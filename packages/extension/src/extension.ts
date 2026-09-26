import { ContextAwareSidebarProvider } from './sidebar/sidebar_provider';
import { TestGenerationService } from './services/test_generation_service';
import { ContextAwareCodeLensProvider } from './codelens/test_codelens_provider';
import { RealtimeDocumentWatcher } from './services/realtime_watcher';
import { vscode } from './vscode_shim';

let statusBarItem: any;

export function activate(context: any): void {
  console.log('🚀 Context-Aware Unit Test Generator Extension (Real-time Enabled) is now active!');

  const testGenService = new TestGenerationService();
  const realtimeWatcher = new RealtimeDocumentWatcher(testGenService);
  const codeLensProvider = new ContextAwareCodeLensProvider();

  // 1. Đăng ký Real-time Document Watcher (Auto-gen on save & AST diff check)
  realtimeWatcher.register(context);

  // 2. Đăng ký Inline CodeLens Provider
  if (vscode.languages && vscode.languages.registerCodeLensProvider) {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        [
          { language: 'typescript', scheme: 'file' },
          { language: 'javascript', scheme: 'file' },
        ],
        codeLensProvider
      )
    );
  }

  // 3. Đăng ký Sidebar Provider
  const sidebarProvider = new ContextAwareSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ContextAwareSidebarProvider.viewType,
      sidebarProvider
    )
  );

  // 4. Đăng ký Command chính: Sinh Unit Test từ BA Context (Toàn bộ file)
  const generateTestCommand = vscode.commands.registerCommand(
    'contextAwareTestGen.generateTest',
    async (uri?: any) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document?.uri;

      if (!targetUri) {
        vscode.window.showWarningMessage(
          'Vui lòng mở một file Service (.ts / .js) hoặc chọn từ Explorer để sinh Unit Test!'
        );
        return;
      }

      await testGenService.generateForFile(targetUri, context.extensionUri);
    }
  );

  // 5. Đăng ký Command sinh test cho một Method cụ thể (từ CodeLens)
  const generateTestMethodCommand = vscode.commands.registerCommand(
    'contextAwareTestGen.generateTestForMethod',
    async (uri?: any, methodName?: string) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document?.uri;
      if (!targetUri) return;

      vscode.window.showInformationMessage(
        `⚡ [Real-time AI] Đang sinh test theo ngữ cảnh BA cho phương thức: ${methodName || 'Method'}`
      );
      await testGenService.generateForFile(targetUri, context.extensionUri);
    }
  );

  // 6. Đăng ký Command mở cài đặt Extension
  const openSettingsCommand = vscode.commands.registerCommand(
    'contextAwareTestGen.openSettings',
    () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:utc2-research-team.context-aware-unit-test-generation-extension'
      );
    }
  );

  // 7. Đăng ký Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'contextAwareTestGen.generateTest';
  statusBarItem.text = '$(beaker) AI Test Gen';
  statusBarItem.tooltip = 'Click để sinh Unit Test từ ngữ cảnh BA (Ctrl+Shift+U)';
  statusBarItem.show();

  context.subscriptions.push(
    generateTestCommand,
    generateTestMethodCommand,
    openSettingsCommand,
    statusBarItem
  );
}

export function deactivate(): void {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
