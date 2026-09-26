import { ILLMGateway } from '../../../core/src/llm/types';
import { TestPostProcessor } from '../../../core/src/pipeline/post_processor';
import { CoverageRunner } from '../../../core/src/pipeline/coverage_runner';
import { ProcessedTestOutput } from '../../../core/src/pipeline/types';

export interface AutoFixRequest {
  serviceCode: string;
  requirementDoc?: string;
  failedTestCode: string;
  errorMessage: string;
  testFilePath?: string;
  maxIterations?: number;
}

export interface AutoFixResult {
  fixed: boolean;
  finalTestCode: string;
  processedOutput: ProcessedTestOutput;
  iterations: number;
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
      const systemPrompt = `Bạn là một Chuyên gia Kiểm thử Phần mềm Tự động (Automated QA / Test Repair Expert).
Nhiệm vụ của bạn là phân tích lỗi biên dịch hoặc lỗi assertion của file test và sửa lại mã TypeScript/Jest để kiểm thử pass 100%.
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
        // Nếu có đường dẫn file test và coverage runner, thử chạy lại để verify
        if (request.testFilePath) {
          const runResult = await this.coverageRunner.executeTest(request.testFilePath);
          if (runResult.suitePassed) {
            return {
              fixed: true,
              finalTestCode: currentTestCode,
              processedOutput,
              iterations: iter,
              fixHistory,
            };
          } else {
            currentError = runResult.errorMessage || 'Assertion failed';
            continue;
          }
        }

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
      fixed: processedOutput.syntaxValidation.isValid,
      finalTestCode: currentTestCode,
      processedOutput,
      iterations: maxIterations,
      fixHistory,
    };
  }
}
