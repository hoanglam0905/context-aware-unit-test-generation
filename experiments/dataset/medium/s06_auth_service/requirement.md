# Requirement: Xác thực người dùng (AuthService Login)

## 1. User Story
Là một Người dùng đã đăng ký tài khoản,  
Tôi muốn đăng nhập vào hệ thống bằng Email và Mật khẩu,  
Để tôi có thể truy cập các tính năng bảo mật của nền tảng.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Kiểm tra thông tin đầu vào (Input Validation):**
   - Email và Password không được để trống hoặc chỉ chứa khoảng trắng. Nếu vi phạm ném `ValidationError`.
   - Định dạng email phải hợp lệ (chứa ký tự `@` và domain).
2. **Xác thực tài khoản (User Existence):**
   - Tìm user theo email thông qua `UserRepository`. Nếu không tìm thấy, ném `InvalidCredentialsError`. (Lưu ý bảo mật: Không thông báo "Email không tồn tại" để tránh user enumeration).
3. **Trạng thái tài khoản (Account Status):**
   - Nếu tài khoản có status `LOCKED`, ném `AccountLockedError`.
   - Nếu tài khoản có status `PENDING_VERIFICATION`, ném `AccountNotVerifiedError`.
4. **Kiểm tra mật khẩu & Khóa tài khoản:**
   - So sánh password với hash lưu trong DB thông qua `HashService.compare(plain, hashed)`.
   - Nếu mật khẩu SAI:
     - Tăng số lần đăng nhập sai (`failedAttempts += 1`).
     - Nếu `failedAttempts >= 5`, cập nhật status thành `LOCKED`, ghi log bảo mật và ném `AccountLockedError`.
     - Nếu chưa tới 5 lần, ném `InvalidCredentialsError`.
   - Nếu mật khẩu ĐÚNG:
     - Reset `failedAttempts = 0`.
     - Cập nhật `lastLoginAt = new Date()`.
     - Sinh cặp token JWT (`accessToken`, `refreshToken`) thông qua `TokenService`.
     - Trả về payload đăng nhập thành công kèm thông tin cơ bản của user.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Đăng nhập thành công với thông tin chính xác
  Given người dùng có tài khoản email "user@example.com" với status "ACTIVE"
  When người dùng đăng nhập với mật khẩu chính xác
  Then hệ thống trả về accessToken và refreshToken
  And số lần đăng nhập sai (failedAttempts) được reset về 0
  And thời gian lastLoginAt được cập nhật

Scenario: Đăng nhập thất bại do sai mật khẩu lần thứ 3 (chưa khóa)
  Given người dùng đã có 2 lần nhập sai mật khẩu trước đó
  When người dùng nhập sai mật khẩu lần nữa
  Then số lần failedAttempts tăng lên 3
  And hệ thống ném ra "InvalidCredentialsError"
  And tài khoản vẫn giữ status "ACTIVE"

Scenario: Tự động khóa tài khoản khi nhập sai mật khẩu đủ 5 lần
  Given người dùng đã có 4 lần nhập sai mật khẩu trước đó
  When người dùng nhập sai mật khẩu lần thứ 5
  Then số lần failedAttempts tăng lên 5
  And trạng thái tài khoản chuyển thành "LOCKED"
  And hệ thống ném ra "AccountLockedError"

Scenario: Từ chối đăng nhập với tài khoản đang bị khóa sẵn
  Given tài khoản đang ở trạng thái "LOCKED"
  When người dùng cố gắng đăng nhập
  Then hệ thống ngay lập tức ném ra "AccountLockedError" mà không kiểm tra mật khẩu
```
