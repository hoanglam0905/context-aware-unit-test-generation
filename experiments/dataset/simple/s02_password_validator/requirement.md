# Requirement: Kiểm tra độ mạnh và tính hợp lệ của mật khẩu

## 1. User Story
Là một Chuyên viên an toàn thông tin (SecOps),  
Tôi muốn hệ thống kiểm tra và áp dụng chính sách mật khẩu nghiêm ngặt khi người dùng đăng ký hoặc đổi mật khẩu,  
Để bảo vệ tài khoản người dùng trước các cuộc tấn công Brute-force, Dictionary attacks và rò rỉ dữ liệu.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Độ dài mật khẩu (Length Constraint):**
   - Độ dài tối thiểu: 8 ký tự.
   - Độ dài tối đa: 32 ký tự.
2. **Thành phần ký tự bắt buộc (Complexity Requirements):**
   - Phải chứa ít nhất 1 chữ cái in hoa (`A-Z`).
   - Phải chứa ít nhất 1 chữ cái in thường (`a-z`).
   - Phải chứa ít nhất 1 chữ số (`0-9`).
   - Phải chứa ít nhất 1 ký tự đặc biệt trong tập hợp: `!@#$%^&*()_+-=[]{}|;:,.<>?`.
3. **Quy tắc an toàn nâng cao (Anti-Pattern Rules):**
   - Không được chứa khoảng trắng (whitespace).
   - Không được chứa thông tin nhạy cảm của người dùng (nếu có cung cấp username hoặc email, password không được chứa chuỗi con username không phân biệt hoa thường).
   - Không được trùng lặp với mật khẩu hiện tại (nếu đổi mật khẩu).
4. **Đánh giá mức độ an toàn (Password Strength Rating):**
   - `WEAK`: Không thỏa mãn một trong các quy tắc cơ bản.
   - `MEDIUM`: Thỏa mãn các quy tắc cơ bản và độ dài từ 8-11 ký tự.
   - `STRONG`: Thỏa mãn các quy tắc cơ bản, độ dài $\ge 12$ ký tự và chứa từ 2 ký tự đặc biệt trở lên.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Mật khẩu hợp lệ mức độ STRONG
  Given người dùng nhập mật khẩu "Str0ng@P@ssw0rd!" và username "john_doe"
  When hệ thống kiểm tra mật khẩu
  Then kết quả trả về isValid = true
  And strength = "STRONG"
  And danh sách lỗi rỗng

Scenario: Mật khẩu quá ngắn (dưới 8 ký tự)
  Given người dùng nhập mật khẩu "Ab1!xyz"
  When hệ thống kiểm tra mật khẩu
  Then kết quả trả về isValid = false
  And lỗi chứa thông báo "Password must be at least 8 characters long"

Scenario: Mật khẩu chứa username
  Given người dùng có username "john_doe"
  And người dùng đặt mật khẩu "John_Doe@2026"
  When hệ thống kiểm tra mật khẩu
  Then kết quả trả về isValid = false
  And lỗi chứa thông báo "Password must not contain username"

Scenario: Mật khẩu chứa khoảng trắng
  Given người dùng nhập mật khẩu "Pass 123!@#word"
  When hệ thống kiểm tra mật khẩu
  Then kết quả trả về isValid = false
  And lỗi chứa thông báo "Password must not contain whitespace"
```
