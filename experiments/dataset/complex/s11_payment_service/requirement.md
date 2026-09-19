# Requirement: Xử lý thanh toán đơn hàng trực tuyến (PaymentService)

## 1. User Story
Là một Khách hàng mua sắm trên hệ thống,  
Tôi muốn thực hiện thanh toán cho đơn hàng đã đặt thông qua cổng thanh toán (Payment Gateway),  
Để hoàn tất quá trình mua hàng một cách an toàn, minh bạch và có hóa đơn biên nhận.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Ràng buộc Idempotency (Chống thanh toán trùng lặp):**
   - Mỗi yêu cầu thanh toán phải kèm theo một `idempotencyKey` duy nhất.
   - Nếu `idempotencyKey` đã tồn tại trong DB:
     - Nếu giao dịch trước đó đã `SUCCESS`, trả về ngay kết quả giao dịch cũ (Idempotent response) mà không gọi lại cổng thanh toán.
     - Nếu giao dịch trước đó đang `PROCESSING`, ném lỗi `ConcurrentTransactionError`.
2. **Kiểm tra trạng thái đơn hàng (Order State Validation):**
   - Đơn hàng phải tồn tại và đang ở trạng thái `PENDING_PAYMENT`.
   - Nếu đơn hàng đã `CANCELLED` hoặc `PAID`, ném `InvalidOrderStateError`.
   - Số tiền thanh toán yêu cầu (`amount`) phải khớp chính xác 100% với `order.totalAmount`. Nếu lệch, ném `AmountMismatchError`.
3. **Giao tiếp Cổng thanh toán (Payment Gateway Integration):**
   - Hệ thống gọi `PaymentGatewayClient.charge({ orderId, amount, paymentMethod })`.
   - Nếu Gateway trả về `SUCCESS`:
     - Cập nhật transaction status sang `SUCCESS`.
     - Cập nhật order status sang `PAID` qua `OrderService`.
     - Ghi nhận Audit Log sự kiện thành công.
   - Nếu Gateway trả về `DECLINED`:
     - Cập nhật transaction status sang `FAILED`.
     - Ném `PaymentDeclinedError` kèm mã lý do (reasonCode).
   - Nếu Gateway bị Timeout / Network Exception:
     - Đánh dấu transaction là `GATEWAY_ERROR`.
     - Gửi yêu cầu kiểm tra/hủy giao dịch (Void / Cancel charge) để tránh charge hụt tài khoản khách hàng.
     - Ném `PaymentGatewayUnavailableError`.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Thanh toán thành công lần đầu tiên
  Given đơn hàng "ORD-001" có giá trị 1,500,000 VND ở trạng thái "PENDING_PAYMENT"
  And idempotencyKey "IDEMP-999" chưa từng được sử dụng
  When khách hàng thanh toán 1,500,000 VND qua cổng thanh toán
  And cổng thanh toán phản hồi giao dịch thành công (gatewayTxId: "GTW-123")
  Then trạng thái giao dịch được lưu là "SUCCESS"
  And trạng thái đơn hàng chuyển sang "PAID"
  And audit log được ghi nhận

Scenario: Xử lý Idempotency - Trả về kết quả cũ khi gửi trùng request đã thành công
  Given giao dịch với idempotencyKey "IDEMP-999" đã từng thành công trước đó
  When khách hàng gửi lại request thanh toán với idempotencyKey "IDEMP-999"
  Then hệ thống trả về kết quả giao dịch cũ ngay lập tức
  And cổng thanh toán bên thứ ba KHÔNG bị gọi lần thứ hai

Scenario: Ném lỗi khi số tiền thanh toán không khớp với đơn hàng
  Given đơn hàng "ORD-001" có giá trị 1,500,000 VND
  When khách hàng gửi yêu cầu thanh toán với số tiền 1,000,000 VND
  Then hệ thống ném ra "AmountMismatchError"
  And không có lệnh gọi nào được gửi tới cổng thanh toán
```
