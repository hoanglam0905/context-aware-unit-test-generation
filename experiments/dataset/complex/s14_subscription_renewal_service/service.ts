export type SubscriptionPlan = 'FREE' | 'PREMIUM' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  retryCount: number;
  lastRetryAt?: Date;
}

export const PLAN_PRICING: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PREMIUM: 99_000,
  ENTERPRISE: 499_000,
};

export class SubscriptionNotFoundException extends Error {
  constructor(id: string) {
    super(`Subscription ${id} not found`);
    this.name = 'SubscriptionNotFoundException';
  }
}

export interface IPaymentGateway {
  chargeRecurring(userId: string, amount: number): Promise<{ success: boolean; error?: string }>;
}

export interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  update(sub: Subscription): Promise<Subscription>;
}

export interface IEmailNotifier {
  sendPaymentSuccess(userId: string, plan: SubscriptionPlan, nextPeriodEnd: Date): Promise<void>;
  sendPaymentFailureWarning(
    userId: string,
    retryCount: number,
    gracePeriodDaysRemaining: number
  ): Promise<void>;
  sendSubscriptionSuspended(userId: string): Promise<void>;
}

export interface ITimeProvider {
  now(): Date;
}

export class SubscriptionRenewalService {
  private static readonly GRACE_PERIOD_DAYS = 7;
  private static readonly MAX_RETRY_COUNT = 3;

  constructor(
    private readonly subRepo: ISubscriptionRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly notifier: IEmailNotifier,
    private readonly timeProvider: ITimeProvider = { now: () => new Date() }
  ) {}

  public async renewSubscription(subscriptionId: string): Promise<Subscription> {
    const sub = await this.subRepo.findById(subscriptionId);
    if (!sub) {
      throw new SubscriptionNotFoundException(subscriptionId);
    }

    // Gói FREE hoặc đã CANCELLED không cần gia hạn
    if (sub.plan === 'FREE' || sub.status === 'CANCELLED') {
      return sub;
    }

    const now = this.timeProvider.now();
    const fee = PLAN_PRICING[sub.plan];

    const gracePeriodEnd = new Date(
      sub.currentPeriodEnd.getTime() + SubscriptionRenewalService.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );

    // Nếu đã thử tối đa số lần và quá hạn ân hạn
    if (sub.retryCount >= SubscriptionRenewalService.MAX_RETRY_COUNT && now.getTime() > gracePeriodEnd.getTime()) {
      sub.plan = 'FREE';
      sub.status = 'SUSPENDED';
      sub.lastRetryAt = now;

      const saved = await this.subRepo.update(sub);
      await this.notifier.sendSubscriptionSuspended(sub.userId);
      return saved;
    }

    // Thực hiện trừ tiền
    const chargeResult = await this.paymentGateway.chargeRecurring(sub.userId, fee);

    if (chargeResult.success) {
      // Gia hạn thêm 30 ngày từ mốc currentPeriodEnd cũ (hoặc từ now nếu đã quá hạn lâu)
      const baseTime = sub.currentPeriodEnd.getTime() > now.getTime() ? sub.currentPeriodEnd : now;
      const nextEnd = new Date(baseTime.getTime() + 30 * 24 * 60 * 60 * 1000);

      sub.currentPeriodEnd = nextEnd;
      sub.status = 'ACTIVE';
      sub.retryCount = 0;
      sub.lastRetryAt = now;

      const saved = await this.subRepo.update(sub);
      await this.notifier.sendPaymentSuccess(sub.userId, sub.plan, nextEnd);
      return saved;
    } else {
      // Thất bại -> tăng retryCount
      sub.retryCount += 1;
      sub.status = 'PAST_DUE';
      sub.lastRetryAt = now;

      const remainingMs = gracePeriodEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

      const saved = await this.subRepo.update(sub);
      await this.notifier.sendPaymentFailureWarning(sub.userId, sub.retryCount, daysRemaining);
      return saved;
    }
  }
}
