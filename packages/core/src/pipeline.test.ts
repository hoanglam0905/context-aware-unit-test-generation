import * as path from 'path';
import * as fs from 'fs';
import { TestPostProcessor } from './pipeline/post_processor';
import { CoreGeneratorPipeline } from './pipeline/generator_pipeline';
import { CoverageRunner } from './pipeline/coverage_runner';
import { ILLMGateway, LLMResponse } from './llm/types';

describe('Thành viên B - Core Engine (Step 2: Post-processor & E2E Generation Pipeline)', () => {
  const rootDatasetDir = path.resolve(__dirname, '../../../experiments/dataset');

  describe('1. TestPostProcessor', () => {
    let postProcessor: TestPostProcessor;

    beforeEach(() => {
      postProcessor = new TestPostProcessor();
    });

    it('bóc tách code block từ markdown raw text và phát hiện danh sách kịch bản test', () => {
      const rawMarkdown = `
Dưới đây là mã kiểm thử đơn vị:
\`\`\`typescript
import { DiscountCalculatorService } from './service';

describe('DiscountCalculatorService', () => {
  it('should calculate 0% discount for REGULAR tier', () => {
    const service = new DiscountCalculatorService();
    const result = service.calculateDiscount(100000, 'REGULAR');
    expect(result.discountAmount).toBe(0);
  });

  it('should throw InvalidOrderAmountException when amount is zero', () => {
    const service = new DiscountCalculatorService();
    expect(() => service.calculateDiscount(0)).toThrow();
  });
});
\`\`\`
      `;

      const result = postProcessor.process(rawMarkdown, 'CODE_BLOCK');

      expect(result.testCode).toContain("import { DiscountCalculatorService } from './service';");
      expect(result.syntaxValidation.isValid).toBe(true);
      expect(result.syntaxValidation.errors.length).toBe(0);

      expect(result.testScenarios.length).toBe(2);
      expect(result.testScenarios[0].description).toBe('should calculate 0% discount for REGULAR tier');
      expect(result.testScenarios[0].category).toBe('Happy Path');
      expect(result.testScenarios[1].description).toBe('should throw InvalidOrderAmountException when amount is zero');
      expect(result.testScenarios[1].category).toBe('Exception / Boundary');
    });

    it('xử lý định dạng JSON từ HybridPromptStrategy', () => {
      const hybridJson = JSON.stringify({
        testScenarios: [
          {
            id: 'TC_01',
            acceptanceCriteriaRef: 'Scenario 1',
            category: 'Happy Path',
            description: 'Tính giảm giá cho thành viên REGULAR',
          },
        ],
        reasoningSteps: ['Phân tích class DiscountCalculatorService', 'Xác định rule REGULAR = 0%'],
        testCode: '```typescript\nimport { DiscountCalculatorService } from "./service";\n```',
      });

      const result = postProcessor.process(hybridJson, 'JSON');

      expect(result.testCode).toBe('import { DiscountCalculatorService } from "./service";');
      expect(result.testScenarios.length).toBe(1);
      expect(result.testScenarios[0].id).toBe('TC_01');
      expect(result.reasoningSteps).toContain('Phân tích class DiscountCalculatorService');
      expect(result.syntaxValidation.isValid).toBe(true);
    });

    it('phát hiện lỗi cú pháp TypeScript trong mã test không hợp lệ', () => {
      const invalidCode = `
        describe('Invalid Test', () => {
          it('syntax error case', () => {
            const a: number = "not a number"
            const obj = { foo: 
          });
        });
      `;

      const result = postProcessor.validateSyntax(invalidCode);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('2. CoreGeneratorPipeline (E2E Integration)', () => {
    it('chạy trọn vẹn luồng E2E: Context Extractor ➔ Hybrid Prompt ➔ Mock LLM ➔ Post-processor', async () => {
      const mockLLM: ILLMGateway = {
        providerName: 'MockProvider',
        modelName: 'mock-model-v1',
        generate: jest.fn().mockResolvedValue({
          rawText: JSON.stringify({
            testScenarios: [
              {
                id: 'TC_01',
                description: 'Test calculateDiscount for regular',
              },
            ],
            testCode: `
              import { DiscountCalculatorService } from './service';
              describe('DiscountCalculatorService', () => {
                it('Test calculateDiscount for regular', () => {
                  expect(true).toBe(true);
                });
              });
            `,
          }),
          testCode: '',
          durationMs: 120,
        } as LLMResponse),
      };

      const s01ServicePath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/service.ts');
      const s01ReqPath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/requirement.md');
      const tempTestPath = path.join(__dirname, '../../../experiments/results_test_tmp/generated.test.ts');

      const pipeline = new CoreGeneratorPipeline(mockLLM);
      const result = await pipeline.execute({
        serviceFilePath: s01ServicePath,
        requirementFilePath: s01ReqPath,
        targetClassName: 'DiscountCalculatorService',
        strategyName: 'hybrid',
        outputTestFilePath: tempTestPath,
      });

      expect(mockLLM.generate).toHaveBeenCalled();
      expect(result.context.metadata.targetClassName).toBe('DiscountCalculatorService');
      expect(result.strategy).toBe('hybrid');
      expect(result.processedOutput.testCode).toContain('DiscountCalculatorService');
      expect(result.processedOutput.syntaxValidation.isValid).toBe(true);
      expect(fs.existsSync(tempTestPath)).toBe(true);

      // Dọn dẹp file test tạm
      if (fs.existsSync(tempTestPath)) {
        fs.unlinkSync(tempTestPath);
      }
    });
  });

  describe('3. CoverageRunner', () => {
    it('thực thi kiểm thử Jest trên file ground_truth mẫu và trả về chỉ số coverage', async () => {
      const runner = new CoverageRunner({ silent: true });
      const groundTruthPath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/ground_truth.test.ts');

      const result = await runner.executeTest(groundTruthPath);

      expect(result.executed).toBe(true);
      expect(result.suitePassed).toBe(true);
      expect(result.totalTests).toBeGreaterThan(0);
      expect(result.passRate).toBe(100);
      expect(result.coverage).toBeDefined();
    });
  });
});
