import { IPromptStrategy, PromptContext, PromptPayload } from './types';

export class HybridPromptStrategy implements IPromptStrategy {
  public readonly name = 'hybrid';

  public buildPrompt(context: PromptContext): PromptPayload {
    const lang = context.sourceLanguage || 'TypeScript';
    const framework = context.testFramework || 'Jest';

    const systemPrompt = `You are an elite QA Engineer and Polyglot Software Verification Specialist.
You are tasked with generating high-mutation-score Unit Tests in ${lang} using ${framework} by combining:
1. BUSINESS REQUIREMENTS (User Stories, Acceptance Criteria, Gherkin specs provided by Business Analysts).
2. SOURCE CODE IMPLEMENTATION (${lang} Service logic and signature).
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
  "testCode": "// Complete, runnable test file in ${lang} using ${framework}"
}`;

    const userPrompt = `### 1. BUSINESS REQUIREMENT SPECIFICATION (from Business Analyst):
${context.requirementDoc || 'No explicit BA requirement document provided. Rely on inferred code logic.'}

---

### 2. SOURCE CODE (Target Service in ${lang}):
\`\`\`${lang.toLowerCase()}
${context.serviceCode}
\`\`\`

---

### INSTRUCTIONS:
1. Cross-reference every Business Rule and Gherkin Acceptance Criterion with the source code.
2. Formulate explicit test scenarios covering edge cases mentioned in the BA document (e.g., specific discounts, retry limits, lockout counts, boundary values).
3. Return the complete result in the requested JSON format. Ensure the "testCode" property contains valid, non-truncated, complete test code in ${lang} using ${framework}.`;

    return {
      systemPrompt,
      userPrompt,
      expectedOutputFormat: 'JSON',
    };
  }
}
