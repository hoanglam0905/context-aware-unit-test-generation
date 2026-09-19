export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum TransactionStatus {
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  GATEWAY_ERROR = 'GATEWAY_ERROR',
}

export interface Order {
  id: string;
  totalAmount: number;
  status: OrderStatus;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  idempotencyKey: string;
  amount: number;
  status: TransactionStatus;
  gatewayTxId?: string;
  createdAt: Date;
}

export interface ProcessPaymentDto {
  orderId: string;
  amount: number;
  paymentMethod: string;
  idempotencyKey: string;
}

export class ConcurrentTransactionError extends Error {
  constructor(message = 'A transaction with this idempotency key is currently processing') {
    super(message);
    this.name = 'ConcurrentTransactionError';
  }
}

export class InvalidOrderStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderStateError';
  }
}

export class AmountMismatchError extends Error {
  constructor(message = 'Payment amount does not match order total amount') {
    super(message);
    this.name = 'AmountMismatchError';
  }
}

export class PaymentDeclinedError extends Error {
  constructor(public readonly reasonCode: string, message = 'Payment was declined by gateway') {
    super(message);
    this.name = 'PaymentDeclinedError';
  }
}

export class PaymentGatewayUnavailableError extends Error {
  constructor(message = 'Payment gateway timeout or network error') {
    super(message);
    this.name = 'PaymentGatewayUnavailableError';
  }
}

export interface IOrderRepository {
  findById(orderId: string): Promise<Order | null>;
  updateStatus(orderId: string, status: OrderStatus): Promise<void>;
}

export interface ITransactionRepository {
  findByIdempotencyKey(key: string): Promise<PaymentTransaction | null>;
  create(tx: Omit<PaymentTransaction, 'id' | 'createdAt'>): Promise<PaymentTransaction>;
  updateStatus(id: string, status: TransactionStatus, gatewayTxId?: string): Promise<void>;
}

export interface IPaymentGatewayClient {
  charge(req: { orderId: string; amount: number; paymentMethod: string }): Promise<{
    success: boolean;
    gatewayTxId?: string;
    declineReason?: string;
  }>;
  voidTransaction(gatewayTxId?: string): Promise<void>;
}

export interface IAuditLogger {
  log(event: string, metadata: Record<string, any>): Promise<void>;
}

export class PaymentService {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly txRepo: ITransactionRepository,
    private readonly gatewayClient: IPaymentGatewayClient,
    private readonly auditLogger: IAuditLogger
  ) {}

  public async processPayment(dto: ProcessPaymentDto): Promise<PaymentTransaction> {
    // 1. Kiểm tra Idempotency
    const existingTx = await this.txRepo.findByIdempotencyKey(dto.idempotencyKey);
    if (existingTx) {
      if (existingTx.status === TransactionStatus.SUCCESS) {
        return existingTx; // Trả về kết quả giao dịch cũ
      }
      if (existingTx.status === TransactionStatus.PROCESSING) {
        throw new ConcurrentTransactionError();
      }
    }

    // 2. Kiểm tra Order hợp lệ
    const order = await this.orderRepo.findById(dto.orderId);
    if (!order) {
      throw new InvalidOrderStateError(`Order ${dto.orderId} not found`);
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new InvalidOrderStateError(`Order is not in PENDING_PAYMENT state (current: ${order.status})`);
    }

    if (order.totalAmount !== dto.amount) {
      throw new AmountMismatchError();
    }

    // 3. Khởi tạo transaction đang xử lý
    const tx = await this.txRepo.create({
      orderId: order.id,
      idempotencyKey: dto.idempotencyKey,
      amount: dto.amount,
      status: TransactionStatus.PROCESSING,
    });

    // 4. Gọi cổng thanh toán
    try {
      const gatewayResponse = await this.gatewayClient.charge({
        orderId: dto.orderId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
      });

      if (gatewayResponse.success) {
        await this.txRepo.updateStatus(tx.id, TransactionStatus.SUCCESS, gatewayResponse.gatewayTxId);
        await this.orderRepo.updateStatus(order.id, OrderStatus.PAID);
        await this.auditLogger.log('PAYMENT_SUCCESS', {
          orderId: order.id,
          txId: tx.id,
          gatewayTxId: gatewayResponse.gatewayTxId,
        });

        return {
          ...tx,
          status: TransactionStatus.SUCCESS,
          gatewayTxId: gatewayResponse.gatewayTxId,
        };
      } else {
        await this.txRepo.updateStatus(tx.id, TransactionStatus.FAILED);
        await this.auditLogger.log('PAYMENT_DECLINED', {
          orderId: order.id,
          txId: tx.id,
          reason: gatewayResponse.declineReason,
        });
        throw new PaymentDeclinedError(gatewayResponse.declineReason || 'UNKNOWN');
      }
    } catch (err: any) {
      if (err instanceof PaymentDeclinedError) {
        throw err;
      }
      // Gặp sự cố mạng hoặc ngoại lệ ngoài ý muốn từ cổng thanh toán
      await this.txRepo.updateStatus(tx.id, TransactionStatus.GATEWAY_ERROR);
      await this.gatewayClient.voidTransaction().catch(() => {});
      await this.auditLogger.log('PAYMENT_GATEWAY_ERROR', {
        orderId: order.id,
        txId: tx.id,
        error: err.message,
      });
      throw new PaymentGatewayUnavailableError();
    }
  }
}
