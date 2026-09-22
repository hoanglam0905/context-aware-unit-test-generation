# Requirement: Quản lý giỏ hàng mua sắm trực tuyến (CartService)

## 1. User Story
Là một Khách hàng mua sắm trực tuyến,  
Tôi muốn thêm sản phẩm, cập nhật số lượng và xóa sản phẩm trong giỏ hàng của mình,  
Để chuẩn bị các mặt hàng cần mua trước khi tiến hành thanh toán và đảm bảo sản phẩm luôn sẵn có trong kho.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Kiểm tra tồn kho qua InventoryService (Stock Validation):**
   - Trước khi thêm hoặc cập nhật số lượng, phải gọi `InventoryService.checkStock(productId, quantity)`.
   - Nếu tồn kho không đủ, ném ngoại lệ `OutOfStockException('Insufficient inventory for product: {id}')`.
2. **Giới hạn số lượng mua tối đa (Purchase Limit):**
   - Mỗi sản phẩm có giới hạn mua tối đa trên một đơn hàng (`maxPurchasePerUser`, mặc định 10 đơn vị nếu không cấu hình).
   - Nếu số lượng yêu cầu vượt quá giới hạn này, ném ngoại lệ `ExceedMaxPurchaseLimitException`.
3. **Thao tác thêm sản phẩm (Add Item):**
   - Nếu sản phẩm chưa có trong giỏ: tạo mới mục hàng trong giỏ (`CartItem`).
   - Nếu sản phẩm đã tồn tại trong giỏ: cộng dồn số lượng mới vào số lượng cũ (tổng số lượng mới không được vượt quá tồn kho và giới hạn mua).
4. **Cập nhật và xóa sản phẩm (Update & Remove):**
   - Cập nhật số lượng về $0$ sẽ tự động xóa sản phẩm đó khỏi giỏ hàng.
   - Thao tác `removeItem(cartId, productId)` xóa dứt điểm mục hàng.
5. **Tính toán tổng tiền giỏ hàng (Cart Totals):**
   - Tổng tiền hàng: $\sum (\text{item.quantity} \times \text{item.unitPrice})$.
   - Tổng số lượng sản phẩm: $\sum \text{item.quantity}$.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Thêm sản phẩm mới vào giỏ hàng thành công
  Given giỏ hàng rỗng của người dùng "user-100"
  And sản phẩm "PROD-1" có giá 200,000 VND và tồn kho 50 cái
  When thêm 2 cái sản phẩm "PROD-1" vào giỏ hàng
  Then giỏ hàng có 1 sản phẩm với số lượng 2
  And tổng tiền giỏ hàng là 400,000 VND

Scenario: Từ chối thêm sản phẩm khi kho không đủ hàng
  Given sản phẩm "PROD-2" chỉ còn 3 cái trong kho
  When người dùng cố gắng thêm 5 cái vào giỏ
  Then hệ thống ném ra lỗi "OutOfStockException"
  And giỏ hàng không bị thay đổi

Scenario: Cộng dồn số lượng khi thêm sản phẩm đã tồn tại trong giỏ
  Given giỏ hàng đã có sẵn 2 cái sản phẩm "PROD-1"
  When người dùng thêm tiếp 3 cái "PROD-1"
  Then tổng số lượng sản phẩm "PROD-1" trong giỏ là 5
  And tổng tiền được cập nhật tương ứng
```
