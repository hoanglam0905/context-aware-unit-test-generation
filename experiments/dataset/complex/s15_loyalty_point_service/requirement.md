# S15 - Loyalty Point Service Requirement Specification

## 1. User Story
Là một thành viên tích cực trong hệ sinh thái khách hàng thân thiết, tôi muốn quy đổi điểm thưởng tích lũy (Loyalty Points) sang mã ưu đãi Voucher hoặc tiền mặt an toàn, với hệ thống bảo vệ chống gian lận (Fraud Detection Threshold) để bảo vệ tài sản số của tôi và ngân sách của doanh nghiệp.

---

## 2. Business Rules (Quy tắc nghiệp vụ)

1. **Quy định đổi điểm cơ bản**:
   - Số điểm quy đổi tối thiểu là `100 điểm` và phải là bội số của `10`.
   - Nếu số điểm không hợp lệ, ném ngoại lệ `InvalidPointsAmountException`.
   - Tỷ lệ quy đổi tiêu chuẩn: `1 điểm = 100 VNĐ` (Ví dụ: 500 điểm = 50.000 VNĐ).
2. **Kiểm tra trạng thái tài khoản và số dư**:
   - Nếu tài khoản không tồn tại, ném `LoyaltyAccountNotFoundException`.
   - Nếu tài khoản đang bị khóa (`isLocked = true`), từ chối giao dịch và ném `LoyaltyAccountLockedException`.
   - Nếu số dư điểm hiện tại nhỏ hơn số điểm muốn đổi, ném `InsufficientPointsException`.
3. **Cơ chế chống gian lận (Fraud Detection Engine)**:
   - Trước khi thực hiện trừ điểm, hệ thống gọi `IFraudDetectionService.evaluateRisk(userId, points, type)`.
   - Các tiêu chí rủi ro cao:
     - Số điểm đổi trong 1 lần vượt ngưỡng khẩn cấp (ví dụ: > 50.000 điểm).
     - Hành vi đổi dồn dập (ví dụ: > 3 giao dịch trong 10 phút) hoặc từ IP bị chặn.
   - Nếu phát hiện rủi ro gian lận (`riskScore >= 80` hoặc cờ `isBlocked = true`):
     - Tự động khóa tài khoản `isLocked = true`.
     - Ghi nhận giao dịch cắm cờ `"FLAGGED"`.
     - Ném ngoại lệ `FraudDetectedException`.
4. **Quy trình hoàn tất giao dịch hợp lệ**:
   - Trừ điểm trong tài khoản qua `ILoyaltyAccountRepository`.
   - Ghi nhận giao dịch vào sổ cái `ILoyaltyLedgerRepository` với trạng thái `"SUCCESS"`.
   - Nếu quy đổi sang Voucher (`type = "VOUCHER"`), gọi `IVoucherIssuer.issueVoucher(userId, amountVnd)`.
   - Gửi thông báo thành công qua `INotificationService`.

---

## 3. Acceptance Criteria (Gherkin Format)

### Scenario 1: Quy đổi điểm sang Voucher thành công
- **Given**: Người dùng `"USR-1"` có số dư 1.000 điểm và tài khoản hoạt động bình thường.
- **When**: Yêu cầu quy đổi 500 điểm sang `"VOUCHER"`.
- **Then**:
  - Hệ thống kiểm tra chống gian lận vượt qua an toàn.
  - Số dư tài khoản giảm 500 điểm (còn 500 điểm).
  - Ghi nhận giao dịch thành công với giá trị tương đương 50.000 VNĐ.
  - Mã voucher 50.000 VNĐ được cấp phát tới người dùng.

### Scenario 2: Từ chối số điểm không hợp lệ hoặc không đủ số dư
- **Given**: Người dùng có số dư 300 điểm.
- **When**: Yêu cầu đổi 50 điểm (< 100) hoặc 105 điểm (không chia hết cho 10).
- **Then**: Hệ thống ném `InvalidPointsAmountException`.
- **When**: Yêu cầu đổi 500 điểm (> số dư 300).
- **Then**: Hệ thống ném `InsufficientPointsException`.

### Scenario 3: Chặn giao dịch và khóa tài khoản khi phát hiện gian lận
- **Given**: Người dùng có số dư 100.000 điểm.
- **When**: Yêu cầu đổi 60.000 điểm và engine gian lận trả về `riskScore = 95` (nguy cơ cao).
- **Then**:
  - Tài khoản tự động bị chuyển sang trạng thái khóa `isLocked = true`.
  - Giao dịch được lưu vào sổ cái với cờ `"FLAGGED"`.
  - Hệ thống ném `FraudDetectedException`.
