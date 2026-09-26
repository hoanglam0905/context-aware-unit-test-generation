import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore: runCLI is imported from jest
import { runCLI } from 'jest';
import { TestExecutionSummary } from './types';

export interface CoverageRunnerOptions {
  rootDir?: string;
  silent?: boolean;
}

export class CoverageRunner {
  private rootDir: string;
  private silent: boolean;

  constructor(options: CoverageRunnerOptions = {}) {
    this.rootDir = options.rootDir || path.resolve(process.cwd());
    this.silent = options.silent ?? true;
  }

  /**
   * Chạy kiểm thử tự động trên file test cụ thể và đo độ phủ mã (Coverage)
   */
  public async executeTest(testFilePath: string, collectCoverageFromPattern?: string): Promise<TestExecutionSummary> {
    if (!fs.existsSync(testFilePath)) {
      return {
        executed: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        passRate: 0,
        suitePassed: false,
        errorMessage: `Test file not found: ${testFilePath}`,
      };
    }

    try {
      const jestConfig: any = {
        roots: [this.rootDir],
        testMatch: [path.resolve(testFilePath).replace(/\\/g, '/')],
        preset: 'ts-jest',
        testEnvironment: 'node',
        collectCoverage: true,
        coverageReporters: ['json-summary'],
        silent: this.silent,
        runInBand: true,
      };

      if (collectCoverageFromPattern) {
        jestConfig.collectCoverageFrom = [collectCoverageFromPattern];
      }

      const { results } = await runCLI(jestConfig as any, [this.rootDir]);

      const totalTests = results.numTotalTests || 0;
      const passedTests = results.numPassedTests || 0;
      const failedTests = results.numFailedTests || 0;
      const passRate = totalTests > 0 ? parseFloat(((passedTests / totalTests) * 100).toFixed(2)) : 0;
      const suitePassed = results.success && failedTests === 0;

      const coverageSummary = results.coverageMap?.getCoverageSummary()?.data;
      const coverage = coverageSummary
        ? {
            lines: coverageSummary.lines?.pct ?? 0,
            branches: coverageSummary.branches?.pct ?? 0,
            functions: coverageSummary.functions?.pct ?? 0,
            statements: coverageSummary.statements?.pct ?? 0,
          }
        : undefined;

      let errorMessage: string | undefined;
      if (!suitePassed && results.testResults && results.testResults.length > 0) {
        errorMessage = results.testResults[0].failureMessage || undefined;
      }

      return {
        executed: true,
        totalTests,
        passedTests,
        failedTests,
        passRate,
        suitePassed,
        coverage,
        errorMessage,
      };
    } catch (err: any) {
      return {
        executed: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        passRate: 0,
        suitePassed: false,
        errorMessage: `Jest execution failed: ${err.message}`,
      };
    }
  }
}
