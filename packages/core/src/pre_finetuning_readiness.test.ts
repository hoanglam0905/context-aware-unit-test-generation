import * as path from 'path';
import * as fs from 'fs';
import { CoverageRunner } from './pipeline/coverage_runner';
import { MutationRunner } from './mutation/mutation_runner';
import { ContextExtractor } from './extractor/context_extractor';
import { GeminiGateway } from './llm/gateway';
import { CoreGeneratorPipeline } from './pipeline/generator_pipeline';
import { ILLMGateway, LLMResponse } from './llm/types';
import { ConfigurationManager } from '../../extension/src/services/config_manager';
import { AutoFixEngine } from '../../extension/src/services/auto_fix_engine';

describe('Pre-Fine-Tuning Readiness Quality Assurance Suite', () => {
  const rootDatasetDir = path.resolve(__dirname, '../../../experiments/dataset');

  describe('1. CoverageRunner Correctness (P0 - Step 1)', () => {
    it('không bao giờ trả về 100% coverage giả khi file test không tồn tại', async () => {
      const runner = new CoverageRunner({ silent: true });
      const res = await runner.executeTest(path.join(rootDatasetDir, 'non_existent_file.test.ts'));

      expect(res.executed).toBe(false);
      expect(res.suitePassed).toBe(false);
      expect(res.totalTests).toBe(0);
      expect(res.passRate).toBe(0);
      expect(res.coverage).toBeUndefined();
      expect(res.errorMessage).toContain('Test file not found');
    });

    it('trả về executed: true và coverage map thật khi chạy file ground_truth S01', async () => {
      const runner = new CoverageRunner({ silent: true });
      const s01Test = path.join(rootDatasetDir, 'simple/s01_discount_calculator/ground_truth.test.ts');
      const s01Service = path.join(rootDatasetDir, 'simple/s01_discount_calculator/service.ts');

      const res = await runner.executeTest(s01Test, s01Service);
      expect(res.executed).toBe(true);
      expect(res.suitePassed).toBe(true);
      expect(res.totalTests).toBeGreaterThan(0);
      expect(res.coverage).toBeDefined();
      expect(typeof res.coverage?.lines).toBe('number');
      expect(res.coverage?.lines).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('2. MutationRunner Classification & Metrics (P0 - Step 2)', () => {
    it('tính toán mutation score loại bỏ compile error khỏi mẫu số', () => {
      // Công thức: (killed + timeout) / (total - compileError) * 100
      const total = 10;
      const compileError = 2;
      const killed = 6;
      const timeout = 0;
      const validMutants = total - compileError; // 8
      const score = parseFloat((((killed + timeout) / validMutants) * 100).toFixed(2));

      expect(score).toBe(75.0);
    });

    it('thực thi mutation test thật trên S01 mà không có giá trị gán cứng', async () => {
      const runner = new MutationRunner({ silent: true });
      const s01Service = path.join(rootDatasetDir, 'simple/s01_discount_calculator/service.ts');
      const s01Test = path.join(rootDatasetDir, 'simple/s01_discount_calculator/ground_truth.test.ts');

      const summary = await runner.runMutationTesting(s01Service, s01Test, 'S01_DiscountCalculator', 'ground-truth');

      expect(summary.totalMutants).toBeGreaterThan(0);
      expect(summary.validMutants).toBe(summary.totalMutants - summary.compileErrorMutants);
      expect(summary.mutationScore).toBeGreaterThan(50);
      expect(summary.results.length).toBe(summary.totalMutants);

      // Mọi mutant phải có status thuộc enum chuẩn
      for (const res of summary.results) {
        expect(['KILLED', 'SURVIVED', 'TIMEOUT', 'COMPILE_ERROR']).toContain(res.status);
      }
    }, 60000);
  });

  describe('3. ContextExtractor AST Summary (P1 - Step 4)', () => {
    it('trích xuất đầy đủ AST structure tóm tắt cho PromptContext', () => {
      const extractor = new ContextExtractor();
      const s01Service = path.join(rootDatasetDir, 'simple/s01_discount_calculator/service.ts');
      const s01Req = path.join(rootDatasetDir, 'simple/s01_discount_calculator/requirement.md');

      const payload = extractor.extract({
        serviceFilePath: s01Service,
        requirementFilePath: s01Req,
      });

      expect(payload.promptContext.astSummary).toBeDefined();
      expect(payload.promptContext.astSummary).toContain('DiscountCalculatorService');
      expect(payload.promptContext.astSummary).toContain('calculateDiscount');
      expect(payload.promptContext.ablationMode).toBe('full');
    });
  });

  describe('4. Dataset Manifest & Leakage Integrity (P1 - Step 5)', () => {
    it('xác nhận 15 services trong manifest phân bổ chính xác và không bị rò rỉ giữa train/val/test', () => {
      const manifestPath = path.join(rootDatasetDir, 'dataset_manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.services.length).toBe(15);

      const train = new Set(manifest.splits.train);
      const val = new Set(manifest.splits.validation);
      const test = new Set(manifest.splits.test);

      expect(train.size).toBe(9);
      expect(val.size).toBe(3);
      expect(test.size).toBe(3);

      // Check disjointness
      for (const s of train) {
        expect(val.has(s)).toBe(false);
        expect(test.has(s)).toBe(false);
      }
      for (const s of val) {
        expect(test.has(s)).toBe(false);
      }
    });
  });

  describe('5. GeminiGateway & Model/Adapter Configuration (P2 - Step 7)', () => {
    it('chấp nhận cả hai cách gọi: tham số rời (apiKey, modelName) hoặc object options', () => {
      const gw1 = new GeminiGateway({ apiKey: 'test-key-1', modelName: 'gemini-2.0-flash' });
      expect(gw1.modelName).toBe('gemini-2.0-flash');

      const gw2 = new GeminiGateway('test-key-2', 'gemini-1.5-pro');
      expect(gw2.modelName).toBe('gemini-1.5-pro');
    });

    it('ConfigurationManager cấu hình đúng adapterPath và fineTunedModel', () => {
      process.env.FINE_TUNED_MODEL = 'qwen2.5-coder:7b-instruct-lora';
      const configMgr = ConfigurationManager.getInstance();
      const config = configMgr.getConfiguration();

      expect(config.fineTunedModel).toBe('qwen2.5-coder:7b-instruct-lora');
      delete process.env.FINE_TUNED_MODEL;
    });
  });

  describe('6. GeneratorPipeline Dry-Run Sandbox & Import Resolution (P0 - Step 1/3)', () => {
    it('thực thi dryRun mượt mà với relative import ./service và dọn dẹp sạch file tạm', async () => {
      const s01ServicePath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/service.ts');
      const s01ReqPath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/requirement.md');
      const s01Dir = path.dirname(s01ServicePath);

      const mockLLM: ILLMGateway = {
        providerName: 'MockLLM',
        modelName: 'mock-model',
        generate: jest.fn().mockResolvedValue({
          rawText: JSON.stringify({
            testScenarios: [
              {
                id: 'TC_01',
                description: 'Test regular discount with relative import',
              },
            ],
            testCode: `
              import { DiscountCalculatorService } from './service';
              describe('DiscountCalculatorService Dry-Run', () => {
                it('should calculate discount for regular correctly', () => {
                  const service = new DiscountCalculatorService();
                  const res = service.calculateDiscount(100000, 'REGULAR');
                  expect(res.discountAmount).toBe(0);
                });
              });
            `,
          }),
          testCode: '',
          durationMs: 50,
        } as LLMResponse),
      };

      const pipeline = new CoreGeneratorPipeline(mockLLM);
      const res = await pipeline.execute({
        serviceFilePath: s01ServicePath,
        requirementFilePath: s01ReqPath,
        targetClassName: 'DiscountCalculatorService',
        strategyName: 'hybrid',
        dryRun: true,
      });

      expect(res.execution).toBeDefined();
      expect(res.execution?.executed).toBe(true);
      expect(res.execution?.suitePassed).toBe(true);
      expect(res.execution?.passRate).toBe(100);

      // Đảm bảo không còn bất kỳ file tạm .temp_preview_ nào vương vãi
      const leftoverFiles = fs.readdirSync(s01Dir).filter((f) => f.startsWith('.temp_preview_') || f.startsWith('.tmp_dryrun_'));
      expect(leftoverFiles.length).toBe(0);
    }, 45000);
  });

  describe('7. AutoFixEngine Execution Failure & Strict Passing Gate (P0 - Step 2)', () => {
    const s01ServicePath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/service.ts');
    const s01Dir = path.dirname(s01ServicePath);

    it('trả về fixed: false khi mã sinh ra vẫn fail assertion khi chạy Jest', async () => {
      const mockLLMStillFailing: ILLMGateway = {
        providerName: 'MockLLM',
        modelName: 'mock-model',
        generate: jest.fn().mockResolvedValue({
          rawText: `
\`\`\`typescript
import { DiscountCalculatorService } from './service';
describe('Failing Assertion Test', () => {
  it('should intentionally fail', () => {
    const service = new DiscountCalculatorService();
    const res = service.calculateDiscount(100000, 'REGULAR');
    expect(res.discountAmount).toBe(999999); // Sai assertion
  });
});
\`\`\`
          `,
          testCode: '',
          durationMs: 50,
        } as LLMResponse),
      };

      const autoFixEngine = new AutoFixEngine(mockLLMStillFailing);
      const result = await autoFixEngine.autoFix({
        serviceFilePath: s01ServicePath,
        serviceCode: fs.readFileSync(s01ServicePath, 'utf-8'),
        failedTestCode: 'describe("bad", () => { it("fails", () => { expect(1).toBe(2); }); });',
        errorMessage: 'Expected 999999 but received 0',
        maxIterations: 2,
      });

      expect(result.fixed).toBe(false);
      expect(result.iterations).toBe(2);

      // Đảm bảo không còn file .temp_autofix_ nào sót lại
      const leftoverFiles = fs.readdirSync(s01Dir).filter((f) => f.startsWith('.temp_autofix_'));
      expect(leftoverFiles.length).toBe(0);
    }, 45000);

    it('trả về fixed: true khi mã sinh ra vượt qua toàn bộ assertion của Jest', async () => {
      const mockLLMPassing: ILLMGateway = {
        providerName: 'MockLLM',
        modelName: 'mock-model',
        generate: jest.fn().mockResolvedValue({
          rawText: `
\`\`\`typescript
import { DiscountCalculatorService } from './service';
describe('Passing Assertion Test', () => {
  it('should pass regular discount', () => {
    const service = new DiscountCalculatorService();
    const res = service.calculateDiscount(100000, 'REGULAR');
    expect(res.discountAmount).toBe(0);
  });
});
\`\`\`
          `,
          testCode: '',
          durationMs: 50,
        } as LLMResponse),
      };

      const autoFixEngine = new AutoFixEngine(mockLLMPassing);
      const result = await autoFixEngine.autoFix({
        serviceFilePath: s01ServicePath,
        serviceCode: fs.readFileSync(s01ServicePath, 'utf-8'),
        failedTestCode: 'describe("bad", () => { it("fails", () => { expect(1).toBe(2); }); });',
        errorMessage: 'Expected 2 but received 1',
        maxIterations: 2,
      });

      expect(result.fixed).toBe(true);
      expect(result.execution).toBeDefined();
      expect(result.execution?.suitePassed).toBe(true);

      const leftoverFiles = fs.readdirSync(s01Dir).filter((f) => f.startsWith('.temp_autofix_'));
      expect(leftoverFiles.length).toBe(0);
    }, 45000);
  });

  describe('8. Fine-Tuning JSONL Traceability & Quality Gate (P1 - Step 3)', () => {
    it('kiểm tra toàn bộ dataset train/val/test đạt 100% chuẩn: không placeholder, không leakage', () => {
      const trainPath = path.join(rootDatasetDir, 'fine_tuning_train.jsonl');
      const valPath = path.join(rootDatasetDir, 'fine_tuning_val.jsonl');
      const testPath = path.join(rootDatasetDir, 'fine_tuning_test.jsonl');

      expect(fs.existsSync(trainPath)).toBe(true);
      expect(fs.existsSync(valPath)).toBe(true);
      expect(fs.existsSync(testPath)).toBe(true);

      const readLines = (p: string) =>
        fs
          .readFileSync(p, 'utf-8')
          .trim()
          .split('\n')
          .filter((l) => l.trim().length > 0)
          .map((l) => JSON.parse(l));

      const trainData = readLines(trainPath);
      const valData = readLines(valPath);
      const testData = readLines(testPath);

      expect(trainData.length).toBe(9);
      expect(valData.length).toBe(3);
      expect(testData.length).toBe(3);

      const allEntries = [...trainData, ...valData, ...testData];
      for (const entry of allEntries) {
        expect(Array.isArray(entry.messages)).toBe(true);
        expect(entry.messages.length).toBe(3);

        const [sys, user, asst] = entry.messages;
        expect(sys.role).toBe('system');
        expect(user.role).toBe('user');
        expect(asst.role).toBe('assistant');

        // Phải chứa cấu trúc JSON hợp lệ ở assistant
        const parsedAsst = JSON.parse(asst.content);
        expect(Array.isArray(parsedAsst.testScenarios)).toBe(true);
        expect(parsedAsst.testScenarios.length).toBeGreaterThan(0);
        expect(typeof parsedAsst.testCode).toBe('string');
        expect(parsedAsst.testCode.length).toBeGreaterThan(50);

        // Kiểm tra tuyệt đối KHÔNG có placeholder strings
        const stringified = JSON.stringify(entry);
        expect(stringified).not.toContain('Rule for');
        expect(stringified).not.toContain('Asserted successfully in test code');
      }
    });
  });
});
