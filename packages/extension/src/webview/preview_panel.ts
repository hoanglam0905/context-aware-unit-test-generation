import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { HostToWebviewMessage, WebviewToHostMessage } from '../types';
import { vscode } from '../vscode_shim';
import { filterTestCodeByScenarios, ScenarioItem } from './test_code_filter';

function getNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

export class TestPreviewPanel {
  public static currentPanel: TestPreviewPanel | undefined;
  public static readonly viewType = 'contextAwareTestGen.testPreview';

  private readonly _panel: any;
  private readonly _extensionUri: any;
  private _disposables: any[] = [];
  private _targetOutputPath?: string;
  private _lastTestCode?: string;
  private _lastScenarios?: ScenarioItem[];
  private _onAcceptCallback?: (testCode: string, outputPath: string) => void;
  private _isReadOnly: boolean = false;

  public static createOrShow(extensionUri: any, initialData?: any): TestPreviewPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (TestPreviewPanel.currentPanel) {
      TestPreviewPanel.currentPanel._panel.reveal(column);
      // Reset target path and callback when reusing panel to avoid stale destination leak
      TestPreviewPanel.currentPanel._targetOutputPath = undefined;
      TestPreviewPanel.currentPanel._onAcceptCallback = undefined;
      TestPreviewPanel.currentPanel._isReadOnly = false;
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

  public setTargetOutput(outputPath: string, onAccept?: (testCode: string, outputPath: string) => void): void {
    this._targetOutputPath = outputPath;
    this._onAcceptCallback = onAccept;
    this._isReadOnly = false;
  }

  private constructor(panel: any, extensionUri: any) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    if (this._panel && typeof this._panel.onDidDispose === 'function') {
      this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    if (this._panel && this._panel.webview && typeof this._panel.webview.onDidReceiveMessage === 'function') {
      this._panel.webview.onDidReceiveMessage(
        (message: unknown) => {
          if (!message || typeof message !== 'object') {
            return;
          }

          const msg = message as WebviewToHostMessage;
        if (typeof msg.type !== 'string') {
          return;
        }

        switch (msg.type) {
          case 'ACCEPT_TEST': {
            if (this._isReadOnly) {
              vscode.window.showWarningMessage('Không thể lưu mã trong chế độ chỉ xem (Read-only / Refinement)!');
              return;
            }

            // Bảo vệ an ninh tuyệt đối: CHỈ cho phép lưu vào target path đã được Host ghim trước đó
            // Tuyệt đối không chấp nhận đường dẫn tùy ý gửi lên từ Webview payload
            if (!this._targetOutputPath) {
              vscode.window.showErrorMessage('Thao tác bị từ chối: Chưa có đường dẫn đích an toàn được ghim từ Host!');
              return;
            }

            const outputPath = this._targetOutputPath;

            // Kiểm tra bảo mật đường dẫn output path (ngăn chặn path traversal)
            const normalizedPath = path.normalize(outputPath);
            if (normalizedPath.includes('..') || !path.isAbsolute(normalizedPath)) {
              vscode.window.showErrorMessage('Phát hiện đường dẫn không an toàn (Path Traversal)! Thao tác bị từ chối.');
              return;
            }

            // Ưu tiên mã test từ cache của Host để đảm bảo tính toàn vẹn
            let testCode = this._lastTestCode || msg.payload?.testCode || '';

            // Nếu webview gửi danh sách scenario được chọn, lọc mã test phía host để đảm bảo tính toàn vẹn
            if (msg.payload?.selectedScenarioIds && this._lastScenarios && this._lastTestCode) {
              testCode = filterTestCodeByScenarios(
                this._lastTestCode,
                msg.payload.selectedScenarioIds,
                this._lastScenarios
              );
            }

            if (!testCode || testCode.trim().length === 0) {
              vscode.window.showWarningMessage('Không có mã test hợp lệ để lưu!');
              return;
            }

            if (this._onAcceptCallback) {
              try {
                this._onAcceptCallback(testCode, normalizedPath);
                vscode.window.showInformationMessage('✅ Đã lưu file test thành công vào workspace!');
              } catch (e: any) {
                vscode.window.showErrorMessage(`❌ Lỗi khi lưu file: ${e.message}`);
              }
            } else {
              try {
                const dir = path.dirname(normalizedPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(normalizedPath, testCode, 'utf-8');
                vscode.window.showInformationMessage('✅ Đã lưu file test thành công vào workspace!');
              } catch (e: any) {
                vscode.window.showErrorMessage(`❌ Lỗi lưu file: ${e.message}`);
              }
            }
            break;
          }
          case 'FILTER_SELECTION': {
            if (this._lastTestCode && this._lastScenarios) {
              const filtered = filterTestCodeByScenarios(
                this._lastTestCode,
                msg.payload?.selectedScenarioIds || [],
                this._lastScenarios
              );
              this._panel.webview.postMessage({
                type: 'UPDATE_FILTERED_CODE',
                payload: { testCode: filtered },
              });
            }
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
  }

  public sendData(data: HostToWebviewMessage['payload']): void {
    if (data && typeof data === 'object') {
      if ('isReadOnly' in data) {
        this._isReadOnly = !!(data as any).isReadOnly;
        if (this._isReadOnly) {
          this._targetOutputPath = undefined;
          this._onAcceptCallback = undefined;
        }
      }
      if ('testCode' in data && (data as any).testCode) {
        this._lastTestCode = (data as any).testCode;
      }
      if ('scenarios' in data && Array.isArray((data as any).scenarios)) {
        this._lastScenarios = (data as any).scenarios;
      }
    }
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

  public _getHtmlForWebview(webview: any): string {
    const nonce = getNonce();
    const cspSource = webview.cspSource || '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
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
      gap: 8px;
      margin-bottom: 16px;
    }
    .scenario-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border);
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 12px;
    }
    .scenario-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .category-tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      background: rgba(255,255,255,0.1);
    }
    .scenario-label {
      font-weight: 500;
      cursor: pointer;
    }
    .trace-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding-left: 24px;
      font-size: 11px;
      opacity: 0.85;
    }
    .ac-badge {
      display: inline-block;
      color: var(--vscode-textLink-foreground, #4daafc);
      font-weight: 500;
    }
    .expected-desc {
      display: inline-block;
      color: var(--vscode-descriptionForeground, #8b949e);
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
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      border-top: 1px solid var(--vscode-panel-border);
      padding-top: 14px;
    }
    .selection-summary {
      font-size: 12px;
      opacity: 0.85;
    }
    .buttons {
      display: flex;
      gap: 10px;
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

  <div class="section-title">📋 Kịch Bản Kiểm Thử Đề Xuất (Acceptance Criteria Traceability)</div>
  <div class="scenario-list" id="scenarioList">
    <div style="opacity: 0.7; font-size: 12px;" id="loadingPlaceholder">Đang tải danh sách kịch bản...</div>
  </div>

  <div class="section-title">💻 Mã Unit Test Sinh Ra (Jest / TypeScript)</div>
  <pre class="code-container" id="codeContainer">// Đang phân tích mã nguồn và sinh test...</pre>

  <div class="action-bar">
    <div class="selection-summary" id="selectionSummary">Đã chọn: 0/0 kịch bản</div>
    <div class="buttons">
      <button class="btn btn-secondary" id="rejectBtn">❌ Hủy Bỏ</button>
      <button class="btn" id="acceptBtn">💾 Chấp Nhận & Lưu File Test</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let originalTestCode = '';
    let currentFilteredCode = '';
    let scenariosData = [];

    function updateCodeView() {
      const selectedIds = scenariosData.filter(s => s.selected !== false).map(s => s.id);
      const summary = document.getElementById('selectionSummary');
      if (summary) {
        summary.textContent = 'Đã chọn: ' + selectedIds.length + '/' + scenariosData.length + ' kịch bản';
      }

      if (selectedIds.length === scenariosData.length) {
        currentFilteredCode = originalTestCode;
      } else if (selectedIds.length === 0) {
        currentFilteredCode = '// Không có kịch bản test nào được chọn\\n';
        const codeElem = document.getElementById('codeContainer');
        if (codeElem) {
          codeElem.textContent = currentFilteredCode;
        }
      } else {
        // Gửi yêu cầu lọc tới Host AST Compiler API để đảm bảo 100% khớp với file lưu
        vscode.postMessage({
          type: 'FILTER_SELECTION',
          payload: { selectedScenarioIds: selectedIds }
        });
      }

      const codeElem = document.getElementById('codeContainer');
      if (codeElem && selectedIds.length === scenariosData.length) {
        codeElem.textContent = currentFilteredCode;
      }
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (!message) return;

      if (message.type === 'UPDATE_FILTERED_CODE') {
        if (message.payload && message.payload.testCode !== undefined) {
          currentFilteredCode = message.payload.testCode;
          const codeElem = document.getElementById('codeContainer');
          if (codeElem) {
            codeElem.textContent = currentFilteredCode;
          }
        }
        return;
      }

      if (message.type !== 'SET_PREVIEW_DATA') return;
      const payload = message.payload;
      if (!payload) return;

      if (payload.serviceName) {
        document.getElementById('serviceName').textContent = payload.serviceName;
      }
      if (payload.strategy) {
        document.getElementById('strategyBadge').textContent = payload.strategy.toUpperCase();
      }
      if (payload.testCode) {
        originalTestCode = payload.testCode;
        currentFilteredCode = payload.testCode;
        document.getElementById('codeContainer').textContent = payload.testCode;
      }
      if (payload.coverage) {
        document.getElementById('lineCov').textContent = payload.coverage.lines + '%';
        document.getElementById('branchCov').textContent = payload.coverage.branches + '%';
      }
      if (payload.syntaxValid !== undefined) {
        document.getElementById('syntaxStatus').textContent = payload.syntaxValid ? '✅ Hợp lệ' : '⚠️ Lỗi cú pháp';
      }

      // Điều khiển hiển thị và vô hiệu hóa nút Chấp nhận & Lưu file
      const acceptBtn = document.getElementById('acceptBtn');
      if (acceptBtn) {
        if (payload.isReadOnly) {
          acceptBtn.style.display = 'none';
          acceptBtn.disabled = true;
        } else {
          acceptBtn.style.display = '';
          const isPendingOrError = !payload.syntaxValid ||
            (payload.testCode && (payload.testCode.startsWith('// ⏳') || payload.testCode.startsWith('// ❌')));
          acceptBtn.disabled = !!isPendingOrError;
        }
      }

      // Render Scenarios an toàn qua DOM API (chống XSS)
      const scList = document.getElementById('scenarioList');
      if (payload.scenarios && Array.isArray(payload.scenarios)) {
        scenariosData = payload.scenarios.map(s => ({
          ...s,
          selected: s.selected !== false
        }));

        while (scList.firstChild) {
          scList.removeChild(scList.firstChild);
        }

        scenariosData.forEach((s, idx) => {
          const item = document.createElement('div');
          item.className = 'scenario-item';

          const header = document.createElement('div');
          header.className = 'scenario-header';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = s.selected;
          cb.id = 'sc_' + idx;
          cb.addEventListener('change', () => {
            s.selected = cb.checked;
            updateCodeView();
          });

          const tag = document.createElement('span');
          tag.className = 'category-tag';
          tag.textContent = s.category || 'General';

          const label = document.createElement('label');
          label.className = 'scenario-label';
          label.htmlFor = 'sc_' + idx;
          label.textContent = s.description || ('Scenario ' + (idx + 1));

          header.appendChild(cb);
          header.appendChild(tag);
          header.appendChild(label);
          item.appendChild(header);

          // Traceability visual display
          const traceBox = document.createElement('div');
          traceBox.className = 'trace-info';

          if (s.acceptanceCriteriaRef) {
            const acBadge = document.createElement('span');
            acBadge.className = 'ac-badge';
            acBadge.textContent = '🎯 ' + s.acceptanceCriteriaRef;
            traceBox.appendChild(acBadge);
          }

          if (s.expectedBehavior) {
            const expSpan = document.createElement('span');
            expSpan.className = 'expected-desc';
            expSpan.textContent = '➡️ ' + s.expectedBehavior;
            traceBox.appendChild(expSpan);
          }

          if (traceBox.children.length > 0) {
            item.appendChild(traceBox);
          }

          scList.appendChild(item);
        });

        updateCodeView();
      }
    });

    document.getElementById('acceptBtn').addEventListener('click', () => {
      const selectedIds = scenariosData.filter(s => s.selected).map(s => s.id);
      vscode.postMessage({
        type: 'ACCEPT_TEST',
        payload: {
          testCode: currentFilteredCode,
          selectedScenarioIds: selectedIds
        }
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
