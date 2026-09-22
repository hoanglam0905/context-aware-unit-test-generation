export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  maxPerUser?: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalQuantity: number;
  totalAmount: number;
  updatedAt: Date;
}

export class OutOfStockException extends Error {
  constructor(message = 'Insufficient inventory') {
    super(message);
    this.name = 'OutOfStockException';
  }
}

export class ExceedMaxPurchaseLimitException extends Error {
  constructor(message = 'Purchase quantity exceeds allowed limit per user') {
    super(message);
    this.name = 'ExceedMaxPurchaseLimitException';
  }
}

export interface IInventoryService {
  checkStock(productId: string, requestedQuantity: number): Promise<boolean>;
}

export interface ICartRepository {
  findByUserId(userId: string): Promise<Cart | null>;
  save(cart: Cart): Promise<void>;
}

export class CartService {
  private static readonly DEFAULT_MAX_PURCHASE = 10;

  constructor(
    private readonly cartRepo: ICartRepository,
    private readonly inventoryService: IInventoryService
  ) {}

  public async addItem(
    userId: string,
    item: Omit<CartItem, 'quantity'>,
    quantity: number
  ): Promise<Cart> {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    let cart = await this.cartRepo.findByUserId(userId);
    if (!cart) {
      cart = {
        id: `cart-${userId}`,
        userId,
        items: [],
        totalQuantity: 0,
        totalAmount: 0,
        updatedAt: new Date(),
      };
    }

    const existingItemIndex = cart.items.findIndex(i => i.productId === item.productId);
    const existingQuantity = existingItemIndex >= 0 ? cart.items[existingItemIndex].quantity : 0;
    const targetQuantity = existingQuantity + quantity;

    const maxAllowed = item.maxPerUser ?? CartService.DEFAULT_MAX_PURCHASE;
    if (targetQuantity > maxAllowed) {
      throw new ExceedMaxPurchaseLimitException();
    }

    const hasStock = await this.inventoryService.checkStock(item.productId, targetQuantity);
    if (!hasStock) {
      throw new OutOfStockException(`Insufficient inventory for product: ${item.productId}`);
    }

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity = targetQuantity;
    } else {
      cart.items.push({
        ...item,
        quantity,
      });
    }

    this.recalculateTotals(cart);
    await this.cartRepo.save(cart);

    return cart;
  }

  public async updateItemQuantity(
    userId: string,
    productId: string,
    newQuantity: number
  ): Promise<Cart> {
    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    if (newQuantity <= 0) {
      cart.items = cart.items.filter(i => i.productId !== productId);
    } else {
      const item = cart.items.find(i => i.productId === productId);
      if (!item) {
        throw new Error('Item not found in cart');
      }

      const maxAllowed = item.maxPerUser ?? CartService.DEFAULT_MAX_PURCHASE;
      if (newQuantity > maxAllowed) {
        throw new ExceedMaxPurchaseLimitException();
      }

      const hasStock = await this.inventoryService.checkStock(productId, newQuantity);
      if (!hasStock) {
        throw new OutOfStockException(`Insufficient inventory for product: ${productId}`);
      }

      item.quantity = newQuantity;
    }

    this.recalculateTotals(cart);
    await this.cartRepo.save(cart);

    return cart;
  }

  public async removeItem(userId: string, productId: string): Promise<Cart> {
    return this.updateItemQuantity(userId, productId, 0);
  }

  private recalculateTotals(cart: Cart): void {
    cart.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    cart.updatedAt = new Date();
  }
}
