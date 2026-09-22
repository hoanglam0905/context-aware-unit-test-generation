import {
  ShippingFeeCalculatorService,
  ShippingMethod,
  InvalidShippingInputException,
} from './service';

describe('ShippingFeeCalculatorService (Ground Truth)', () => {
  let service: ShippingFeeCalculatorService;

  beforeEach(() => {
    service = new ShippingFeeCalculatorService();
  });

  describe('Validation & Edge Cases', () => {
    it('should throw InvalidShippingInputException when distance is <= 0', () => {
      expect(() =>
        service.calculateFee({ distanceKm: 0, weightKg: 1 })
      ).toThrow('Distance must be greater than 0');

      expect(() =>
        service.calculateFee({ distanceKm: -5, weightKg: 1 })
      ).toThrow(InvalidShippingInputException);
    });

    it('should throw InvalidShippingInputException when weight is <= 0', () => {
      expect(() =>
        service.calculateFee({ distanceKm: 10, weightKg: 0 })
      ).toThrow('Weight must be greater than 0');

      expect(() =>
        service.calculateFee({ distanceKm: 10, weightKg: -2 })
      ).toThrow(InvalidShippingInputException);
    });
  });

  describe('Distance Tiers Calculation', () => {
    it('should return fixed 15,000 VND base fee for distance <= 5 km', () => {
      const result = service.calculateFee({ distanceKm: 4, weightKg: 1 });
      expect(result.baseDistanceFee).toBe(15000);
      expect(result.weightSurcharge).toBe(0);
      expect(result.finalShippingFee).toBe(15000);
    });

    it('should calculate base fee correctly for distance between 5 and 20 km (Boundary test)', () => {
      // 10km -> 15,000 + 5 * 3,000 = 30,000
      const result = service.calculateFee({ distanceKm: 10, weightKg: 2 });
      expect(result.baseDistanceFee).toBe(30000);
      expect(result.weightSurcharge).toBe(0);
      expect(result.finalShippingFee).toBe(30000);
    });

    it('should calculate base fee correctly for distance > 20 km', () => {
      // 25km -> 15,000 + (15 * 3,000 = 45,000) + (5 * 5,000 = 25,000) = 85,000
      const result = service.calculateFee({ distanceKm: 25, weightKg: 2 });
      expect(result.baseDistanceFee).toBe(85000);
      expect(result.finalShippingFee).toBe(85000);
    });
  });

  describe('Weight Surcharges', () => {
    it('should be free of weight surcharge for weight <= 2 kg', () => {
      const result = service.calculateFee({ distanceKm: 5, weightKg: 2.0 });
      expect(result.weightSurcharge).toBe(0);
    });

    it('should charge 5,000 VND per extra kg rounded up', () => {
      // 3.2 kg -> vượt 1.2 kg -> làm tròn thành 2 kg vượt -> phụ thu 10,000
      const result = service.calculateFee({ distanceKm: 5, weightKg: 3.2 });
      expect(result.weightSurcharge).toBe(10000);
      expect(result.finalShippingFee).toBe(25000); // 15,000 + 10,000
    });
  });

  describe('Shipping Methods & Express Multiplier', () => {
    it('should apply 1.5 multiplier for EXPRESS shipping method', () => {
      // distance 5km (15k) + weight 4kg (vượt 2kg = 10k) = 25k -> Express 1.5 = 37,500
      const result = service.calculateFee({
        distanceKm: 5,
        weightKg: 4,
        method: ShippingMethod.EXPRESS,
      });
      expect(result.expressMultiplier).toBe(1.5);
      expect(result.finalShippingFee).toBe(37500);
    });
  });

  describe('Freeship Policy for High-Value Orders', () => {
    it('should deduct up to 30,000 VND for STANDARD orders >= 500,000 VND', () => {
      // base 15,000 + weight 10,000 = 25,000 -> Giảm tối đa 30,000 -> Còn 0 VND
      const result = service.calculateFee({
        distanceKm: 5,
        weightKg: 4,
        method: ShippingMethod.STANDARD,
        orderSubtotal: 600000,
      });
      expect(result.discountAmount).toBe(25000);
      expect(result.finalShippingFee).toBe(0);
    });

    it('should NOT apply freeship discount for EXPRESS orders even if subtotal >= 500,000 VND', () => {
      const result = service.calculateFee({
        distanceKm: 5,
        weightKg: 2,
        method: ShippingMethod.EXPRESS,
        orderSubtotal: 1000000,
      });
      expect(result.discountAmount).toBe(0);
      expect(result.finalShippingFee).toBe(22500); // 15,000 * 1.5
    });
  });
});
