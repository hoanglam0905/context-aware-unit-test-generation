import {
  DiscountCalculatorService,
  InvalidOrderAmountException,
  MembershipTier,
} from './discount-calculator.service';

describe('DiscountCalculatorService', () => {
  let service: DiscountCalculatorService;

  beforeEach(() => {
    service = new DiscountCalculatorService();
  });

  describe('Validation & Error Handling', () => {
    it.each([
      [0, 'zero'],
      [-1, 'negative number'],
      [-100000, 'large negative number'],
      [NaN, 'NaN'],
      [Infinity, 'Infinity'],
      [-Infinity, '-Infinity'],
    ])('should throw InvalidOrderAmountException when orderAmount is %s (%s)', (invalidAmount) => {
      expect(() => service.calculateDiscount(invalidAmount, MembershipTier.REGULAR)).toThrow(
        InvalidOrderAmountException
      );
      expect(() => service.calculateDiscount(invalidAmount, MembershipTier.REGULAR)).toThrow(
        'Order amount must be greater than zero'
      );
    });

    it('should set the custom error name correctly', () => {
      try {
        service.calculateDiscount(-50);
        fail('Expected InvalidOrderAmountException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidOrderAmountException);
        expect((error as InvalidOrderAmountException).name).toBe('InvalidOrderAmountException');
      }
    });
  });

  describe('Tier Resolution', () => {
    it('should default to REGULAR when tier is undefined or omitted', () => {
      const resultWithoutParam = service.calculateDiscount(100_000);
      const resultWithUndefined = service.calculateDiscount(100_000, undefined);

      expect(resultWithoutParam.discountRate).toBe(0.0);
      expect(resultWithoutParam.discountAmount).toBe(0);
      expect(resultWithoutParam.finalAmount).toBe(100_000);

      expect(resultWithUndefined.discountRate).toBe(0.0);
      expect(resultWithUndefined.discountAmount).toBe(0);
    });

    it('should default to REGULAR when an unknown tier string is provided', () => {
      const result = service.calculateDiscount(100_000, 'DIAMOND');
      expect(result.discountRate).toBe(0.0);
      expect(result.discountAmount).toBe(0);
      expect(result.finalAmount).toBe(100_000);
    });

    it('should handle case-insensitive tier strings', () => {
      const lowerSilver = service.calculateDiscount(100_000, 'silver');
      const mixedPlatinum = service.calculateDiscount(100_000, 'pLaTiNuM');

      expect(lowerSilver.discountRate).toBe(0.05);
      expect(lowerSilver.discountAmount).toBe(5_000);

      expect(mixedPlatinum.discountRate).toBe(0.20);
      expect(mixedPlatinum.discountAmount).toBe(20_000);
    });
  });

  describe('Discount Calculations by Tier', () => {
    describe('REGULAR Tier', () => {
      it('should return 0% discount regardless of amount', () => {
        const result = service.calculateDiscount(500_000, MembershipTier.REGULAR);

        expect(result).toEqual({
          originalAmount: 500_000,
          discountRate: 0.0,
          discountAmount: 0,
          finalAmount: 500_000,
          isCapped: false,
        });
      });
    });

    describe('SILVER Tier', () => {
      it('should apply 5% discount for SILVER tier', () => {
        const result = service.calculateDiscount(200_000, MembershipTier.SILVER);

        expect(result).toEqual({
          originalAmount: 200_000,
          discountRate: 0.05,
          discountAmount: 10_000,
          finalAmount: 190_000,
          isCapped: false,
        });
      });

      it('should round discount amounts to the nearest integer', () => {
        // 333,333 * 0.05 = 16,666.65 -> rounded to 16,667
        const result = service.calculateDiscount(333_333, MembershipTier.SILVER);

        expect(result.discountAmount).toBe(16_667);
        expect(result.finalAmount).toBe(333_333 - 16_667);
      });
    });

    describe('GOLD Tier (Threshold Boundaries)', () => {
      it('should apply 10% discount when amount is strictly below GOLD_TIER_THRESHOLD (999,999)', () => {
        const orderAmount = 999_999;
        const result = service.calculateDiscount(orderAmount, MembershipTier.GOLD);

        // 999,999 * 0.10 = 99,999.9 -> 100,000
        expect(result.discountRate).toBe(0.10);
        expect(result.discountAmount).toBe(100_000);
        expect(result.finalAmount).toBe(orderAmount - 100_000);
        expect(result.isCapped).toBe(false);
      });

      it('should apply 15% discount when amount exactly reaches GOLD_TIER_THRESHOLD (1,000,000)', () => {
        const orderAmount = 1_000_000;
        const result = service.calculateDiscount(orderAmount, MembershipTier.GOLD);

        expect(result.discountRate).toBe(0.15);
        expect(result.discountAmount).toBe(150_000);
        expect(result.finalAmount).toBe(850_000);
        expect(result.isCapped).toBe(false);
      });

      it('should apply 15% discount when amount is above GOLD_TIER_THRESHOLD (1,000,001)', () => {
        const orderAmount = 1_000_001;
        const result = service.calculateDiscount(orderAmount, MembershipTier.GOLD);

        // 1,000,001 * 0.15 = 150,000.15 -> 150,000
        expect(result.discountRate).toBe(0.15);
        expect(result.discountAmount).toBe(150_000);
        expect(result.finalAmount).toBe(850_001);
        expect(result.isCapped).toBe(false);
      });
    });

    describe('PLATINUM Tier', () => {
      it('should apply 20% discount for PLATINUM tier below cap', () => {
        const orderAmount = 1_000_000;
        const result = service.calculateDiscount(orderAmount, MembershipTier.PLATINUM);

        expect(result).toEqual({
          originalAmount: orderAmount,
          discountRate: 0.20,
          discountAmount: 200_000,
          finalAmount: 800_000,
          isCapped: false,
        });
      });
    });
  });

  describe('Discount Cap (MAX_DISCOUNT_CAP = 500,000)', () => {
    it('should not cap when discount is strictly below 500,000', () => {
      // 2,499_990 * 0.20 = 499,998
      const orderAmount = 2_499_990;
      const result = service.calculateDiscount(orderAmount, MembershipTier.PLATINUM);

      expect(result.discountAmount).toBe(499_998);
      expect(result.finalAmount).toBe(orderAmount - 499_998);
      expect(result.isCapped).toBe(false);
    });

    it('should not mark isCapped as true when discount is exactly equal to 500,000', () => {
      // 2,500,000 * 0.20 = 500,000
      const orderAmount = 2_500_000;
      const result = service.calculateDiscount(orderAmount, MembershipTier.PLATINUM);

      expect(result.discountAmount).toBe(500_000);
      expect(result.finalAmount).toBe(2_000_000);
      expect(result.isCapped).toBe(false);
    });

    it('should cap discount amount to 500,000 and set isCapped=true when raw discount exceeds 500,000', () => {
      // 3,000,000 * 0.20 = 600,000 -> capped to 500,000
      const orderAmount = 3_000_000;
      const result = service.calculateDiscount(orderAmount, MembershipTier.PLATINUM);

      expect(result).toEqual({
        originalAmount: orderAmount,
        discountRate: 0.20,
        discountAmount: 500_000,
        finalAmount: 2_500_000,
        isCapped: true,
      });
    });

    it('should cap correctly for large GOLD tier orders', () => {
      // 4,000,000 * 0.15 = 600,000 -> capped to 500,000
      const orderAmount = 4_000_000;
      const result = service.calculateDiscount(orderAmount, MembershipTier.GOLD);

      expect(result).toEqual({
        originalAmount: orderAmount,
        discountRate: 0.15,
        discountAmount: 500_000,
        finalAmount: 3_500_000,
        isCapped: true,
      });
    });
  });

  describe('Edge Case Values', () => {
    it('should handle minimal positive orderAmount (orderAmount = 1)', () => {
      const result = service.calculateDiscount(1, MembershipTier.PLATINUM);
      // 1 * 0.20 = 0.2 -> rounded to 0
      expect(result).toEqual({
        originalAmount: 1,
        discountRate: 0.20,
        discountAmount: 0,
        finalAmount: 1,
        isCapped: false,
      });
    });
  });
});