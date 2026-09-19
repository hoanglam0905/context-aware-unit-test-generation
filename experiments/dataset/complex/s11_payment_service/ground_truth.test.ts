import {
  PaymentService,
  OrderStatus,
  TransactionStatus,
  IOrderRepository,
  ITransactionRepository,
  IPaymentGatewayClient,
  IAuditLogger,
  ConcurrentTransactionError,
  InvalidOrderStateError,
  AmountMismatchError,
  PaymentDeclinedError,
  PaymentGatewayUnavailableError,
  ProcessPaymentDto,
} from './service';

describe('PaymentService (Ground Truth)', () => {
  let paymentService: PaymentService;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockTxRepo: jest.Mocked<ITransactionRepository>;
  let mockGatewayClient: jest.Mocked<IPaymentGatewayClient>;
  let mockAuditLogger: jest.Mocked<IAuditLogger>;

  const sampleDto: ProcessPaymentDto = {
    orderId: 'ORD-100',
    amount: 1500000,
    paymentMethod: 'CREDIT_CARD',
    idempotencyKey: 'IDEMP-ABC-123',
  };

  beforeEach(() => {
    mockOrderRepo = {
      findById: jest.fn(),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    mockTxRepo = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((tx) =>
        Promise.resolve({
          ...tx,
          id: 'tx-999',
          createdAt: new Date(),
        })
      ),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    mockGatewayClient = {
      charge: jest.fn(),
      voidTransaction: jest.fn().mockResolvedValue(undefined),
    };
    mockAuditLogger = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    paymentService = new PaymentService(
      mockOrderRepo,
      mockTxRepo,
      mockGatewayClient,
      mockAuditLogger
    );
  });

  describe('Idempotency Key Checks', () => {
    it('should return existing transaction immediately if it already succeeded', async () => {
      mockTxRepo.findByIdempotencyKey.mockResolvedValue({
        id: 'tx-old-1',
        orderId: 'ORD-100',
        idempotencyKey: 'IDEMP-ABC-123',
        amount: 1500000,
        status: TransactionStatus.SUCCESS,
        gatewayTxId: 'GTW-OLD',
        createdAt: new Date(),
      });

      const result = await paymentService.processPayment(sampleDto);

      expect(result.id).toBe('tx-old-1');
      expect(result.status).toBe(TransactionStatus.SUCCESS);
      expect(mockGatewayClient.charge).not.toHaveBeenCalled();
      expect(mockOrderRepo.findById).not.toHaveBeenCalled();
    });

    it('should throw ConcurrentTransactionError if previous transaction is still PROCESSING', async () => {
      mockTxRepo.findByIdempotencyKey.mockResolvedValue({
        id: 'tx-processing',
        orderId: 'ORD-100',
        idempotencyKey: 'IDEMP-ABC-123',
        amount: 1500000,
        status: TransactionStatus.PROCESSING,
        createdAt: new Date(),
      });

      await expect(paymentService.processPayment(sampleDto)).rejects.toThrow(
        ConcurrentTransactionError
      );
      expect(mockGatewayClient.charge).not.toHaveBeenCalled();
    });
  });

  describe('Order Validation', () => {
    it('should throw InvalidOrderStateError when order is not found', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      await expect(paymentService.processPayment(sampleDto)).rejects.toThrow(
        InvalidOrderStateError
      );
      expect(mockGatewayClient.charge).not.toHaveBeenCalled();
    });

    it('should throw InvalidOrderStateError when order is already PAID', async () => {
      mockOrderRepo.findById.mockResolvedValue({
        id: 'ORD-100',
        totalAmount: 1500000,
        status: OrderStatus.PAID,
      });

      await expect(paymentService.processPayment(sampleDto)).rejects.toThrow(
        'Order is not in PENDING_PAYMENT state'
      );
    });

    it('should throw AmountMismatchError when payment amount does not match order total', async () => {
      mockOrderRepo.findById.mockResolvedValue({
        id: 'ORD-100',
        totalAmount: 2000000, // Đơn hàng 2M, nhưng DTO gửi 1.5M
        status: OrderStatus.PENDING_PAYMENT,
      });

      await expect(paymentService.processPayment(sampleDto)).rejects.toThrow(
        AmountMismatchError
      );
      expect(mockGatewayClient.charge).not.toHaveBeenCalled();
    });
  });

  describe('Payment Gateway Execution', () => {
    beforeEach(() => {
      mockOrderRepo.findById.mockResolvedValue({
        id: 'ORD-100',
        totalAmount: 1500000,
        status: OrderStatus.PENDING_PAYMENT,
      });
    });

    it('should handle successful payment: update order to PAID and write audit log', async () => {
      mockGatewayClient.charge.mockResolvedValue({
        success: true,
        gatewayTxId: 'GTW-SUCCESS-99',
      });

      const result = await paymentService.processPayment(sampleDto);

      expect(result.status).toBe(TransactionStatus.SUCCESS);
      expect(result.gatewayTxId).toBe('GTW-SUCCESS-99');
      expect(mockTxRepo.updateStatus).toHaveBeenCalledWith(
        'tx-999',
        TransactionStatus.SUCCESS,
        'GTW-SUCCESS-99'
      );
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ORD-100', OrderStatus.PAID);
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'PAYMENT_SUCCESS',
        expect.objectContaining({ orderId: 'ORD-100', gatewayTxId: 'GTW-SUCCESS-99' })
      );
    });

    it('should throw PaymentDeclinedError and update status to FAILED when card is declined', async () => {
      mockGatewayClient.charge.mockResolvedValue({
        success: false,
        declineReason: 'INSUFFICIENT_FUNDS',
      });

      await expect(paymentService.processPayment(sampleDto)).rejects.toThrow(PaymentDeclinedError);

      expect(mockTxRepo.updateStatus).toHaveBeenCalledWith('tx-999', TransactionStatus.FAILED);
      expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled();
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'PAYMENT_DECLINED',
        expect.objectContaining({ reason: 'INSUFFICIENT_FUNDS' })
      );
    });

    it('should trigger voidTransaction and throw PaymentGatewayUnavailableError on network error', async () => {
      mockGatewayClient.charge.mockRejectedValue(new Error('Gateway timeout 504'));

      await expect(paymentService.processPayment(sampleDto)).rejects.toThrow(
        PaymentGatewayUnavailableError
      );

      expect(mockTxRepo.updateStatus).toHaveBeenCalledWith('tx-999', TransactionStatus.GATEWAY_ERROR);
      expect(mockGatewayClient.voidTransaction).toHaveBeenCalled();
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'PAYMENT_GATEWAY_ERROR',
        expect.objectContaining({ error: 'Gateway timeout 504' })
      );
    });
  });
});
