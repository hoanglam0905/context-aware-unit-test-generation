# BENCHMARK DATASET SPECIFICATION & CATALOG

Tài liệu quản lý và danh mục 15 bài toán nghiệp vụ mẫu phục vụ ma trận thực nghiệm sinh Unit Test từ tài liệu BA + Source Code.

## 1. Phân loại độ phức tạp (Complexity Tiers)

| Mức độ | Số lượng | Tiêu chí kỹ thuật | Đặc điểm nghiệp vụ |
| :--- | :---: | :--- | :--- |
| **Simple (Đơn giản)** | 5 | 0-1 dependency, Cyclomatic Complexity $\le 4$, luồng rẽ nhánh ít. | CRUD cơ bản, format dữ liệu, tính toán phí/chiết khấu đơn giản. |
| **Medium (Trung bình)** | 5 | 2-3 dependencies (Database, Cache, External API), Cyclomatic Complexity 5-10. | Xác thực người dùng, OTP, giỏ hàng, áp dụng coupon voucher, phân quyền. |
| **Complex (Phức tạp)** | 5 | $\ge 4$ dependencies, Cyclomatic Complexity $> 10$, nhiều ngoại lệ nghiệp vụ, state machine. | Xử lý thanh toán hoàn tiền, quy trình duyệt đơn nhiều bước, đặt phòng/ghế concurrency, tính điểm xếp hạng loyalty. |

---

## 2. Danh mục 15 Services & Yêu Cầu Nghiệp Vụ (Catalog)

### Tier 1: Simple Services
1. **`S01_DiscountCalculator`**: Tính phần trăm giảm giá theo hạng thành viên (BRONZE, SILVER, GOLD, PLATINUM) và giá trị đơn hàng.
2. **`S02_PasswordValidator`**: Kiểm tra độ mạnh mật khẩu theo chính sách bảo mật (độ dài, ký tự đặc biệt, không chứa username, lịch sử trùng lặp).
3. **`S03_ShippingFeeCalculator`**: Tính phí giao hàng theo khoảng cách km, khối lượng kiện hàng và cờ hỏa tốc (Express).
4. **`S04_TaxCalculator`**: Tính thuế thu nhập cá nhân lũy tiến theo từng bậc và giảm trừ gia cảnh.
5. **`S05_SlugGenerator`**: Chuyển đổi tiêu đề bài viết tiếng Việt sang URL Slug chuẩn SEO, xử lý ký tự đặc biệt và độ dài tối đa.

### Tier 2: Medium Services
6. **`S06_AuthService`**: Đăng nhập tài khoản (Kiểm tra tồn tại, bcrypt verify, khóa tài khoản nếu nhập sai quá 5 lần, sinh JWT).
7. **`S07_CartService`**: Thêm sản phẩm vào giỏ hàng, kiểm tra tồn kho (InventoryService), giới hạn số lượng mua tối đa cho mỗi tài khoản.
8. **`S08_CouponService`**: Áp dụng mã giảm giá (kiểm tra hạn sử dụng, số lượng còn lại, giá trị đơn hàng tối thiểu, kiểm tra chống dùng lặp).
9. **`S09_NotificationService`**: Gửi thông báo đa kênh (Email/SMS/Push Notification) theo cấu hình người dùng, fallback nếu kênh chính lỗi.
10. **`S10_UserProfileService`**: Cập nhật hồ sơ cá nhân, đổi email (yêu cầu gửi email xác nhận trước khi cập nhật chính thức).

### Tier 3: Complex Services
11. **`S11_PaymentService`**: Xử lý thanh toán đơn hàng (Gọi Payment Gateway 3rd-party, Idempotency key, hoàn tiền khi giao dịch fail, lưu audit log).
12. **`S12_OrderFulfillmentService`**: Xử lý state machine đơn hàng: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED (bắt buộc rollback nếu hết hàng).
13. **`S13_BookingConcurrencyService`**: Đặt vé/phòng thời gian thực (Giữ chỗ 10 phút, kiểm tra trùng lặp thời gian, xử lý deadlock/race condition).
14. **`S14_SubscriptionRenewalService`**: Tự động gia hạn gói dịch vụ định kỳ (Retry 3 lần nếu trừ thẻ lỗi, hạ cấp tài khoản nếu quá hạn 7 ngày, gửi email nhắc).
15. **`S15_LoyaltyPointService`**: Quy đổi điểm thưởng sang voucher hoặc tiền mặt, tích hợp cơ chế chống gian lận (Fraud detection threshold).

---

## 3. Cấu trúc mỗi thư mục mẫu
Mỗi mẫu trong dataset bao gồm đúng 3 thành phần:
```
experiments/dataset/<tier>/<service_id>/
├── requirement.md      # Tài liệu nghiệp vụ BA: User Story, Acceptance Criteria (Gherkin), Business Rules
├── service.ts          # Mã nguồn Service cần viết Unit Test (TypeScript)
└── ground_truth.test.ts # Bộ Unit Test mẫu chuẩn do chuyên gia/con người viết làm đối trọng so sánh
```
