import { TypeScriptASTParser } from '../../../core/src/extractor/ast_parser';
import { vscode } from '../vscode_shim';

export class ContextAwareCodeLensProvider {
  private astParser: TypeScriptASTParser;
  private _onDidChangeCodeLenses: any;

  constructor() {
    this.astParser = new TypeScriptASTParser();
  }

  /**
   * Cung cấp các dòng CodeLens tương tác phía trên từng Class và Method trong file
   */
  public provideCodeLenses(document: any, _token: any): any[] {
    const config = vscode.workspace.getConfiguration('contextAwareTestGen');
    const isEnabled = config.get('enableCodeLens', true);
    if (!isEnabled) return [];

    const text = document.getText();
    const fileName = document.fileName || 'service.ts';
    const codeLenses: any[] = [];

    try {
      const codeContext = this.astParser.parseSource(text, fileName);

      // 1. CodeLens cho từng Class
      for (const cls of codeContext.classes) {
        const lineIdx = this.findLineIndex(text, `class ${cls.name}`);
        if (lineIdx >= 0) {
          codeLenses.push({
            range: {
              start: { line: lineIdx, character: 0 },
              end: { line: lineIdx, character: 0 },
            },
            isResolved: true,
            command: {
              title: `✨ [AI Test Gen] Sinh Unit Test cho toàn bộ Class: ${cls.name}`,
              command: 'contextAwareTestGen.generateTest',
              arguments: [document.uri],
            },
          });
        }

        // 2. CodeLens cho từng Method trong Class
        for (const method of cls.methods) {
          if (method.visibility === 'public') {
            const methodLineIdx = this.findLineIndex(text, `${method.name}(`);
            if (methodLineIdx >= 0) {
              codeLenses.push({
                range: {
                  start: { line: methodLineIdx, character: 0 },
                  end: { line: methodLineIdx, character: 0 },
                },
                isResolved: true,
                command: {
                  title: `⚡ [Real-time Test] Sinh test kịch bản BA cho: ${method.name}()`,
                  command: 'contextAwareTestGen.generateTestForMethod',
                  arguments: [document.uri, method.name],
                },
              });
            }
          }
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
