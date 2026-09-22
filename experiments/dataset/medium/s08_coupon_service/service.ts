export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export interface Coupon {
  code: string;
  type: CouponType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  startDate: Date;
  endDate: Date;
  usageCount: number;
  maxUsage: number;
  isActive: boolean;
}

export interface ApplyCouponResult {
  code: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

export class CouponNotFoundException extends Error {
  constructor(message = 'Coupon code not found') {
    super(message);
    this.name = 'CouponNotFoundException';
  }
}

export class CouponInactiveException extends Error {
  constructor(message = 'Coupon is deactivated') {
    super(message);
    this.name = 'CouponInactiveException';
  }
}

export class CouponExpiredException extends Error {
  constructor(message = 'Coupon has expired or is not yet active') {
    super(message);
    this.name = 'CouponExpiredException';
  }
}

export class CouponExhaustedException extends Error {
  constructor(message = 'Coupon usage limit has been reached') {
    super(message);
    this.name = 'CouponExhaustedException';
  }
}

export class CouponAlreadyUsedByUserException extends Error {
  constructor(message = 'User has already used this coupon') {
    super(message);
    this.name = 'CouponAlreadyUsedByUserException';
  }
}

export class CouponConditionNotMetException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CouponConditionNotMetException';
  }
}

export interface ICouponRepository {
  findByCode(code: string): Promise<Coupon | null>;
  incrementUsage(code: string): Promise<void>;
}

export interface IUserCouponHistoryRepository {
  hasUserUsed(userId: string, code: string): Promise<boolean>;
  recordUsage(userId: string, code: string): Promise<void>;
}

export class CouponService {
  constructor(
    private readonly couponRepo: ICouponRepository,
    private readonly historyRepo: IUserCouponHistoryRepository
  ) {}

  public async applyCoupon(
    userId: string,
    code: string,
    orderAmount: number,
    now: Date = new Date()
  ): Promise<ApplyCouponResult> {
    if (orderAmount <= 0) {
      throw new Error('Order amount must be positive');
    }

    const coupon = await this.couponRepo.findByCode(code.toUpperCase().trim());
    if (!coupon) {
      throw new CouponNotFoundException();
    }

    if (!coupon.isActive) {
      throw new CouponInactiveException();
    }

    if (now < coupon.startDate || now > coupon.endDate) {
      throw new CouponExpiredException();
    }

    if (coupon.usageCount >= coupon.maxUsage) {
      throw new CouponExhaustedException();
    }

    const hasUsed = await this.historyRepo.hasUserUsed(userId, coupon.code);
    if (hasUsed) {
      throw new CouponAlreadyUsedByUserException();
    }

    if (orderAmount < coupon.minOrderAmount) {
      throw new CouponConditionNotMetException(
        `Order amount does not meet minimum requirement of ${coupon.minOrderAmount}`
      );
    }

    let discountAmount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      const rawDiscount = Math.round(orderAmount * (coupon.discountValue / 100));
      discountAmount = coupon.maxDiscountAmount
        ? Math.min(rawDiscount, coupon.maxDiscountAmount)
        : rawDiscount;
    } else {
      discountAmount = Math.min(coupon.discountValue, orderAmount);
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);

    return {
      code: coupon.code,
      originalAmount: orderAmount,
      discountAmount,
      finalAmount,
    };
  }
}
