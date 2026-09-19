import { IPromptStrategy, PromptContext, PromptPayload } from './types';

export class HybridPromptStrategy implements IPromptStrategy {
  public readonly name = 'hybrid';

  public buildPrompt(context: PromptContext): PromptPayload {
    const systemPrompt = `You are an elite QA Engineer and Software Verification Specialist.
You are tasked with generating high-mutation-score Unit Tests by combining:
1. BUSINESS REQUIREMENTS (User Stories, Acceptance Criteria, Gherkin specs provided by Business Analysts).
2. SOURCE CODE IMPLEMENTATION (TypeScript Service logic and AST signature).
3. STRUCTURED REASONING (CoT matrix matching every Acceptance Criterion to at least one test case).

You must output a structured JSON response matching the following schema exactly:
{
  "testScenarios": [
    {
      "id": "TC-001",
      "acceptanceCriteriaRef": "Scenario name or rule",
      "category": "HAPPY_PATH | BOUNDARY | EXCEPTION",
      "description": "Brief explanation of what is tested",
      "expectedBehavior": "Expected outcome or exception"
    }
  ],
  "reasoningSteps": [
    "Step 1: Analyzed BA business rules...",
    "Step 2: Mapped to source code branches..."
  ],
  "testCode": "// Complete, runnable Jest test file in TypeScript"
}`;

    const userPrompt = `### 1. BUSINESS REQUIREMENT SPECIFICATION (from Business Analyst):
${context.requirementDoc || 'No explicit BA requirement document provided. Rely on inferred code logic.'}

---

### 2. SOURCE CODE (Target Service):
\`\`\`typescript
${context.serviceCode}
\`\`\`

---

### INSTRUCTIONS:
1. Cross-reference every Business Rule and Gherkin Acceptance Criterion with the source code.
2. Formulate explicit test scenarios covering edge cases mentioned in the BA document (e.g., specific discounts, retry limits, lockout counts).
3. Return the complete result in the requested JSON format. Ensure the "testCode" property contains valid, non-truncated TypeScript test code.`;

    return {
      systemPrompt,
      userPrompt,
      expectedOutputFormat: 'JSON',
    };
  }
}
