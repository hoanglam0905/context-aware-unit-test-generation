import * as vscode from 'vscode';
import { HostToWebviewMessage, WebviewToHostMessage } from '../types';

export class ContextAwareSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'contextAwareTestGen.sidebarView';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data: WebviewToHostMessage) => {
      switch (data.type) {
        case 'GENERATE_TEST': {
          vscode.commands.executeCommand('contextAwareTestGen.generateTest');
          break;
        }
        case 'OPEN_SETTINGS': {
          vscode.commands.executeCommand('contextAwareTestGen.openSettings');
          break;
        }
      }
    });
  }

  public sendMessage(message: HostToWebviewMessage): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  public _getHtmlForWebview(webview: vscode.Webview): string {
    const config = vscode.workspace.getConfiguration('contextAwareTestGen');
    const provider = config.get<string>('modelProvider', 'gemini');
    const strategy = config.get<string>('promptStrategy', 'hybrid');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Context-Aware Test Gen</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 12px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-sideBar-background);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      padding-bottom: 8px;
    }
    .title {
      font-weight: 600;
      font-size: 13px;
    }
    .badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
    }
    .card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 12px;
    }
    .card-title {
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 6px;
      opacity: 0.8;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .btn {
      width: 100%;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      margin-top: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="title">🧪 AI Test Generator</span>
    <span class="badge">v0.1.0</span>
  </div>

  <div class="card">
    <div class="card-title">Cấu hình hiện tại</div>
    <div class="info-row">
      <span>Provider:</span>
      <strong>${provider.toUpperCase()}</strong>
    </div>
    <div class="info-row">
      <span>Strategy:</span>
      <strong>${strategy.toUpperCase()}</strong>
    </div>
  </div>

  <button class="btn" id="generateBtn">
    ⚡ Sinh Unit Test từ BA Context
  </button>

  <button class="btn btn-secondary" id="settingsBtn">
    ⚙️ Cấu hình API / Model
  </button>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('generateBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'GENERATE_TEST' });
    });
    document.getElementById('settingsBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'OPEN_SETTINGS' });
    });
  </script>
</body>
</html>`;
  }
}
