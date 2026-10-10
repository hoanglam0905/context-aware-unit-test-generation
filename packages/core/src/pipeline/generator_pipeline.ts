import * as fs from 'fs';
import * as path from 'path';
import { ContextExtractor } from '../extractor/context_extractor';
import { ILLMGateway } from '../llm/types';
import { PromptStrategyFactory } from '../prompts';
import { CoverageRunner } from './coverage_runner';
import { TestPostProcessor } from './post_processor';
import { PipelineOptions, PipelineResult } from './types';

export class CoreGeneratorPipeline {
  private extractor: ContextExtractor;
  private postProcessor: TestPostProcessor;
  private coverageRunner: CoverageRunner;

  constructor(
    private readonly llmGateway: ILLMGateway,
    extractor?: ContextExtractor,
    postProcessor?: TestPostProcessor,
    coverageRunner?: CoverageRunner
  ) {
    this.extractor = extractor || new ContextExtractor();
    this.postProcessor = postProcessor || new TestPostProcessor();
    this.coverageRunner = coverageRunner || new CoverageRunner();
  }

  /**
   * Chạy toàn bộ quy trình E2E từ Service/BA doc đến Unit Test Code và đo Coverage
   */
  public async execute(options: PipelineOptions): Promise<PipelineResult> {
    const startTime = Date.now();

    // 1. Trích xuất ngữ cảnh AST mã nguồn và tài liệu BA
    const context = this.extractor.extract({
      serviceFilePath: options.serviceFilePath,
      serviceCode: options.serviceCode,
      requirementFilePath: options.requirementFilePath,
      requirementDoc: options.requirementDoc,
      existingTestPatterns: options.existingTestPatterns,
      targetClassName: options.targetClassName,
    });

    // 2. Xây dựng Prompt dựa trên chiến lược (zero-shot, few-shot, cot, hybrid)
    const strategy = PromptStrategyFactory.getStrategy(options.strategyName);
    const promptPayload = strategy.buildPrompt(context.promptContext);

    // 3. Gọi LLM sinh test
    const llmResponse = await this.llmGateway.generate(
      promptPayload.systemPrompt,
      promptPayload.userPrompt
    );

    // 4. Hậu xử lý (Post-processing) mã test: trích xuất code, scenarios, kiểm tra cú pháp
    const processedOutput = this.postProcessor.process(
      llmResponse.rawText || llmResponse.testCode,
      promptPayload.expectedOutputFormat
    );

    // 5. Lưu ra file nếu được chỉ định và không chạy dryRun
    if (options.outputTestFilePath && !options.dryRun) {
      const outputDir = path.dirname(options.outputTestFilePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(options.outputTestFilePath, processedOutput.testCode, 'utf-8');
    }

    // 6. Chạy đo Coverage nếu được bật và mã hợp lệ
    let execution: PipelineResult['execution'];
    if (options.runCoverage && processedOutput.syntaxValidation.isValid) {
      if (options.outputTestFilePath && !options.dryRun && fs.existsSync(options.outputTestFilePath)) {
        execution = await this.coverageRunner.executeTest(options.outputTestFilePath);
      } else {
        // Chạy trong sandbox tạm để không ghi đè file đích trước khi xác nhận
        const tempDir = path.resolve(process.cwd(), '.pipeline_temp');
        fs.mkdirSync(tempDir, { recursive: true });
        const tempTestPath = path.join(tempDir, 'temp.test.ts');
        try {
          fs.writeFileSync(tempTestPath, processedOutput.testCode, 'utf-8');
          execution = await this.coverageRunner.executeTest(tempTestPath);
        } finally {
          if (fs.existsSync(tempDir)) {
            try {
              fs.rmSync(tempDir, { recursive: true, force: true });
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      context,
      llmResponse,
      processedOutput,
      execution,
      durationMs,
      strategy: options.strategyName,
      timestamp: new Date().toISOString(),
    };
  }
}
