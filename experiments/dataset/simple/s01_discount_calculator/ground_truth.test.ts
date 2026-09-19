import {
  DiscountCalculatorService,
  MembershipTier,
  InvalidOrderAmountException,
} from './service';

describe('DiscountCalculatorService (Ground Truth)', () => {
  let service: DiscountCalculatorService;

  beforeEach(() => {
    service = new DiscountCalculatorService();
  });

  describe('Validation & Edge Cases', () => {
    it('should throw InvalidOrderAmountException when amount is 0', () => {
      expect(() => service.calculateDiscount(0, MembershipTier.REGULAR))
        .toThrow(InvalidOrderAmountException);
    });

    it('should throw InvalidOrderAmountException when amount is negative', () => {
      expect(() => service.calculateDiscount(-10000, MembershipTier.SILVER))
        .toThrow(InvalidOrderAmountException);
    });

    it('should default to REGULAR tier when tier is undefined', () => {
      const result = service.calculateDiscount(100000);
      expect(result.discountRate).toBe(0.0);
      expect(result.discountAmount).toBe(0);
      expect(result.finalAmount).toBe(100000);
      expect(result.isCapped).toBe(false);
    });

    it('should default to REGULAR tier when tier is invalid string', () => {
      const result = service.calculateDiscount(100000, 'UNKNOWN_TIER');
      expect(result.discountRate).toBe(0.0);
      expect(result.discountAmount).toBe(0);
    });
  });

  describe('Business Rules by Tier', () => {
    it('should give 0% discount for REGULAR tier', () => {
      const result = service.calculateDiscount(500000, MembershipTier.REGULAR);
      expect(result.discountRate).toBe(0.0);
      expect(result.discountAmount).toBe(0);
      expect(result.finalAmount).toBe(500000);
      expect(result.isCapped).toBe(false);
    });

    it('should give 5% discount for SILVER tier', () => {
      const result = service.calculateDiscount(500000, MembershipTier.SILVER);
      expect(result.discountRate).toBe(0.05);
      expect(result.discountAmount).toBe(25000);
      expect(result.finalAmount).toBe(475000);
      expect(result.isCapped).toBe(false);
    });

    it('should give 10% discount for GOLD tier when amount < 1,000,000', () => {
      const result = service.calculateDiscount(999999, MembershipTier.GOLD);
      expect(result.discountRate).toBe(0.10);
      expect(result.discountAmount).toBe(100000);
      expect(result.finalAmount).toBe(899999);
      expect(result.isCapped).toBe(false);
    });

    it('should give 15% discount for GOLD tier when amount >= 1,000,000 (Boundary Value)', () => {
      const result = service.calculateDiscount(1000000, MembershipTier.GOLD);
      expect(result.discountRate).toBe(0.15);
      expect(result.discountAmount).toBe(150000);
      expect(result.finalAmount).toBe(850000);
      expect(result.isCapped).toBe(false);
    });

    it('should give 20% discount for PLATINUM tier without reaching cap', () => {
      const result = service.calculateDiscount(2000000, MembershipTier.PLATINUM);
      expect(result.discountRate).toBe(0.20);
      expect(result.discountAmount).toBe(400000);
      expect(result.finalAmount).toBe(1600000);
      expect(result.isCapped).toBe(false);
    });
  });

  describe('Discount Cap (Trần giảm giá 500,000 VND)', () => {
    it('should cap discount amount at 500,000 VND when calculated discount exceeds 500k', () => {
      // 4,000,000 * 20% = 800,000 -> Bị cap về 500,000
      const result = service.calculateDiscount(4000000, MembershipTier.PLATINUM);
      expect(result.discountRate).toBe(0.20);
      expect(result.discountAmount).toBe(500000);
      expect(result.finalAmount).toBe(3500000);
      expect(result.isCapped).toBe(true);
    });

    it('should cap discount amount for GOLD tier with very large order', () => {
      // 5,000,000 * 15% = 750,000 -> Bị cap về 500,000
      const result = service.calculateDiscount(5000000, MembershipTier.GOLD);
      expect(result.discountAmount).toBe(500000);
      expect(result.finalAmount).toBe(4500000);
      expect(result.isCapped).toBe(true);
    });
  });
});
