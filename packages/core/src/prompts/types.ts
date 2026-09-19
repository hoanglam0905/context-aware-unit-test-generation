export interface PromptContext {
  serviceCode: string;
  requirementDoc?: string;
  existingTestPatterns?: string;
  className?: string;
}

export interface PromptPayload {
  systemPrompt: string;
  userPrompt: string;
  expectedOutputFormat: 'JSON' | 'CODE_BLOCK';
}

/**
 * Interface chuẩn cho các chiến lược Prompting
 */
export interface IPromptStrategy {
  readonly name: 'zero-shot' | 'few-shot' | 'cot' | 'hybrid';
  buildPrompt(context: PromptContext): PromptPayload;
}
