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

    // 5. Lưu ra file nếu được chỉ định
    if (options.outputTestFilePath) {
      const outputDir = path.dirname(options.outputTestFilePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(options.outputTestFilePath, processedOutput.testCode, 'utf-8');
    }

    // 6. Chạy đo Coverage nếu được bật và mã hợp lệ
    let execution: PipelineResult['execution'];
    if (options.runCoverage && options.outputTestFilePath && processedOutput.syntaxValidation.isValid) {
      execution = await this.coverageRunner.executeTest(options.outputTestFilePath);
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
