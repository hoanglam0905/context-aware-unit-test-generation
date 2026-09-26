/**
 * Safe wrapper cho VS Code API giúp module chạy an toàn cả trong VS Code Extension Host lẫn Jest Unit Test
 */
let vscodeModule: any;

try {
  vscodeModule = require('vscode');
} catch {
  // Mock khi chạy trong Jest/Node test environment
  vscodeModule = {
    workspace: {
      workspaceFolders: [{ uri: { fsPath: process.cwd() } }],
      getConfiguration: (_section?: string) => ({
        get: (key: string, defaultValue?: any) => defaultValue,
      }),
    },
    window: {
      activeTextEditor: undefined,
      showInformationMessage: (_msg: string) => Promise.resolve(),
      showWarningMessage: (_msg: string) => Promise.resolve(),
      showErrorMessage: (_msg: string) => Promise.resolve(),
      createStatusBarItem: () => ({
        show: () => {},
        dispose: () => {},
      }),
      createWebviewPanel: () => ({
        reveal: () => {},
        dispose: () => {},
        onDidDispose: () => {},
        webview: {
          options: {},
          html: '',
          onDidReceiveMessage: () => {},
          postMessage: () => {},
        },
      }),
      withProgress: async (_options: any, task: any) => task({ report: () => {} }),
    },
    commands: {
      registerCommand: (_id: string, callback: any) => ({
        dispose: () => {},
      }),
      executeCommand: (_cmd: string, ..._args: any[]) => Promise.resolve(),
    },
    Uri: {
      file: (pathStr: string) => ({ fsPath: pathStr, path: pathStr }),
    },
    Range: class {
      constructor(public start: any, public end: any) {}
    },
    Position: class {
      constructor(public line: number, public character: number) {}
    },
    CodeLens: class {
      constructor(public range: any, public command?: any) {}
    },
    ViewColumn: {
      Beside: 2,
    },
    ProgressLocation: {
      Notification: 15,
    },
    StatusBarAlignment: {
      Right: 2,
    },
  };
}

export const vscode = vscodeModule;
