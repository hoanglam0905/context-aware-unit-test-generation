import * as path from 'path';
import { TypeScriptASTParser } from './extractor/ast_parser';
import { RequirementParser } from './extractor/requirement_parser';
import { ContextExtractor } from './extractor/context_extractor';
import { PromptStrategyFactory } from './prompts';

describe('Thành viên B - Core Engine (Step 1: AST & Requirement Context Extractor)', () => {
  const rootDatasetDir = path.resolve(__dirname, '../../../experiments/dataset');

  describe('1. TypeScriptASTParser', () => {
    let parser: TypeScriptASTParser;

    beforeEach(() => {
      parser = new TypeScriptASTParser();
    });

    it('bóc tách đầy đủ class, methods, visibility và parameters từ mã nguồn TypeScript', () => {
      const code = `
        import { Order, OrderStatus } from './types';
        import axios from 'axios';

        export interface ICalculator {
          calculate(val: number): number;
        }

        export class CalculatorService implements ICalculator {
          private rate: number = 0.1;
          public static readonly MAX_LIMIT: number = 1000;

          /**
           * Tính tổng tiền sau thuế
           */
          public async calculateTotal(amount: number, discountCode?: string): Promise<number> {
            return amount * (1 + this.rate);
          }

          private helper(): void {}
        }
      `;

      const result = parser.parseSource(code, 'calculator.ts');

      // Check imports
      expect(result.imports.length).toBe(2);
      expect(result.imports[0].moduleSpecifier).toBe('./types');
      expect(result.imports[0].namedImports).toContain('Order');
      expect(result.imports[0].namedImports).toContain('OrderStatus');
      expect(result.imports[1].defaultImport).toBe('axios');

      // Check type definitions
      expect(result.typeDefinitions.length).toBe(1);
      expect(result.typeDefinitions[0].name).toBe('ICalculator');
      expect(result.typeDefinitions[0].kind).toBe('interface');

      // Check class
      expect(result.classes.length).toBe(1);
      const cls = result.classes[0];
      expect(cls.name).toBe('CalculatorService');
      expect(cls.isExported).toBe(true);
      expect(cls.implementsInterfaces).toContain('ICalculator');

      // Check methods
      expect(cls.methods.length).toBe(2);
      const calcMethod = cls.methods.find((m) => m.name === 'calculateTotal')!;
      expect(calcMethod).toBeDefined();
      expect(calcMethod.visibility).toBe('public');
      expect(calcMethod.isAsync).toBe(true);
      expect(calcMethod.parameters.length).toBe(2);
      expect(calcMethod.parameters[0].name).toBe('amount');
      expect(calcMethod.parameters[0].type).toBe('number');
      expect(calcMethod.parameters[1].name).toBe('discountCode');
      expect(calcMethod.parameters[1].isOptional).toBe(true);
      expect(calcMethod.docComment).toContain('Tính tổng tiền sau thuế');
    });

    it('parse chính xác service thực tế S01_DiscountCalculator', () => {
      const s01ServicePath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/service.ts');
      const extractor = new ContextExtractor();
      const payload = extractor.extract({ serviceFilePath: s01ServicePath });

      expect(payload.code.classes.length).toBeGreaterThanOrEqual(1);
      const mainClass = payload.code.classes.find((c) => c.name === 'DiscountCalculatorService')!;
      expect(mainClass).toBeDefined();
      expect(mainClass.methods.some((m) => m.name === 'calculateDiscount')).toBe(true);
      expect(payload.code.typeDefinitions.some((t) => t.name === 'MembershipTier' && t.kind === 'enum')).toBe(true);
      expect(payload.metadata.targetClassName).toBe('InvalidOrderAmountException'); // First class or target
    });
  });

  describe('2. RequirementParser', () => {
    let reqParser: RequirementParser;

    beforeEach(() => {
      reqParser = new RequirementParser();
    });

    it('bóc tách đầy đủ User Story, Business Rules và Gherkin Acceptance Criteria từ Markdown', () => {
      const markdown = `
# Requirement: Xác thực người dùng

## 1. User Story
Là một Thành viên hệ thống,
Tôi muốn đăng nhập bằng Email và Password,
Để tôi truy cập tài khoản bảo mật.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. Email phải đúng định dạng RFC 5322.
2. Khóa tài khoản sau 5 lần nhập sai mật khẩu liên tiếp.

## 3. Acceptance Criteria (Gherkin format)
\`\`\`gherkin
Scenario: Đăng nhập thành công với thông tin hợp lệ
  Given người dùng có email "user@test.com" và mật khẩu "Secret123!"
  When thực hiện đăng nhập
  Then trả về JWT token và mã trạng thái 200

Scenario Outline: Ném lỗi khi mật khẩu sai
  Given tài khoản đang hoạt động
  When nhập sai mật khẩu <attempt> lần
  Then hệ thống trả về thông báo lỗi

  Examples:
    | attempt |
    | 1       |
    | 5       |
\`\`\`
      `;

      const result = reqParser.parse(markdown);

      expect(result.title).toBe('Xác thực người dùng');
      expect(result.userStory).toContain('Là một Thành viên hệ thống');
      expect(result.businessRules.length).toBe(2);
      expect(result.businessRules[0]).toContain('RFC 5322');
      expect(result.scenarios.length).toBe(2);

      const sc1 = result.scenarios[0];
      expect(sc1.title).toBe('Đăng nhập thành công với thông tin hợp lệ');
      expect(sc1.given![0]).toContain('user@test.com');
      expect(sc1.then![0]).toContain('JWT token');

      const sc2 = result.scenarios[1];
      expect(sc2.title).toBe('Ném lỗi khi mật khẩu sai');
      expect(sc2.examples).toBeDefined();
      expect(sc2.examples!.length).toBe(2);
      expect(sc2.examples![0].attempt).toBe('1');
      expect(sc2.examples![1].attempt).toBe('5');
    });

    it('hỗ trợ parse tài liệu yêu cầu dạng JSON', () => {
      const jsonReq = JSON.stringify({
        title: 'Coupon Validation',
        userStory: 'As a user I want to apply discount code',
        businessRules: ['Code must not be expired', 'Min order 100k'],
        scenarios: [
          {
            title: 'Valid coupon',
            given: ['Coupon code "SUMMER" is active'],
            when: ['User applies coupon'],
            then: ['Discount is applied'],
          },
        ],
      });

      const result = reqParser.parse(jsonReq);
      expect(result.title).toBe('Coupon Validation');
      expect(result.businessRules.length).toBe(2);
      expect(result.scenarios.length).toBe(1);
      expect(result.scenarios[0].title).toBe('Valid coupon');
    });
  });

  describe('3. ContextExtractor & Integration Bridge', () => {
    it('kết nối Code Context và BA Requirement tạo ContextPayload hoàn chỉnh cho Prompt Strategy', () => {
      const s01ServicePath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/service.ts');
      const s01ReqPath = path.join(rootDatasetDir, 'simple/s01_discount_calculator/requirement.md');

      const extractor = new ContextExtractor();
      const payload = extractor.extract({
        serviceFilePath: s01ServicePath,
        requirementFilePath: s01ReqPath,
        targetClassName: 'DiscountCalculatorService',
      });

      expect(payload.metadata.targetClassName).toBe('DiscountCalculatorService');
      expect(payload.metadata.targetMethodNames).toContain('calculateDiscount');
      expect(payload.requirement).toBeDefined();
      expect(payload.requirement?.title).toContain('Tính toán giảm giá theo hạng thành viên');
      expect(payload.requirement?.scenarios.length).toBeGreaterThanOrEqual(3);

      // Tương thích với Prompt Strategy của Thành viên A
      const hybridStrategy = PromptStrategyFactory.getStrategy('hybrid');
      const promptPayload = hybridStrategy.buildPrompt(payload.promptContext);

      expect(promptPayload.userPrompt).toContain('DiscountCalculatorService');
      expect(promptPayload.userPrompt).toContain('Tính toán giảm giá theo hạng thành viên');
      expect(promptPayload.expectedOutputFormat).toBe('JSON');

      // Format summary helper
      const summary = extractor.formatSummary(payload);
      expect(summary).toContain('DiscountCalculatorService');
      expect(summary).toContain('Acceptance Scenarios');
    });
  });
});
