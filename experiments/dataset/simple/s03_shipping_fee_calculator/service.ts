export enum ShippingMethod {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
}

export interface ShippingCalculationRequest {
  distanceKm: number;
  weightKg: number;
  method?: ShippingMethod | string;
  orderSubtotal?: number;
}

export interface ShippingFeeBreakdown {
  baseDistanceFee: number;
  weightSurcharge: number;
  expressMultiplier: number;
  discountAmount: number;
  finalShippingFee: number;
}

export class InvalidShippingInputException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidShippingInputException';
  }
}

export class ShippingFeeCalculatorService {
  private static readonly BASE_DISTANCE_FEE = 15000;
  private static readonly NEAR_KM_LIMIT = 5;
  private static readonly MID_KM_LIMIT = 20;
  private static readonly RATE_5_TO_20 = 3000;
  private static readonly RATE_ABOVE_20 = 5000;

  private static readonly FREE_WEIGHT_KG = 2;
  private static readonly WEIGHT_SURCHARGE_PER_KG = 5000;

  private static readonly FREESHIP_ORDER_THRESHOLD = 500000;
  private static readonly MAX_FREESHIP_DISCOUNT = 30000;

  public calculateFee(req: ShippingCalculationRequest): ShippingFeeBreakdown {
    if (!req || req.distanceKm <= 0 || !Number.isFinite(req.distanceKm)) {
      throw new InvalidShippingInputException('Distance must be greater than 0');
    }
    if (req.weightKg <= 0 || !Number.isFinite(req.weightKg)) {
      throw new InvalidShippingInputException('Weight must be greater than 0');
    }

    // 1. Phí theo khoảng cách
    const baseDistanceFee = this.calculateDistanceFee(req.distanceKm);

    // 2. Phụ phí cân nặng
    const weightSurcharge = this.calculateWeightSurcharge(req.weightKg);

    // 3. Phương thức vận chuyển
    const method = this.resolveMethod(req.method);
    const expressMultiplier = method === ShippingMethod.EXPRESS ? 1.5 : 1.0;

    let subtotalShipping = (baseDistanceFee + weightSurcharge) * expressMultiplier;

    // 4. Chính sách freeship
    let discountAmount = 0;
    if (method === ShippingMethod.STANDARD && (req.orderSubtotal || 0) >= ShippingFeeCalculatorService.FREESHIP_ORDER_THRESHOLD) {
      discountAmount = Math.min(subtotalShipping, ShippingFeeCalculatorService.MAX_FREESHIP_DISCOUNT);
    }

    const finalShippingFee = Math.max(0, Math.round(subtotalShipping - discountAmount));

    return {
      baseDistanceFee,
      weightSurcharge,
      expressMultiplier,
      discountAmount,
      finalShippingFee,
    };
  }

  private calculateDistanceFee(distanceKm: number): number {
    if (distanceKm <= ShippingFeeCalculatorService.NEAR_KM_LIMIT) {
      return ShippingFeeCalculatorService.BASE_DISTANCE_FEE;
    }

    if (distanceKm <= ShippingFeeCalculatorService.MID_KM_LIMIT) {
      const extraKm = distanceKm - ShippingFeeCalculatorService.NEAR_KM_LIMIT;
      return ShippingFeeCalculatorService.BASE_DISTANCE_FEE + extraKm * ShippingFeeCalculatorService.RATE_5_TO_20;
    }

    // > 20 km
    const midKmSpan = ShippingFeeCalculatorService.MID_KM_LIMIT - ShippingFeeCalculatorService.NEAR_KM_LIMIT; // 15 km
    const extraKmAbove20 = distanceKm - ShippingFeeCalculatorService.MID_KM_LIMIT;
    return (
      ShippingFeeCalculatorService.BASE_DISTANCE_FEE +
      midKmSpan * ShippingFeeCalculatorService.RATE_5_TO_20 +
      extraKmAbove20 * ShippingFeeCalculatorService.RATE_ABOVE_20
    );
  }

  private calculateWeightSurcharge(weightKg: number): number {
    if (weightKg <= ShippingFeeCalculatorService.FREE_WEIGHT_KG) {
      return 0;
    }
    const chargeableWeight = Math.ceil(weightKg - ShippingFeeCalculatorService.FREE_WEIGHT_KG);
    return chargeableWeight * ShippingFeeCalculatorService.WEIGHT_SURCHARGE_PER_KG;
  }

  private resolveMethod(method?: string): ShippingMethod {
    if (!method) return ShippingMethod.STANDARD;
    const upper = method.toUpperCase();
    if (upper === ShippingMethod.EXPRESS) {
      return ShippingMethod.EXPRESS;
    }
    return ShippingMethod.STANDARD;
  }
}
