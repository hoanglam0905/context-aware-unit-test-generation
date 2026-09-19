export interface LLMResponse {
  rawText: string;
  testCode: string;
  testScenarios?: Array<{
    id: string;
    acceptanceCriteriaRef?: string;
    category?: string;
    description: string;
    expectedBehavior?: string;
  }>;
  reasoningSteps?: string[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs: number;
}

export interface ILLMGateway {
  readonly providerName: string;
  readonly modelName: string;
  generate(systemPrompt: string, userPrompt: string): Promise<LLMResponse>;
}
