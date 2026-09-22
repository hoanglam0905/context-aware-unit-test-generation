import {
  TaxCalculatorService,
  InvalidTaxInputException,
} from './service';

describe('TaxCalculatorService (Ground Truth)', () => {
  let service: TaxCalculatorService;

  beforeEach(() => {
    service = new TaxCalculatorService();
  });

  describe('Validation', () => {
    it('should throw InvalidTaxInputException when grossIncome is negative', () => {
      expect(() =>
        service.calculateTax({ grossIncome: -1000 })
      ).toThrow(InvalidTaxInputException);
    });

    it('should throw InvalidTaxInputException when dependentsCount is negative', () => {
      expect(() =>
        service.calculateTax({ grossIncome: 20000000, dependentsCount: -1 })
      ).toThrow('Dependents count must be a non-negative integer');
    });
  });

  describe('Zero and Low Income Scenarios', () => {
    it('should result in 0 tax when gross income is below personal deduction (11M)', () => {
      const result = service.calculateTax({ grossIncome: 10000000 });
      expect(result.taxableIncome).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.netIncome).toBe(10000000);
      expect(result.bracketDetails).toHaveLength(0);
    });

    it('should consider insurance and dependents in total deductions', () => {
      // 20M gross - 2M ins - 11M self - 4.4M (1 dep) = 2.6M taxable
      const result = service.calculateTax({
        grossIncome: 20000000,
        insuranceContribution: 2000000,
        dependentsCount: 1,
      });
      expect(result.totalDeductions).toBe(17400000);
      expect(result.taxableIncome).toBe(2600000);
      expect(result.totalTax).toBe(130000); // 2.6M * 5%
    });
  });

  describe('Progressive Multi-Bracket Tax Calculations', () => {
    it('should calculate Bracket 1 (5%) correctly', () => {
      // 15M gross - 1.5M ins - 11M self = 2.5M taxable in Bracket 1
      const result = service.calculateTax({
        grossIncome: 15000000,
        insuranceContribution: 1500000,
      });
      expect(result.taxableIncome).toBe(2500000);
      expect(result.totalTax).toBe(125000);
      expect(result.bracketDetails).toHaveLength(1);
      expect(result.bracketDetails[0].rate).toBe(0.05);
    });

    it('should calculate across 3 brackets correctly (Tier 1, 2, and 3)', () => {
      // 30M gross - 3M ins - 11M self - 4.4M (1 dep) = 11.6M taxable
      // B1: 5M * 5% = 250k
      // B2: 5M * 10% = 500k
      // B3: 1.6M * 15% = 240k
      // Total = 990k
      const result = service.calculateTax({
        grossIncome: 30000000,
        insuranceContribution: 3000000,
        dependentsCount: 1,
      });
      expect(result.taxableIncome).toBe(11600000);
      expect(result.totalTax).toBe(990000);
      expect(result.bracketDetails).toHaveLength(3);
      expect(result.bracketDetails[0].taxAmount).toBe(250000);
      expect(result.bracketDetails[1].taxAmount).toBe(500000);
      expect(result.bracketDetails[2].taxAmount).toBe(240000);
      expect(result.netIncome).toBe(30000000 - 3000000 - 990000);
    });
  });
});
