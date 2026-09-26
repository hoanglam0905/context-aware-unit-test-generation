import * as path from 'path';
import * as fs from 'fs';
import { CoreGeneratorPipeline } from '../../../core/src/pipeline/generator_pipeline';
import { PipelineResult } from '../../../core/src/pipeline/types';
import { ConfigurationManager } from './config_manager';
import { RequirementFinder } from './requirement_finder';
import { AutoFixEngine } from './auto_fix_engine';
import { ExtensionMetricsCollector } from './metrics_collector';
import { TestPreviewPanel } from '../webview/preview_panel';
import { vscode } from '../vscode_shim';

export class TestGenerationService {
  private configManager: ConfigurationManager;
  private metricsCollector: ExtensionMetricsCollector;

  constructor() {
    this.configManager = ConfigurationManager.getInstance();
    this.metricsCollector = ExtensionMetricsCollector.getInstance();
  }

  /**
   * Thực hiện luồng sinh Unit Test từ file Service và hiển thị kết quả lên Preview Panel (có kèm Auto-Fix và Metrics)
   */
  public async generateForFile(serviceUri: any, extensionUri: any): Promise<PipelineResult | undefined> {
    const startTime = Date.now();
    const serviceFilePath = serviceUri.fsPath;
    const serviceFileName = path.basename(serviceFilePath, path.extname(serviceFilePath));
    const requirementFilePath = RequirementFinder.findRequirementFile(serviceFilePath);

    const config = this.configManager.getConfiguration();
    const llmGateway = this.configManager.createLLMGateway();
    const pipeline = new CoreGeneratorPipeline(llmGateway);
    const autoFixEngine = new AutoFixEngine(llmGateway);

    // Mở preview panel ở trạng thái Loading
    const panel = TestPreviewPanel.createOrShow(extensionUri, {
      serviceName: serviceFileName,
      strategy: config.promptStrategy,
      scenarios: [],
      testCode: `// ⏳ Đang kết nối tới mô hình ${config.modelProvider.toUpperCase()} (${config.promptStrategy.toUpperCase()})...\n// 📄 Tài liệu BA: ${requirementFilePath ? path.basename(requirementFilePath) : 'Không tìm thấy (Baseline)'}\n// Vui lòng chờ trong giây lát...`,
      syntaxValid: true,
    });

    try {
      const defaultOutputPath = path.join(
        path.dirname(serviceFilePath),
        `${serviceFileName}.test.ts`
      );

      let result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `[Context-Aware] Đang sinh Unit Test cho ${serviceFileName}...`,
          cancellable: false,
        },
        async () => {
          return await pipeline.execute({
            serviceFilePath,
            requirementFilePath,
            strategyName: config.promptStrategy,
            outputTestFilePath: defaultOutputPath,
            runCoverage: config.autoRunCoverage,
          });
        }
      );

      let autoFixAttempts = 0;

      // 🔄 Tự động kích hoạt Auto-Fix nếu phát hiện lỗi cú pháp
      if (!result.processedOutput.syntaxValidation.isValid) {
        vscode.window.showWarningMessage('⚠️ Phát hiện lỗi cú pháp trong mã test sinh ra. Đang kích hoạt Self-Reflection Auto-Fix...');
        
        const serviceCode = fs.existsSync(serviceFilePath) ? fs.readFileSync(serviceFilePath, 'utf-8') : '';
        const requirementDoc = requirementFilePath && fs.existsSync(requirementFilePath) ? fs.readFileSync(requirementFilePath, 'utf-8') : undefined;

        const fixResult = await autoFixEngine.autoFix({
          serviceCode,
          requirementDoc,
          failedTestCode: result.processedOutput.testCode,
          errorMessage: result.processedOutput.syntaxValidation.errors.join('\n'),
          testFilePath: defaultOutputPath,
          maxIterations: 2,
        });

        autoFixAttempts = fixResult.iterations;
        if (fixResult.fixed) {
          result.processedOutput = fixResult.processedOutput;
          vscode.window.showInformationMessage(`✅ Auto-Fix thành công sau ${fixResult.iterations} lần lặp!`);
        }
      }

      // Cập nhật dữ liệu thật lên Webview Panel
      panel.sendData({
        serviceName: serviceFileName,
        strategy: config.promptStrategy,
        scenarios: result.processedOutput.testScenarios.map((s: any) => ({
          id: s.id,
          description: s.description,
          category: s.category,
          selected: true,
        })),
        testCode: result.processedOutput.testCode,
        coverage: result.execution?.coverage
          ? {
              lines: result.execution.coverage.lines,
              branches: result.execution.coverage.branches,
            }
          : undefined,
        syntaxValid: result.processedOutput.syntaxValidation.isValid,
      });

      const totalLatency = Date.now() - startTime;

      // Ghi nhận chỉ số thực nghiệm
      this.metricsCollector.recordMetric({
        serviceName: serviceFileName,
        provider: config.modelProvider,
        strategy: config.promptStrategy,
        latencyMs: totalLatency,
        tokens: result.llmResponse.usage,
        scenariosCount: result.processedOutput.testScenarios.length,
        autoFixAttempts,
        success: result.processedOutput.syntaxValidation.isValid,
      });

      vscode.window.showInformationMessage(
        `✅ Đã sinh thành công ${result.processedOutput.testScenarios.length} kịch bản test cho ${serviceFileName} (${totalLatency}ms)!`
      );

      return result;
    } catch (err: any) {
      vscode.window.showErrorMessage(`❌ Lỗi khi sinh Unit Test: ${err.message}`);
      panel.sendData({
        serviceName: serviceFileName,
        strategy: config.promptStrategy,
        scenarios: [],
        testCode: `// ❌ Gặp lỗi: ${err.message}`,
        syntaxValid: false,
      });
      return undefined;
    }
  }

  /**
   * Lưu file test sau khi người dùng xác nhận
   */
  public saveTestFile(serviceFilePath: string, testCode: string): string {
    const serviceDir = path.dirname(serviceFilePath);
    const serviceBase = path.basename(serviceFilePath, path.extname(serviceFilePath));
    const outputPath = path.join(serviceDir, `${serviceBase}.test.ts`);

    fs.writeFileSync(outputPath, testCode, 'utf-8');
    return outputPath;
  }
}
