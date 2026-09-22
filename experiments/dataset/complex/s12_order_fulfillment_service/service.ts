export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  trackingCode?: string;
  cancelReason?: string;
  updatedAt: Date;
}

export class OrderNotFoundException extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} not found`);
    this.name = 'OrderNotFoundException';
  }
}

export class InvalidOrderStateTransitionException extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot transition order from state '${from}' to '${to}'`);
    this.name = 'InvalidOrderStateTransitionException';
  }
}

export class OutOfStockFulfillmentException extends Error {
  constructor(orderId: string) {
    super(`Insufficient inventory to fulfill order ${orderId}`);
    this.name = 'OutOfStockFulfillmentException';
  }
}

export interface IOrderRepository {
  findById(orderId: string): Promise<Order | null>;
  update(order: Order): Promise<Order>;
}

export interface IInventoryService {
  reserveStock(items: OrderItem[]): Promise<boolean>;
  releaseStock(items: OrderItem[]): Promise<void>;
}

export interface IShippingCarrierService {
  createShipment(orderId: string): Promise<{ trackingCode: string }>;
}

export interface INotificationService {
  notifyCustomer(customerId: string, message: string): Promise<void>;
}

export interface IAuditLogger {
  logTransition(orderId: string, fromState: OrderStatus, toState: OrderStatus, reason?: string): Promise<void>;
}

export class OrderFulfillmentService {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly inventoryService: IInventoryService,
    private readonly shippingCarrier: IShippingCarrierService,
    private readonly notificationService: INotificationService,
    private readonly auditLogger: IAuditLogger
  ) {}

  public async confirmOrder(orderId: string): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);
    if (order.status !== 'PENDING') {
      throw new InvalidOrderStateTransitionException(order.status, 'CONFIRMED');
    }

    const reserved = await this.inventoryService.reserveStock(order.items);
    if (!reserved) {
      order.status = 'CANCELLED';
      order.cancelReason = 'Out of stock during confirmation';
      order.updatedAt = new Date();
      await this.orderRepo.update(order);
      await this.auditLogger.logTransition(order.id, 'PENDING', 'CANCELLED', order.cancelReason);
      await this.notificationService.notifyCustomer(order.customerId, 'Order cancelled due to stockout');
      throw new OutOfStockFulfillmentException(orderId);
    }

    const previousStatus = order.status;
    order.status = 'CONFIRMED';
    order.updatedAt = new Date();

    const saved = await this.orderRepo.update(order);
    await this.auditLogger.logTransition(order.id, previousStatus, 'CONFIRMED');
    await this.notificationService.notifyCustomer(order.customerId, 'Order has been confirmed');
    return saved;
  }

  public async startProcessing(orderId: string): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);
    if (order.status !== 'CONFIRMED') {
      throw new InvalidOrderStateTransitionException(order.status, 'PROCESSING');
    }

    const previousStatus = order.status;
    order.status = 'PROCESSING';
    order.updatedAt = new Date();

    const saved = await this.orderRepo.update(order);
    await this.auditLogger.logTransition(order.id, previousStatus, 'PROCESSING');
    return saved;
  }

  public async shipOrder(orderId: string): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);
    if (order.status !== 'PROCESSING') {
      throw new InvalidOrderStateTransitionException(order.status, 'SHIPPED');
    }

    const shipment = await this.shippingCarrier.createShipment(order.id);
    const previousStatus = order.status;
    order.status = 'SHIPPED';
    order.trackingCode = shipment.trackingCode;
    order.updatedAt = new Date();

    const saved = await this.orderRepo.update(order);
    await this.auditLogger.logTransition(order.id, previousStatus, 'SHIPPED');
    await this.notificationService.notifyCustomer(
      order.customerId,
      `Your order has shipped with tracking code ${shipment.trackingCode}`
    );
    return saved;
  }

  public async deliverOrder(orderId: string): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);
    if (order.status !== 'SHIPPED') {
      throw new InvalidOrderStateTransitionException(order.status, 'DELIVERED');
    }

    const previousStatus = order.status;
    order.status = 'DELIVERED';
    order.updatedAt = new Date();

    const saved = await this.orderRepo.update(order);
    await this.auditLogger.logTransition(order.id, previousStatus, 'DELIVERED');
    await this.notificationService.notifyCustomer(order.customerId, 'Order delivered successfully');
    return saved;
  }

  public async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const order = await this.getOrderOrThrow(orderId);
    if (order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new InvalidOrderStateTransitionException(order.status, 'CANCELLED');
    }

    // Nếu đã giữ kho ở CONFIRMED hoặc PROCESSING, phải rollback kho
    if (order.status === 'CONFIRMED' || order.status === 'PROCESSING') {
      await this.inventoryService.releaseStock(order.items);
    }

    const previousStatus = order.status;
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    order.updatedAt = new Date();

    const saved = await this.orderRepo.update(order);
    await this.auditLogger.logTransition(order.id, previousStatus, 'CANCELLED', reason);
    await this.notificationService.notifyCustomer(order.customerId, `Order cancelled: ${reason}`);
    return saved;
  }

  private async getOrderOrThrow(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new OrderNotFoundException(orderId);
    }
    return order;
  }
}
