import * as vscode from 'vscode';
import { HostToWebviewMessage, WebviewToHostMessage } from '../types';

export class TestPreviewPanel {
  public static currentPanel: TestPreviewPanel | undefined;
  public static readonly viewType = 'contextAwareTestGen.testPreview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, initialData?: any): TestPreviewPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (TestPreviewPanel.currentPanel) {
      TestPreviewPanel.currentPanel._panel.reveal(column);
      if (initialData) {
        TestPreviewPanel.currentPanel.sendData(initialData);
      }
      return TestPreviewPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      TestPreviewPanel.viewType,
      '🧪 Preview Unit Test (Context-Aware)',
      column || vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true,
      }
    );

    TestPreviewPanel.currentPanel = new TestPreviewPanel(panel, extensionUri);
    if (initialData) {
      TestPreviewPanel.currentPanel.sendData(initialData);
    }

    return TestPreviewPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message: WebviewToHostMessage) => {
        switch (message.type) {
          case 'ACCEPT_TEST': {
            vscode.window.showInformationMessage('✅ Đã chấp nhận và lưu file test thành công!');
            break;
          }
          case 'REJECT_TEST': {
            this.dispose();
            break;
          }
          case 'OPEN_SETTINGS': {
            vscode.commands.executeCommand('contextAwareTestGen.openSettings');
            break;
          }
        }
      },
      null,
      this._disposables
    );
  }

  public sendData(data: HostToWebviewMessage['payload']): void {
    this._panel.webview.postMessage({
      type: 'SET_PREVIEW_DATA',
      payload: data,
    });
  }

  public dispose(): void {
    TestPreviewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  public _getHtmlForWebview(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Unit Test</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 16px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .title {
      font-size: 16px;
      font-weight: 600;
    }
    .badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      margin-top: 16px;
      margin-bottom: 8px;
      text-transform: uppercase;
      opacity: 0.9;
    }
    .scenario-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }
    .scenario-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
    }
    .code-container {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 12px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      overflow-x: auto;
      max-height: 400px;
      white-space: pre;
    }
    .action-bar {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
      border-top: 1px solid var(--vscode-panel-border);
      padding-top: 14px;
    }
    .btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }
    .btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title" id="serviceHeader">🧪 Sinh Unit Test: <span id="serviceName">DiscountCalculatorService</span></div>
    <span class="badge" id="strategyBadge">HYBRID (BA + Code)</span>
  </div>

  <div class="section-title">📋 Danh Sách Kịch Bản Test (Acceptance Criteria)</div>
  <div class="scenario-list" id="scenarioList">
    <div class="scenario-item">
      <input type="checkbox" checked id="sc1">
      <label for="sc1"><strong>[Happy Path]</strong> Tính giảm giá cho hạng REGULAR = 0%</label>
    </div>
    <div class="scenario-item">
      <input type="checkbox" checked id="sc2">
      <label for="sc2"><strong>[Happy Path]</strong> Tính giảm giá cho hạng GOLD >= 1,000,000 VND</label>
    </div>
    <div class="scenario-item">
      <input type="checkbox" checked id="sc3">
      <label for="sc3"><strong>[Boundary]</strong> Áp dụng trần giảm giá tối đa 500,000 VND</label>
    </div>
    <div class="scenario-item">
      <input type="checkbox" checked id="sc4">
      <label for="sc4"><strong>[Exception]</strong> Ném lỗi InvalidOrderAmountException khi amount <= 0</label>
    </div>
  </div>

  <div class="section-title">💻 Mã Kiểm Thử Sinh Ra (Jest / TypeScript)</div>
  <pre class="code-container" id="codeContainer">// Đang tải mã nguồn kiểm thử...</pre>

  <div class="action-bar">
    <button class="btn btn-secondary" id="rejectBtn">❌ Hủy Bỏ</button>
    <button class="btn" id="acceptBtn">💾 Lưu File Test Vào Workspace</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let currentTestCode = '';

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'SET_PREVIEW_DATA') {
        const payload = message.payload;
        if (payload.serviceName) {
          document.getElementById('serviceName').textContent = payload.serviceName;
        }
        if (payload.strategy) {
          document.getElementById('strategyBadge').textContent = payload.strategy.toUpperCase();
        }
        if (payload.testCode) {
          currentTestCode = payload.testCode;
          document.getElementById('codeContainer').textContent = payload.testCode;
        }
      }
    });

    document.getElementById('acceptBtn').addEventListener('click', () => {
      vscode.postMessage({
        type: 'ACCEPT_TEST',
        payload: { testCode: currentTestCode }
      });
    });

    document.getElementById('rejectBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'REJECT_TEST' });
    });
  </script>
</body>
</html>`;
  }
}
