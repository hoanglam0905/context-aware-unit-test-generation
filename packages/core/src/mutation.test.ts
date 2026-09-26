import * as path from 'path';
import { CodeMutatorGenerator } from './mutation/mutators';
import { MutationAnalyzer } from './mutation/mutation_analyzer';
import { MutationSummary } from './mutation/types';

describe('Thành viên B - Core Engine (Step 3: Mutation Testing Pipeline & Analyzer)', () => {
  const rootDatasetDir = path.resolve(__dirname, '../../../experiments/dataset');

  describe('1. CodeMutatorGenerator', () => {
    let generator: CodeMutatorGenerator;

    beforeEach(() => {
      generator = new CodeMutatorGenerator();
    });

    it('sinh đầy đủ các dạng mutant: toán tử biên, so sánh, số học, boolean, hằng số', () => {
      const code = `
        export class SampleService {
          public check(amount: number, isActive: boolean): number {
            if (amount >= 1000 && isActive === true) {
              return amount * 0.15;
            }
            return amount + 10;
          }
        }
      `;

      const mutants = generator.generateMutants(code, 'sample.ts');

      expect(mutants.length).toBeGreaterThanOrEqual(4);

      // Boundary mutator (>= -> >)
      const boundaryMutant = mutants.find((m) => m.mutatorType === 'CONDITIONAL_BOUNDARY');
      expect(boundaryMutant).toBeDefined();
      expect(boundaryMutant?.mutatedCode).toContain('amount > 1000');

      // Equality mutator (=== -> !==)
      const equalityMutant = mutants.find((m) => m.mutatorType === 'EQUALITY_OPERATOR');
      expect(equalityMutant).toBeDefined();
      expect(equalityMutant?.mutatedCode).toContain('isActive !== true');

      // Boolean literal mutator (true -> false)
      const boolMutant = mutants.find((m) => m.mutatorType === 'BOOLEAN_LITERAL');
      expect(boolMutant).toBeDefined();
      expect(boolMutant?.mutatedCode).toContain('isActive === false');

      // Numeric / binary mutators
      const binaryMutant = mutants.find((m) => m.mutatorType === 'BINARY_EXPRESSION');
      expect(binaryMutant).toBeDefined();
    });

    it('sinh mutants từ service thực tế S01_DiscountCalculator', () => {
      const s01Code = `
        export class DiscountCalculatorService {
          private static readonly MAX_DISCOUNT_CAP = 500000;
          private static readonly GOLD_TIER_THRESHOLD = 1000000;

          public calculateDiscount(orderAmount: number, tier?: string): number {
            if (orderAmount <= 0) throw new Error();
            const rate = orderAmount >= 1000000 ? 0.15 : 0.10;
            const rawDiscount = orderAmount * rate;
            return rawDiscount > 500000 ? 500000 : rawDiscount;
          }
        }
      `;

      const mutants = generator.generateMutants(s01Code, 'service.ts');
      expect(mutants.length).toBeGreaterThanOrEqual(5);

      // Kiểm tra trần giảm giá cap
      const capMutant = mutants.find((m) => m.mutatorType === 'NUMERIC_LITERAL');
      expect(capMutant).toBeDefined();
    });
  });

  describe('2. MutationAnalyzer & Report Generator', () => {
    let analyzer: MutationAnalyzer;

    beforeEach(() => {
      analyzer = new MutationAnalyzer();
    });

    it('tính toán chính xác chỉ số Mutation Score và xác định các mutant logic chỉ bị diệt bởi Hybrid', () => {
      const mockSummaries: Record<string, MutationSummary> = {
        'zero-shot': {
          serviceId: 'S01_DiscountCalculator',
          strategy: 'zero-shot',
          totalMutants: 10,
          killedMutants: 5,
          survivedMutants: 5,
          timeoutMutants: 0,
          compileErrorMutants: 0,
          mutationScore: 50.0,
          durationMs: 1000,
          results: [
            { mutant: { id: 'MUT_001' } as any, status: 'KILLED', durationMs: 100 },
            { mutant: { id: 'MUT_002' } as any, status: 'SURVIVED', durationMs: 100 },
            { mutant: { id: 'MUT_003' } as any, status: 'SURVIVED', durationMs: 100 },
          ],
        },
        'hybrid': {
          serviceId: 'S01_DiscountCalculator',
          strategy: 'hybrid',
          totalMutants: 10,
          killedMutants: 9,
          survivedMutants: 1,
          timeoutMutants: 0,
          compileErrorMutants: 0,
          mutationScore: 90.0,
          durationMs: 1200,
          results: [
            { mutant: { id: 'MUT_001' } as any, status: 'KILLED', durationMs: 100 },
            { mutant: { id: 'MUT_002' } as any, status: 'KILLED', durationMs: 100 }, // Killed by hybrid!
            { mutant: { id: 'MUT_003' } as any, status: 'SURVIVED', durationMs: 100 },
          ],
        },
      };

      const comparison = analyzer.compareStrategies('S01_DiscountCalculator', mockSummaries);

      expect(comparison.strategies['hybrid'].mutationScore).toBe(90.0);
      expect(comparison.strategies['zero-shot'].mutationScore).toBe(50.0);
      expect(comparison.businessLogicMutantsKilledByHybridOnly).toContain('MUT_002');

      const markdown = analyzer.generateMarkdownReport(comparison);
      expect(markdown).toContain('Báo Cáo Phân Tích Mutation Testing');
      expect(markdown).toContain('HYBRID');
      expect(markdown).toContain('90%');
      expect(markdown).toContain('ZERO-SHOT');
      expect(markdown).toContain('50%');
    });
  });
});
