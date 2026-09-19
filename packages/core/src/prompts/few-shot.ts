import { IPromptStrategy, PromptContext, PromptPayload } from './types';

export class FewShotPromptStrategy implements IPromptStrategy {
  public readonly name = 'few-shot';

  public buildPrompt(context: PromptContext): PromptPayload {
    const systemPrompt = `You are an expert software test engineer specializing in TypeScript, Jest, and software quality assurance.
You will be provided with an exemplar of a Service and its corresponding high-quality Jest unit test suite, followed by a new target Service.
You must follow the structure, mocking conventions, and assertion style of the exemplar.
Output ONLY the runnable TypeScript test code enclosed in \`\`\`typescript ... \`\`\`.`;

    const exemplarService = `export class MathUtil {
  public divide(a: number, b: number): number {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  }
}`;

    const exemplarTest = `import { MathUtil } from './service';

describe('MathUtil', () => {
  let util: MathUtil;

  beforeEach(() => {
    util = new MathUtil();
  });

  it('should divide two valid positive numbers correctly', () => {
    expect(util.divide(10, 2)).toBe(5);
  });

  it('should throw Error when dividing by zero', () => {
    expect(() => util.divide(10, 0)).toThrow('Division by zero');
  });
});`;

    const userPrompt = `### EXEMPLAR 1:
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
Generate a complete unit test suite for this target service, strictly adhering to the style shown above:

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
