import * as ts from 'typescript';
import { extractCodeBlock, parseHybridJson } from '../llm/gateway';
import { ProcessedTestOutput, SyntaxValidationResult } from './types';

export class TestPostProcessor {
  /**
   * Hậu xử lý văn bản sinh ra từ LLM thành code TypeScript chuẩn hóa và kiểm tra cú pháp
   */
  public process(rawLlmText: string, expectedFormat: 'JSON' | 'CODE_BLOCK' = 'CODE_BLOCK'): ProcessedTestOutput {
    let testCode = '';
    let testScenarios: ProcessedTestOutput['testScenarios'] = [];
    let reasoningSteps: string[] | undefined;

    if (expectedFormat === 'JSON' || (rawLlmText.includes('{') && rawLlmText.includes('testCode'))) {
      const parsed = parseHybridJson(rawLlmText);
      testCode = parsed.testCode;
      testScenarios = parsed.testScenarios || [];
      reasoningSteps = parsed.reasoningSteps;
    } else {
      testCode = extractCodeBlock(rawLlmText);
    }

    // Nếu không có testScenarios từ JSON, thử trích xuất từ testCode (các khối `describe` và `it` / `test`)
    if (testScenarios.length === 0 && testCode) {
      testScenarios = this.extractScenariosFromCode(testCode);
    }

    // Chuẩn hóa mã nguồn (loại bỏ khoảng trắng thừa ở đầu/cuối)
    testCode = this.cleanCode(testCode);

    // Kiểm tra cú pháp qua TypeScript Compiler API
    const syntaxValidation = this.validateSyntax(testCode);

    return {
      testCode,
      testScenarios,
      reasoningSteps,
      syntaxValidation,
      rawText: rawLlmText,
    };
  }

  /**
   * Kiểm tra cú pháp và khả năng chuyển đổi (transpilation) của mã TypeScript
   */
  public validateSyntax(code: string): SyntaxValidationResult {
    if (!code || code.trim().length === 0) {
      return {
        isValid: false,
        errors: ['Empty test code generated'],
      };
    }

    const errors: string[] = [];

    try {
      const transpileResult = ts.transpileModule(code, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          noEmitOnError: false,
        },
        reportDiagnostics: true,
      });

      if (transpileResult.diagnostics && transpileResult.diagnostics.length > 0) {
        for (const diag of transpileResult.diagnostics) {
          if (diag.category === ts.DiagnosticCategory.Error) {
            const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
            errors.push(`TS Error (${diag.code}): ${message}`);
          }
        }
      }
    } catch (err: any) {
      errors.push(`Transpilation exception: ${err.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Trích xuất danh sách kịch bản test case từ các câu lệnh describe/it/test trong file test
   */
  public extractScenariosFromCode(code: string): ProcessedTestOutput['testScenarios'] {
    const scenarios: ProcessedTestOutput['testScenarios'] = [];
    const testRegex = /(?:it|test)\s*\(\s*(['"`])(.*?)\1/g;
    let match: RegExpExecArray | null;
    let idx = 1;

    while ((match = testRegex.exec(code)) !== null) {
      const desc = match[2];
      scenarios.push({
        id: `TC_${String(idx).padStart(2, '0')}`,
        description: desc,
        category: this.guessCategory(desc),
      });
      idx++;
    }

    return scenarios;
  }

  /**
   * Chuẩn hóa mã nguồn: xóa khoảng trống dư thừa, kiểm tra import path
   */
  public cleanCode(code: string): string {
    let cleaned = code.trim();
    // Chuẩn hóa dòng trắng liên tiếp
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned;
  }

  private guessCategory(desc: string): string {
    const lower = desc.toLowerCase();
    if (lower.includes('throw') || lower.includes('error') || lower.includes('invalid') || lower.includes('fail')) {
      return 'Exception / Boundary';
    }
    if (lower.includes('zero') || lower.includes('null') || lower.includes('negative') || lower.includes('empty')) {
      return 'Edge Case';
    }
    return 'Happy Path';
  }
}
