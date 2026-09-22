import {
  SlugGeneratorService,
  InvalidSlugInputException,
} from './service';

describe('SlugGeneratorService (Ground Truth)', () => {
  let service: SlugGeneratorService;

  beforeEach(() => {
    service = new SlugGeneratorService();
  });

  describe('Validation & Edge Cases', () => {
    it('should throw InvalidSlugInputException when input is empty or whitespace', () => {
      expect(() => service.generate('')).toThrow('Input string cannot be empty');
      expect(() => service.generate('   ')).toThrow(InvalidSlugInputException);
    });

    it('should throw InvalidSlugInputException when input only contains special symbols', () => {
      expect(() => service.generate('@#$%^&*()_+')).toThrow(InvalidSlugInputException);
    });
  });

  describe('Vietnamese Diacritics & Special Character Conversion', () => {
    it('should convert complex Vietnamese accents to clean ASCII slug', () => {
      const input = 'Nghiên Cứu và Phát Triển LLM Cho Kỹ Thuật Phần Mềm!';
      const result = service.generate(input);
      expect(result).toBe('nghien-cuu-va-phat-trien-llm-cho-ky-thuat-phan-mem');
    });

    it('should handle letter Đ and đ correctly', () => {
      const input = 'Đại Học Giao Thông Vận Tải Phân Hiệu UTC2';
      const result = service.generate(input);
      expect(result).toBe('dai-hoc-giao-thong-van-tai-phan-hieu-utc2');
    });

    it('should collapse multiple hyphens and trim edge separators', () => {
      const input = '--- UTC2   --- Sinh Vien --- 2026 ---';
      const result = service.generate(input);
      expect(result).toBe('utc2-sinh-vien-2026');
    });
  });

  describe('Options & Word-Safe Truncation', () => {
    it('should support custom separator like underscore (_)', () => {
      const input = 'Hello World from UTC2';
      const result = service.generate(input, { separator: '_' });
      expect(result).toBe('hello_world_from_utc2');
    });

    it('should perform word-safe truncation when exceeding maxLength', () => {
      const input = 'lap trinh ung dung web voi nextjs va typescript';
      // Truncate at 30 chars -> 'lap-trinh-ung-dung-web-voi' (26 chars)
      const result = service.generate(input, { maxLength: 30 });
      expect(result).toBe('lap-trinh-ung-dung-web-voi');
      expect(result.length).toBeLessThanOrEqual(30);
    });
  });
});
