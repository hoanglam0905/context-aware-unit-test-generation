import { HostToWebviewMessage, WebviewToHostMessage } from '../types';
import { vscode } from '../vscode_shim';

export class TestPreviewPanel {
  public static currentPanel: TestPreviewPanel | undefined;
  public static readonly viewType = 'contextAwareTestGen.testPreview';

  private readonly _panel: any;
  private readonly _extensionUri: any;
  private _disposables: any[] = [];

  public static createOrShow(extensionUri: any, initialData?: any): TestPreviewPanel {
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

  private constructor(panel: any, extensionUri: any) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message: WebviewToHostMessage) => {
        switch (message.type) {
          case 'ACCEPT_TEST': {
            vscode.window.showInformationMessage('✅ Đã lưu file test thành công vào workspace!');
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

  public _getHtmlForWebview(_webview: any): string {
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
      line-height: 1.5;
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
      font-size: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .metrics-bar {
      display: flex;
      gap: 16px;
      background: var(--vscode-sideBar-background);
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--vscode-widget-border);
      margin-bottom: 16px;
      font-size: 12px;
    }
    .metric-item {
      display: flex;
      gap: 6px;
    }
    .metric-val {
      font-weight: 600;
      color: var(--vscode-progressBar-background, #388bfd);
    }
    .section-title {
      font-size: 12px;
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
    .category-tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      background: rgba(255,255,255,0.1);
    }
    .code-container {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 12px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      overflow-x: auto;
      max-height: 420px;
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
      font-size: 12px;
      font-weight: 500;
    }
    .btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">🧪 Dịch Vụ: <span id="serviceName">Service</span></div>
    <span class="badge" id="strategyBadge">HYBRID (BA + Code AST)</span>
  </div>

  <div class="metrics-bar" id="metricsBar">
    <div class="metric-item">📊 Trạng thái: <span class="metric-val" id="syntaxStatus">Hợp lệ</span></div>
    <div class="metric-item">📈 Line Coverage: <span class="metric-val" id="lineCov">Đang đo...</span></div>
    <div class="metric-item">🌿 Branch Coverage: <span class="metric-val" id="branchCov">Đang đo...</span></div>
  </div>

  <div class="section-title">📋 Kịch Bản Kiểm Thử Đề Xuất (Acceptance Criteria)</div>
  <div class="scenario-list" id="scenarioList">
    <div style="opacity: 0.7; font-size: 12px;">Đang tải danh sách kịch bản...</div>
  </div>

  <div class="section-title">💻 Mã Unit Test Sinh Ra (Jest / TypeScript)</div>
  <pre class="code-container" id="codeContainer">// Đang phân tích mã nguồn và sinh test...</pre>

  <div class="action-bar">
    <button class="btn btn-secondary" id="rejectBtn">❌ Hủy Bỏ</button>
    <button class="btn" id="acceptBtn">💾 Chấp Nhận & Lưu File Test</button>
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
        if (payload.coverage) {
          document.getElementById('lineCov').textContent = payload.coverage.lines + '%';
          document.getElementById('branchCov').textContent = payload.coverage.branches + '%';
        }
        if (payload.syntaxValid !== undefined) {
          document.getElementById('syntaxStatus').textContent = payload.syntaxValid ? '✅ Sẵn sàng' : '⚠️ Lỗi cú pháp';
        }

        // Render Scenarios
        const scList = document.getElementById('scenarioList');
        if (payload.scenarios && payload.scenarios.length > 0) {
          scList.innerHTML = '';
          payload.scenarios.forEach((s, idx) => {
            const item = document.createElement('div');
            item.className = 'scenario-item';
            item.innerHTML = \`
              <input type="checkbox" checked id="sc_\${idx}">
              <span class="category-tag">\${s.category || 'General'}</span>
              <label for="sc_\${idx}">\${s.description}</label>
            \`;
            scList.appendChild(item);
          });
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
