# Requirement: Tính toán giảm giá theo hạng thành viên

## 1. User Story
Là một Khách hàng của hệ thống E-commerce,  
Tôi muốn được áp dụng chính sách giảm giá tương ứng với hạng thành viên khi thanh toán đơn hàng,  
Để tôi được hưởng quyền lợi ưu đãi và khuyến khích tôi gắn bó với nền tảng.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Hạng thành viên (Membership Tier):**
   - `REGULAR`: Giảm 0%.
   - `SILVER`: Giảm 5% cho đơn hàng bất kỳ.
   - `GOLD`: Giảm 10% nếu đơn hàng dưới 1,000,000 VND; Giảm 15% nếu đơn hàng từ 1,000,000 VND trở lên.
   - `PLATINUM`: Giảm 20% cho đơn hàng bất kỳ.
2. **Hạn mức giảm giá tối đa (Discount Cap):**
   - Số tiền giảm giá tối đa không được vượt quá 500,000 VND cho một đơn hàng (bất kể hạng nào).
3. **Ràng buộc đầu vào (Validation):**
   - Giá trị đơn hàng (`orderAmount`) phải là số dương lớn hơn 0. Nếu $\le 0$, hệ thống ném ra ngoại lệ `InvalidOrderAmountException`.
   - Nếu hạng thành viên không hợp lệ hoặc rỗng, mặc định coi là `REGULAR`.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Tính giảm giá cho thành viên REGULAR
  Given khách hàng có hạng "REGULAR"
  When tính giảm giá cho đơn hàng 500,000 VND
  Then số tiền giảm giá là 0 VND
  And số tiền thanh toán cuối cùng là 500,000 VND

Scenario: Tính giảm giá cho thành viên GOLD đơn hàng lớn hơn hoặc bằng 1,000,000 VND
  Given khách hàng có hạng "GOLD"
  When tính giảm giá cho đơn hàng 2,000,000 VND
  Then mức giảm giá là 15% tương đương 300,000 VND
  And số tiền thanh toán cuối cùng là 1,700,000 VND

Scenario: Áp dụng trần giảm giá tối đa 500,000 VND cho PLATINUM
  Given khách hàng có hạng "PLATINUM" (chiết khấu 20%)
  When tính giảm giá cho đơn hàng 4,000,000 VND (20% là 800,000 VND)
  Then số tiền giảm giá bị chặn ở mức tối đa 500,000 VND
  And số tiền thanh toán là 3,500,000 VND

Scenario Outline: Ném lỗi khi giá trị đơn hàng không hợp lệ
  Given khách hàng nhập giá trị đơn hàng <amount>
  When thực hiện tính toán
  Then hệ thống báo lỗi "InvalidOrderAmountException"

  Examples:
    | amount |
    | 0      |
    | -50000 |
```
