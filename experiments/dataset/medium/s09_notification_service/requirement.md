# Requirement: Gửi thông báo đa kênh có cơ chế dự phòng (NotificationService)

## 1. User Story
Là một Hệ thống cảnh báo & Chăm sóc khách hàng,  
Tôi muốn gửi thông báo tới người dùng qua các kênh ưa thích (Email, SMS, Mobile Push) với cơ chế tự động chuyển kênh dự phòng (Fallback) khi kênh chính gặp sự cố,  
Để đảm bảo các thông điệp quan trọng (mã OTP, biến động số dư, trạng thái đơn hàng) luôn được chuyển giao thành công.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Lựa chọn kênh theo độ ưu tiên & Cấu hình người dùng (Channel Preference):**
   - Người dùng có thể cấu hình danh sách kênh ưu tiên theo thứ tự (ví dụ: `[PUSH, SMS, EMAIL]`).
   - Nếu người dùng không cấu hình, danh sách mặc định là: `PUSH` $\to$ `EMAIL` $\to$ `SMS`.
2. **Cơ chế Fallback khi gặp lỗi (Fault Tolerance):**
   - Hệ thống thử gửi qua kênh đầu tiên trong danh sách ưu tiên.
   - Nếu nhà cung cấp dịch vụ của kênh đó (Sender) trả về thất bại (ném lỗi hoặc `success = false`):
     - Ghi nhận lỗi của kênh hiện tại vào lịch sử.
     - Tự động thử gửi tiếp sang kênh kế tiếp trong danh sách fallback.
   - Nếu gửi thành công ở bất kỳ kênh nào: lập tức kết thúc quá trình gửi và đánh dấu thông báo là `DELIVERED`.
3. **Trường hợp tất cả các kênh đều thất bại:**
   - Nếu đã duyệt hết toàn bộ các kênh trong danh sách mà không có kênh nào gửi được, đánh dấu thông báo là `FAILED` và ném `AllNotificationChannelsFailedException`.
4. **Kiểm tra thông tin người nhận (Recipient Info Validation):**
   - Gửi kênh `EMAIL` đòi hỏi người nhận phải có địa chỉ email hợp lệ.
   - Gửi kênh `SMS` đòi hỏi phải có số điện thoại (`phoneNumber`).
   - Gửi kênh `PUSH` đòi hỏi phải có thiết bị đã đăng ký token (`deviceToken`).
   - Nếu thiếu thông tin cần thiết của một kênh, kênh đó sẽ bị bỏ qua (Skip) để chuyển sang kênh tiếp theo.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Gửi thành công ngay từ kênh ưu tiên số 1 (PUSH)
  Given người dùng có deviceToken hợp lệ
  When gửi thông báo "Đơn hàng đã được xác nhận"
  And nhà cung cấp Push phản hồi thành công
  Then thông báo được đánh dấu "DELIVERED" qua kênh "PUSH"
  And không có tin nhắn SMS hoặc Email nào bị gửi dư thừa

Scenario: Tự động chuyển sang EMAIL khi kênh PUSH thất bại
  Given kênh PUSH gặp sự cố mất kết nối mạng
  And người dùng có email "user@example.com"
  When hệ thống gửi thông báo
  Then hệ thống tự động fallback và gửi thành công qua kênh "EMAIL"
  And nhật ký ghi nhận 1 lần thất bại PUSH và 1 lần thành công EMAIL
```
