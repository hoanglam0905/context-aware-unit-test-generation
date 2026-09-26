import { UniversalCodeParser } from '../../../core/src/extractor/universal_ast_parser';
import { LanguageDetector } from '../../../core/src/extractor/language_detector';
import { vscode } from '../vscode_shim';

export class ContextAwareCodeLensProvider {
  private universalParser: UniversalCodeParser;

  constructor() {
    this.universalParser = new UniversalCodeParser();
  }

  /**
   * Cung cấp các dòng CodeLens tương tác phía trên từng Class và Method trong file đa ngôn ngữ
   */
  public provideCodeLenses(document: any, _token: any): any[] {
    const config = vscode.workspace.getConfiguration('contextAwareTestGen');
    const isEnabled = config.get('enableCodeLens', true);
    if (!isEnabled) return [];

    const text = document.getText ? document.getText() : '';
    const fileName = document.fileName || 'service.ts';
    const langInfo = LanguageDetector.detectLanguage(fileName);
    const codeLenses: any[] = [];

    try {
      const codeContext = this.universalParser.parse(text, fileName);

      // 1. CodeLens cho từng Class / Struct
      for (const cls of codeContext.classes) {
        const lineIdx = this.findLineIndex(text, cls.name);
        if (lineIdx >= 0) {
          codeLenses.push({
            range: {
              start: { line: lineIdx, character: 0 },
              end: { line: lineIdx, character: 0 },
            },
            isResolved: true,
            command: {
              title: `✨ [${langInfo.defaultTestFramework}] Sinh Unit Test cho: ${cls.name}`,
              command: 'contextAwareTestGen.generateTest',
              arguments: [document.uri],
            },
          });
        }

        // 2. CodeLens cho từng Method trong Class
        for (const method of cls.methods) {
          if (method.visibility === 'public') {
            const methodLineIdx = this.findLineIndex(text, method.name);
            if (methodLineIdx >= 0) {
              codeLenses.push({
                range: {
                  start: { line: methodLineIdx, character: 0 },
                  end: { line: methodLineIdx, character: 0 },
                },
                isResolved: true,
                command: {
                  title: `⚡ [${langInfo.defaultTestFramework}] Sinh test BA cho: ${method.name}()`,
                  command: 'contextAwareTestGen.generateTestForMethod',
                  arguments: [document.uri, method.name],
                },
              });
            }
          }
        }
      }

      // 3. CodeLens cho Standalone Functions (Python / Go / JS)
      for (const func of codeContext.functions) {
        const funcLineIdx = this.findLineIndex(text, func.name);
        if (funcLineIdx >= 0) {
          codeLenses.push({
            range: {
              start: { line: funcLineIdx, character: 0 },
              end: { line: funcLineIdx, character: 0 },
            },
            isResolved: true,
            command: {
              title: `⚡ [${langInfo.defaultTestFramework}] Sinh test BA cho hàm: ${func.name}()`,
              command: 'contextAwareTestGen.generateTestForMethod',
              arguments: [document.uri, func.name],
            },
          });
        }
      }
    } catch {
      // Ignore parsing errors during typing
    }

    return codeLenses;
  }

  private findLineIndex(fullText: string, searchSubstring: string): number {
    const lines = fullText.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchSubstring)) {
        return i;
      }
    }
    return -1;
  }
}
