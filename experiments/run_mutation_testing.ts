import * as path from 'path';
import * as fs from 'fs';
import { MutationRunner } from '../packages/core/src/mutation/mutation_runner';
import { MutationAnalyzer } from '../packages/core/src/mutation/mutation_analyzer';
import { MutationSummary } from '../packages/core/src/mutation/types';

async function main() {
  console.log('================================================================');
  console.log('🧬 TIẾN HÀNH THỰC NGHIỆM MUTATION TESTING (THÀNH VIÊN B)');
  console.log('================================================================\n');

  const rootDatasetDir = path.resolve(__dirname, 'dataset');
  const resultsDir = path.resolve(__dirname, 'results');
  const serviceId = 'S01_DiscountCalculator';
  const servicePath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/service.ts');
  const groundTruthTestPath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/ground_truth.test.ts');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const runner = new MutationRunner({ silent: true });
  const analyzer = new MutationAnalyzer();

  console.log(`[1/2] Đang chạy Mutation Testing cho Ground Truth (${serviceId})...`);
  const groundTruthSummary = await runner.runMutationTesting(
    servicePath,
    groundTruthTestPath,
    serviceId,
    'ground-truth'
  );

  console.log(`\n📊 Kết quả Mutation Ground Truth (${serviceId}):`);
  console.log(`- Tổng số Mutant sinh ra: ${groundTruthSummary.totalMutants}`);
  console.log(`- Mutant hợp lệ (Valid): ${groundTruthSummary.validMutants}`);
  console.log(`- Tiêu diệt (Killed): ${groundTruthSummary.killedMutants}`);
  console.log(`- Sót (Survived): ${groundTruthSummary.survivedMutants}`);
  console.log(`- Lỗi biên dịch (Compile Error): ${groundTruthSummary.compileErrorMutants}`);
  console.log(`- Quá thời gian (Timeout): ${groundTruthSummary.timeoutMutants}`);
  console.log(`- Mutation Score: ${groundTruthSummary.mutationScore}%\n`);

  const summaries: Record<string, MutationSummary> = {
    'ground-truth': groundTruthSummary,
  };

  // Nếu có file test sinh thực tế trong experiments/results hoặc dataset, chạy kiểm thử thật
  const generatedTests: Array<{ strategy: string; filePath: string }> = [
    { strategy: 'hybrid', filePath: path.join(resultsDir, `${serviceId}_hybrid.test.ts`) },
    { strategy: 'zero-shot', filePath: path.join(resultsDir, `${serviceId}_zero-shot.test.ts`) },
    { strategy: 'cot', filePath: path.join(resultsDir, `${serviceId}_cot.test.ts`) },
  ];

  for (const gen of generatedTests) {
    if (fs.existsSync(gen.filePath)) {
      console.log(`Đang chạy Mutation Testing thật cho strategy [${gen.strategy}]...`);
      const summary = await runner.runMutationTesting(
        servicePath,
        gen.filePath,
        serviceId,
        gen.strategy
      );
      summaries[gen.strategy] = summary;
      console.log(`  -> Mutation Score (${gen.strategy}): ${summary.mutationScore}%`);
    }
  }

  console.log('[2/2] Phân tích tổng hợp kết quả Mutation Score...');
  const comparison = analyzer.compareStrategies(serviceId, summaries);
  const reportMarkdown = analyzer.generateMarkdownReport(comparison);

  const reportPath = path.join(resultsDir, 'mutation_report.md');
  const summaryJsonPath = path.join(resultsDir, 'mutation_summary.json');

  fs.writeFileSync(reportPath, reportMarkdown, 'utf-8');
  fs.writeFileSync(summaryJsonPath, JSON.stringify(comparison, null, 2), 'utf-8');

  console.log(`\n✅ Đã xuất báo cáo Mutation Report tại: ${reportPath}`);
  console.log(`✅ Đã xuất tóm tắt dữ liệu tại: ${summaryJsonPath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Mutation testing error:', err);
    process.exit(1);
  });
}
