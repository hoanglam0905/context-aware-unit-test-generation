import {
  CartService,
  ICartRepository,
  IInventoryService,
  Cart,
  OutOfStockException,
  ExceedMaxPurchaseLimitException,
} from './service';

describe('CartService (Ground Truth)', () => {
  let cartService: CartService;
  let mockCartRepo: jest.Mocked<ICartRepository>;
  let mockInventoryService: jest.Mocked<IInventoryService>;

  beforeEach(() => {
    mockCartRepo = {
      findByUserId: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockInventoryService = {
      checkStock: jest.fn(),
    };
    cartService = new CartService(mockCartRepo, mockInventoryService);
  });

  describe('Adding Items to Cart', () => {
    it('should create new cart and add item when cart does not exist', async () => {
      mockCartRepo.findByUserId.mockResolvedValue(null);
      mockInventoryService.checkStock.mockResolvedValue(true);

      const cart = await cartService.addItem(
        'user-1',
        { productId: 'PROD-1', productName: 'Laptop', unitPrice: 15000000 },
        2
      );

      expect(cart.items).toHaveLength(1);
      expect(cart.totalQuantity).toBe(2);
      expect(cart.totalAmount).toBe(30000000);
      expect(mockCartRepo.save).toHaveBeenCalled();
    });

    it('should accumulate quantity when adding an item that already exists in cart', async () => {
      const existingCart: Cart = {
        id: 'cart-user-1',
        userId: 'user-1',
        items: [
          { productId: 'PROD-1', productName: 'Laptop', unitPrice: 10000, quantity: 2 },
        ],
        totalQuantity: 2,
        totalAmount: 20000,
        updatedAt: new Date(),
      };
      mockCartRepo.findByUserId.mockResolvedValue(existingCart);
      mockInventoryService.checkStock.mockResolvedValue(true);

      const updatedCart = await cartService.addItem(
        'user-1',
        { productId: 'PROD-1', productName: 'Laptop', unitPrice: 10000 },
        3
      );

      expect(updatedCart.items[0].quantity).toBe(5);
      expect(updatedCart.totalQuantity).toBe(5);
      expect(updatedCart.totalAmount).toBe(50000);
    });

    it('should throw OutOfStockException when inventory is insufficient', async () => {
      mockCartRepo.findByUserId.mockResolvedValue(null);
      mockInventoryService.checkStock.mockResolvedValue(false);

      await expect(
        cartService.addItem(
          'user-1',
          { productId: 'PROD-2', productName: 'Phone', unitPrice: 5000 },
          10
        )
      ).rejects.toThrow(OutOfStockException);
      expect(mockCartRepo.save).not.toHaveBeenCalled();
    });

    it('should throw ExceedMaxPurchaseLimitException when requested quantity exceeds item limit', async () => {
      mockCartRepo.findByUserId.mockResolvedValue(null);

      await expect(
        cartService.addItem(
          'user-1',
          { productId: 'PROD-FLASH', productName: 'Flash Sale Item', unitPrice: 1000, maxPerUser: 3 },
          5 // Yêu cầu 5 > max 3
        )
      ).rejects.toThrow(ExceedMaxPurchaseLimitException);
    });
  });

  describe('Updating and Removing Items', () => {
    it('should remove item when updating quantity to 0', async () => {
      const cart: Cart = {
        id: 'cart-user-1',
        userId: 'user-1',
        items: [
          { productId: 'PROD-1', productName: 'Book', unitPrice: 50000, quantity: 2 },
          { productId: 'PROD-2', productName: 'Pen', unitPrice: 10000, quantity: 5 },
        ],
        totalQuantity: 7,
        totalAmount: 150000,
        updatedAt: new Date(),
      };
      mockCartRepo.findByUserId.mockResolvedValue(cart);

      const result = await cartService.updateItemQuantity('user-1', 'PROD-1', 0);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe('PROD-2');
      expect(result.totalQuantity).toBe(5);
      expect(result.totalAmount).toBe(50000);
    });

    it('should remove item via removeItem method', async () => {
      const cart: Cart = {
        id: 'cart-user-1',
        userId: 'user-1',
        items: [{ productId: 'PROD-1', productName: 'Book', unitPrice: 50000, quantity: 2 }],
        totalQuantity: 2,
        totalAmount: 100000,
        updatedAt: new Date(),
      };
      mockCartRepo.findByUserId.mockResolvedValue(cart);

      const result = await cartService.removeItem('user-1', 'PROD-1');
      expect(result.items).toHaveLength(0);
      expect(result.totalQuantity).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });
});
