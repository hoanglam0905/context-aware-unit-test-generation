# S14 - Subscription Renewal Service Requirement Specification

## 1. User Story
Là một quản trị viên hệ thống và khách hàng mua gói thuê bao, tôi muốn hệ thống tự động xử lý gia hạn gói dịch vụ định kỳ với chính sách retry thanh toán tối đa 3 lần và 7 ngày ân hạn (Grace Period) trước khi tự động hạ cấp tài khoản, đảm bảo doanh thu ổn định và không làm gián đoạn dịch vụ của khách hàng một cách đột ngột.

---

## 2. Business Rules (Quy tắc nghiệp vụ)

1. **Chu kỳ và trạng thái gói thuê bao (Subscription Lifecycle)**:
   - Các trạng thái hợp lệ: `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`.
   - Các gói dịch vụ: `FREE` (0đ), `PREMIUM` (99.000đ/tháng), `ENTERPRISE` (499.000đ/tháng).
2. **Gia hạn thanh toán thành công (Successful Renewal)**:
   - Khi `IPaymentGateway.chargeRecurring` trả về thành công:
     - Gia hạn chu kỳ `currentPeriodEnd` thêm 30 ngày.
     - Trạng thái duy trì hoặc phục hồi về `"ACTIVE"`.
     - Bộ đếm retry thất bại `retryCount` được reset về `0`.
     - Gửi email thông báo gia hạn thành công qua `IEmailNotifier`.
3. **Xử lý thanh toán thất bại (Payment Failure & Retry Logic)**:
   - Khi thanh toán thẻ thất bại và `retryCount < 3`:
     - Tăng `retryCount` thêm 1.
     - Trạng thái chuyển thành `"PAST_DUE"`.
     - Gửi email cảnh báo thanh toán không thành công kèm số ngày ân hạn còn lại.
4. **Hết lượt retry và thời gian ân hạn 7 ngày (Grace Period Expiry & Downgrade)**:
   - Nếu `retryCount >= 3` và đã quá 7 ngày kể từ ngày đến hạn chu kỳ (`currentPeriodEnd` + 7 ngày < `now`):
     - Gói thuê bao bị hạ cấp xuống `plan = "FREE"`.
     - Trạng thái chuyển thành `"SUSPENDED"`.
     - Gửi email thông báo tạm dừng gói và hạ cấp tài khoản.
5. **Gói FREE hoặc CANCELLED không gia hạn**:
   - Các gói `FREE` hoặc đã có trạng thái `CANCELLED` sẽ bị bỏ qua không tính phí gia hạn.

---

## 3. Acceptance Criteria (Gherkin Format)

### Scenario 1: Gia hạn thành công gói PREMIUM
- **Given**: Khách hàng đang có gói `PREMIUM` đến hạn gia hạn hôm nay.
- **When**: Hệ thống thực hiện `renewSubscription(subId)`.
- **Then**:
  - Gọi cổng thanh toán trừ 99.000đ thành công.
  - Chu kỳ `currentPeriodEnd` tăng thêm 30 ngày.
  - Trạng thái là `"ACTIVE"`, `retryCount = 0`.
  - Gửi email hóa đơn thành công.

### Scenario 2: Trừ tiền thất bại lần đầu tiên (Retry 1)
- **Given**: Gói `ENTERPRISE` đến hạn gia hạn, cổng thanh toán báo thẻ hết tiền.
- **When**: Gọi `renewSubscription(subId)`.
- **Then**:
  - `retryCount` tăng từ 0 lên 1.
  - Trạng thái chuyển sang `"PAST_DUE"`.
  - Gửi email cảnh báo thanh toán không thành công.

### Scenario 3: Thất bại đã quá 3 lần và hết 7 ngày ân hạn
- **Given**: Gói `PREMIUM` đã retry 3 lần và ngày đến hạn đã quá 8 ngày trước.
- **When**: Gọi `renewSubscription(subId)`.
- **Then**:
  - Không trừ tiền nữa.
  - Gói bị hạ cấp sang `"FREE"`.
  - Trạng thái chuyển `"SUSPENDED"`.
  - Gửi email thông báo đình chỉ gói.

### Scenario 4: Bỏ qua gói FREE hoặc đã CANCELLED
- **Given**: Gói dịch vụ `"FREE"` hoặc `"CANCELLED"`.
- **When**: Gọi `renewSubscription(subId)`.
- **Then**: Hệ thống giữ nguyên trạng thái, không gọi cổng thanh toán.
