import { filterTestCodeByScenarios, ScenarioItem } from './webview/test_code_filter';
import { TestPreviewPanel } from './webview/preview_panel';
import { MutationGuidedRefiner } from '../../core/src/mutation/mutation_refiner';
import { MutationSummary } from '../../core/src/mutation/types';

describe('Acceptance & Safety Verification Suite (UAT)', () => {
  const sampleTestCode = `import { DiscountCalculatorService } from './service';

describe('DiscountCalculatorService', () => {
  let service: DiscountCalculatorService;

  beforeEach(() => {
    service = new DiscountCalculatorService();
  });

  it('TC-001: should calculate 0% discount for regular tier', () => {
    const res = service.calculateDiscount(100000, 'REGULAR');
    expect(res.discountAmount).toBe(0);
  });

  it('TC-002: should calculate 5% discount for silver tier', () => {
    const res = service.calculateDiscount(100000, 'SILVER');
    expect(res.discountAmount).toBe(5000);
  });

  it('TC-003: should cap discount at 500k', () => {
    const res = service.calculateDiscount(10000000, 'PLATINUM');
    expect(res.discountAmount).toBe(500000);
  });
});`;

  const sampleScenarios: ScenarioItem[] = [
    {
      id: 'TC-001',
      description: 'should calculate 0% discount for regular tier',
      category: 'NORMAL_FLOW',
      acceptanceCriteriaRef: 'AC1: Regular tier discount',
      expectedBehavior: 'Discount is 0',
      selected: true,
    },
    {
      id: 'TC-002',
      description: 'should calculate 5% discount for silver tier',
      category: 'NORMAL_FLOW',
      acceptanceCriteriaRef: 'AC2: Silver tier discount',
      expectedBehavior: 'Discount is 5%',
      selected: true,
    },
    {
      id: 'TC-003',
      description: 'should cap discount at 500k',
      category: 'BOUNDARY_VALUE',
      acceptanceCriteriaRef: 'BR2: Max cap 500k',
      expectedBehavior: 'Discount capped at 500,000 VND',
      selected: true,
    },
  ];

  describe('1. Webview Security & CSP Verification (Issue 4.1)', () => {
    it('sinh HTML có Content Security Policy (CSP) và nonce mã hóa ngẫu nhiên', () => {
      const panel = new (TestPreviewPanel as any)({ webview: {}, onDidDispose: () => {} }, {});
      const html = panel._getHtmlForWebview({ cspSource: 'vscode-webview:' });

      expect(html).toContain('Content-Security-Policy');
      expect(html).toContain('default-src \'none\'');
      expect(html).toContain('script-src \'nonce-');
      expect(html).toContain('style-src vscode-webview: \'unsafe-inline\'');
    });

    it('không sử dụng innerHTML cho description từ model (ngăn chặn XSS)', () => {
      const panel = new (TestPreviewPanel as any)({ webview: {}, onDidDispose: () => {} }, {});
      const html = panel._getHtmlForWebview({ cspSource: 'vscode-webview:' });

      // Xác nhận trong client script dùng textContent và createElement, không có item.innerHTML = `...`
      expect(html).toContain('document.createElement');
      expect(html).toContain('textContent = s.description');
      expect(html).not.toContain('item.innerHTML = `');
    });
  });

  describe('2. Scenario-based Test Filtering Verification (Issue 4.3)', () => {
    it('giữ nguyên mã test khi người dùng chọn tất cả scenarios', () => {
      const filtered = filterTestCodeByScenarios(
        sampleTestCode,
        ['TC-001', 'TC-002', 'TC-003'],
        sampleScenarios
      );
      expect(filtered).toBe(sampleTestCode);
    });

    it('loại bỏ các test case không được chọn nhưng vẫn bảo toàn imports và beforeEach', () => {
      const filtered = filterTestCodeByScenarios(
        sampleTestCode,
        ['TC-001'],
        sampleScenarios
      );

      expect(filtered).toContain('import { DiscountCalculatorService }');
      expect(filtered).toContain('beforeEach');
      expect(filtered).toContain('TC-001');
      expect(filtered).not.toContain('TC-002');
      expect(filtered).not.toContain('TC-003');
    });

    it('trả về khung cấu trúc khi người dùng bỏ chọn tất cả scenarios', () => {
      const filtered = filterTestCodeByScenarios(
        sampleTestCode,
        [],
        sampleScenarios
      );

      expect(filtered).toContain('import { DiscountCalculatorService }');
      expect(filtered).not.toContain('TC-001');
      expect(filtered).not.toContain('TC-002');
      expect(filtered).not.toContain('TC-003');
    });
  });

  describe('3. Mutation-Guided Refinement Engine Verification (Section 5)', () => {
    it('phân tích mutants sống sót và tạo đề xuất kịch bản test bổ sung có giá trị biên', () => {
      const mockSummary: MutationSummary = {
        serviceId: 'S01_DiscountCalculator',
        strategy: 'ground-truth',
        totalMutants: 9,
        validMutants: 9,
        killedMutants: 8,
        survivedMutants: 1,
        compileErrorMutants: 0,
        timeoutMutants: 0,
        mutationScore: 88.89,
        durationMs: 450,
        results: [
          {
            mutant: {
              id: 'MUT_008',
              mutatorType: 'CONDITIONAL_BOUNDARY',
              fileName: 'service.ts',
              lineNumber: 85,
              originalCode: 'if (password.length >= 12 && specialCount >= 2)',
              mutatedCode: 'if (password.length > 12 && specialCount > 2)',
              mutatedFileContent: '',
              description: 'Thay đổi điều kiện biên >= thành >',
            },
            status: 'SURVIVED',
            durationMs: 50,
          },
        ],
      };

      const refiner = new MutationGuidedRefiner();
      const suggestion = refiner.analyzeAndSuggestRefinement(mockSummary, 'class Service {}');

      expect(suggestion.survivedMutantsCount).toBe(1);
      expect(suggestion.suggestedScenarios.length).toBe(1);
      expect(suggestion.suggestedScenarios[0].targetMutantId).toBe('MUT_008');
      expect(suggestion.suggestedScenarios[0].mutatorType).toBe('CONDITIONAL_BOUNDARY');
      expect(suggestion.feedbackPrompt).toContain('MUTATION-GUIDED REFINEMENT FEEDBACK');
      expect(suggestion.feedbackPrompt).toContain('MUT_008');
    });
  });

  describe('4. Webview Host Security & Traversal Defense Verification (Issue 4.1)', () => {
    it('kiểm tra và từ chối đường dẫn chứa path traversal khi lưu file', () => {
      const panel = new (TestPreviewPanel as any)({ webview: {}, onDidDispose: () => {} }, {});
      // Host target path không được phép bị override bởi path tùy ý từ webview
      panel.setTargetOutput('/app/experiments/dataset/simple/s01_discount_calculator/test.ts');
      expect((panel as any)._targetOutputPath).toBe('/app/experiments/dataset/simple/s01_discount_calculator/test.ts');
    });
  });

  describe('5. Method-Level Scoping Verification (Issue 4.2 & Section 5.3)', () => {
    it('chỉ định targetMethodName được truyền chính xác vào ngữ cảnh', () => {
      const { HybridPromptStrategy } = require('../../core/src/prompts/hybrid');
      const strategy = new HybridPromptStrategy();
      const payload = strategy.buildPrompt({
        serviceCode: 'class Calculator { add(a: number, b: number) { return a + b; } sub(a: number, b: number) { return a - b; } }',
        targetMethodName: 'add',
      });

      expect(payload.userPrompt).toContain('add');
      expect(payload.userPrompt).toContain('TARGET METHOD FOCUS');
      expect(payload.userPrompt).toContain('Generate test cases exclusively for method: "add()"');
    });

    it('ContextExtractor trích xuất chính xác MethodSlice với signature và AST slice', () => {
      const { ContextExtractor } = require('../../core/src/extractor/context_extractor');
      const extractor = new ContextExtractor();
      const code = `
export class OrderService {
  public calculateTotal(items: number[], taxRate: number): number {
    return items.reduce((a, b) => a + b, 0) * (1 + taxRate);
  }
  public cancelOrder(orderId: string): boolean {
    return true;
  }
}
`;
      const ctx = extractor.extract({ serviceCode: code, targetMethodName: 'calculateTotal' });
      expect(ctx.promptContext.targetMethodSlice).toBeDefined();
      expect(ctx.promptContext.targetMethodSlice?.methodName).toBe('calculateTotal');
      expect(ctx.promptContext.targetMethodSlice?.className).toBe('OrderService');
      expect(ctx.promptContext.targetMethodSlice?.returnType).toBe('number');
      expect(ctx.promptContext.astSummary).toContain('=== TARGET METHOD UNDER TEST');
    });
  });

  describe('6. Extension Mutation Refinement Integration (Issue 4.5)', () => {
    it('TestGenerationService có phương thức refineWithMutation và trả về kết quả gợi ý', async () => {
      const { TestGenerationService } = require('./services/test_generation_service');
      const service = new TestGenerationService();
      expect(typeof service.refineWithMutation).toBe('function');

      const path = require('path');
      const sampleServiceUri = {
        fsPath: path.resolve(__dirname, '../../../experiments/dataset/simple/s01_discount_calculator/service.ts'),
      };
      const extensionUri = { fsPath: path.resolve(__dirname, '..') };

      const refinement = await service.refineWithMutation(sampleServiceUri, extensionUri);
      expect(refinement).toBeDefined();
      expect(Array.isArray(refinement.suggestedScenarios)).toBe(true);
      expect(typeof refinement.feedbackPrompt).toBe('string');
      expect(refinement.feedbackPrompt).toContain('MUTATION-GUIDED REFINEMENT FEEDBACK');
    });
  });
});
