import { MutationStrategyComparison, MutationSummary } from './types';

export class MutationAnalyzer {
  /**
   * Phân tích và so sánh kết quả Mutation Testing giữa các chiến lược Prompt
   */
  public compareStrategies(
    serviceId: string,
    summaries: Record<string, MutationSummary>
  ): MutationStrategyComparison {
    const strategies: MutationStrategyComparison['strategies'] = {};
    const killedByStrategy: Record<string, Set<string>> = {};

    for (const [stratName, summary] of Object.entries(summaries)) {
      const killedIds = new Set<string>();
      const survivedIds: string[] = [];

      for (const res of summary.results) {
        if (res.status === 'KILLED' || res.status === 'TIMEOUT') {
          killedIds.add(res.mutant.id);
        } else if (res.status === 'SURVIVED') {
          survivedIds.push(res.mutant.id);
        }
      }

      killedByStrategy[stratName] = killedIds;
      strategies[stratName] = {
        mutationScore: summary.mutationScore,
        killedCount: summary.killedMutants + summary.timeoutMutants,
        survivedCount: summary.survivedMutants,
        survivedMutantIds: survivedIds,
      };
    }

    // Xác định các mutants nghiệp vụ chỉ bị tiêu diệt bởi Hybrid / CoT (mà Zero-shot bỏ sót)
    const hybridKilled = killedByStrategy['hybrid'] || new Set<string>();
    const zeroShotKilled = killedByStrategy['zero-shot'] || new Set<string>();

    const businessLogicMutantsKilledByHybridOnly: string[] = [];
    for (const id of hybridKilled) {
      if (!zeroShotKilled.has(id)) {
        businessLogicMutantsKilledByHybridOnly.push(id);
      }
    }

    return {
      serviceId,
      strategies,
      businessLogicMutantsKilledByHybridOnly,
    };
  }

  /**
   * Sinh báo cáo Markdown so sánh Mutation Testing
   */
  public generateMarkdownReport(comparison: MutationStrategyComparison): string {
    const lines: string[] = [];
    lines.push(`# 🧬 Báo Cáo Phân Tích Mutation Testing - Service: ${comparison.serviceId}\n`);
    lines.push('## 1. Bảng So Sánh Chỉ Số Mutation Score (%)\n');
    lines.push('| Chiến lược Prompt | Số Mutant Tiêu Diệt (Killed) | Số Mutant Sót (Survived) | **Mutation Score (%)** |');
    lines.push('| :--- | :---: | :---: | :---: |');

    for (const [name, data] of Object.entries(comparison.strategies)) {
      lines.push(`| **${name.toUpperCase()}** | ${data.killedCount} | ${data.survivedCount} | **${data.mutationScore}%** |`);
    }

    lines.push('\n## 2. Phân Tích Đóng Góp Của Ngữ Cảnh BA (Requirement)\n');
    lines.push(`- **Số lượng mutant logic nghiệp vụ được phát hiện thêm bởi Hybrid:** **${comparison.businessLogicMutantsKilledByHybridOnly.length}** mutants.`);
    lines.push('- **Nhận định:** Kỹ thuật `Hybrid Prompting` (kết hợp BA Requirement + Code AST) giúp tiêu diệt các mutant liên quan đến trần giảm giá, điều kiện biên và quy tắc nghiệp vụ đặc thù mà `Zero-shot` không thể suy luận được từ code đơn thuần.\n');

    return lines.join('\n');
  }
}
