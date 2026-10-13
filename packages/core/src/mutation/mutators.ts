import { Mutant, MutatorType } from './types';

let tsModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  tsModule = require('typescript');
} catch {
  tsModule = null;
}

export class CodeMutatorGenerator {
  /**
   * Sinh danh sách các Mutants từ mã nguồn gốc đảm bảo tính hợp lệ cú pháp TypeScript
   */
  public generateMutants(sourceCode: string, fileName = 'service.ts'): Mutant[] {
    const mutants: Mutant[] = [];
    const lines = sourceCode.split(/\r?\n/);
    const counter = { current: 1 };

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const trimmed = line.trim();

      // Bỏ qua comment, import, interface, type alias, enum và regex literal
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('import ') ||
        trimmed.startsWith('export interface ') ||
        trimmed.startsWith('interface ') ||
        trimmed.startsWith('export type ') ||
        trimmed.startsWith('type ') ||
        trimmed.startsWith('export enum ') ||
        trimmed.startsWith('enum ') ||
        /=\s*\/.*\/[a-z]*;?$/.test(trimmed) ||
        trimmed.length === 0
      ) {
        continue;
      }

      // 1. Conditional Boundary Mutators (<, <=, >, >=)
      // Loại trừ các generic type parameter dạng <Type>, Promise<User>, Map<string, any>
      const codeWithoutGenerics = line.replace(/<[A-Za-z0-9_,\s<>[\]|&?]+>/g, ' ');
      const codeWithoutArrows = codeWithoutGenerics.replace(/=>/g, ' ');
      const isComparisonContext = /\b(if|while|for|return|throw|const|let|var)\b|[?:]/.test(line);

      if (isComparisonContext && /[<>]/.test(codeWithoutArrows)) {
        const boundaryMutations: Array<{ pattern: RegExp; replace: string; desc: string }> = [
          { pattern: />=/g, replace: '>', desc: 'Thay đổi điều kiện biên >= thành >' },
          { pattern: /<=/g, replace: '<', desc: 'Thay đổi điều kiện biên <= thành <' },
          { pattern: /(?<!=)>(?!=)/g, replace: '>=', desc: 'Thay đổi điều kiện biên > thành >=' },
          { pattern: /(?<!=)<(?!=)/g, replace: '<=', desc: 'Thay đổi điều kiện biên < thành <=' },
        ];

        for (const m of boundaryMutations) {
          if (m.pattern.test(line)) {
            // Đảm bảo không thay thế nhầm bên trong type annotation
            const mutatedLine = line.replace(m.pattern, m.replace);
            if (mutatedLine !== line) {
              this.addMutantIfValid(
                mutants,
                counter,
                'CONDITIONAL_BOUNDARY',
                fileName,
                lineIdx + 1,
                line,
                mutatedLine,
                lines,
                lineIdx,
                m.desc
              );
            }
          }
        }
      }

      // 2. Equality Operators (===, !==, ==, !=)
      if (/===|!==|==|!=/.test(line)) {
        const equalityMutations: Array<{ pattern: RegExp; replace: string; desc: string }> = [
          { pattern: /===/g, replace: '!==', desc: 'Đảo ngược toán tử so sánh bằng === thành !==' },
          { pattern: /!==/g, replace: '===', desc: 'Đảo ngược toán tử so sánh !== thành ===' },
        ];

        for (const m of equalityMutations) {
          if (m.pattern.test(line)) {
            const mutatedLine = line.replace(m.pattern, m.replace);
            if (mutatedLine !== line) {
              this.addMutantIfValid(
                mutants,
                counter,
                'EQUALITY_OPERATOR',
                fileName,
                lineIdx + 1,
                line,
                mutatedLine,
                lines,
                lineIdx,
                m.desc
              );
            }
          }
        }
      }

      // 3. Binary Expressions (+, -, *, /)
      if (/[+\-*\/]/.test(line) && !line.includes('//')) {
        // Không biến đổi phép cộng chuỗi để tránh lỗi kiểu TypeScript: 'string - string'
        const hasStringLiteral = /['"`]/.test(line);
        const binaryMutations: Array<{ pattern: RegExp; replace: string; desc: string }> = [
          ...(!hasStringLiteral
            ? [{ pattern: /(?<=\s)\+(?=\s)/g, replace: '-', desc: 'Đổi phép cộng (+) thành phép trừ (-)' }]
            : []),
          { pattern: /(?<=\s)\-(?=\s)/g, replace: '+', desc: 'Đổi phép trừ (-) thành phép cộng (+)' },
          { pattern: /(?<=\s)\*(?=\s)/g, replace: '/', desc: 'Đổi phép nhân (*) thành phép chia (/)' },
        ];

        for (const m of binaryMutations) {
          if (m.pattern.test(line)) {
            const mutatedLine = line.replace(m.pattern, m.replace);
            if (mutatedLine !== line) {
              this.addMutantIfValid(
                mutants,
                counter,
                'BINARY_EXPRESSION',
                fileName,
                lineIdx + 1,
                line,
                mutatedLine,
                lines,
                lineIdx,
                m.desc
              );
            }
          }
        }
      }

      // 4. Boolean Literals (true <-> false)
      if (/\btrue\b|\bfalse\b/.test(line)) {
        let mutatedLine = line;
        let desc = '';
        if (/\btrue\b/.test(line)) {
          mutatedLine = line.replace(/\btrue\b/, 'false');
          desc = 'Đổi hằng số true thành false';
        } else if (/\bfalse\b/.test(line)) {
          mutatedLine = line.replace(/\bfalse\b/, 'true');
          desc = 'Đổi hằng số false thành true';
        }

        if (mutatedLine !== line) {
          this.addMutantIfValid(
            mutants,
            counter,
            'BOOLEAN_LITERAL',
            fileName,
            lineIdx + 1,
            line,
            mutatedLine,
            lines,
            lineIdx,
            desc
          );
        }
      }

      // 5. Numeric Literals
      if (/\b\d+(\.\d+)?\b/.test(line) && !line.includes('//')) {
        // A. Tỉ lệ thập phân (ví dụ: 0.15, 0.20, 0.05)
        const decimalMatch = line.match(/\b0\.(\d+)\b/);
        if (decimalMatch) {
          const val = parseFloat(decimalMatch[0]);
          const mutatedVal = (val > 0.05 ? val - 0.05 : val + 0.05).toFixed(2);
          const mutatedLine = line.replace(decimalMatch[0], mutatedVal);
          if (mutatedLine !== line) {
            this.addMutantIfValid(
              mutants,
              counter,
              'NUMERIC_LITERAL',
              fileName,
              lineIdx + 1,
              line,
              mutatedLine,
              lines,
              lineIdx,
              `Thay đổi tỉ lệ thập phân ${decimalMatch[0]} thành ${mutatedVal}`
            );
          }
        }

        // B. Hằng số ngưỡng số nguyên (ví dụ: 500000, 1000000, 10000)
        const largeIntMatch = line.match(/\b([1-9]\d{3,})\b/);
        if (largeIntMatch) {
          const val = parseInt(largeIntMatch[0], 10);
          const mutatedVal = String(Math.floor(val / 2));
          const mutatedLine = line.replace(largeIntMatch[0], mutatedVal);
          if (mutatedLine !== line) {
            this.addMutantIfValid(
              mutants,
              counter,
              'NUMERIC_LITERAL',
              fileName,
              lineIdx + 1,
              line,
              mutatedLine,
              lines,
              lineIdx,
              `Thay đổi ngưỡng số học ${largeIntMatch[0]} thành ${mutatedVal}`
            );
          }
        }
      }
    }

    return mutants;
  }

  private addMutantIfValid(
    mutants: Mutant[],
    counter: { current: number },
    mutatorType: MutatorType,
    fileName: string,
    lineNumber: number,
    originalCode: string,
    mutatedCode: string,
    allLines: string[],
    lineIdx: number,
    description: string
  ): void {
    const copy = [...allLines];
    copy[lineIdx] = mutatedCode;
    const mutatedFileContent = copy.join('\n');

    // Xác thực cú pháp TypeScript tự động qua Compiler API transpileModule
    if (!this.isValidSyntax(mutatedFileContent)) {
      return;
    }

    mutants.push({
      id: `MUT_${String(counter.current++).padStart(3, '0')}`,
      mutatorType,
      fileName,
      lineNumber,
      originalCode: originalCode.trim(),
      mutatedCode: mutatedCode.trim(),
      mutatedFileContent,
      description,
    });
  }

  public isValidSyntax(code: string): boolean {
    if (!tsModule) return true;
    try {
      const result = tsModule.transpileModule(code, {
        compilerOptions: {
          module: tsModule.ModuleKind.CommonJS,
          target: tsModule.ScriptTarget.ES2020,
          noEmitOnError: false,
        },
        reportDiagnostics: true,
      });

      if (result.diagnostics && result.diagnostics.length > 0) {
        return !result.diagnostics.some((d: any) => d.category === tsModule.DiagnosticCategory.Error);
      }
      return true;
    } catch {
      return false;
    }
  }
}
