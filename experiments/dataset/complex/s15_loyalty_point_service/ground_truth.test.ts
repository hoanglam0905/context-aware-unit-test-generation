import {
  LoyaltyPointService,
  ILoyaltyAccountRepository,
  ILoyaltyLedgerRepository,
  IFraudDetectionService,
  IVoucherIssuer,
  INotificationService,
  LoyaltyAccount,
  InvalidPointsAmountException,
  LoyaltyAccountNotFoundException,
  LoyaltyAccountLockedException,
  InsufficientPointsException,
  FraudDetectedException,
} from './service';

describe('LoyaltyPointService (Ground Truth)', () => {
  let accountRepo: jest.Mocked<ILoyaltyAccountRepository>;
  let ledgerRepo: jest.Mocked<ILoyaltyLedgerRepository>;
  let fraudDetector: jest.Mocked<IFraudDetectionService>;
  let voucherIssuer: jest.Mocked<IVoucherIssuer>;
  let notificationService: jest.Mocked<INotificationService>;
  let service: LoyaltyPointService;

  const mockActiveAccount: LoyaltyAccount = {
    userId: 'USER-100',
    balance: 5000,
    isLocked: false,
    updatedAt: new Date(),
  };

  beforeEach(() => {
    accountRepo = {
      findByUserId: jest.fn(),
      update: jest.fn().mockImplementation(async (acc) => ({ ...acc })),
    };
    ledgerRepo = {
      recordTransaction: jest.fn().mockImplementation(async (tx) => ({ ...tx })),
    };
    fraudDetector = {
      evaluateRisk: jest.fn().mockResolvedValue({ isBlocked: false, riskScore: 10 }),
    };
    voucherIssuer = {
      issueVoucher: jest.fn().mockResolvedValue({ voucherCode: 'VOUCHER-50K' }),
    };
    notificationService = {
      notifyUser: jest.fn(),
    };

    service = new LoyaltyPointService(
      accountRepo,
      ledgerRepo,
      fraudDetector,
      voucherIssuer,
      notificationService
    );
  });

  describe('redeemPoints input validation', () => {
    it('should throw InvalidPointsAmountException if points < 100', async () => {
      await expect(service.redeemPoints('USER-100', 90, 'VOUCHER')).rejects.toThrow(
        InvalidPointsAmountException
      );
    });

    it('should throw InvalidPointsAmountException if points not multiple of 10', async () => {
      await expect(service.redeemPoints('USER-100', 105, 'VOUCHER')).rejects.toThrow(
        InvalidPointsAmountException
      );
    });
  });

  describe('account state validation', () => {
    it('should throw LoyaltyAccountNotFoundException when account does not exist', async () => {
      accountRepo.findByUserId.mockResolvedValue(null);

      await expect(service.redeemPoints('NON_EXISTENT', 200, 'VOUCHER')).rejects.toThrow(
        LoyaltyAccountNotFoundException
      );
    });

    it('should throw LoyaltyAccountLockedException when account is locked', async () => {
      accountRepo.findByUserId.mockResolvedValue({
        ...mockActiveAccount,
        isLocked: true,
      });

      await expect(service.redeemPoints('USER-100', 200, 'VOUCHER')).rejects.toThrow(
        LoyaltyAccountLockedException
      );
    });

    it('should throw InsufficientPointsException when balance is smaller than requested points', async () => {
      accountRepo.findByUserId.mockResolvedValue({
        ...mockActiveAccount,
        balance: 150,
      });

      await expect(service.redeemPoints('USER-100', 200, 'VOUCHER')).rejects.toThrow(
        InsufficientPointsException
      );
    });
  });

  describe('fraud detection integration', () => {
    it('should lock account, record FLAGGED transaction, and throw FraudDetectedException when risk score >= 80', async () => {
      accountRepo.findByUserId.mockResolvedValue({ ...mockActiveAccount });
      fraudDetector.evaluateRisk.mockResolvedValue({
        isBlocked: false,
        riskScore: 90,
        reason: 'Velocity check triggered',
      });

      await expect(service.redeemPoints('USER-100', 500, 'VOUCHER')).rejects.toThrow(
        FraudDetectedException
      );

      expect(accountRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ isLocked: true })
      );
      expect(ledgerRepo.recordTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FLAGGED',
          reason: 'Velocity check triggered',
        })
      );
      expect(notificationService.notifyUser).toHaveBeenCalledWith(
        'USER-100',
        expect.stringContaining('locked')
      );
      expect(voucherIssuer.issueVoucher).not.toHaveBeenCalled();
    });
  });

  describe('successful redemptions', () => {
    it('should redeem points for VOUCHER, issue code, and deduct balance', async () => {
      accountRepo.findByUserId.mockResolvedValue({ ...mockActiveAccount, balance: 2000 });

      const result = await service.redeemPoints('USER-100', 500, 'VOUCHER');

      expect(result.voucherCode).toBe('VOUCHER-50K');
      expect(result.transaction.status).toBe('SUCCESS');
      expect(result.transaction.amountVnd).toBe(50000); // 500 * 100
      expect(accountRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ balance: 1500 })
      );
      expect(voucherIssuer.issueVoucher).toHaveBeenCalledWith('USER-100', 50000);
      expect(notificationService.notifyUser).toHaveBeenCalledWith(
        'USER-100',
        expect.stringContaining('Successfully redeemed 500 points')
      );
    });

    it('should redeem points for CASH without calling voucherIssuer', async () => {
      accountRepo.findByUserId.mockResolvedValue({ ...mockActiveAccount, balance: 1000 });

      const result = await service.redeemPoints('USER-100', 300, 'CASH');

      expect(result.voucherCode).toBeUndefined();
      expect(result.transaction.status).toBe('SUCCESS');
      expect(result.transaction.amountVnd).toBe(30000);
      expect(voucherIssuer.issueVoucher).not.toHaveBeenCalled();
      expect(accountRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ balance: 700 })
      );
    });
  });
});
