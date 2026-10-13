import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { LanguageDetector } from '../../../core/src/extractor/language_detector';
import { CoreGeneratorPipeline } from '../../../core/src/pipeline/generator_pipeline';
import { PipelineResult } from '../../../core/src/pipeline/types';
import { ConfigurationManager } from './config_manager';
import { RequirementFinder } from './requirement_finder';
import { AutoFixEngine } from './auto_fix_engine';
import { ExtensionMetricsCollector } from './metrics_collector';
import { TestPreviewPanel } from '../webview/preview_panel';
import { vscode } from '../vscode_shim';
import { MutationGuidedRefiner } from '../../../core/src/mutation/mutation_refiner';
import { MutationSummary } from '../../../core/src/mutation/types';

export class TestGenerationService {
  private configManager: ConfigurationManager;
  private metricsCollector: ExtensionMetricsCollector;

  constructor() {
    this.configManager = ConfigurationManager.getInstance();
    this.metricsCollector = ExtensionMetricsCollector.getInstance();
  }

  /**
   * Sinh Unit Test cho một phương thức cụ thể (Method-Level Test Generation)
   */
  public async generateForMethod(
    serviceUri: any,
    extensionUri: any,
    methodName: string,
    className?: string
  ): Promise<PipelineResult | undefined> {
    return this.generateForFile(serviceUri, extensionUri, {
      targetSymbol: methodName,
      targetType: 'method',
      targetClassName: className,
    });
  }

  /**
   * Thực hiện luồng sinh Unit Test từ file Service và hiển thị kết quả lên Preview Panel (có kèm Auto-Fix và Metrics)
   */
  public async generateForFile(
    serviceUri: any,
    extensionUri: any,
    options?: { targetSymbol?: string; targetType?: 'file' | 'method' | 'class'; targetClassName?: string }
  ): Promise<PipelineResult | undefined> {
    const startTime = Date.now();
    const serviceFilePath = serviceUri.fsPath;
    const serviceFileName = path.basename(serviceFilePath, path.extname(serviceFilePath));
    const requirementFilePath = RequirementFinder.findRequirementFile(serviceFilePath);

    const config = this.configManager.getConfiguration();

    // 🔒 Kiểm tra chấp thuận quyền riêng tư (Explicit Privacy Consent) khi dùng Cloud LLM
    const provider = config.modelProvider.toLowerCase();
    const isCloud = ['gemini', 'openai', 'deepseek'].includes(provider);
    if (isCloud) {
      const vsConfig = vscode.workspace.getConfiguration('contextAwareTestGen');
      const consentedProviders: string[] = vsConfig.get('consentedProviders', []) || [];
      const envConsent = (process.env.PRIVACY_CONSENT_ACKNOWLEDGED || '').trim().toLowerCase();
      const isEnvAcknowledged = envConsent === 'true' || envConsent === '1';
      const hasConsented = consentedProviders.includes(provider) || isEnvAcknowledged;

      if (!hasConsented) {
        const choice = await vscode.window.showWarningMessage(
          `🔒 [Quyền riêng tư] Bạn đang cấu hình sử dụng Cloud Provider (${provider.toUpperCase()}). Toàn bộ mã nguồn file "${serviceFileName}" và tài liệu BA sẽ được truyền qua mạng Internet tới API của nhà cung cấp dịch vụ đám mây.\n\nBạn có đồng ý gửi dữ liệu này ra bên ngoài cho nhà cung cấp ${provider.toUpperCase()} không?`,
          { modal: true },
          'Đồng ý & Tiếp tục',
          'Hủy bỏ'
        );

        if (choice !== 'Đồng ý & Tiếp tục') {
          vscode.window.showInformationMessage(`Đã hủy bỏ yêu cầu sinh test do chưa nhận được sự đồng ý gửi dữ liệu tới ${provider.toUpperCase()}.`);
          return;
        }

        if (vsConfig.update) {
          const updated = Array.from(new Set([...consentedProviders, provider]));
          await vsConfig.update('consentedProviders', updated, vscode.ConfigurationTarget?.Global || 1);
          await vsConfig.update('privacyConsentAcknowledged', true, vscode.ConfigurationTarget?.Global || 1);
        }
      }
    }

    const llmGateway = this.configManager.createLLMGateway();
    const pipeline = new CoreGeneratorPipeline(llmGateway);
    const autoFixEngine = new AutoFixEngine(llmGateway);

    const displayTarget = options?.targetSymbol ? `${serviceFileName} -> ${options.targetSymbol}()` : serviceFileName;

    // Mở preview panel ở trạng thái Loading
    const panel = TestPreviewPanel.createOrShow(extensionUri, {
      serviceName: displayTarget,
      strategy: config.promptStrategy,
      scenarios: [],
      testCode: `// ⏳ Đang kết nối tới mô hình ${config.modelProvider.toUpperCase()} (${config.promptStrategy.toUpperCase()})...\n// 🎯 Mục tiêu: ${displayTarget}\n// 📄 Tài liệu BA: ${requirementFilePath ? path.basename(requirementFilePath) : 'Không tìm thấy (Baseline)'}\n// Vui lòng chờ trong giây lát...`,
      syntaxValid: true,
    });

    try {
      const defaultOutputPath = LanguageDetector.computeTestFilePath(serviceFilePath);

      // Thiết lập callback lưu file thực sự khi người dùng bấm ACCEPT_TEST
      panel.setTargetOutput(defaultOutputPath, (testCode) => {
        this.saveTestFile(serviceFilePath, testCode);
      });

      let result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `[Context-Aware] Đang sinh Unit Test cho ${displayTarget}...`,
          cancellable: false,
        },
        async () => {
          return await pipeline.execute({
            serviceFilePath,
            requirementFilePath,
            strategyName: config.promptStrategy,
            outputTestFilePath: defaultOutputPath,
            runCoverage: config.autoRunCoverage,
            targetMethodName: options?.targetSymbol,
            targetClassName: options?.targetClassName,
            dryRun: true, // Không chạm file đích trên đĩa trước khi người dùng xác nhận
          });
        }
      );

      let autoFixAttempts = 0;

      // 🔄 Tự động kích hoạt Auto-Fix nếu phát hiện lỗi cú pháp HOẶC lỗi assertion khi chạy
      const hasSyntaxError = !result.processedOutput.syntaxValidation.isValid;
      const hasExecutionFailure = !!(result.execution && !result.execution.suitePassed && result.execution.executed);

      if (hasSyntaxError || hasExecutionFailure) {
        const errorType = hasSyntaxError ? 'cú pháp' : 'thực thi/assertion';
        vscode.window.showWarningMessage(`⚠️ Phát hiện lỗi ${errorType} trong mã test sinh ra. Đang kích hoạt Self-Reflection Auto-Fix...`);
        
        const serviceCode = fs.existsSync(serviceFilePath) ? fs.readFileSync(serviceFilePath, 'utf-8') : '';
        const requirementDoc = requirementFilePath && fs.existsSync(requirementFilePath) ? fs.readFileSync(requirementFilePath, 'utf-8') : undefined;
        const initialError = hasSyntaxError
          ? result.processedOutput.syntaxValidation.errors.join('\n')
          : result.execution?.errorMessage || 'Test suite assertion failed';

        const fixResult = await autoFixEngine.autoFix({
          serviceCode,
          requirementDoc,
          failedTestCode: result.processedOutput.testCode,
          errorMessage: initialError,
          testFilePath: defaultOutputPath,
          serviceFilePath,
          maxIterations: 2,
        });

        autoFixAttempts = fixResult.iterations;
        if (fixResult.fixed) {
          result.processedOutput = fixResult.processedOutput;
          if (fixResult.execution) {
            result.execution = fixResult.execution;
          }
          vscode.window.showInformationMessage(`✅ Auto-Fix thành công sau ${fixResult.iterations} lần lặp!`);
        }
      }

      // Cập nhật dữ liệu thật lên Webview Panel (kèm đầy đủ Traceability AC/BR)
      panel.sendData({
        serviceName: displayTarget,
        strategy: config.promptStrategy,
        scenarios: result.processedOutput.testScenarios.map((s: any) => ({
          id: s.id,
          description: s.description,
          category: s.category,
          acceptanceCriteriaRef: s.acceptanceCriteriaRef,
          expectedBehavior: s.expectedBehavior,
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
      const syntaxValid = result.processedOutput.syntaxValidation.isValid;
      const testExecutionStatus: 'not_run' | 'passed' | 'failed' =
        !result.execution || !result.execution.executed
          ? 'not_run'
          : result.execution.suitePassed
            ? 'passed'
            : 'failed';

      // Thành công khi cú pháp hợp lệ VÀ (nếu có chạy test thì test suite phải pass)
      const isSuccess = syntaxValid && testExecutionStatus !== 'failed';

      // Ghi nhận chỉ số thực nghiệm
      this.metricsCollector.recordMetric({
        serviceName: serviceFileName,
        provider: config.modelProvider,
        strategy: config.promptStrategy,
        latencyMs: totalLatency,
        tokens: result.llmResponse.usage,
        scenariosCount: result.processedOutput.testScenarios.length,
        autoFixAttempts,
        syntaxValid,
        testExecutionStatus,
        success: isSuccess,
      });

      if (testExecutionStatus === 'passed') {
        vscode.window.showInformationMessage(
          `✅ Đã sinh thành công ${result.processedOutput.testScenarios.length} kịch bản test và chạy kiểm thử PASS cho ${serviceFileName} (${totalLatency}ms)!`
        );
      } else if (testExecutionStatus === 'failed') {
        vscode.window.showWarningMessage(
          `⚠️ Đã sinh ${result.processedOutput.testScenarios.length} kịch bản test cho ${serviceFileName} (${totalLatency}ms) nhưng kiểm thử thất bại!`
        );
      } else {
        vscode.window.showInformationMessage(
          `✅ Đã sinh thành công ${result.processedOutput.testScenarios.length} kịch bản test cho ${serviceFileName} (${totalLatency}ms, chưa chạy kiểm thử)!`
        );
      }

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
    const outputPath = LanguageDetector.computeTestFilePath(serviceFilePath);
    fs.writeFileSync(outputPath, testCode, 'utf-8');
    return outputPath;
  }

  /**
   * Tinh chỉnh Unit Test bằng phản hồi đột biến (Mutation-Guided Refinement)
   * Phân tích các mutants còn sống sót từ kết quả kiểm thử đột biến thực tế
   * và tạo đề xuất kịch bản test bổ sung để tiêu diệt mutant.
   */
  public async refineWithMutation(
    serviceUri: any,
    extensionUri: any
  ): Promise<any> {
    const serviceFilePath = serviceUri.fsPath;
    const serviceFileName = path.basename(serviceFilePath, path.extname(serviceFilePath));
    const parentDirName = path.basename(path.dirname(serviceFilePath));
    const serviceCode = fs.existsSync(serviceFilePath) ? fs.readFileSync(serviceFilePath, 'utf-8') : '';

    if (!serviceCode) {
      vscode.window.showErrorMessage(`Không tìm thấy mã nguồn tại: ${serviceFilePath}`);
      return undefined;
    }

    // 1. Tải kết quả mutation summary thực tế từ các vị trí hợp lệ
    let summary: MutationSummary | undefined;
    const candidatePaths = [
      path.resolve(__dirname, '../../../../experiments/results/mutation_summary.json'),
      path.resolve(__dirname, '../../../experiments/results/mutation_summary.json'),
      path.resolve(process.cwd(), 'experiments/results/mutation_summary.json'),
    ];

    if (vscode.workspace?.workspaceFolders) {
      for (const folder of vscode.workspace.workspaceFolders) {
        candidatePaths.push(path.join(folder.uri.fsPath, 'experiments/results/mutation_summary.json'));
      }
    }

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const serviceNorm = normalize(serviceFileName);
    const parentNorm = normalize(parentDirName);

    for (const candPath of candidatePaths) {
      if (fs.existsSync(candPath)) {
        try {
          const rawData = JSON.parse(fs.readFileSync(candPath, 'utf-8'));
          const allSummaries: MutationSummary[] = Array.isArray(rawData)
            ? rawData
            : rawData.services
              ? Object.values(rawData.services).map((s: any) => s.groundTruth || s)
              : [];

          const matched = allSummaries.find((s) => {
            const sid = normalize(s?.serviceId || '');
            return sid === serviceNorm || sid === parentNorm;
          });

          if (matched) {
            summary = matched;
            break;
          }
        } catch {
          // Bỏ qua lỗi đọc file không hợp lệ
        }
      }
    }

    // Nếu không tìm thấy kết quả kiểm thử đột biến thật, thông báo rõ ràng cho người dùng
    // TUYỆT ĐỐI KHÔNG BỊA ĐẶT / FABRICATE SỐ LIỆU GIẢ LẬP
    if (!summary) {
      vscode.window.showWarningMessage(
        `Chưa có kết quả kiểm thử đột biến (Mutation Summary) cho dịch vụ "${serviceFileName}". Vui lòng chạy "npm run experiment:mutation" trước để phân tích mutants còn sống sót thật sự!`
      );
      return undefined;
    }

    const fullSourceHash = crypto.createHash('sha256').update(serviceCode).digest('hex');
    const sourceHash = fullSourceHash.slice(0, 12);

    // Kiểm tra độ tươi mới (Freshness check) giữa mã nguồn hiện tại và summary
    const survivedMutants = (summary.results || []).filter((r: any) => r.status === 'SURVIVED');
    const hasDivergence = survivedMutants.some((r: any) => r.mutant?.originalCode && !serviceCode.includes(r.mutant.originalCode));
    if (hasDivergence) {
      vscode.window.showWarningMessage(
        `⚠️ Cảnh báo: Mã nguồn ${serviceFileName} đã thay đổi so với bản chạy mutation testing trước đó! Gợi ý kịch bản có thể không còn khớp hoàn toàn.`
      );
    }

    const refiner = new MutationGuidedRefiner();
    const refinement = refiner.analyzeAndSuggestRefinement(summary, serviceCode);
    (refinement as any).sourceHash = fullSourceHash;
    refinement.feedbackPrompt = `### Source Code SHA-256: ${fullSourceHash}\n` + refinement.feedbackPrompt;

    // 2. Hiển thị kết quả lên Preview Panel ở chế độ CHỈ XEM (READ-ONLY)
    // Ngăn chặn hoàn toàn việc ghi đè prompt phản hồi lên file test thật
    TestPreviewPanel.createOrShow(extensionUri, {
      serviceName: `${serviceFileName} (Mutation Suggestions - Read Only)`,
      strategy: 'mutation-suggestions',
      isReadOnly: true,
      scenarios: refinement.suggestedScenarios.map((s) => ({
        id: s.id,
        description: s.description,
        category: 'Mutation Suggestions',
        acceptanceCriteriaRef: s.targetMutantId,
        expectedBehavior: s.expectedAssertion,
        selected: true,
      })),
      testCode: `// 🧬 MUTATION-GUIDED TEST SUGGESTIONS CHO: ${serviceFileName}\n` +
        `// 🔑 Source Hash (SHA-256): ${sourceHash} (${fullSourceHash})\n` +
        `// 🎯 Mutation Score ban đầu: ${refinement.initialMutationScore.toFixed(1)}%\n` +
        `// ⚠️ Số Mutants còn sống sót (Survived): ${refinement.survivedMutantsCount}\n` +
        `// ℹ️ Chế độ xem phản hồi (Read-Only) - Phân tích & Gợi ý kịch bản, chưa qua vòng sinh lại tự động\n\n` +
        refinement.feedbackPrompt,
      syntaxValid: true,
    });

    vscode.window.showInformationMessage(
      `🧬 Phân tích Mutation-Guided Suggestions hoàn tất: ${refinement.survivedMutantsCount} mutants sống sót đã được tạo gợi ý phản hồi!`
    );

    return refinement;
  }
}
