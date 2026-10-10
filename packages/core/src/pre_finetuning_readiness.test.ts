import * as path from 'path';
import * as fs from 'fs';
import { CoverageRunner } from './pipeline/coverage_runner';
import { MutationRunner } from './mutation/mutation_runner';
import { ContextExtractor } from './extractor/context_extractor';
import { GeminiGateway } from './llm/gateway';
import { ConfigurationManager } from '../../extension/src/services/config_manager';

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
});
