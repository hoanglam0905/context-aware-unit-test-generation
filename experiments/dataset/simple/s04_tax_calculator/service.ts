export interface TaxCalculationRequest {
  grossIncome: number;
  insuranceContribution?: number;
  dependentsCount?: number;
}

export interface TaxBracketDetail {
  bracket: number;
  rate: number;
  taxableAmountInBracket: number;
  taxAmount: number;
}

export interface TaxCalculationResult {
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  totalTax: number;
  netIncome: number;
  bracketDetails: TaxBracketDetail[];
}

export class InvalidTaxInputException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTaxInputException';
  }
}

export class TaxCalculatorService {
  private static readonly PERSONAL_DEDUCTION = 11000000;
  private static readonly DEPENDENT_DEDUCTION = 4400000;

  // Cấu hình 7 bậc thuế lũy tiến: [ngưỡng trên, thuế suất]
  private static readonly TAX_BRACKETS: Array<{ limit: number; rate: number }> = [
    { limit: 5000000, rate: 0.05 },
    { limit: 10000000, rate: 0.10 },
    { limit: 18000000, rate: 0.15 },
    { limit: 32000000, rate: 0.20 },
    { limit: 52000000, rate: 0.25 },
    { limit: 80000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ];

  public calculateTax(req: TaxCalculationRequest): TaxCalculationResult {
    if (req.grossIncome < 0 || !Number.isFinite(req.grossIncome)) {
      throw new InvalidTaxInputException('Gross income must be non-negative');
    }
    const dependents = req.dependentsCount ?? 0;
    if (dependents < 0 || !Number.isInteger(dependents)) {
      throw new InvalidTaxInputException('Dependents count must be a non-negative integer');
    }
    const insurance = Math.max(0, req.insuranceContribution ?? 0);

    const totalDeductions =
      TaxCalculatorService.PERSONAL_DEDUCTION +
      dependents * TaxCalculatorService.DEPENDENT_DEDUCTION +
      insurance;

    const taxableIncome = Math.max(0, req.grossIncome - totalDeductions);
    const bracketDetails: TaxBracketDetail[] = [];
    let remainingTaxable = taxableIncome;
    let previousLimit = 0;
    let totalTax = 0;

    for (let i = 0; i < TaxCalculatorService.TAX_BRACKETS.length; i++) {
      const { limit, rate } = TaxCalculatorService.TAX_BRACKETS[i];
      const bracketCap = limit - previousLimit;

      if (remainingTaxable <= 0) break;

      const taxableInCurrent = Math.min(remainingTaxable, bracketCap);
      const taxInCurrent = Math.round(taxableInCurrent * rate);

      bracketDetails.push({
        bracket: i + 1,
        rate,
        taxableAmountInBracket: taxableInCurrent,
        taxAmount: taxInCurrent,
      });

      totalTax += taxInCurrent;
      remainingTaxable -= taxableInCurrent;
      previousLimit = limit;
    }

    const netIncome = req.grossIncome - insurance - totalTax;

    return {
      grossIncome: req.grossIncome,
      totalDeductions,
      taxableIncome,
      totalTax,
      netIncome,
      bracketDetails,
    };
  }
}
