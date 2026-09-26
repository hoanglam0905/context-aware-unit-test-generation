# Context-Aware Unit Test Generator (VS Code Extension)

> **Automated Unit Test Generation from Source Code & BA Requirements using LLMs**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blueviolet.svg)

---

## 🌟 Key Features

- 🧠 **Context-Aware AST Extraction:** Uses TypeScript Compiler AST API to extract classes, method signatures, parameter types, and dependencies.
- 📄 **BA Requirement Ingestion:** Reads User Stories, Business Rules, and Gherkin Scenarios from Markdown, text, and JSON requirements.
- ⚡ **Interactive Webview Preview:** Filter and toggle test scenarios before saving the test suite to your workspace.
- 🔄 **Self-Reflection Auto-Fix Loop:** Automatically repairs test compilation errors and assertion failures using iterative LLM reflection.
- 📊 **Real-time Coverage & Telemetry:** Measures Line & Branch Coverage immediately using the integrated Jest runner.
- ⌨️ **Quick Keyboard Shortcuts:** Press `Ctrl+Shift+U` (Windows/Linux) or `Cmd+Shift+U` (macOS) to generate tests instantly.

---

## 🚀 Quickstart

1. Open any TypeScript service file (e.g. `service.ts`).
2. Press `Ctrl+Shift+U` or right-click and choose **Context-Aware: Generate Unit Test from BA Context**.
3. Review proposed test scenarios in the Webview Preview Panel.
4. Click **Accept & Save Test File** to generate the working Jest test suite.

---

## ⚙️ Configuration

Open VS Code Settings (`Ctrl+,`) and search for `Context-Aware`:

| Setting | Default | Description |
| :--- | :--- | :--- |
| `contextAwareTestGen.modelProvider` | `gemini` | Choose between `gemini`, `deepseek`, `openai`, `ollama`. |
| `contextAwareTestGen.promptStrategy` | `hybrid` | Choose between `hybrid`, `cot`, `few-shot`, `zero-shot`. |
| `contextAwareTestGen.autoRunCoverage` | `true` | Automatically run Jest coverage after generation. |

---

## 📦 Building from Source

```bash
# Package into .vsix file
npx vsce package
```
