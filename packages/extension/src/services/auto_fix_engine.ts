import { ILLMGateway } from '../../../core/src/llm/types';
import { TestPostProcessor } from '../../../core/src/pipeline/post_processor';
import { CoverageRunner } from '../../../core/src/pipeline/coverage_runner';
import { ProcessedTestOutput, TestExecutionSummary } from '../../../core/src/pipeline/types';
import * as fs from 'fs';
import * as path from 'path';

export interface AutoFixRequest {
  serviceCode: string;
  requirementDoc?: string;
  failedTestCode: string;
  errorMessage: string;
  testFilePath?: string;
  serviceFilePath?: string;
  maxIterations?: number;
}

export interface AutoFixResult {
  fixed: boolean;
  finalTestCode: string;
  processedOutput: ProcessedTestOutput;
  iterations: number;
  execution?: TestExecutionSummary;
  fixHistory: Array<{
    iteration: number;
    errorSummary: string;
    durationMs: number;
  }>;
}

export class AutoFixEngine {
  private postProcessor: TestPostProcessor;
  private coverageRunner: CoverageRunner;

  constructor(
    private readonly llmGateway: ILLMGateway,
    postProcessor?: TestPostProcessor,
    coverageRunner?: CoverageRunner
  ) {
    this.postProcessor = postProcessor || new TestPostProcessor();
    this.coverageRunner = coverageRunner || new CoverageRunner();
  }

  /**
   * Vòng lặp Self-Reflection tự động sửa lỗi mã Unit Test (Syntax Error hoặc Assertion Failure)
   */
  public async autoFix(request: AutoFixRequest): Promise<AutoFixResult> {
    const maxIterations = request.maxIterations || 2;
    let currentTestCode = request.failedTestCode;
    let currentError = request.errorMessage;
    const fixHistory: AutoFixResult['fixHistory'] = [];

    let processedOutput = this.postProcessor.process(currentTestCode);

    for (let iter = 1; iter <= maxIterations; iter++) {
      const iterStartTime = Date.now();

      // Xây dựng Reflection Prompt cho LLM
      const systemPrompt = `Bạn là một Chuyên gia Sửa lỗi Kiểm thử Phần mềm (Automated QA / Test Repair Expert).
Nhiệm vụ của bạn là phân tích nguyên nhân lỗi biên dịch hoặc lỗi assertion của mã test và sửa lại mã TypeScript/Jest để kiểm thử pass 100%.
BẢO TOÀN CHẤT LƯỢNG TEST: Giữ nguyên các kịch bản kiểm thử nghiệp vụ, boundary case và assertion quan trọng; tuyệt đối KHÔNG xoá bỏ test case hoặc làm yếu assertion (không đổi expect(val).toBe(x) thành toBeDefined() vô nghĩa).
Chỉ trả về mã test TypeScript hoàn chỉnh trong codeblock \`\`\`typescript ... \`\`\`. Không giải thích lan man.`;

      const userPrompt = `### MÃ NGUỒN SERVICE GỐC:
\`\`\`typescript
${request.serviceCode}
\`\`\`

${request.requirementDoc ? `### TÀI LIỆU YÊU CẦU NGHIỆP VỤ (BA REQUIREMENT):\n${request.requirementDoc}\n` : ''}

### MÃ TEST ĐANG BỊ LỖI:
\`\`\`typescript
${currentTestCode}
\`\`\`

### THÔNG BÁO LỖI (ERROR / STACK TRACE):
\`\`\`text
${currentError}
\`\`\`

Hãy phân tích nguyên nhân lỗi và sinh lại file mã kiểm thử hoàn chỉnh đã được sửa lỗi triệt để.`;

      const llmResponse = await this.llmGateway.generate(systemPrompt, userPrompt);
      processedOutput = this.postProcessor.process(llmResponse.rawText || llmResponse.testCode);
      currentTestCode = processedOutput.testCode;

      const durationMs = Date.now() - iterStartTime;
      fixHistory.push({
        iteration: iter,
        errorSummary: currentError.substring(0, 200),
        durationMs,
      });

      // Nếu cú pháp hợp lệ
      if (processedOutput.syntaxValidation.isValid) {
        // Chạy kiểm tra thực thi nếu có đường dẫn test hoặc service
        if (request.testFilePath || request.serviceFilePath) {
          let sandboxTestPath: string;
          let isIsolatedDir = false;
          let tempSandboxDir = '';

          const refDir = request.testFilePath
            ? path.dirname(request.testFilePath)
            : request.serviceFilePath
              ? path.dirname(request.serviceFilePath)
              : undefined;

          if (refDir && fs.existsSync(refDir)) {
            // Đặt file tạm cùng thư mục để bảo toàn cấu trúc import tương đối (./service)
            sandboxTestPath = path.join(
              refDir,
              `.temp_autofix_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.test.ts`
            );
            fs.writeFileSync(sandboxTestPath, currentTestCode, 'utf-8');
          } else {
            // Tạo sandbox tạm biệt lập và copy service vào sandbox
            isIsolatedDir = true;
            tempSandboxDir = path.resolve(process.cwd(), `.autofix_sandbox_${Date.now()}`);
            fs.mkdirSync(tempSandboxDir, { recursive: true });
            sandboxTestPath = path.join(tempSandboxDir, 'autofix.test.ts');
            fs.writeFileSync(sandboxTestPath, currentTestCode, 'utf-8');

            const serviceFileName = request.serviceFilePath ? path.basename(request.serviceFilePath) : 'service.ts';
            const serviceDest = path.join(tempSandboxDir, serviceFileName);
            if (request.serviceFilePath && fs.existsSync(request.serviceFilePath)) {
              fs.copyFileSync(request.serviceFilePath, serviceDest);
            } else if (request.serviceCode) {
              fs.writeFileSync(serviceDest, request.serviceCode, 'utf-8');
            }
          }

          let runResult: TestExecutionSummary;
          try {
            runResult = await this.coverageRunner.executeTest(sandboxTestPath, request.serviceFilePath);
          } finally {
            if (fs.existsSync(sandboxTestPath)) {
              try {
                fs.unlinkSync(sandboxTestPath);
              } catch {}
            }
            if (isIsolatedDir && fs.existsSync(tempSandboxDir)) {
              try {
                fs.rmSync(tempSandboxDir, { recursive: true, force: true });
              } catch {}
            }
          }

          if (runResult.suitePassed) {
            return {
              fixed: true,
              finalTestCode: currentTestCode,
              processedOutput,
              iterations: iter,
              execution: runResult,
              fixHistory,
            };
          } else {
            currentError = runResult.errorMessage || 'Test suite assertions failed during execution';
            continue;
          }
        }

        // Không có runner context, chỉ kiểm tra được syntax
        return {
          fixed: true,
          finalTestCode: currentTestCode,
          processedOutput,
          iterations: iter,
          fixHistory,
        };
      } else {
        currentError = processedOutput.syntaxValidation.errors.join('\n');
      }
    }

    return {
      fixed: false,
      finalTestCode: currentTestCode,
      processedOutput,
      iterations: maxIterations,
      fixHistory,
    };
  }
}
