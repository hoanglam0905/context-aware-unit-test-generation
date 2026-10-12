import * as path from 'path';
import * as fs from 'fs';
import { AutoFixEngine } from './services/auto_fix_engine';
import { ExtensionMetricsCollector } from './services/metrics_collector';
import { ILLMGateway, LLMResponse } from '../../core/src/llm/types';

describe('Thành viên C - VS Code Extension (Step 3: Self-Reflection Auto-Fix & UX Optimization)', () => {
  describe('1. AutoFixEngine (Reflection Loop)', () => {
    it('tự động sửa lỗi cú pháp test thông qua vòng lặp phản xạ LLM', async () => {
      const mockLLMGateway: ILLMGateway = {
        providerName: 'MockProvider',
        modelName: 'mock-model-repair',
        generate: jest.fn().mockResolvedValue({
          rawText: `
\`\`\`typescript
import { DiscountCalculatorService } from './service';

describe('DiscountCalculatorService', () => {
  it('fixed test case', () => {
    const service = new DiscountCalculatorService();
    expect(service.calculateDiscount(100)).toBeDefined();
  });
});
\`\`\`
          `,
          testCode: '',
          durationMs: 80,
        } as LLMResponse),
      };

      const autoFixEngine = new AutoFixEngine(mockLLMGateway);
      const invalidCode = `
        describe('Faulty Test', () => {
          it('has syntax error', () => {
            const x: number = "broken
          })
        })
      `;

      const result = await autoFixEngine.autoFix({
        serviceCode: 'export class DiscountCalculatorService {}',
        failedTestCode: invalidCode,
        errorMessage: 'TS Error (1005): Unterminated string literal',
        maxIterations: 2,
      });

      expect(mockLLMGateway.generate).toHaveBeenCalled();
      expect(result.fixed).toBe(true);
      expect(result.iterations).toBe(1);
      expect(result.finalTestCode).toContain('DiscountCalculatorService');
      expect(result.processedOutput.syntaxValidation.isValid).toBe(true);
      expect(result.fixHistory.length).toBe(1);
    });
  });

  describe('2. ExtensionMetricsCollector (Telemetry & Performance Analysis)', () => {
    let metricsCollector: ExtensionMetricsCollector;

    beforeEach(() => {
      metricsCollector = ExtensionMetricsCollector.getInstance();
      metricsCollector.clear();
    });

    it('ghi nhận chính xác độ trễ (latency), số token và tính toán thống kê tổng hợp', () => {
      metricsCollector.recordMetric({
        serviceName: 'S01_DiscountCalculator',
        provider: 'gemini',
        strategy: 'hybrid',
        latencyMs: 1200,
        tokens: {
          promptTokens: 800,
          completionTokens: 400,
          totalTokens: 1200,
        },
        scenariosCount: 4,
        autoFixAttempts: 0,
        success: true,
      });

      metricsCollector.recordMetric({
        serviceName: 'S06_AuthService',
        provider: 'gemini',
        strategy: 'hybrid',
        latencyMs: 1800,
        tokens: {
          promptTokens: 1200,
          completionTokens: 600,
          totalTokens: 1800,
        },
        scenariosCount: 5,
        autoFixAttempts: 1,
        success: true,
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.length).toBe(2);

      const summary = metricsCollector.getAggregateSummary();
      expect(summary.totalGenerations).toBe(2);
      expect(summary.successRate).toBe(100);
      expect(summary.syntaxValidRate).toBe(100);
      expect(summary.testPassRate).toBe(100);
      expect(summary.avgLatencyMs).toBe(1500);
      expect(summary.avgTokens).toBe(1500);
      expect(summary.autoFixTriggeredCount).toBe(1);
    });

    it('phân biệt rạch ròi 4 trạng thái: lỗi cú pháp, chưa chạy runner, suite fail và suite pass', () => {
      // 1. Lỗi cú pháp
      metricsCollector.recordMetric({
        serviceName: 'S01_FaultySyntax',
        provider: 'gemini',
        strategy: 'zero-shot',
        latencyMs: 800,
        scenariosCount: 0,
        autoFixAttempts: 2,
        syntaxValid: false,
        testExecutionStatus: 'not_run',
        success: false,
      });

      // 2. Cú pháp hợp lệ nhưng chưa chạy test runner
      metricsCollector.recordMetric({
        serviceName: 'S02_NotRun',
        provider: 'gemini',
        strategy: 'few-shot',
        latencyMs: 1000,
        scenariosCount: 3,
        autoFixAttempts: 0,
        syntaxValid: true,
        testExecutionStatus: 'not_run',
        success: true,
      });

      // 3. Cú pháp hợp lệ, đã chạy nhưng suite fail assertion
      metricsCollector.recordMetric({
        serviceName: 'S03_AssertionFail',
        provider: 'gemini',
        strategy: 'cot',
        latencyMs: 1500,
        scenariosCount: 4,
        autoFixAttempts: 1,
        syntaxValid: true,
        testExecutionStatus: 'failed',
        success: false,
      });

      // 4. Cú pháp hợp lệ và test suite pass
      metricsCollector.recordMetric({
        serviceName: 'S04_PassSuite',
        provider: 'gemini',
        strategy: 'hybrid',
        latencyMs: 1200,
        scenariosCount: 5,
        autoFixAttempts: 0,
        syntaxValid: true,
        testExecutionStatus: 'passed',
        success: true,
      });

      const summary = metricsCollector.getAggregateSummary();
      expect(summary.totalGenerations).toBe(4);
      // 3 trong 4 là syntaxValid: 75%
      expect(summary.syntaxValidRate).toBe(75.0);
      // 2 lượt đã thực thi test runner: 1 pass, 1 fail -> 50%
      expect(summary.executedCount).toBe(2);
      expect(summary.passedCount).toBe(1);
      expect(summary.testPassRate).toBe(50.0);
      // 2 lượt overall success: 50%
      expect(summary.overallSuccessRate).toBe(50.0);
    });
  });

  describe('3. Shortcut & Keybinding Configuration', () => {
    it('kiểm tra phím tắt Ctrl+Shift+U / Cmd+Shift+U được đăng ký trong package.json', () => {
      const pkgPath = path.resolve(__dirname, '../package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      const keybindings = pkg.contributes.keybindings;
      expect(Array.isArray(keybindings)).toBe(true);
      const mainShortcut = keybindings.find((k: any) => k.command === 'contextAwareTestGen.generateTest');

      expect(mainShortcut).toBeDefined();
      expect(mainShortcut.key).toBe('ctrl+shift+u');
      expect(mainShortcut.mac).toBe('cmd+shift+u');
      expect(mainShortcut.when).toBe('editorTextFocus');
    });
  });
});
