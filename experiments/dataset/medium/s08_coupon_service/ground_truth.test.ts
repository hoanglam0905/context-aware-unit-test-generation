import {
  CouponService,
  CouponType,
  Coupon,
  ICouponRepository,
  IUserCouponHistoryRepository,
  CouponNotFoundException,
  CouponInactiveException,
  CouponExpiredException,
  CouponExhaustedException,
  CouponAlreadyUsedByUserException,
  CouponConditionNotMetException,
} from './service';

describe('CouponService (Ground Truth)', () => {
  let service: CouponService;
  let mockCouponRepo: jest.Mocked<ICouponRepository>;
  let mockHistoryRepo: jest.Mocked<IUserCouponHistoryRepository>;

  const validCoupon: Coupon = {
    code: 'SUMMER20',
    type: CouponType.PERCENTAGE,
    discountValue: 20,
    maxDiscountAmount: 300000,
    minOrderAmount: 500000,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-08-31'),
    usageCount: 10,
    maxUsage: 100,
    isActive: true,
  };

  const currentDate = new Date('2026-07-15');

  beforeEach(() => {
    mockCouponRepo = {
      findByCode: jest.fn(),
      incrementUsage: jest.fn().mockResolvedValue(undefined),
    };
    mockHistoryRepo = {
      hasUserUsed: jest.fn().mockResolvedValue(false),
      recordUsage: jest.fn().mockResolvedValue(undefined),
    };
    service = new CouponService(mockCouponRepo, mockHistoryRepo);
  });

  describe('Validation & Coupon Status', () => {
    it('should throw CouponNotFoundException when coupon code does not exist', async () => {
      mockCouponRepo.findByCode.mockResolvedValue(null);
      await expect(service.applyCoupon('user-1', 'INVALID', 1000000)).rejects.toThrow(
        CouponNotFoundException
      );
    });

    it('should throw CouponInactiveException when coupon is deactivated', async () => {
      mockCouponRepo.findByCode.mockResolvedValue({ ...validCoupon, isActive: false });
      await expect(service.applyCoupon('user-1', 'SUMMER20', 1000000)).rejects.toThrow(
        CouponInactiveException
      );
    });

    it('should throw CouponExpiredException when current date is outside validity window', async () => {
      mockCouponRepo.findByCode.mockResolvedValue(validCoupon);
      const expiredDate = new Date('2026-09-01');
      await expect(
        service.applyCoupon('user-1', 'SUMMER20', 1000000, expiredDate)
      ).rejects.toThrow(CouponExpiredException);
    });
  });

  describe('Usage limits & User history', () => {
    it('should throw CouponExhaustedException when usage reaches max limit', async () => {
      mockCouponRepo.findByCode.mockResolvedValue({
        ...validCoupon,
        usageCount: 100,
        maxUsage: 100,
      });
      await expect(
        service.applyCoupon('user-1', 'SUMMER20', 1000000, currentDate)
      ).rejects.toThrow(CouponExhaustedException);
    });

    it('should throw CouponAlreadyUsedByUserException if user already used this coupon', async () => {
      mockCouponRepo.findByCode.mockResolvedValue(validCoupon);
      mockHistoryRepo.hasUserUsed.mockResolvedValue(true);

      await expect(
        service.applyCoupon('user-1', 'SUMMER20', 1000000, currentDate)
      ).rejects.toThrow(CouponAlreadyUsedByUserException);
    });
  });

  describe('Discount Calculations & Caps', () => {
    it('should throw CouponConditionNotMetException when order subtotal is below min requirement', async () => {
      mockCouponRepo.findByCode.mockResolvedValue(validCoupon);

      await expect(
        service.applyCoupon('user-1', 'SUMMER20', 400000, currentDate) // min là 500k
      ).rejects.toThrow(CouponConditionNotMetException);
    });

    it('should cap discount to maxDiscountAmount (300,000 VND) for large percentage discount', async () => {
      // 2,000,000 * 20% = 400,000 -> Bị giới hạn ở mức trần 300,000 VND
      mockCouponRepo.findByCode.mockResolvedValue(validCoupon);

      const result = await service.applyCoupon('user-1', 'SUMMER20', 2000000, currentDate);

      expect(result.discountAmount).toBe(300000);
      expect(result.finalAmount).toBe(1700000);
    });

    it('should calculate FIXED_AMOUNT discount properly', async () => {
      mockCouponRepo.findByCode.mockResolvedValue({
        ...validCoupon,
        type: CouponType.FIXED_AMOUNT,
        discountValue: 50000,
        minOrderAmount: 200000,
      });

      const result = await service.applyCoupon('user-1', 'FIXED50', 500000, currentDate);

      expect(result.discountAmount).toBe(50000);
      expect(result.finalAmount).toBe(450000);
    });
  });
});
