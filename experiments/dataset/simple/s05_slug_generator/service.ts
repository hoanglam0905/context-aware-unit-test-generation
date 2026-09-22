export interface SlugOptions {
  maxLength?: number;
  separator?: string;
  lowercase?: boolean;
}

export class InvalidSlugInputException extends Error {
  constructor(message = 'Input string must contain at least one valid alphanumeric character') {
    super(message);
    this.name = 'InvalidSlugInputException';
  }
}

export class SlugGeneratorService {
  private static readonly VIETNAMESE_MAP: Record<string, string> = {
    'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
    'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
    'ì|í|ị|ỉ|ĩ': 'i',
    'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
    'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
    'ỳ|ý|ỵ|ỷ|ỹ': 'y',
    'đ': 'd',
    'À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ': 'A',
    'È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ': 'E',
    'Ì|Í|Ị|Ỉ|Ĩ': 'I',
    'Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ': 'O',
    'Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ': 'U',
    'Ỳ|Ý|Ỵ|Ỷ|Ỹ': 'Y',
    'Đ': 'D',
  };

  /**
   * Tạo URL slug chuẩn SEO từ chuỗi tiêu đề tiếng Việt hoặc đa ngôn ngữ
   */
  public generate(input: string, options?: SlugOptions): string {
    if (!input || !input.trim()) {
      throw new InvalidSlugInputException('Input string cannot be empty');
    }

    const maxLength = options?.maxLength ?? 80;
    const separator = options?.separator ?? '-';
    const lowercase = options?.lowercase ?? true;

    // 1. Chuyển đổi dấu tiếng Việt
    let str = input;
    for (const [pattern, replacement] of Object.entries(SlugGeneratorService.VIETNAMESE_MAP)) {
      str = str.replace(new RegExp(pattern, 'g'), replacement);
    }

    // 2. Chuyển sang chữ thường nếu được bật
    if (lowercase) {
      str = str.toLowerCase();
    }

    // 3. Loại bỏ ký tự đặc biệt không phải chữ cái, số, hoặc khoảng trắng
    str = str.replace(/[^a-zA-Z0-9\s-]/g, '');

    // 4. Thay thế khoảng trắng và dấu gạch ngang liên tiếp thành 1 separator
    str = str.replace(/[\s-]+/g, separator);

    // 5. Cắt bỏ separator ở đầu và cuối chuỗi
    const escapeSep = separator.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    str = str.replace(new RegExp(`^${escapeSep}+|${escapeSep}+$`, 'g'), '');

    if (!str) {
      throw new InvalidSlugInputException();
    }

    // 6. Giới hạn độ dài an toàn theo từ (Word-safe truncation)
    if (str.length > maxLength) {
      const truncated = str.substring(0, maxLength);
      const lastSepIndex = truncated.lastIndexOf(separator);
      if (lastSepIndex > 0) {
        str = truncated.substring(0, lastSepIndex);
      } else {
        str = truncated;
      }
      str = str.replace(new RegExp(`${escapeSep}+$`, 'g'), '');
    }

    return str;
  }
}
