import {
  OrderFulfillmentService,
  IOrderRepository,
  IInventoryService,
  IShippingCarrierService,
  INotificationService,
  IAuditLogger,
  Order,
  OrderNotFoundException,
  InvalidOrderStateTransitionException,
  OutOfStockFulfillmentException,
} from './service';

describe('OrderFulfillmentService (Ground Truth)', () => {
  let orderRepo: jest.Mocked<IOrderRepository>;
  let inventoryService: jest.Mocked<IInventoryService>;
  let shippingCarrier: jest.Mocked<IShippingCarrierService>;
  let notificationService: jest.Mocked<INotificationService>;
  let auditLogger: jest.Mocked<IAuditLogger>;
  let service: OrderFulfillmentService;

  const mockPendingOrder: Order = {
    id: 'ORD-001',
    customerId: 'CUST-001',
    items: [
      { productId: 'PROD-A', quantity: 2 },
      { productId: 'PROD-B', quantity: 1 },
    ],
    status: 'PENDING',
    updatedAt: new Date(),
  };

  beforeEach(() => {
    orderRepo = {
      findById: jest.fn(),
      update: jest.fn().mockImplementation(async (order) => ({ ...order })),
    };
    inventoryService = {
      reserveStock: jest.fn(),
      releaseStock: jest.fn(),
    };
    shippingCarrier = {
      createShipment: jest.fn(),
    };
    notificationService = {
      notifyCustomer: jest.fn(),
    };
    auditLogger = {
      logTransition: jest.fn(),
    };

    service = new OrderFulfillmentService(
      orderRepo,
      inventoryService,
      shippingCarrier,
      notificationService,
      auditLogger
    );
  });

  describe('confirmOrder', () => {
    it('should throw OrderNotFoundException if order does not exist', async () => {
      orderRepo.findById.mockResolvedValue(null);

      await expect(service.confirmOrder('NON_EXISTENT')).rejects.toThrow(
        OrderNotFoundException
      );
    });

    it('should throw InvalidOrderStateTransitionException if status is not PENDING', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'PROCESSING',
      });

      await expect(service.confirmOrder('ORD-001')).rejects.toThrow(
        InvalidOrderStateTransitionException
      );
    });

    it('should cancel order and throw OutOfStockFulfillmentException if inventory is insufficient', async () => {
      orderRepo.findById.mockResolvedValue({ ...mockPendingOrder });
      inventoryService.reserveStock.mockResolvedValue(false);

      await expect(service.confirmOrder('ORD-001')).rejects.toThrow(
        OutOfStockFulfillmentException
      );

      expect(orderRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'CANCELLED',
          cancelReason: expect.stringContaining('Out of stock'),
        })
      );
      expect(auditLogger.logTransition).toHaveBeenCalledWith(
        'ORD-001',
        'PENDING',
        'CANCELLED',
        expect.any(String)
      );
      expect(notificationService.notifyCustomer).toHaveBeenCalled();
    });

    it('should confirm order when stock is reserved successfully', async () => {
      orderRepo.findById.mockResolvedValue({ ...mockPendingOrder });
      inventoryService.reserveStock.mockResolvedValue(true);

      const result = await service.confirmOrder('ORD-001');

      expect(result.status).toBe('CONFIRMED');
      expect(inventoryService.reserveStock).toHaveBeenCalledWith(mockPendingOrder.items);
      expect(auditLogger.logTransition).toHaveBeenCalledWith('ORD-001', 'PENDING', 'CONFIRMED');
      expect(notificationService.notifyCustomer).toHaveBeenCalledWith('CUST-001', expect.any(String));
    });
  });

  describe('startProcessing', () => {
    it('should throw InvalidOrderStateTransitionException if not CONFIRMED', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'PENDING',
      });

      await expect(service.startProcessing('ORD-001')).rejects.toThrow(
        InvalidOrderStateTransitionException
      );
    });

    it('should transition to PROCESSING when currently CONFIRMED', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'CONFIRMED',
      });

      const result = await service.startProcessing('ORD-001');

      expect(result.status).toBe('PROCESSING');
      expect(auditLogger.logTransition).toHaveBeenCalledWith('ORD-001', 'CONFIRMED', 'PROCESSING');
    });
  });

  describe('shipOrder', () => {
    it('should throw InvalidOrderStateTransitionException if not PROCESSING', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'CONFIRMED',
      });

      await expect(service.shipOrder('ORD-001')).rejects.toThrow(
        InvalidOrderStateTransitionException
      );
    });

    it('should transition to SHIPPED and store tracking code', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'PROCESSING',
      });
      shippingCarrier.createShipment.mockResolvedValue({ trackingCode: 'VNPOST-999' });

      const result = await service.shipOrder('ORD-001');

      expect(result.status).toBe('SHIPPED');
      expect(result.trackingCode).toBe('VNPOST-999');
      expect(shippingCarrier.createShipment).toHaveBeenCalledWith('ORD-001');
      expect(notificationService.notifyCustomer).toHaveBeenCalledWith(
        'CUST-001',
        expect.stringContaining('VNPOST-999')
      );
    });
  });

  describe('deliverOrder', () => {
    it('should throw InvalidOrderStateTransitionException if not SHIPPED', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'PROCESSING',
      });

      await expect(service.deliverOrder('ORD-001')).rejects.toThrow(
        InvalidOrderStateTransitionException
      );
    });

    it('should transition to DELIVERED when currently SHIPPED', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'SHIPPED',
      });

      const result = await service.deliverOrder('ORD-001');

      expect(result.status).toBe('DELIVERED');
      expect(auditLogger.logTransition).toHaveBeenCalledWith('ORD-001', 'SHIPPED', 'DELIVERED');
      expect(notificationService.notifyCustomer).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('should reject cancellation for SHIPPED or DELIVERED orders', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'SHIPPED',
      });

      await expect(service.cancelOrder('ORD-001', 'Too late')).rejects.toThrow(
        InvalidOrderStateTransitionException
      );
    });

    it('should cancel PENDING order without releasing stock', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'PENDING',
      });

      const result = await service.cancelOrder('ORD-001', 'Customer cancelled');

      expect(result.status).toBe('CANCELLED');
      expect(result.cancelReason).toBe('Customer cancelled');
      expect(inventoryService.releaseStock).not.toHaveBeenCalled();
    });

    it('should cancel CONFIRMED order and release reserved stock', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'CONFIRMED',
      });

      const result = await service.cancelOrder('ORD-001', 'Customer cancelled');

      expect(result.status).toBe('CANCELLED');
      expect(inventoryService.releaseStock).toHaveBeenCalledWith(mockPendingOrder.items);
      expect(auditLogger.logTransition).toHaveBeenCalledWith(
        'ORD-001',
        'CONFIRMED',
        'CANCELLED',
        'Customer cancelled'
      );
    });

    it('should cancel PROCESSING order and release reserved stock', async () => {
      orderRepo.findById.mockResolvedValue({
        ...mockPendingOrder,
        status: 'PROCESSING',
      });

      const result = await service.cancelOrder('ORD-001', 'Warehouse issue');

      expect(result.status).toBe('CANCELLED');
      expect(inventoryService.releaseStock).toHaveBeenCalledWith(mockPendingOrder.items);
    });
  });
});
