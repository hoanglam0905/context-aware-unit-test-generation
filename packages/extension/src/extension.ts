import * as vscode from 'vscode';
import { ContextAwareSidebarProvider } from './sidebar/sidebar_provider';
import { TestPreviewPanel } from './webview/preview_panel';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  console.log('🚀 Context-Aware Unit Test Generator Extension is now active!');

  // 1. Đăng ký Sidebar Provider
  const sidebarProvider = new ContextAwareSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ContextAwareSidebarProvider.viewType,
      sidebarProvider
    )
  );

  // 2. Đăng ký Command chính: Sinh Unit Test từ BA Context
  const generateTestCommand = vscode.commands.registerCommand(
    'contextAwareTestGen.generateTest',
    async (uri?: vscode.Uri) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;

      if (!targetUri) {
        vscode.window.showWarningMessage(
          'Vui lòng mở một file Service (.ts / .js) hoặc chọn từ Explorer để sinh Unit Test!'
        );
        return;
      }

      // Mở Preview Panel
      const panel = TestPreviewPanel.createOrShow(context.extensionUri, {
        serviceName: targetUri.path.split('/').pop() || 'Service',
        strategy: 'hybrid',
        scenarios: [],
        testCode: `// Đang phân tích mã nguồn AST và tài liệu BA cho: ${targetUri.fsPath}...\n`,
        syntaxValid: true,
      });

      vscode.window.showInformationMessage(
        `[Context-Aware] Đang trích xuất ngữ cảnh AST & BA cho: ${targetUri.fsPath}`
      );
    }
  );

  // 3. Đăng ký Command mở cài đặt Extension
  const openSettingsCommand = vscode.commands.registerCommand(
    'contextAwareTestGen.openSettings',
    () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:utc2-research-team.context-aware-unit-test-generation-extension'
      );
    }
  );

  // 4. Đăng ký Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'contextAwareTestGen.generateTest';
  statusBarItem.text = '$(beaker) AI Test Gen';
  statusBarItem.tooltip = 'Click để sinh Unit Test từ ngữ cảnh BA';
  statusBarItem.show();

  context.subscriptions.push(
    generateTestCommand,
    openSettingsCommand,
    statusBarItem
  );
}

export function deactivate(): void {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
