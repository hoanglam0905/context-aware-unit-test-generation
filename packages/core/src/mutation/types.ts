/**
 * Loại toán tử biến dị (Mutator Type)
 */
export type MutatorType =
  | 'BINARY_EXPRESSION'
  | 'EQUALITY_OPERATOR'
  | 'CONDITIONAL_BOUNDARY'
  | 'BOOLEAN_LITERAL'
  | 'NUMERIC_LITERAL'
  | 'RETURN_VALUE';

/**
 * Trạng thái của Mutant sau khi chạy kiểm thử
 */
export type MutantStatus = 'KILLED' | 'SURVIVED' | 'TIMEOUT' | 'COMPILE_ERROR';

/**
 * Thông tin một cá thể Mutant được sinh ra từ mã nguồn gốc
 */
export interface Mutant {
  id: string;
  mutatorType: MutatorType;
  fileName: string;
  lineNumber: number;
  originalCode: string;
  mutatedCode: string;
  mutatedFileContent: string;
  description: string;
}

/**
 * Kết quả đánh giá của một cá thể Mutant
 */
export interface MutantTestResult {
  mutant: Mutant;
  status: MutantStatus;
  killingTestName?: string;
  errorMessage?: string;
  durationMs: number;
}

/**
 * Kết quả Mutation Testing tổng hợp cho một dịch vụ / bộ test
 */
export interface MutationSummary {
  serviceId: string;
  strategy: string;
  totalMutants: number;
  killedMutants: number;
  survivedMutants: number;
  timeoutMutants: number;
  compileErrorMutants: number;
  mutationScore: number; // Tỉ lệ % tiêu diệt mutant: (Killed + Timeout) / (Total - CompileError) * 100
  durationMs: number;
  results: MutantTestResult[];
}

/**
 * Phân tích so sánh Mutation Score giữa các chiến lược Prompt
 */
export interface MutationStrategyComparison {
  serviceId: string;
  strategies: Record<
    string,
    {
      mutationScore: number;
      killedCount: number;
      survivedCount: number;
      survivedMutantIds: string[];
    }
  >;
  businessLogicMutantsKilledByHybridOnly: string[];
}
