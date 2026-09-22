import {
  SubscriptionRenewalService,
  ISubscriptionRepository,
  IPaymentGateway,
  IEmailNotifier,
  ITimeProvider,
  Subscription,
  SubscriptionNotFoundException,
} from './service';

describe('SubscriptionRenewalService (Ground Truth)', () => {
  let subRepo: jest.Mocked<ISubscriptionRepository>;
  let paymentGateway: jest.Mocked<IPaymentGateway>;
  let notifier: jest.Mocked<IEmailNotifier>;
  let timeProvider: jest.Mocked<ITimeProvider>;
  let service: SubscriptionRenewalService;

  const fixedNow = new Date('2026-09-22T00:00:00Z');

  beforeEach(() => {
    subRepo = {
      findById: jest.fn(),
      update: jest.fn().mockImplementation(async (s) => ({ ...s })),
    };
    paymentGateway = {
      chargeRecurring: jest.fn(),
    };
    notifier = {
      sendPaymentSuccess: jest.fn(),
      sendPaymentFailureWarning: jest.fn(),
      sendSubscriptionSuspended: jest.fn(),
    };
    timeProvider = {
      now: jest.fn().mockReturnValue(fixedNow),
    };

    service = new SubscriptionRenewalService(subRepo, paymentGateway, notifier, timeProvider);
  });

  describe('renewSubscription', () => {
    it('should throw SubscriptionNotFoundException when subscription does not exist', async () => {
      subRepo.findById.mockResolvedValue(null);

      await expect(service.renewSubscription('SUB-404')).rejects.toThrow(
        SubscriptionNotFoundException
      );
    });

    it('should not charge or change FREE plan subscriptions', async () => {
      const freeSub: Subscription = {
        id: 'SUB-FREE',
        userId: 'USER-1',
        plan: 'FREE',
        status: 'ACTIVE',
        currentPeriodEnd: fixedNow,
        retryCount: 0,
      };
      subRepo.findById.mockResolvedValue(freeSub);

      const result = await service.renewSubscription('SUB-FREE');

      expect(result.plan).toBe('FREE');
      expect(paymentGateway.chargeRecurring).not.toHaveBeenCalled();
    });

    it('should not charge or change CANCELLED subscriptions', async () => {
      const cancelledSub: Subscription = {
        id: 'SUB-CANCELLED',
        userId: 'USER-1',
        plan: 'PREMIUM',
        status: 'CANCELLED',
        currentPeriodEnd: fixedNow,
        retryCount: 0,
      };
      subRepo.findById.mockResolvedValue(cancelledSub);

      const result = await service.renewSubscription('SUB-CANCELLED');

      expect(result.status).toBe('CANCELLED');
      expect(paymentGateway.chargeRecurring).not.toHaveBeenCalled();
    });

    it('should successfully charge PREMIUM plan and extend period by 30 days', async () => {
      const activeSub: Subscription = {
        id: 'SUB-PREMIUM',
        userId: 'USER-1',
        plan: 'PREMIUM',
        status: 'ACTIVE',
        currentPeriodEnd: fixedNow,
        retryCount: 1, // had 1 prior failure
      };
      subRepo.findById.mockResolvedValue(activeSub);
      paymentGateway.chargeRecurring.mockResolvedValue({ success: true });

      const result = await service.renewSubscription('SUB-PREMIUM');

      expect(paymentGateway.chargeRecurring).toHaveBeenCalledWith('USER-1', 99_000);
      expect(result.status).toBe('ACTIVE');
      expect(result.retryCount).toBe(0);
      expect(result.currentPeriodEnd.getTime()).toBe(fixedNow.getTime() + 30 * 24 * 60 * 60 * 1000);
      expect(notifier.sendPaymentSuccess).toHaveBeenCalledWith(
        'USER-1',
        'PREMIUM',
        result.currentPeriodEnd
      );
    });

    it('should increment retryCount and set PAST_DUE when payment fails', async () => {
      const activeSub: Subscription = {
        id: 'SUB-ENTERPRISE',
        userId: 'USER-2',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        currentPeriodEnd: fixedNow,
        retryCount: 1,
      };
      subRepo.findById.mockResolvedValue(activeSub);
      paymentGateway.chargeRecurring.mockResolvedValue({ success: false, error: 'Insufficient funds' });

      const result = await service.renewSubscription('SUB-ENTERPRISE');

      expect(paymentGateway.chargeRecurring).toHaveBeenCalledWith('USER-2', 499_000);
      expect(result.status).toBe('PAST_DUE');
      expect(result.retryCount).toBe(2);
      expect(notifier.sendPaymentFailureWarning).toHaveBeenCalledWith('USER-2', 2, expect.any(Number));
    });

    it('should suspend and downgrade to FREE when retryCount >= 3 and grace period has elapsed', async () => {
      const pastDueSub: Subscription = {
        id: 'SUB-OVERDUE',
        userId: 'USER-3',
        plan: 'PREMIUM',
        status: 'PAST_DUE',
        currentPeriodEnd: new Date(fixedNow.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days overdue (grace period is 7)
        retryCount: 3,
      };
      subRepo.findById.mockResolvedValue(pastDueSub);

      const result = await service.renewSubscription('SUB-OVERDUE');

      expect(paymentGateway.chargeRecurring).not.toHaveBeenCalled();
      expect(result.plan).toBe('FREE');
      expect(result.status).toBe('SUSPENDED');
      expect(notifier.sendSubscriptionSuspended).toHaveBeenCalledWith('USER-3');
    });
  });
});
