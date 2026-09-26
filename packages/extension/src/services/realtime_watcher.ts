import { UniversalCodeParser } from '../../../core/src/extractor/universal_ast_parser';
import { LanguageDetector } from '../../../core/src/extractor/language_detector';
import { TestGenerationService } from './test_generation_service';
import { vscode } from '../vscode_shim';

export class RealtimeDocumentWatcher {
  private universalParser: UniversalCodeParser;
  private lastASTSignatures: Map<string, string> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly testGenService: TestGenerationService) {
    this.universalParser = new UniversalCodeParser();
  }

  /**
   * Đăng ký lắng nghe sự kiện lưu file và chỉnh sửa tài liệu
   */
  public register(context: any): void {
    const onSaveDisposable = vscode.workspace.onDidSaveTextDocument
      ? vscode.workspace.onDidSaveTextDocument((document: any) => {
          this.handleDocumentSaved(document, context.extensionUri);
        })
      : null;

    if (onSaveDisposable) {
      context.subscriptions.push(onSaveDisposable);
    }
  }

  /**
   * Xử lý khi tài liệu bất kỳ ngôn ngữ nào được lưu
   */
  public handleDocumentSaved(document: any, extensionUri: any): void {
    const config = vscode.workspace.getConfiguration('contextAwareTestGen');
    const autoGenOnSave = config.get('autoGenerateOnSave', true);
    if (!autoGenOnSave) return;

    const filePath = document.fileName || document.uri?.fsPath || '';

    // Bỏ qua nếu là file test
    if (
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('_test.') ||
      filePath.includes('Test.') ||
      filePath.includes('Tests.')
    ) {
      return;
    }

    const supportedExts = LanguageDetector.getAllSupportedExtensions();
    const isSupported = supportedExts.some((ext) => filePath.toLowerCase().endsWith(ext));
    if (!isSupported) return;

    const text = document.getText ? document.getText() : '';
    if (!text.trim()) return;

    // Kiểm tra AST Diff
    const currentSignature = this.computeASTSignature(text, filePath);
    const lastSignature = this.lastASTSignatures.get(filePath);

    if (lastSignature && lastSignature === currentSignature) {
      return;
    }

    this.lastASTSignatures.set(filePath, currentSignature);

    // Áp dụng Debounce
    const debounceDelay = config.get('debounceDelayMs', 1500);
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filePath);
      const langInfo = LanguageDetector.detectLanguage(filePath);
      vscode.window.showInformationMessage(
        `⚡ [Real-time ${langInfo.name}] Phát hiện thay đổi trong ${document.fileName?.split(/[\\/]/).pop()}. Đang tự động cập nhật Unit Test (${langInfo.defaultTestFramework})...`
      );
      await this.testGenService.generateForFile(document.uri || { fsPath: filePath }, extensionUri);
    }, debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Tính toán hash tóm tắt cấu trúc AST đa ngôn ngữ
   */
  public computeASTSignature(sourceCode: string, fileName: string): string {
    try {
      const codeContext = this.universalParser.parse(sourceCode, fileName);
      const signatureParts: string[] = [];

      for (const cls of codeContext.classes) {
        signatureParts.push(`class:${cls.name}`);
        for (const m of cls.methods) {
          const params = m.parameters.map((p) => `${p.name}:${p.type}`).join(',');
          signatureParts.push(`method:${m.visibility}:${m.name}(${params}):${m.returnType}`);
        }
      }

      for (const f of codeContext.functions) {
        const params = f.parameters.map((p) => `${p.name}:${p.type}`).join(',');
        signatureParts.push(`func:${f.name}(${params}):${f.returnType}`);
      }

      return signatureParts.join('|');
    } catch {
      return sourceCode.trim();
    }
  }

  public dispose(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.lastASTSignatures.clear();
  }
}
