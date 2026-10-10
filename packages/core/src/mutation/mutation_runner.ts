import * as fs from 'fs';
import * as path from 'path';

let runCLI: any = null;
try {
  runCLI = require('jest').runCLI;
} catch {
  runCLI = null;
}
import { CodeMutatorGenerator } from './mutators';
import { Mutant, MutantStatus, MutantTestResult, MutationSummary } from './types';

export interface MutationRunnerOptions {
  sandboxDir?: string;
  silent?: boolean;
}

export class MutationRunner {
  private mutatorGen: CodeMutatorGenerator;
  private sandboxDir: string;
  private silent: boolean;

  constructor(options: MutationRunnerOptions = {}) {
    this.mutatorGen = new CodeMutatorGenerator();
    this.sandboxDir = options.sandboxDir || path.resolve(process.cwd(), '.mutation_sandbox');
    this.silent = options.silent ?? true;
  }

  /**
   * Chạy Mutation Testing cho một file service và file test tương ứng
   */
  public async runMutationTesting(
    serviceFilePath: string,
    testFilePath: string,
    serviceId = 'Service',
    strategy = 'unknown'
  ): Promise<MutationSummary> {
    const startTime = Date.now();
    const serviceSource = fs.readFileSync(serviceFilePath, 'utf-8');
    const testSource = fs.readFileSync(testFilePath, 'utf-8');
    const serviceFileName = path.basename(serviceFilePath);

    const mutants = this.mutatorGen.generateMutants(serviceSource, serviceFileName);
    const results: MutantTestResult[] = [];

    // Tạo thư mục sandbox
    if (!fs.existsSync(this.sandboxDir)) {
      fs.mkdirSync(this.sandboxDir, { recursive: true });
    }

    try {
      for (const mutant of mutants) {
        const result = await this.evaluateMutant(mutant, testSource, serviceFileName);
        results.push(result);
      }
    } finally {
      // Dọn dẹp sandbox
      if (fs.existsSync(this.sandboxDir)) {
        try {
          fs.rmSync(this.sandboxDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    const killedMutants = results.filter((r) => r.status === 'KILLED').length;
    const survivedMutants = results.filter((r) => r.status === 'SURVIVED').length;
    const timeoutMutants = results.filter((r) => r.status === 'TIMEOUT').length;
    const compileErrorMutants = results.filter((r) => r.status === 'COMPILE_ERROR').length;

    const validMutantsCount = mutants.length - compileErrorMutants;
    const mutationScore =
      validMutantsCount > 0
        ? parseFloat((((killedMutants + timeoutMutants) / validMutantsCount) * 100).toFixed(2))
        : 0;

    return {
      serviceId,
      strategy,
      totalMutants: mutants.length,
      validMutants: validMutantsCount,
      killedMutants,
      survivedMutants,
      timeoutMutants,
      compileErrorMutants,
      mutationScore,
      durationMs: Date.now() - startTime,
      results,
    };
  }

  private async evaluateMutant(
    mutant: Mutant,
    testSource: string,
    serviceFileName: string
  ): Promise<MutantTestResult> {
    const mutantStartTime = Date.now();
    const mutantDir = path.join(this.sandboxDir, mutant.id);
    fs.mkdirSync(mutantDir, { recursive: true });

    const mutantServicePath = path.join(mutantDir, serviceFileName);
    const mutantTestPath = path.join(mutantDir, 'mutant.test.ts');

    // Điều chỉnh import relative trong test file trỏ đúng vào mutant service
    const adjustedTestSource = testSource
      .replace(/from\s+['"]\.\/service['"]/g, `from './${path.basename(serviceFileName, '.ts')}'`)
      .replace(/from\s+['"]\.\.\/service['"]/g, `from './${path.basename(serviceFileName, '.ts')}'`);

    fs.writeFileSync(mutantServicePath, mutant.mutatedFileContent, 'utf-8');
    fs.writeFileSync(mutantTestPath, adjustedTestSource, 'utf-8');

    if (!runCLI) {
      return {
        mutant,
        status: 'COMPILE_ERROR',
        errorMessage: 'Jest runner is not available or could not be loaded.',
        durationMs: Date.now() - mutantStartTime,
      };
    }

    try {
      const jestConfig: any = {
        roots: [mutantDir],
        testMatch: [path.resolve(mutantTestPath).replace(/\\/g, '/')],
        preset: 'ts-jest',
        testEnvironment: 'node',
        silent: true,
        runInBand: true,
      };

      const { results } = await runCLI(jestConfig as any, [mutantDir]);

      let status: MutantStatus = 'SURVIVED';
      let killingTestName: string | undefined;
      let errorMessage: string | undefined;

      const hasFailedTests = (results.numFailedTests || 0) > 0;
      const totalTests = results.numTotalTests || 0;
      const hasSuiteFailure = !results.success || (results.numFailedTestSuites || 0) > 0;

      if (hasFailedTests) {
        // Có test assertion thực sự fail do mutant
        status = 'KILLED';
        if (results.testResults && results.testResults.length > 0) {
          const failedResult = results.testResults[0];
          errorMessage = failedResult.failureMessage || undefined;
          const failedAssertion = failedResult.testResults?.find((t: any) => t.status === 'failed');
          if (failedAssertion) {
            killingTestName = failedAssertion.title;
          }
        }
      } else if (hasSuiteFailure && totalTests === 0) {
        // Lỗi biên dịch, cú pháp hoặc import harness khiến suite không thể chạy
        status = 'COMPILE_ERROR';
        if (results.testResults && results.testResults.length > 0) {
          errorMessage = results.testResults[0].failureMessage || 'Compilation/runtime error before tests could execute.';
        } else {
          errorMessage = 'Compilation/runtime error before tests could execute.';
        }
      } else if (!hasSuiteFailure && totalTests > 0) {
        // Toàn bộ test suite pass -> mutant đã sống sót
        status = 'SURVIVED';
      } else {
        // Trường hợp khác (harness crash hoặc timeout)
        status = 'COMPILE_ERROR';
        errorMessage = 'Uncategorized test harness failure.';
      }

      return {
        mutant,
        status,
        killingTestName,
        errorMessage,
        durationMs: Date.now() - mutantStartTime,
      };
    } catch (err: any) {
      return {
        mutant,
        status: 'COMPILE_ERROR',
        errorMessage: err.message,
        durationMs: Date.now() - mutantStartTime,
      };
    }
  }
}
