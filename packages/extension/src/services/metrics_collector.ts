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
  public recordMetric(entry: Omit<GenerationMetricEntry, 'id' | 'timestamp'>): GenerationMetricEntry {
    const fullEntry: GenerationMetricEntry = {
      ...entry,
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
   * Tính toán các chỉ số trung bình (Latency, Tokens, Pass Rate)
   */
  public getAggregateSummary(): {
    totalGenerations: number;
    successRate: number;
    avgLatencyMs: number;
    avgTokens: number;
    autoFixTriggeredCount: number;
  } {
    const total = this.entries.length;
    if (total === 0) {
      return {
        totalGenerations: 0,
        successRate: 0,
        avgLatencyMs: 0,
        avgTokens: 0,
        autoFixTriggeredCount: 0,
      };
    }

    const successful = this.entries.filter((e) => e.success).length;
    const totalLatency = this.entries.reduce((sum, e) => sum + e.latencyMs, 0);
    const totalTokens = this.entries.reduce((sum, e) => sum + (e.tokens?.totalTokens || 0), 0);
    const autoFixCount = this.entries.filter((e) => e.autoFixAttempts > 0).length;

    return {
      totalGenerations: total,
      successRate: parseFloat(((successful / total) * 100).toFixed(2)),
      avgLatencyMs: Math.round(totalLatency / total),
      avgTokens: Math.round(totalTokens / total),
      autoFixTriggeredCount: autoFixCount,
    };
  }

  public clear(): void {
    this.entries = [];
  }
}
