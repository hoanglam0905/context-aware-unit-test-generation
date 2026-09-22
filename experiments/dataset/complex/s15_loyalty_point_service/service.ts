export type RedemptionType = 'VOUCHER' | 'CASH';
export type TransactionStatus = 'SUCCESS' | 'FAILED' | 'FLAGGED';

export interface LoyaltyAccount {
  userId: string;
  balance: number;
  isLocked: boolean;
  updatedAt: Date;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  points: number;
  amountVnd: number;
  type: RedemptionType;
  status: TransactionStatus;
  reason?: string;
  createdAt: Date;
}

export class LoyaltyAccountNotFoundException extends Error {
  constructor(userId: string) {
    super(`Loyalty account for user ${userId} not found`);
    this.name = 'LoyaltyAccountNotFoundException';
  }
}

export class LoyaltyAccountLockedException extends Error {
  constructor(userId: string) {
    super(`Loyalty account for user ${userId} is currently locked`);
    this.name = 'LoyaltyAccountLockedException';
  }
}

export class InsufficientPointsException extends Error {
  constructor(required: number, available: number) {
    super(`Insufficient points: required ${required}, but available is only ${available}`);
    this.name = 'InsufficientPointsException';
  }
}

export class InvalidPointsAmountException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPointsAmountException';
  }
}

export class FraudDetectedException extends Error {
  constructor(reason: string) {
    super(`Fraud detected: ${reason}`);
    this.name = 'FraudDetectedException';
  }
}

export interface FraudEvaluationResult {
  isBlocked: boolean;
  riskScore: number;
  reason?: string;
}

export interface ILoyaltyAccountRepository {
  findByUserId(userId: string): Promise<LoyaltyAccount | null>;
  update(account: LoyaltyAccount): Promise<LoyaltyAccount>;
}

export interface ILoyaltyLedgerRepository {
  recordTransaction(transaction: LoyaltyTransaction): Promise<LoyaltyTransaction>;
}

export interface IFraudDetectionService {
  evaluateRisk(userId: string, points: number, type: RedemptionType): Promise<FraudEvaluationResult>;
}

export interface IVoucherIssuer {
  issueVoucher(userId: string, valueVnd: number): Promise<{ voucherCode: string }>;
}

export interface INotificationService {
  notifyUser(userId: string, message: string): Promise<void>;
}

export class LoyaltyPointService {
  public static readonly POINT_RATE_VND = 100; // 1 điểm = 100 VNĐ
  public static readonly MINIMUM_REDEMPTION_POINTS = 100;
  public static readonly FRAUD_SCORE_THRESHOLD = 80;

  constructor(
    private readonly accountRepo: ILoyaltyAccountRepository,
    private readonly ledgerRepo: ILoyaltyLedgerRepository,
    private readonly fraudDetector: IFraudDetectionService,
    private readonly voucherIssuer: IVoucherIssuer,
    private readonly notificationService: INotificationService
  ) {}

  public async redeemPoints(
    userId: string,
    points: number,
    type: RedemptionType
  ): Promise<{ transaction: LoyaltyTransaction; voucherCode?: string }> {
    // 1. Kiểm tra tính hợp lệ của số điểm
    if (points < LoyaltyPointService.MINIMUM_REDEMPTION_POINTS) {
      throw new InvalidPointsAmountException(
        `Points must be at least ${LoyaltyPointService.MINIMUM_REDEMPTION_POINTS}`
      );
    }

    if (points % 10 !== 0) {
      throw new InvalidPointsAmountException('Points must be a multiple of 10');
    }

    // 2. Tìm tài khoản
    const account = await this.accountRepo.findByUserId(userId);
    if (!account) {
      throw new LoyaltyAccountNotFoundException(userId);
    }

    if (account.isLocked) {
      throw new LoyaltyAccountLockedException(userId);
    }

    if (account.balance < points) {
      throw new InsufficientPointsException(points, account.balance);
    }

    const amountVnd = points * LoyaltyPointService.POINT_RATE_VND;

    // 3. Đánh giá rủi ro gian lận
    const fraudResult = await this.fraudDetector.evaluateRisk(userId, points, type);
    if (fraudResult.isBlocked || fraudResult.riskScore >= LoyaltyPointService.FRAUD_SCORE_THRESHOLD) {
      // Khóa tài khoản
      account.isLocked = true;
      account.updatedAt = new Date();
      await this.accountRepo.update(account);

      // Ghi ledger FLAGGED
      const flaggedTx: LoyaltyTransaction = {
        id: `TX-FLAGGED-${Date.now()}`,
        userId,
        points,
        amountVnd,
        type,
        status: 'FLAGGED',
        reason: fraudResult.reason || 'High risk score',
        createdAt: new Date(),
      };
      await this.ledgerRepo.recordTransaction(flaggedTx);

      await this.notificationService.notifyUser(
        userId,
        'Your loyalty account was temporarily locked due to unusual activity.'
      );

      throw new FraudDetectedException(fraudResult.reason || 'Transaction flagged by fraud system');
    }

    // 4. Trừ điểm thành công
    account.balance -= points;
    account.updatedAt = new Date();
    await this.accountRepo.update(account);

    // 5. Ghi nhận giao dịch thành công
    const successTx: LoyaltyTransaction = {
      id: `TX-${Date.now()}`,
      userId,
      points,
      amountVnd,
      type,
      status: 'SUCCESS',
      createdAt: new Date(),
    };
    const savedTx = await this.ledgerRepo.recordTransaction(successTx);

    let voucherCode: string | undefined;
    if (type === 'VOUCHER') {
      const voucherRes = await this.voucherIssuer.issueVoucher(userId, amountVnd);
      voucherCode = voucherRes.voucherCode;
    }

    await this.notificationService.notifyUser(
      userId,
      `Successfully redeemed ${points} points for ${amountVnd.toLocaleString('vi-VN')} VND value.`
    );

    return {
      transaction: savedTx,
      voucherCode,
    };
  }
}
