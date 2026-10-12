export interface GenerationMetricEntry {
  id: string;
  serviceName: string;
  provider: string;
  strategy: string;
  latencyMs: number;
  tokens?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  scenariosCount: number;
  autoFixAttempts: number;
  syntaxValid?: boolean;
  testExecutionStatus?: 'not_run' | 'passed' | 'failed';
  success: boolean;
  timestamp: string;
}

export class ExtensionMetricsCollector {
  private static instance: ExtensionMetricsCollector;
  private entries: GenerationMetricEntry[] = [];

  private constructor() {}

  public static getInstance(): ExtensionMetricsCollector {
    if (!ExtensionMetricsCollector.instance) {
      ExtensionMetricsCollector.instance = new ExtensionMetricsCollector();
    }
    return ExtensionMetricsCollector.instance;
  }

  /**
   * Ghi nhận một phiên sinh kiểm thử
   */
  public recordMetric(
    entry: Omit<GenerationMetricEntry, 'id' | 'timestamp'> & {
      syntaxValid?: boolean;
      testExecutionStatus?: 'not_run' | 'passed' | 'failed';
    }
  ): GenerationMetricEntry {
    const syntaxValid = entry.syntaxValid !== undefined ? entry.syntaxValid : entry.success;
    const testExecutionStatus =
      entry.testExecutionStatus !== undefined
        ? entry.testExecutionStatus
        : entry.success
          ? 'passed'
          : 'not_run';

    const fullEntry: GenerationMetricEntry = {
      ...entry,
      syntaxValid,
      testExecutionStatus,
      id: `METRIC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    this.entries.push(fullEntry);
    return fullEntry;
  }

  /**
   * Lấy toàn bộ danh sách chỉ số
   */
  public getMetrics(): GenerationMetricEntry[] {
    return [...this.entries];
  }

  /**
   * Tính toán các chỉ số trung bình (Latency, Tokens, Pass Rate, Syntax Rate)
   */
  public getAggregateSummary(): {
    totalGenerations: number;
    syntaxValidRate: number;
    testPassRate: number;
    overallSuccessRate: number;
    successRate: number;
    avgLatencyMs: number;
    avgTokens: number;
    autoFixTriggeredCount: number;
    executedCount: number;
    passedCount: number;
  } {
    const total = this.entries.length;
    if (total === 0) {
      return {
        totalGenerations: 0,
        syntaxValidRate: 0,
        testPassRate: 0,
        overallSuccessRate: 0,
        successRate: 0,
        avgLatencyMs: 0,
        avgTokens: 0,
        autoFixTriggeredCount: 0,
        executedCount: 0,
        passedCount: 0,
      };
    }

    const syntaxValidCount = this.entries.filter((e) => e.syntaxValid).length;
    const executedEntries = this.entries.filter((e) => e.testExecutionStatus !== 'not_run');
    const passedEntries = this.entries.filter((e) => e.testExecutionStatus === 'passed');
    const successfulEntries = this.entries.filter((e) => e.success);

    const totalLatency = this.entries.reduce((sum, e) => sum + e.latencyMs, 0);
    const totalTokens = this.entries.reduce((sum, e) => sum + (e.tokens?.totalTokens || 0), 0);
    const autoFixCount = this.entries.filter((e) => e.autoFixAttempts > 0).length;

    const syntaxValidRate = parseFloat(((syntaxValidCount / total) * 100).toFixed(2));
    const testPassRate =
      executedEntries.length > 0
        ? parseFloat(((passedEntries.length / executedEntries.length) * 100).toFixed(2))
        : 0;
    const overallSuccessRate = parseFloat(((successfulEntries.length / total) * 100).toFixed(2));

    return {
      totalGenerations: total,
      syntaxValidRate,
      testPassRate,
      overallSuccessRate,
      successRate: overallSuccessRate,
      avgLatencyMs: Math.round(totalLatency / total),
      avgTokens: Math.round(totalTokens / total),
      autoFixTriggeredCount: autoFixCount,
      executedCount: executedEntries.length,
      passedCount: passedEntries.length,
    };
  }

  public clear(): void {
    this.entries = [];
  }
}
