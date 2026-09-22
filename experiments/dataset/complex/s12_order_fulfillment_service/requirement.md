# S12 - Order Fulfillment Service Requirement Specification

## 1. User Story
Là một nhân viên vận hành (Operations Specialist) và khách hàng, tôi muốn hệ thống quản lý vòng đời đơn hàng qua máy trạng thái nghiêm ngặt (Order Fulfillment State Machine) với việc trừ giữ kho tự động, tích hợp vận chuyển và khả năng hủy/hoàn kho an toàn để đảm bảo tính toàn vẹn tồn kho và trải nghiệm giao nhận minh bạch.

---

## 2. Business Rules (Quy tắc nghiệp vụ)

1. **Vòng đời trạng thái đơn hàng (Order Lifecycle States)**:
   - Các trạng thái hợp lệ: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.
2. **Luồng chuyển đổi trạng thái hợp lệ (Valid Transitions)**:
   - `PENDING` -> `CONFIRMED`: Khi xác nhận đơn và giữ hàng tồn kho (`reserveStock`) thành công.
   - `CONFIRMED` -> `PROCESSING`: Khi kho bắt đầu đóng gói kiện hàng (`packOrder`).
   - `PROCESSING` -> `SHIPPED`: Khi đơn vị vận chuyển nhận hàng và tạo mã vận đơn (`trackingCode`).
   - `SHIPPED` -> `DELIVERED`: Khi người nhận ký nhận thành công.
   - Hủy đơn (`CANCELLED`): Chỉ cho phép hủy khi đơn hàng ở trạng thái `PENDING`, `CONFIRMED` hoặc `PROCESSING`. Khi hủy ở `CONFIRMED` hoặc `PROCESSING`, bắt buộc hoàn trả tồn kho (`releaseStock`).
3. **Quy tắc chuyển đổi không hợp lệ**:
   - Chuyển trạng thái sai quy trình (ví dụ: `PENDING` -> `DELIVERED` hoặc `SHIPPED` -> `CANCELLED`) phải ném lỗi `InvalidOrderStateTransitionException`.
4. **Xử lý hết hàng khi xác nhận (`confirmOrder`)**:
   - Nếu `IInventoryService.reserveStock` thất bại do thiếu hàng, đơn hàng chuyển sang `CANCELLED` và ném `OutOfStockFulfillmentException`.
5. **Kiểm toán và thông báo (Audit & Notification)**:
   - Mọi lần chuyển đổi trạng thái thành công đều phải ghi nhật ký kiểm toán qua `IAuditLogger` và gửi thông báo qua `INotificationService`.

---

## 3. Acceptance Criteria (Gherkin Format)

### Scenario 1: Xác nhận đơn hàng thành công khi đủ hàng tồn kho
- **Given**: Đơn hàng có ID `"ORD-101"` đang ở trạng thái `"PENDING"` với danh sách sản phẩm.
- **When**: Gọi phương thức `confirmOrder("ORD-101")`.
- **Then**: 
  - Hệ thống gọi `IInventoryService.reserveStock` thành công.
  - Trạng thái đơn hàng cập nhật thành `"CONFIRMED"`.
  - Ghi audit log chuyển từ `"PENDING"` sang `"CONFIRMED"`.
  - Gửi thông báo xác nhận thành công tới khách hàng.

### Scenario 2: Xác nhận đơn hàng thất bại do hết tồn kho
- **Given**: Đơn hàng `"ORD-102"` ở trạng thái `"PENDING"`.
- **And**: `IInventoryService.reserveStock` trả về thất bại (hết hàng).
- **When**: Gọi phương thức `confirmOrder("ORD-102")`.
- **Then**:
  - Trạng thái đơn hàng chuyển sang `"CANCELLED"`.
  - Hệ thống ném ngoại lệ `OutOfStockFulfillmentException`.

### Scenario 3: Chuyển sang PROCESSING và SHIPPED
- **Given**: Đơn hàng `"ORD-103"` ở trạng thái `"CONFIRMED"`.
- **When**: Gọi `startProcessing("ORD-103")`.
- **Then**: Đơn hàng chuyển sang `"PROCESSING"`.
- **When**: Tiếp tục gọi `shipOrder("ORD-103")`.
- **Then**: Đơn vị vận chuyển tạo mã tracking, trạng thái cập nhật `"SHIPPED"`.

### Scenario 4: Hủy đơn hàng hợp lệ và hoàn trả tồn kho
- **Given**: Đơn hàng `"ORD-104"` ở trạng thái `"PROCESSING"`.
- **When**: Gọi `cancelOrder("ORD-104", "Khách đổi ý")`.
- **Then**:
  - Hệ thống gọi `IInventoryService.releaseStock` để hoàn trả số lượng.
  - Trạng thái đơn cập nhật `"CANCELLED"`.
  - Audit log ghi nhận lý do hủy.

### Scenario 5: Chuyển đổi trạng thái sai quy trình bị từ chối
- **Given**: Đơn hàng `"ORD-105"` đã ở trạng thái `"SHIPPED"`.
- **When**: Cố tình gọi `cancelOrder("ORD-105", "Muốn hủy")`.
- **Then**: Hệ thống từ chối và ném `InvalidOrderStateTransitionException`.
