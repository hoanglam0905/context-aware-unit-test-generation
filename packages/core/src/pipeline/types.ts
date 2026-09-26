import { ContextPayload } from '../extractor/types';
import { LLMResponse } from '../llm/types';

/**
 * Kết quả kiểm tra cú pháp và khả năng biên dịch của mã test
 */
export interface SyntaxValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Kết quả sau khi hậu xử lý (Post-processing) mã test do LLM sinh ra
 */
export interface ProcessedTestOutput {
  testCode: string;
  testScenarios: Array<{
    id: string;
    acceptanceCriteriaRef?: string;
    category?: string;
    description: string;
    expectedBehavior?: string;
  }>;
  reasoningSteps?: string[];
  syntaxValidation: SyntaxValidationResult;
  rawText: string;
}

/**
 * Kết quả đo độ phủ mã (Coverage)
 */
export interface CoverageMetrics {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

export interface TestExecutionSummary {
  executed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  suitePassed: boolean;
  coverage?: CoverageMetrics;
  errorMessage?: string;
}

/**
 * Cấu hình đầu vào cho Test Generation Pipeline E2E
 */
export interface PipelineOptions {
  serviceFilePath?: string;
  serviceCode?: string;
  requirementFilePath?: string;
  requirementDoc?: string;
  existingTestPatterns?: string;
  targetClassName?: string;
  strategyName: 'zero-shot' | 'few-shot' | 'cot' | 'hybrid';
  outputTestFilePath?: string;
  runCoverage?: boolean;
}

/**
 * Kết quả tổng thể của toàn bộ Pipeline E2E
 */
export interface PipelineResult {
  context: ContextPayload;
  llmResponse: LLMResponse;
  processedOutput: ProcessedTestOutput;
  execution?: TestExecutionSummary;
  durationMs: number;
  strategy: string;
  timestamp: string;
}
