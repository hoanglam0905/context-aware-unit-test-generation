# Requirement: Tính phí giao hàng (ShippingFeeCalculator)

## 1. User Story
Là một Khách hàng đặt mua đơn hàng trên sàn E-commerce,  
Tôi muốn hệ thống tự động tính toán phí vận chuyển chính xác dựa trên khoảng cách địa lý, trọng lượng kiện hàng và phương thức giao hàng,  
Để tôi nắm rõ chi phí trước khi tiến hành thanh toán đơn hàng.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Phí cơ bản theo khoảng cách (Distance Tier):**
   - Khoảng cách $\le 5$ km: Cước cơ bản cố định là 15,000 VND.
   - Khoảng cách từ $> 5$ km đến $20$ km: Cước cơ bản = 15,000 + (khoảng cách - 5) $\times$ 3,000 VND/km.
   - Khoảng cách $> 20$ km: Cước cơ bản = 15,000 + (15 $\times$ 3,000) + (khoảng cách - 20) $\times$ 5,000 VND/km.
2. **Phụ phí khối lượng (Weight Surcharge):**
   - Khối lượng kiện hàng tính bằng kg (`weightKg`).
   - Miễn phụ phí cho 2 kg đầu tiên.
   - Mỗi kg vượt quá 2 kg (làm tròn lên): phụ thu thêm 5,000 VND/kg.
3. **Phương thức giao hàng (Shipping Method):**
   - `STANDARD` (Tiêu chuẩn): Giữ nguyên cước tính toán.
   - `EXPRESS` (Hỏa tốc trong 2h): Nhân hệ số $1.5$ trên tổng cước (làm tròn đến hàng nghìn).
4. **Miễn phí vận chuyển (Freeship Policy):**
   - Nếu giá trị đơn hàng (`orderSubtotal`) $\ge 500,000$ VND và phương thức là `STANDARD`, giảm tối đa 30,000 VND phí ship. Phí ship tối thiểu sau giảm là 0 VND.
5. **Ràng buộc kiểm tra đầu vào (Validation):**
   - `distanceKm` phải $> 0$. Nếu $\le 0$, ném lỗi `InvalidShippingInputException('Distance must be greater than 0')`.
   - `weightKg` phải $> 0$. Nếu $\le 0$, ném lỗi `InvalidShippingInputException('Weight must be greater than 0')`.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Giao hàng chuẩn khoảng cách gần dưới 5km và nhẹ dưới 2kg
  Given khoảng cách 4 km và khối lượng 1.5 kg
  And phương thức "STANDARD" với đơn hàng 200,000 VND
  When tính phí giao hàng
  Then cước vận chuyển là 15,000 VND

Scenario: Giao hàng hỏa tốc và kiện hàng nặng vượt chuẩn
  Given khoảng cách 10 km (phí cơ bản: 15,000 + 5*3,000 = 30,000 VND)
  And khối lượng 5 kg (vượt 3kg: phụ thu 3*5,000 = 15,000 VND)
  And phương thức "EXPRESS" (hệ số 1.5)
  When tính phí giao hàng
  Then tổng cước trước nhân hệ số là 45,000 VND
  And cước cuối cùng là 45,000 * 1.5 = 67,500 VND (hoặc 68,000 VND nếu làm tròn)

Scenario: Áp dụng mã miễn phí ship 30,000 VND cho đơn hàng giá trị cao
  Given đơn hàng có giá trị 600,000 VND
  And phương thức "STANDARD" với cước tính ban đầu là 25,000 VND
  When tính phí giao hàng
  Then cước vận chuyển sau giảm trừ được đưa về 0 VND
```
