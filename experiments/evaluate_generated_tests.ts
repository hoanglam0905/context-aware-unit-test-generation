import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
// @ts-ignore: jest runCLI is exposed by jest package
import { runCLI } from 'jest';

export interface TestEvaluationResult {
  runId: string;
  serviceId: string;
  tier: string;
  model: string;
  strategy: string;
  testFilePath: string;
  compilable: boolean;
  compilationErrors?: string[];
  execution: {
    executed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number; // 0 - 100%
    suitePassed: boolean;
    errorMessage?: string;
  };
  coverage: {
    linesPct: number;
    branchesPct: number;
    statementsPct: number;
    functionsPct: number;
  };
  durationMs: number;
  evaluatedAt: string;
}

export interface MetricAggregate {
  count: number;
  compilableCount: number;
  compilabilityRate: number;
  totalTests: number;
  passedTests: number;
  passRate: number;
  avgLineCoverage: number;
  avgBranchCoverage: number;
}

export interface EvaluationSummary {
  totalEvaluated: number;
  compilabilityRate: number;
  firstPassExecutionRate: number;
  avgLineCoverage: number;
  avgBranchCoverage: number;
  byStrategy: Record<string, MetricAggregate>;
  byModel: Record<string, MetricAggregate>;
  byTier: Record<string, MetricAggregate>;
  results: TestEvaluationResult[];
}

export interface EvaluatorConfig {
  resultsDir?: string;
  datasetDir?: string;
  sandboxDir?: string;
  filterService?: string;
  filterStrategy?: string;
  filterModel?: string;
  limit?: number;
  silent?: boolean;
}

export class GeneratedTestEvaluator {
  private readonly resultsDir: string;
  private readonly datasetDir: string;
  private readonly sandboxDir: string;
  private readonly filterService?: string;
  private readonly filterStrategy?: string;
  private readonly filterModel?: string;
  private readonly limit?: number;
  private readonly silent: boolean;

  constructor(config: EvaluatorConfig = {}) {
    this.resultsDir = config.resultsDir || path.resolve(process.cwd(), 'experiments/results');
    this.datasetDir = config.datasetDir || path.resolve(process.cwd(), 'experiments/dataset');
    this.sandboxDir = config.sandboxDir || path.resolve(process.cwd(), 'experiments/eval_sandbox');
    this.filterService = config.filterService;
    this.filterStrategy = config.filterStrategy;
    this.filterModel = config.filterModel;
    this.limit = config.limit;
    this.silent = config.silent ?? false;
  }

  /**
   * Đánh giá một file test do LLM sinh ra trong môi trường Sandbox biệt lập
   */
  public async evaluateSingleTest(target: {
    runId: string;
    serviceId: string;
    tier: string;
    model: string;
    strategy: string;
    testFilePath: string;
    serviceFilePath: string;
  }): Promise<TestEvaluationResult> {
    const startTime = Date.now();
    const evaluatedAt = new Date().toISOString();

    if (!fs.existsSync(target.testFilePath)) {
      throw new Error(`Test file not found: ${target.testFilePath}`);
    }

    if (!fs.existsSync(target.serviceFilePath)) {
      throw new Error(`Service file not found: ${target.serviceFilePath}`);
    }

    const rawTestCode = fs.readFileSync(target.testFilePath, 'utf-8');
    const testCode = GeneratedTestEvaluator.extractExecutableTestCode(rawTestCode);

    // 1. Kiểm tra cú pháp nhanh qua TypeScript Transpiler
    const transpileResult = ts.transpileModule(testCode, {
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    });

    const syntaxErrors: string[] = [];
    if (transpileResult.diagnostics && transpileResult.diagnostics.length > 0) {
      for (const diag of transpileResult.diagnostics) {
        const msg = typeof diag.messageText === 'string'
          ? diag.messageText
          : diag.messageText.messageText;
        syntaxErrors.push(msg);
      }
    }

    // Nếu cú pháp TS bị hỏng nặng -> fail ngay
    if (syntaxErrors.length > 0) {
      return {
        runId: target.runId,
        serviceId: target.serviceId,
        tier: target.tier,
        model: target.model,
        strategy: target.strategy,
        testFilePath: target.testFilePath,
        compilable: false,
        compilationErrors: syntaxErrors,
        execution: {
          executed: false,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          passRate: 0,
          suitePassed: false,
          errorMessage: syntaxErrors.join('; '),
        },
        coverage: {
          linesPct: 0,
          branchesPct: 0,
          statementsPct: 0,
          functionsPct: 0,
        },
        durationMs: Date.now() - startTime,
        evaluatedAt,
      };
    }

    // 2. Thiết lập Sandbox biệt lập
    fs.mkdirSync(this.sandboxDir, { recursive: true });
    const serviceSandboxPath = path.join(this.sandboxDir, 'service.ts');
    const testSandboxPath = path.join(this.sandboxDir, 'eval.test.ts');

    try {
      // Sao chép service gốc sang sandbox
      fs.copyFileSync(target.serviceFilePath, serviceSandboxPath);

      // Ghi test code đã được chuẩn hóa sang sandbox
      fs.writeFileSync(testSandboxPath, testCode, 'utf-8');

      // 3. Thực thi Jest kiểm thử & đo Coverage
      const relativeTestPath = path.relative(process.cwd(), testSandboxPath).replace(/\\/g, '/');
      const relativeServicePath = path.relative(process.cwd(), serviceSandboxPath).replace(/\\/g, '/');

      const { results } = await runCLI(
        {
          testMatch: [`<rootDir>/${relativeTestPath}`],
          runInBand: true,
          silent: true,
          coverage: true,
          collectCoverageFrom: [`<rootDir>/${relativeServicePath}`],
          coverageReporters: ['json-summary'],
          cache: false,
        } as any,
        [process.cwd()]
      );

      const testSuiteResult = results.testResults?.[0];
      const hasSuiteFailure = results.numFailedTestSuites > 0;
      const totalTests = results.numTotalTests || 0;
      const passedTests = results.numPassedTests || 0;
      const failedTests = results.numFailedTests || 0;

      // Nếu Jest không thể chạy hoặc báo lỗi biên dịch/import (0 tests executed nhưng suite failed)
      if (totalTests === 0 && hasSuiteFailure) {
        const failureMessage = testSuiteResult?.failureMessage || 'Failed to compile or execute test suite';
        return {
          runId: target.runId,
          serviceId: target.serviceId,
          tier: target.tier,
          model: target.model,
          strategy: target.strategy,
          testFilePath: target.testFilePath,
          compilable: false,
          compilationErrors: [failureMessage],
          execution: {
            executed: false,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            passRate: 0,
            suitePassed: false,
            errorMessage: failureMessage,
          },
          coverage: {
            linesPct: 0,
            branchesPct: 0,
            statementsPct: 0,
            functionsPct: 0,
          },
          durationMs: Date.now() - startTime,
          evaluatedAt,
        };
      }

      // Đã biên dịch & thực thi các test case thành công
      const coverageSummary = results.coverageMap?.getCoverageSummary()?.data;
      const linesPct = coverageSummary?.lines?.pct ?? 0;
      const branchesPct = coverageSummary?.branches?.pct ?? 0;
      const statementsPct = coverageSummary?.statements?.pct ?? 0;
      const functionsPct = coverageSummary?.functions?.pct ?? 0;

      const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
      const suitePassed = totalTests > 0 && failedTests === 0;

      return {
        runId: target.runId,
        serviceId: target.serviceId,
        tier: target.tier,
        model: target.model,
        strategy: target.strategy,
        testFilePath: target.testFilePath,
        compilable: true,
        execution: {
          executed: true,
          totalTests,
          passedTests,
          failedTests,
          passRate: parseFloat(passRate.toFixed(2)),
          suitePassed,
          errorMessage: failedTests > 0 ? (testSuiteResult?.failureMessage || undefined) : undefined,
        },
        coverage: {
          linesPct: parseFloat(linesPct.toFixed(2)),
          branchesPct: parseFloat(branchesPct.toFixed(2)),
          statementsPct: parseFloat(statementsPct.toFixed(2)),
          functionsPct: parseFloat(functionsPct.toFixed(2)),
        },
        durationMs: Date.now() - startTime,
        evaluatedAt,
      };
    } finally {
      // Dọn dẹp sandbox
      if (fs.existsSync(this.sandboxDir)) {
        fs.rmSync(this.sandboxDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * Quét và đánh giá toàn bộ kết quả thực nghiệm trong thư mục kết quả
   */
  public async evaluateAll(): Promise<EvaluationSummary> {
    if (!this.silent) {
      console.log('================================================================');
      console.log('🔬 BẮT ĐẦU ĐÁNH GIÁ CHẤT LƯỢNG UNIT TEST TỰ ĐỘNG (THÀNH VIÊN A)');
      console.log(`Thư mục kết quả: ${this.resultsDir}`);
      console.log(`Thư mục dataset: ${this.datasetDir}`);
      console.log('================================================================\n');
    }

    const testTargets = this.discoverTestTargets();
    if (!this.silent) {
      console.log(`Tìm thấy ${testTargets.length} file test sinh ra cần đánh giá.\n`);
    }

    const results: TestEvaluationResult[] = [];
    const totalToEvaluate = this.limit ? Math.min(this.limit, testTargets.length) : testTargets.length;

    for (let i = 0; i < totalToEvaluate; i++) {
      const target = testTargets[i];
      if (!this.silent) {
        console.log(`[${i + 1}/${totalToEvaluate}] Đánh giá: ${target.runId}...`);
      }

      try {
        const evalResult = await this.evaluateSingleTest(target);
        results.push(evalResult);

        // Lưu evaluation.json vào chính thư mục của run
        const runDir = path.dirname(target.testFilePath);
        fs.writeFileSync(
          path.join(runDir, 'evaluation.json'),
          JSON.stringify(evalResult, null, 2),
          'utf-8'
        );

        if (!this.silent) {
          const compStr = evalResult.compilable ? '✅ Biên dịch OK' : '❌ Lỗi biên dịch';
          const passStr = evalResult.execution.executed
            ? `Pass: ${evalResult.execution.passedTests}/${evalResult.execution.totalTests} (${evalResult.execution.passRate}%)`
            : 'Pass: N/A';
          const covStr = `Line: ${evalResult.coverage.linesPct}% | Branch: ${evalResult.coverage.branchesPct}%`;
          console.log(`    ➔ ${compStr} | ${passStr} | ${covStr}`);
        }
      } catch (err: any) {
        if (!this.silent) {
          console.error(`    ❌ Lỗi khi đánh giá ${target.runId}: ${err.message}`);
        }
      }
    }

    const summary = this.computeSummary(results);

    // Xuất báo cáo tổng hợp
    fs.mkdirSync(this.resultsDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.resultsDir, 'evaluation_summary.json'),
      JSON.stringify(summary, null, 2),
      'utf-8'
    );

    this.exportCsv(results);

    if (!this.silent) {
      this.printSummaryTable(summary);
    }

    return summary;
  }

  private discoverTestTargets(): Array<{
    runId: string;
    serviceId: string;
    tier: string;
    model: string;
    strategy: string;
    testFilePath: string;
    serviceFilePath: string;
  }> {
    const targets: Array<{
      runId: string;
      serviceId: string;
      tier: string;
      model: string;
      strategy: string;
      testFilePath: string;
      serviceFilePath: string;
    }> = [];

    if (!fs.existsSync(this.resultsDir)) {
      return targets;
    }

    const tiers = ['simple', 'medium', 'complex'];
    for (const tier of tiers) {
      const tierPath = path.join(this.resultsDir, tier);
      if (!fs.existsSync(tierPath)) continue;

      for (const serviceId of fs.readdirSync(tierPath)) {
        if (this.filterService && serviceId !== this.filterService) continue;
        const serviceDirPath = path.join(tierPath, serviceId);
        if (!fs.statSync(serviceDirPath).isDirectory()) continue;

        const serviceFilePath = path.join(this.datasetDir, tier, serviceId, 'service.ts');
        if (!fs.existsSync(serviceFilePath)) continue;

        for (const model of fs.readdirSync(serviceDirPath)) {
          if (this.filterModel && model !== this.filterModel) continue;
          const modelDirPath = path.join(serviceDirPath, model);
          if (!fs.statSync(modelDirPath).isDirectory()) continue;

          for (const strategy of fs.readdirSync(modelDirPath)) {
            if (this.filterStrategy && strategy !== this.filterStrategy) continue;
            const strategyDirPath = path.join(modelDirPath, strategy);
            if (!fs.statSync(strategyDirPath).isDirectory()) continue;

            const testFilePath = path.join(strategyDirPath, 'generated.test.ts');
            if (fs.existsSync(testFilePath)) {
              targets.push({
                runId: `${serviceId}__${model}__${strategy}`,
                serviceId,
                tier,
                model,
                strategy,
                testFilePath,
                serviceFilePath,
              });
            }
          }
        }
      }
    }

    return targets;
  }

  private computeSummary(results: TestEvaluationResult[]): EvaluationSummary {
    const total = results.length;
    const compilableCount = results.filter(r => r.compilable).length;
    const totalTests = results.reduce((acc, r) => acc + r.execution.totalTests, 0);
    const passedTests = results.reduce((acc, r) => acc + r.execution.passedTests, 0);

    const compilableResults = results.filter(r => r.compilable);
    const avgLineCov = compilableResults.length > 0
      ? compilableResults.reduce((acc, r) => acc + r.coverage.linesPct, 0) / compilableResults.length
      : 0;
    const avgBranchCov = compilableResults.length > 0
      ? compilableResults.reduce((acc, r) => acc + r.coverage.branchesPct, 0) / compilableResults.length
      : 0;

    const calcGroup = (groupResults: TestEvaluationResult[]): MetricAggregate => {
      const gTotal = groupResults.length;
      const gComp = groupResults.filter(r => r.compilable).length;
      const gTotalTests = groupResults.reduce((acc, r) => acc + r.execution.totalTests, 0);
      const gPassedTests = groupResults.reduce((acc, r) => acc + r.execution.passedTests, 0);
      const gCompResults = groupResults.filter(r => r.compilable);

      return {
        count: gTotal,
        compilableCount: gComp,
        compilabilityRate: gTotal > 0 ? parseFloat(((gComp / gTotal) * 100).toFixed(2)) : 0,
        totalTests: gTotalTests,
        passedTests: gPassedTests,
        passRate: gTotalTests > 0 ? parseFloat(((gPassedTests / gTotalTests) * 100).toFixed(2)) : 0,
        avgLineCoverage: gCompResults.length > 0
          ? parseFloat((gCompResults.reduce((acc, r) => acc + r.coverage.linesPct, 0) / gCompResults.length).toFixed(2))
          : 0,
        avgBranchCoverage: gCompResults.length > 0
          ? parseFloat((gCompResults.reduce((acc, r) => acc + r.coverage.branchesPct, 0) / gCompResults.length).toFixed(2))
          : 0,
      };
    };

    const byStrategy: Record<string, MetricAggregate> = {};
    const byModel: Record<string, MetricAggregate> = {};
    const byTier: Record<string, MetricAggregate> = {};

    for (const r of results) {
      if (!byStrategy[r.strategy]) {
        byStrategy[r.strategy] = calcGroup(results.filter(x => x.strategy === r.strategy));
      }
      if (!byModel[r.model]) {
        byModel[r.model] = calcGroup(results.filter(x => x.model === r.model));
      }
      if (!byTier[r.tier]) {
        byTier[r.tier] = calcGroup(results.filter(x => x.tier === r.tier));
      }
    }

    return {
      totalEvaluated: total,
      compilabilityRate: total > 0 ? parseFloat(((compilableCount / total) * 100).toFixed(2)) : 0,
      firstPassExecutionRate: totalTests > 0 ? parseFloat(((passedTests / totalTests) * 100).toFixed(2)) : 0,
      avgLineCoverage: parseFloat(avgLineCov.toFixed(2)),
      avgBranchCoverage: parseFloat(avgBranchCov.toFixed(2)),
      byStrategy,
      byModel,
      byTier,
      results,
    };
  }

  private exportCsv(results: TestEvaluationResult[]): void {
    const csvPath = path.join(this.resultsDir, 'evaluation_summary.csv');
    const header = 'RunId,Tier,Service,Model,Strategy,Compilable,TotalTests,PassedTests,FailedTests,PassRate,LineCoverage,BranchCoverage,DurationMs,EvaluatedAt\n';
    const rows = results.map(r =>
      `"${r.runId}","${r.tier}","${r.serviceId}","${r.model}","${r.strategy}",${r.compilable},${r.execution.totalTests},${r.execution.passedTests},${r.execution.failedTests},${r.execution.passRate},${r.coverage.linesPct},${r.coverage.branchesPct},${r.durationMs},"${r.evaluatedAt}"`
    ).join('\n');

    fs.writeFileSync(csvPath, header + rows, 'utf-8');
  }

  private printSummaryTable(summary: EvaluationSummary): void {
    console.log('\n================================================================');
    console.log('📊 TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ CHỈ SỐ NCKH (SUMMARY METRICS)');
    console.log('================================================================');
    console.log(`Tổng số run đánh giá: ${summary.totalEvaluated}`);
    console.log(`Tỷ lệ biên dịch thành công (Compilability Rate): ${summary.compilabilityRate}%`);
    console.log(`Tỷ lệ pass ngay lần đầu (First-pass Pass Rate): ${summary.firstPassExecutionRate}%`);
    console.log(`Độ phủ dòng trung bình (Avg Line Coverage): ${summary.avgLineCoverage}%`);
    console.log(`Độ phủ nhánh trung bình (Avg Branch Coverage): ${summary.avgBranchCoverage}%\n`);

    console.log('--- SO SÁNH THEO CHIẾN LƯỢC PROMPT ---');
    console.log('| Chiến lược | Số mẫu | Biên dịch (%) | Pass Rate (%) | Line Cov (%) | Branch Cov (%) |');
    console.log('| :--- | :---: | :---: | :---: | :---: | :---: |');
    for (const [strategy, metrics] of Object.entries(summary.byStrategy)) {
      console.log(
        `| ${strategy.padEnd(12)} | ${metrics.count.toString().padStart(6)} | ${(metrics.compilabilityRate + '%').padStart(13)} | ${(metrics.passRate + '%').padStart(13)} | ${(metrics.avgLineCoverage + '%').padStart(12)} | ${(metrics.avgBranchCoverage + '%').padStart(14)} |`
      );
    }

    console.log('\n--- SO SÁNH THEO ĐỘ PHỨC TẠP (TIER) ---');
    console.log('| Tier | Số mẫu | Biên dịch (%) | Pass Rate (%) | Line Cov (%) | Branch Cov (%) |');
    console.log('| :--- | :---: | :---: | :---: | :---: | :---: |');
    for (const [tier, metrics] of Object.entries(summary.byTier)) {
      console.log(
        `| ${tier.padEnd(10)} | ${metrics.count.toString().padStart(6)} | ${(metrics.compilabilityRate + '%').padStart(13)} | ${(metrics.passRate + '%').padStart(13)} | ${(metrics.avgLineCoverage + '%').padStart(12)} | ${(metrics.avgBranchCoverage + '%').padStart(14)} |`
      );
    }
    console.log('================================================================\n');
  }

  public static extractExecutableTestCode(rawCode: string): string {
    let clean = rawCode.trim();

    // 1. Nếu file bắt đầu bằng json hoặc ```json
    if (clean.startsWith('json\n') || clean.startsWith('json\r\n')) {
      clean = clean.replace(/^json\r?\n/, '');
    }

    // 2. Nếu là JSON object chứa testCode
    if (clean.startsWith('{') && clean.includes('"testCode"')) {
      try {
        const parsed = JSON.parse(clean);
        if (parsed.testCode && typeof parsed.testCode === 'string') {
          clean = parsed.testCode;
        }
      } catch {
        // Fallback trích xuất nếu JSON chứa template literals unescaped
        const match = clean.match(/"testCode"\s*:\s*[`"]([\s\S]*?)[`"]\s*,?\s*"?(?:testScenarios|reasoningSteps|generatedAt)?/);
        if (match && match[1]) {
          clean = match[1];
        }
      }
    }

    // 3. Nếu còn bọc trong markdown code fence
    const fenceMatch = clean.match(/```(?:typescript|ts)?\r?\n([\s\S]*?)```/);
    if (fenceMatch && fenceMatch[1]) {
      clean = fenceMatch[1];
    }

    // 4. Chuẩn hóa relative imports cục bộ hướng về service.ts
    // Replace các local import dạng './User', './DiscountCalculatorService', '../service' về './service'
    clean = clean.replace(/(from\s+['"])\.\.?[^'"]*(['"])/g, '$1./service$2');

    return clean;
  }
}

// Chạy trực tiếp từ dòng lệnh (CLI execution)
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: EvaluatorConfig = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--service' && args[i + 1]) options.filterService = args[++i];
    if (args[i] === '--strategy' && args[i + 1]) options.filterStrategy = args[++i];
    if (args[i] === '--model' && args[i + 1]) options.filterModel = args[++i];
    if (args[i] === '--limit' && args[i + 1]) options.limit = parseInt(args[++i], 10);
  }

  const evaluator = new GeneratedTestEvaluator(options);
  evaluator.evaluateAll().catch(err => {
    console.error('Fatal Evaluation Error:', err);
    process.exit(1);
  });
}
