import { Mutant, MutantTestResult, MutationSummary } from './types';

export interface RefinedTestScenario {
  id: string;
  targetMutantId: string;
  mutatorType: string;
  lineNumber: number;
  description: string;
  suggestedInputFocus: string;
  expectedAssertion: string;
}

export interface RefinementResult {
  serviceId: string;
  survivedMutantsCount: number;
  initialMutationScore: number;
  suggestedScenarios: RefinedTestScenario[];
  feedbackPrompt: string;
}

/**
 * Mutation-Guided Refinement Engine
 * Phân tích các mutants còn sống sót (survived mutants) sau mutation testing
 * và tự động tạo feedback/kịch bản test bổ sung nhắm thẳng vào mutant để nâng cao mutation score.
 */
export class MutationGuidedRefiner {
  /**
   * Phân tích tóm tắt kiểm thử đột biến và đề xuất các kịch bản kiểm thử bổ sung
   */
  public analyzeAndSuggestRefinement(
    summary: MutationSummary,
    serviceCode: string
  ): RefinementResult {
    const survivedResults = summary.results.filter((r) => r.status === 'SURVIVED');
    const suggestedScenarios: RefinedTestScenario[] = [];

    survivedResults.forEach((res, idx) => {
      const m = res.mutant;
      const scenarioId = `TC-REFINE-${String(idx + 1).padStart(3, '0')}`;
      let suggestedInput = 'Kiểm tra giá trị biên hoặc trường hợp đối nghịch';
      let expectedAssertion = `Phát hiện sự sai lệch giữa mã gốc ("${m.originalCode.trim()}") và mã đột biến ("${m.mutatedCode.trim()}")`;

      switch (m.mutatorType) {
        case 'CONDITIONAL_BOUNDARY':
          suggestedInput = 'Truyền giá trị đầu vào chính xác tại ngưỡng biên (ví dụ: điểm cắt min/max)';
          expectedAssertion = `Xác minh hành vi tại điểm biên bằng cách assert giá trị tại đúng ngưỡng`;
          break;
        case 'BINARY_EXPRESSION':
          suggestedInput = 'Truyền giá trị đầu vào làm nổi bật sự khác biệt giữa phép cộng và trừ (orderAmount > 0)';
          expectedAssertion = 'Assert giá trị số học tuyệt đối để phát hiện phép toán bị đảo chiều';
          break;
        case 'EQUALITY_OPERATOR':
          suggestedInput = 'Truyền các giá trị gần bằng nhưng không bằng nhau';
          expectedAssertion = 'Assert chặt chẽ tính bằng nhau hoặc không bằng nhau';
          break;
        case 'RETURN_VALUE':
          suggestedInput = 'Kiểm tra giá trị trả về trong trường hợp đặc biệt';
          expectedAssertion = 'Assert cụ thể giá trị trả về khác mặc định';
          break;
      }

      suggestedScenarios.push({
        id: scenarioId,
        targetMutantId: m.id,
        mutatorType: m.mutatorType,
        lineNumber: m.lineNumber,
        description: `Bổ sung test case diệt mutant ${m.id} (${m.description} tại dòng ${m.lineNumber})`,
        suggestedInputFocus: suggestedInput,
        expectedAssertion,
      });
    });

    const feedbackPrompt = this.buildFeedbackPrompt(summary.serviceId, survivedResults, serviceCode);

    return {
      serviceId: summary.serviceId,
      survivedMutantsCount: survivedResults.length,
      initialMutationScore: summary.mutationScore,
      suggestedScenarios,
      feedbackPrompt,
    };
  }

  /**
   * Tạo prompt phản hồi tự động gửi cho LLM để sinh thêm test diệt mutant còn sống
   */
  private buildFeedbackPrompt(
    serviceId: string,
    survived: MutantTestResult[],
    serviceCode: string
  ): string {
    const mutantList = survived
      .map(
        (s, i) =>
          `${i + 1}. Mutant ${s.mutant.id} (Dòng ${s.mutant.lineNumber}, loại ${s.mutant.mutatorType}):\n` +
          `   - Mã gốc:    ${s.mutant.originalCode.trim()}\n` +
          `   - Mã đột biến: ${s.mutant.mutatedCode.trim()}\n` +
          `   - Lý do sống sót: Bộ test hiện tại chưa kiểm tra giá trị phân biệt được sự thay đổi này.`
      )
      .join('\n\n');

    return `### MUTATION-GUIDED REFINEMENT FEEDBACK FOR ${serviceId}:
Bộ kiểm thử hiện tại đã bỏ sót ${survived.length} mutants còn sống sót:

${mutantList}

### YÊU CẦU:
1. Hãy viết bổ sung các test cases cụ thể trong Jest để "tiêu diệt" (kill) các mutants trên.
2. Mỗi test case bổ sung phải tập trung vào giá trị đầu vào làm cho kết quả của mã gốc khác biệt hoàn toàn với mã đột biến.
3. Không làm ảnh hưởng tới các test case hiện có.`;
  }
}
