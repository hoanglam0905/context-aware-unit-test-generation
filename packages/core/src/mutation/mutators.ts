import { Mutant, MutatorType } from './types';

export class CodeMutatorGenerator {
  /**
   * Sinh danh sách các Mutants từ mã nguồn gốc
   */
  public generateMutants(sourceCode: string, fileName = 'service.ts'): Mutant[] {
    const mutants: Mutant[] = [];
    const lines = sourceCode.split(/\r?\n/);
    let mutantCounter = 1;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const trimmed = line.trim();

      // Bỏ qua comment và import
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('import ') ||
        trimmed.length === 0
      ) {
        continue;
      }

      // 1. Conditional Boundary Mutators (<, <=, >, >=)
      if (/[<>]/.test(line)) {
        const boundaryMutations: Array<{ pattern: RegExp; replace: string; desc: string }> = [
          { pattern: />=/g, replace: '>', desc: 'Thay đổi điều kiện biên >= thành >' },
          { pattern: /<=/g, replace: '<', desc: 'Thay đổi điều kiện biên <= thành <' },
          { pattern: /(?<!=)>(?!=)/g, replace: '>=', desc: 'Thay đổi điều kiện biên > thành >=' },
          { pattern: /(?<!=)<(?!=)/g, replace: '<=', desc: 'Thay đổi điều kiện biên < thành <=' },
        ];

        for (const m of boundaryMutations) {
          if (m.pattern.test(line)) {
            const mutatedLine = line.replace(m.pattern, m.replace);
            if (mutatedLine !== line) {
              mutants.push(
                this.createMutant(
                  `MUT_${String(mutantCounter++).padStart(3, '0')}`,
                  'CONDITIONAL_BOUNDARY',
                  fileName,
                  lineIdx + 1,
                  line,
                  mutatedLine,
                  lines,
                  lineIdx,
                  m.desc
                )
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
              mutants.push(
                this.createMutant(
                  `MUT_${String(mutantCounter++).padStart(3, '0')}`,
                  'EQUALITY_OPERATOR',
                  fileName,
                  lineIdx + 1,
                  line,
                  mutatedLine,
                  lines,
                  lineIdx,
                  m.desc
                )
              );
            }
          }
        }
      }

      // 3. Binary Expressions (+, -, *, /)
      if (/[+\-*\/]/.test(line) && !line.includes('//')) {
        const binaryMutations: Array<{ pattern: RegExp; replace: string; desc: string }> = [
          { pattern: /(?<=\s)\+(?=\s)/g, replace: '-', desc: 'Đổi phép cộng (+) thành phép trừ (-)' },
          { pattern: /(?<=\s)\-(?=\s)/g, replace: '+', desc: 'Đổi phép trừ (-) thành phép cộng (+)' },
          { pattern: /(?<=\s)\*(?=\s)/g, replace: '/', desc: 'Đổi phép nhân (*) thành phép chia (/)' },
        ];

        for (const m of binaryMutations) {
          if (m.pattern.test(line)) {
            const mutatedLine = line.replace(m.pattern, m.replace);
            if (mutatedLine !== line) {
              mutants.push(
                this.createMutant(
                  `MUT_${String(mutantCounter++).padStart(3, '0')}`,
                  'BINARY_EXPRESSION',
                  fileName,
                  lineIdx + 1,
                  line,
                  mutatedLine,
                  lines,
                  lineIdx,
                  m.desc
                )
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
          mutants.push(
            this.createMutant(
              `MUT_${String(mutantCounter++).padStart(3, '0')}`,
              'BOOLEAN_LITERAL',
              fileName,
              lineIdx + 1,
              line,
              mutatedLine,
              lines,
              lineIdx,
              desc
            )
          );
        }
      }

      // 5. Numeric Literals (e.g. 0.15 -> 0.10, 500000 -> 0)
      if (/\b0\.\d+\b|\b\d{4,}\b/.test(line)) {
        if (/0\.15/.test(line)) {
          const mutatedLine = line.replace(/0\.15/, '0.10');
          mutants.push(
            this.createMutant(
              `MUT_${String(mutantCounter++).padStart(3, '0')}`,
              'NUMERIC_LITERAL',
              fileName,
              lineIdx + 1,
              line,
              mutatedLine,
              lines,
              lineIdx,
              'Thay đổi tỉ lệ chiết khấu 0.15 thành 0.10'
            )
          );
        } else if (/500000/.test(line)) {
          const mutatedLine = line.replace(/500000/, '100000');
          mutants.push(
            this.createMutant(
              `MUT_${String(mutantCounter++).padStart(3, '0')}`,
              'NUMERIC_LITERAL',
              fileName,
              lineIdx + 1,
              line,
              mutatedLine,
              lines,
              lineIdx,
              'Thay đổi trần giảm giá tối đa 500000 thành 100000'
            )
          );
        }
      }
    }

    return mutants;
  }

  private createMutant(
    id: string,
    mutatorType: MutatorType,
    fileName: string,
    lineNumber: number,
    originalCode: string,
    mutatedCode: string,
    allLines: string[],
    lineIdx: number,
    description: string
  ): Mutant {
    const copy = [...allLines];
    copy[lineIdx] = mutatedCode;
    const mutatedFileContent = copy.join('\n');

    return {
      id,
      mutatorType,
      fileName,
      lineNumber,
      originalCode: originalCode.trim(),
      mutatedCode: mutatedCode.trim(),
      mutatedFileContent,
      description,
    };
  }
}
