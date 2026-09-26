import * as path from 'path';
import * as fs from 'fs';
import { RequirementFinder } from './services/requirement_finder';
import { ConfigurationManager } from './services/config_manager';
import { TestGenerationService } from './services/test_generation_service';

describe('Thành viên C - VS Code Extension (Step 2: Core Engine Integration & Preview Services)', () => {
  const rootDatasetDir = path.resolve(__dirname, '../../../experiments/dataset');

  describe('1. RequirementFinder', () => {
    it('tự động tìm thấy file requirement.md trong cùng thư mục của S01_DiscountCalculator', () => {
      const s01ServicePath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/service.ts');
      const foundPath = RequirementFinder.findRequirementFile(s01ServicePath);

      expect(foundPath).toBeDefined();
      expect(foundPath).toContain('requirement.md');
      expect(fs.existsSync(foundPath!)).toBe(true);
    });

    it('trả về undefined nếu không có file tài liệu BA nào trong thư mục', () => {
      const fakePath = path.join(__dirname, 'non_existent_folder/service.ts');
      const foundPath = RequirementFinder.findRequirementFile(fakePath);
      expect(foundPath).toBeUndefined();
    });
  });

  describe('2. ConfigurationManager', () => {
    it('lấy cấu hình mặc định (Gemini + Hybrid Strategy + autoRunCoverage)', () => {
      const configManager = ConfigurationManager.getInstance();
      const config = configManager.getConfiguration();

      expect(config.modelProvider).toBeDefined();
      expect(config.promptStrategy).toBe('hybrid');
      expect(config.autoRunCoverage).toBe(true);
    });

    it('khởi tạo thành công LLM Gateway từ cấu hình', () => {
      const configManager = ConfigurationManager.getInstance();
      const gateway = configManager.createLLMGateway();

      expect(gateway).toBeDefined();
      expect(gateway.providerName).toBeDefined();
      expect(typeof gateway.generate).toBe('function');
    });
  });

  describe('3. TestGenerationService File Saving', () => {
    it('lưu nội dung mã test vào đúng đường dẫn tương ứng với service', () => {
      const service = new TestGenerationService();
      const dummyServicePath = path.join(__dirname, '../../../experiments/results_test_tmp/sample_service.ts');
      const dummyTestCode = `describe('SampleTest', () => { it('works', () => expect(1).toBe(1)); });`;

      // Tạo thư mục tạm nếu chưa có
      const tmpDir = path.dirname(dummyServicePath);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const savedPath = service.saveTestFile(dummyServicePath, dummyTestCode);

      expect(fs.existsSync(savedPath)).toBe(true);
      const savedContent = fs.readFileSync(savedPath, 'utf-8');
      expect(savedContent).toBe(dummyTestCode);

      // Dọn dẹp file tạm
      if (fs.existsSync(savedPath)) {
        fs.unlinkSync(savedPath);
      }
    });
  });
});
