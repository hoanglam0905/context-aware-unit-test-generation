import { IPromptStrategy, PromptContext, PromptPayload } from './types';

export class ZeroShotPromptStrategy implements IPromptStrategy {
  public readonly name = 'zero-shot';

  public buildPrompt(context: PromptContext): PromptPayload {
    const systemPrompt = `You are an expert software test engineer specializing in TypeScript, Jest, and software quality assurance.
Your task is to generate a comprehensive, runnable Jest unit test file for the provided service class.
Follow these constraints strictly:
1. Use Jest syntax (describe, it, expect, jest.fn(), jest.mock()).
2. Cover both happy paths and error cases.
3. Output ONLY the runnable TypeScript test code enclosed in \`\`\`typescript ... \`\`\`. Do not include conversational text.`;

    const astSection = context.astSummary ? `\n\n### AST Structure:\n${context.astSummary}` : '';
    const reqSection =
      context.ablationMode !== 'code-only' && context.requirementDoc
        ? `\n\n### Business Requirements (Reference):\n${context.requirementDoc}`
        : '';

    const userPrompt = `Generate a complete unit test file for the following TypeScript service:${astSection}${reqSection}

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
