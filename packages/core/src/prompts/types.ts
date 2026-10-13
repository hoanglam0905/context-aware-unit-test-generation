export interface MethodSlice {
  className?: string;
  methodName: string;
  visibility?: string;
  parameters: Array<{ name: string; type: string }>;
  returnType: string;
  signature: string;
}

export interface PromptContext {
  serviceCode: string;
  requirementDoc?: string;
  existingTestPatterns?: string;
  className?: string;
  targetMethodName?: string;
  targetMethodSlice?: MethodSlice;
  sourceLanguage?: string;
  testFramework?: string;
  astSummary?: string;
  ablationMode?: 'full' | 'code-only' | 'req-only';
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
