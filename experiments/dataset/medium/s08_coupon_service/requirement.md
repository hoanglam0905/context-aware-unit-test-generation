# Requirement: Quản lý và áp dụng mã khuyến mãi (CouponService)

## 1. User Story
Là một Khách hàng tại bước thanh toán giỏ hàng,  
Tôi muốn nhập mã coupon giảm giá (Voucher code),  
Để nhận được chiết khấu hợp lệ theo chính sách của chiến dịch marketing.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Tìm kiếm và trạng thái Coupon (Coupon Status):**
   - Tìm coupon theo mã (`code`). Nếu không tìm thấy, ném `CouponNotFoundException`.
   - Nếu coupon có `isActive = false`, ném `CouponInactiveException('Coupon is deactivated')`.
2. **Kiểm tra thời hạn sử dụng (Validity Window):**
   - `startDate <= currentDate <= endDate`.
   - Nếu chưa đến ngày bắt đầu hoặc đã quá hạn, ném `CouponExpiredException`.
3. **Số lượt sử dụng (Usage Limit):**
   - Nếu tổng số lượt đã dùng $\ge$ số lượt tối đa (`usageCount >= maxUsage`), ném `CouponExhaustedException`.
   - Kiểm tra lịch sử người dùng qua `IUserCouponHistoryRepository`: nếu người dùng này đã từng dùng mã này (`hasUserUsed(userId, code)`), ném `CouponAlreadyUsedByUserException`.
4. **Điều kiện giá trị đơn hàng tối thiểu (Min Order Amount):**
   - Nếu `orderAmount < coupon.minOrderAmount`, ném `CouponConditionNotMetException('Order amount does not meet minimum requirement')`.
5. **Cách tính tiền giảm giá (Discount Calculation):**
   - Loại `PERCENTAGE`: $\text{discount} = \text{orderAmount} \times (\text{discountValue} / 100)$, bị giới hạn bởi `maxDiscountAmount` (nếu có).
   - Loại `FIXED_AMOUNT`: $\text{discount} = \min(\text{discountValue}, \text{orderAmount})$.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Áp dụng thành công coupon phần trăm có trần giảm giá
  Given đơn hàng 2,000,000 VND và coupon "SUMMER20" giảm 20% tối đa 300,000 VND
  And đơn hàng đạt mức tối thiểu 500,000 VND
  When người dùng "user-101" áp dụng coupon
  Then số tiền giảm giá là 300,000 VND (bị chặn trần thay vì 400,000 VND)
  And số tiền thanh toán cuối cùng là 1,700,000 VND

Scenario: Từ chối coupon khi người dùng đã từng sử dụng trước đó
  Given người dùng "user-101" đã dùng mã "WELCOME100" tuần trước
  When người dùng nhập lại mã "WELCOME100"
  Then hệ thống ném ra lỗi "CouponAlreadyUsedByUserException"
```
