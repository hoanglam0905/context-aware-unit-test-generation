import * as path from 'path';

export interface SupportedLanguageInfo {
  id: 'typescript' | 'javascript' | 'python' | 'java' | 'csharp' | 'go' | 'php' | 'cpp';
  name: string;
  extensions: string[];
  defaultTestFramework: string;
  testFileNamingPattern: (baseName: string) => string;
  codeBlockLang: string;
}

export class LanguageDetector {
  private static readonly LANGUAGES: SupportedLanguageInfo[] = [
    {
      id: 'typescript',
      name: 'TypeScript',
      extensions: ['.ts', '.tsx'],
      defaultTestFramework: 'Jest',
      testFileNamingPattern: (b) => `${b}.test.ts`,
      codeBlockLang: 'typescript',
    },
    {
      id: 'javascript',
      name: 'JavaScript',
      extensions: ['.js', '.jsx', '.mjs'],
      defaultTestFramework: 'Jest',
      testFileNamingPattern: (b) => `${b}.test.js`,
      codeBlockLang: 'javascript',
    },
    {
      id: 'python',
      name: 'Python',
      extensions: ['.py'],
      defaultTestFramework: 'pytest',
      testFileNamingPattern: (b) => (b.startsWith('test_') ? `${b}.py` : `test_${b}.py`),
      codeBlockLang: 'python',
    },
    {
      id: 'java',
      name: 'Java',
      extensions: ['.java'],
      defaultTestFramework: 'JUnit 5',
      testFileNamingPattern: (b) => (b.endsWith('Test') ? `${b}.java` : `${b}Test.java`),
      codeBlockLang: 'java',
    },
    {
      id: 'csharp',
      name: 'C#',
      extensions: ['.cs'],
      defaultTestFramework: 'xUnit',
      testFileNamingPattern: (b) => (b.endsWith('Tests') ? `${b}.cs` : `${b}Tests.cs`),
      codeBlockLang: 'csharp',
    },
    {
      id: 'go',
      name: 'Go',
      extensions: ['.go'],
      defaultTestFramework: 'testing',
      testFileNamingPattern: (b) => (b.endsWith('_test') ? `${b}.go` : `${b}_test.go`),
      codeBlockLang: 'go',
    },
    {
      id: 'php',
      name: 'PHP',
      extensions: ['.php'],
      defaultTestFramework: 'PHPUnit',
      testFileNamingPattern: (b) => (b.endsWith('Test') ? `${b}.php` : `${b}Test.php`),
      codeBlockLang: 'php',
    },
    {
      id: 'cpp',
      name: 'C++',
      extensions: ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
      defaultTestFramework: 'Google Test (gtest)',
      testFileNamingPattern: (b) => `${b}_test.cpp`,
      codeBlockLang: 'cpp',
    },
  ];

  /**
   * Phát hiện ngôn ngữ lập trình dựa trên đường dẫn file hoặc tên file
   */
  public static detectLanguage(filePath: string): SupportedLanguageInfo {
    const ext = path.extname(filePath).toLowerCase();
    const query = filePath.toLowerCase();

    for (const lang of this.LANGUAGES) {
      if (lang.extensions.includes(ext) || lang.id === query || lang.name.toLowerCase() === query) {
        return lang;
      }
    }

    // Default fallback
    return this.LANGUAGES[0];
  }

  /**
   * Lấy framework kiểm thử mặc định theo ngôn ngữ hoặc file
   */
  public static getDefaultTestFramework(langOrPath: string): string {
    const lang = this.detectLanguage(langOrPath);
    return lang.defaultTestFramework;
  }

  /**
   * Tính toán đường dẫn file test tương ứng cho file nguồn bất kỳ
   */
  public static computeTestFilePath(sourceFilePath: string): string {
    const dir = path.dirname(sourceFilePath);
    const ext = path.extname(sourceFilePath);
    const baseName = path.basename(sourceFilePath, ext);
    const langInfo = this.detectLanguage(sourceFilePath);

    const testFileName = langInfo.testFileNamingPattern(baseName);
    return path.join(dir, testFileName);
  }

  /**
   * Lấy danh sách tất cả các đuôi file hỗ trợ
   */
  public static getAllSupportedExtensions(): string[] {
    return this.LANGUAGES.flatMap((l) => l.extensions);
  }
}
