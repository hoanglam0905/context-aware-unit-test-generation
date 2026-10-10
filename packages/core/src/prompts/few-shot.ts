import { IPromptStrategy, PromptContext, PromptPayload } from './types';

export class FewShotPromptStrategy implements IPromptStrategy {
  public readonly name = 'few-shot';

  public buildPrompt(context: PromptContext): PromptPayload {
    const systemPrompt = `You are an expert software test engineer specializing in TypeScript, Jest, and software quality assurance.
You will be provided with an exemplar of a Service and its corresponding high-quality Jest unit test suite, followed by a new target Service.
You must follow the structure, mocking conventions, and assertion style of the exemplar.
Output ONLY the runnable TypeScript test code enclosed in \`\`\`typescript ... \`\`\`.`;

    const exemplarService = `export enum MembershipTier {
  REGULAR = 'REGULAR',
  GOLD = 'GOLD',
}

export class DiscountCalculatorService {
  private static readonly MAX_DISCOUNT_CAP = 500000;

  public calculateDiscount(orderAmount: number, tier = MembershipTier.REGULAR) {
    if (orderAmount <= 0) throw new Error('Order amount must be greater than zero');
    const rate = tier === MembershipTier.GOLD ? 0.15 : 0.05;
    let discount = Math.round(orderAmount * rate);
    if (discount > DiscountCalculatorService.MAX_DISCOUNT_CAP) {
      discount = DiscountCalculatorService.MAX_DISCOUNT_CAP;
    }
    return { discountAmount: discount, finalAmount: orderAmount - discount };
  }
}`;

    const exemplarTest = `import { DiscountCalculatorService, MembershipTier } from './service';

describe('DiscountCalculatorService (Training Exemplar)', () => {
  let service: DiscountCalculatorService;

  beforeEach(() => {
    service = new DiscountCalculatorService();
  });

  it('should calculate discount for REGULAR tier correctly', () => {
    const result = service.calculateDiscount(100000, MembershipTier.REGULAR);
    expect(result.discountAmount).toBe(5000);
    expect(result.finalAmount).toBe(95000);
  });

  it('should apply discount cap when discount exceeds maximum limit', () => {
    const result = service.calculateDiscount(10000000, MembershipTier.GOLD);
    expect(result.discountAmount).toBe(500000);
  });

  it('should throw Error when orderAmount is invalid (non-positive)', () => {
    expect(() => service.calculateDiscount(0)).toThrow('Order amount must be greater than zero');
  });
});`;

    const astSection = context.astSummary ? `\n\n### AST Structure:\n${context.astSummary}` : '';
    const reqSection =
      context.ablationMode !== 'code-only' && context.requirementDoc
        ? `\n\n### Business Requirements (Reference):\n${context.requirementDoc}`
        : '';

    const userPrompt = `### EXEMPLAR 1 (Training Reference):
Target Service:
\`\`\`typescript
${exemplarService}
\`\`\`

Generated Test:
\`\`\`typescript
${exemplarTest}
\`\`\`

---

### NEW TASK:
Generate a complete unit test suite for this target service, strictly adhering to the style shown above:${astSection}${reqSection}

\`\`\`typescript
${context.serviceCode}
\`\`\``;

    return {
      systemPrompt,
      userPrompt,
      expectedOutputFormat: 'CODE_BLOCK',
    };
  }
}
