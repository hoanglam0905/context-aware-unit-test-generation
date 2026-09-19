import { IPromptStrategy, PromptContext, PromptPayload } from './types';

export class ChainOfThoughtPromptStrategy implements IPromptStrategy {
  public readonly name = 'cot';

  public buildPrompt(context: PromptContext): PromptPayload {
    const systemPrompt = `You are a Principal QA Architect and Test Automation Specialist.
Follow a structured Chain-of-Thought reasoning process before generating any code.

You must think step-by-step through the following 4 phases:
1. PHASE 1 - Structural Analysis: Identify all methods, dependencies, branches (if/else, switch), and potential exception points.
2. PHASE 2 - Test Scenario Enumeration: List all test scenarios categorized into:
   - Happy Paths (Normal business flow)
   - Boundary Values (Min, max, threshold edges)
   - Negative & Error Handling (Invalid input, thrown exceptions, dependency failures)
3. PHASE 3 - Mocking Strategy: Define how each external dependency and repository will be mocked.
4. PHASE 4 - Code Implementation: Produce the production-ready Jest test code.

Format your response in two clear sections:
### REASONING & TEST SCENARIOS
(Bullet points detailing the 4 phases)

### IMPLEMENTATION
\`\`\`typescript
// Full Jest test file here
\`\`\``;

    const userPrompt = `Perform Step-by-Step Chain-of-Thought analysis and generate a complete test suite for:

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
