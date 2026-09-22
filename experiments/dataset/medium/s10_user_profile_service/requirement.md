# Requirement: Cập nhật hồ sơ người dùng và đổi email (UserProfileService)

## 1. User Story
Là một Người dùng đã đăng nhập vào hệ sinh thái,  
Tôi muốn cập nhật thông tin cá nhân (Họ tên, Số điện thoại, Avatar) và thực hiện đổi địa chỉ Email,  
Để hồ sơ luôn chính xác và quy trình đổi email được bảo vệ bằng mã OTP gửi về hòm thư mới.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Cập nhật thông tin thông thường (Profile Updates):**
   - Họ tên (`fullName`) không được rỗng và có độ dài từ 2 đến 50 ký tự.
   - Số điện thoại phải đúng định dạng số điện thoại Việt Nam (10 số, bắt đầu bằng `0` hoặc `+84`).
2. **Quy trình đổi Email an toàn 2 bước (Two-Phase Email Change):**
   - **Bước 1: `requestEmailChange(userId, newEmail)`**:
     - Kiểm tra email mới: phải đúng định dạng email và không trùng với email hiện tại.
     - Kiểm tra trùng lặp toàn hệ thống: Nếu `newEmail` đã được một tài khoản khác sử dụng, ném `EmailAlreadyInUseException`.
     - Sinh mã OTP ngẫu nhiên gồm 6 chữ số (có hiệu lực trong 15 phút) lưu vào Cache / TokenStore.
     - Gửi email kèm mã OTP xác nhận tới hòm thư mới qua `EmailService`.
     - **Lưu ý:** Địa chỉ email trong bảng User vẫn giữ nguyên email cũ cho đến khi hoàn tất bước 2.
   - **Bước 2: `confirmEmailChange(userId, newEmail, otpCode)`**:
     - Kiểm tra mã OTP: Nếu không khớp hoặc đã hết hạn, ném `InvalidOrExpiredOtpException`.
     - Cập nhật chính thức `user.email = newEmail` trong DB.
     - Xóa token OTP để tránh tái sử dụng.
     - Ghi nhận Audit Log sự kiện đổi email bảo mật.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Yêu cầu đổi email thành công - gửi mã OTP
  Given người dùng có email hiện tại "old@example.com"
  When yêu cầu đổi sang email mới "new@example.com"
  Then hệ thống sinh mã OTP 6 số
  And gửi email xác nhận tới "new@example.com"
  And email trong cơ sở dữ liệu vẫn là "old@example.com"

Scenario: Xác nhận đổi email thành công với OTP chính xác
  Given người dùng đã nhận được mã OTP "123456" cho email mới
  When người dùng nhập đúng mã "123456"
  Then email người dùng được cập nhật thành "new@example.com"
  And mã OTP bị vô hiệu hóa
```
