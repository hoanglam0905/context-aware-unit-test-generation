export enum MembershipTier {
  REGULAR = 'REGULAR',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export interface DiscountResult {
  originalAmount: number;
  discountRate: number;
  discountAmount: number;
  finalAmount: number;
  isCapped: boolean;
}

export class InvalidOrderAmountException extends Error {
  constructor(message = 'Order amount must be greater than zero') {
    super(message);
    this.name = 'InvalidOrderAmountException';
  }
}

export class DiscountCalculatorService {
  private static readonly MAX_DISCOUNT_CAP = 500000;
  private static readonly GOLD_TIER_THRESHOLD = 1000000;

  /**
   * Tính toán chiết khấu đơn hàng dựa trên hạng thành viên và giá trị đơn hàng
   */
  public calculateDiscount(orderAmount: number, tier?: MembershipTier | string): DiscountResult {
    if (orderAmount <= 0 || !Number.isFinite(orderAmount)) {
      throw new InvalidOrderAmountException();
    }

    const resolvedTier = this.resolveTier(tier);
    const discountRate = this.getDiscountRate(resolvedTier, orderAmount);
    
    let rawDiscount = Math.round(orderAmount * discountRate);
    let isCapped = false;

    if (rawDiscount > DiscountCalculatorService.MAX_DISCOUNT_CAP) {
      rawDiscount = DiscountCalculatorService.MAX_DISCOUNT_CAP;
      isCapped = true;
    }

    const finalAmount = orderAmount - rawDiscount;

    return {
      originalAmount: orderAmount,
      discountRate,
      discountAmount: rawDiscount,
      finalAmount,
      isCapped,
    };
  }

  private resolveTier(tier?: string): MembershipTier {
    if (!tier) return MembershipTier.REGULAR;
    const upper = tier.toUpperCase();
    if (Object.values(MembershipTier).includes(upper as MembershipTier)) {
      return upper as MembershipTier;
    }
    return MembershipTier.REGULAR;
  }

  private getDiscountRate(tier: MembershipTier, amount: number): number {
    switch (tier) {
      case MembershipTier.PLATINUM:
        return 0.20;
      case MembershipTier.GOLD:
        return amount >= DiscountCalculatorService.GOLD_TIER_THRESHOLD ? 0.15 : 0.10;
      case MembershipTier.SILVER:
        return 0.05;
      case MembershipTier.REGULAR:
      default:
        return 0.0;
    }
  }
}
