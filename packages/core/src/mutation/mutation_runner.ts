import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

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

function getJestBinPath(): string | undefined {
  try {
    const jestPkg = require.resolve('jest/package.json');
    const binPath = path.join(path.dirname(jestPkg), 'bin/jest.js');
    if (fs.existsSync(binPath)) return binPath;
  } catch {}

  const cwdBin = path.resolve(process.cwd(), 'node_modules/jest/bin/jest.js');
  if (fs.existsSync(cwdBin)) return cwdBin;

  const nodeModulesBin = path.resolve(process.cwd(), 'node_modules/.bin/jest');
  if (fs.existsSync(nodeModulesBin)) return nodeModulesBin;

  return undefined;
}

export class MutationRunner {
  private mutatorGen: CodeMutatorGenerator;
  private sandboxDir: string;
  private silent: boolean;
  private jestBinPath?: string;

  constructor(options: MutationRunnerOptions = {}) {
    this.mutatorGen = new CodeMutatorGenerator();
    this.sandboxDir = options.sandboxDir || path.resolve(process.cwd(), '.mutation_sandbox');
    this.silent = options.silent ?? true;
    this.jestBinPath = getJestBinPath();
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

    // 1. Sinh danh sách mutants từ mã nguồn
    const mutants = this.mutatorGen.generateMutants(serviceSource, serviceFileName);

    // 2. Tạo sandbox biệt lập
    if (!fs.existsSync(this.sandboxDir)) {
      fs.mkdirSync(this.sandboxDir, { recursive: true });
    }

    const results: MutantTestResult[] = [];

    try {
      for (const mutant of mutants) {
        const result = await this.evaluateMutant(mutant, testSource, serviceFileName, serviceId);
        results.push(result);
      }
    } finally {
      // Dọn dẹp sandbox
      if (fs.existsSync(this.sandboxDir)) {
        try {
          fs.rmSync(this.sandboxDir, { recursive: true, force: true });
        } catch {
          // Ignore sandbox cleanup errors
        }
      }
    }

    // 3. Tính toán Mutation Score & Thống kê
    const killedCount = results.filter((r) => r.status === 'KILLED').length;
    const survivedCount = results.filter((r) => r.status === 'SURVIVED').length;
    const compileErrorCount = results.filter((r) => r.status === 'COMPILE_ERROR').length;
    const timeoutCount = results.filter((r) => r.status === 'TIMEOUT').length;

    // Mutants hợp lệ = Mutants biên dịch thành công và được kiểm thử (KILLED + SURVIVED)
    const validMutants = killedCount + survivedCount;
    const score = validMutants > 0 ? Number(((killedCount / validMutants) * 100).toFixed(2)) : 0;

    return {
      serviceId,
      strategy,
      totalMutants: mutants.length,
      killedMutants: killedCount,
      survivedMutants: survivedCount,
      compileErrorMutants: compileErrorCount,
      timeoutMutants: timeoutCount,
      validMutants,
      mutationScore: score,
      durationMs: Date.now() - startTime,
      results,
    };
  }

  private async evaluateMutant(
    mutant: Mutant,
    testSource: string,
    serviceFileName: string,
    serviceId = 'Service'
  ): Promise<MutantTestResult> {
    const mutantStartTime = Date.now();
    const cleanSvcId = serviceId.replace(/[^a-zA-Z0-9_]/g, '_');
    const mutantDir = path.join(this.sandboxDir, `${cleanSvcId}_${mutant.id}`);
    fs.mkdirSync(mutantDir, { recursive: true });

    const uniqueServiceName = `${cleanSvcId}_${mutant.id}_${path.basename(serviceFileName, '.ts')}`;
    const mutantServicePath = path.join(mutantDir, `${uniqueServiceName}.ts`);
    const mutantTestPath = path.join(mutantDir, 'mutant.test.ts');

    // Điều chỉnh import relative trong test file trỏ đúng vào mutant service
    const adjustedTestSource = testSource
      .replace(/from\s+['"](?:\.\/|\.\.\/)service(?:\.ts|\.js)?['"]/g, `from './${uniqueServiceName}'`);

    fs.writeFileSync(mutantServicePath, mutant.mutatedFileContent, 'utf-8');
    fs.writeFileSync(mutantTestPath, adjustedTestSource, 'utf-8');

    try {
      // 🚀 Sử dụng Child Process Isolation với Jest CLI nếu có sẵn
      // Khi process thoát, toàn bộ heap memory được OS thu hồi lập tức, loại bỏ hoàn toàn V8 OOM
      if (this.jestBinPath) {
        const spawnRes = cp.spawnSync(
          process.execPath,
          [
            this.jestBinPath,
            mutantTestPath,
            '--testMatch=**/*.test.ts',
            '--runInBand',
            '--json',
            '--silent',
            '--cache=false',
          ],
          {
            cwd: mutantDir,
            timeout: 20000,
            encoding: 'utf-8',
            env: {
              ...process.env,
              NODE_OPTIONS: '--max-old-space-size=512',
            },
          }
        );

        if (spawnRes.error) {
          if ((spawnRes.error as any).code === 'ETIMEDOUT') {
            return {
              mutant,
              status: 'TIMEOUT',
              errorMessage: 'Test execution timed out on mutant',
              durationMs: Date.now() - mutantStartTime,
            };
          }
          return {
            mutant,
            status: 'COMPILE_ERROR',
            errorMessage: spawnRes.error.message,
            durationMs: Date.now() - mutantStartTime,
          };
        }

        const rawStdout = (spawnRes.stdout || '').trim();
        let parsedResults: any = null;

        const startIdx = rawStdout.indexOf('{');
        const endIdx = rawStdout.lastIndexOf('}');
        if (startIdx >= 0 && endIdx >= startIdx) {
          try {
            parsedResults = JSON.parse(rawStdout.substring(startIdx, endIdx + 1));
          } catch {}
        }

        if (parsedResults) {
          const hasFailedTests = (parsedResults.numFailedTests || 0) > 0;
          const totalTests = parsedResults.numTotalTests || 0;
          const hasSuiteFailure = !parsedResults.success || (parsedResults.numFailedTestSuites || 0) > 0;

          if (hasFailedTests) {
            let killingTestName: string | undefined;
            let errorMessage: string | undefined;
            if (parsedResults.testResults && parsedResults.testResults.length > 0) {
              const failedResult = parsedResults.testResults[0];
              errorMessage = failedResult.failureMessage || undefined;
              const failedAssertion = failedResult.testResults?.find((t: any) => t.status === 'failed');
              if (failedAssertion) {
                killingTestName = failedAssertion.title;
              }
            }
            return {
              mutant,
              status: 'KILLED',
              killingTestName,
              errorMessage,
              durationMs: Date.now() - mutantStartTime,
            };
          } else if (hasSuiteFailure && totalTests === 0) {
            return {
              mutant,
              status: 'COMPILE_ERROR',
              errorMessage: parsedResults.testResults?.[0]?.failureMessage || 'Compilation error on mutant',
              durationMs: Date.now() - mutantStartTime,
            };
          } else if (!hasSuiteFailure && totalTests > 0) {
            return {
              mutant,
              status: 'SURVIVED',
              durationMs: Date.now() - mutantStartTime,
            };
          }
        }

        // Nếu status != 0 và không có kết quả hợp lệ
        if (spawnRes.status !== 0) {
          return {
            mutant,
            status: 'COMPILE_ERROR',
            errorMessage: spawnRes.stderr || 'Non-zero exit code during mutant test',
            durationMs: Date.now() - mutantStartTime,
          };
        }
      }

      // Fallback in-process runCLI nếu không có Jest binary
      if (!runCLI) {
        return {
          mutant,
          status: 'COMPILE_ERROR',
          errorMessage: 'Jest runner is not available or could not be loaded.',
          durationMs: Date.now() - mutantStartTime,
        };
      }

      const jestConfig: any = {
        roots: [mutantDir],
        testMatch: [path.resolve(mutantTestPath).replace(/\\/g, '/')],
        preset: 'ts-jest',
        testEnvironment: 'node',
        silent: true,
        runInBand: true,
        cache: false,
        resetModules: true,
        transform: {
          '^.+\\.tsx?$': [
            'ts-jest',
            {
              isolatedModules: true,
              diagnostics: false,
            },
          ],
        },
      };

      const { results } = await runCLI(jestConfig as any, [mutantDir]);

      let status: MutantStatus = 'SURVIVED';
      let killingTestName: string | undefined;
      let errorMessage: string | undefined;

      const hasFailedTests = (results.numFailedTests || 0) > 0;
      const totalTests = results.numTotalTests || 0;
      const hasSuiteFailure = !results.success || (results.numFailedTestSuites || 0) > 0;

      if (hasFailedTests) {
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
        status = 'COMPILE_ERROR';
        if (results.testResults && results.testResults.length > 0) {
          errorMessage = results.testResults[0].failureMessage || 'Compilation/runtime error before tests could execute.';
        } else {
          errorMessage = 'Compilation/runtime error before tests could execute.';
        }
      } else if (!hasSuiteFailure && totalTests > 0) {
        status = 'SURVIVED';
      } else {
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
    } finally {
      if (fs.existsSync(mutantDir)) {
        try {
          fs.rmSync(mutantDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}
