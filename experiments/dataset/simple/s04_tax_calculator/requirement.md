# Requirement: Tính thuế thu nhập cá nhân lũy tiến (TaxCalculator)

## 1. User Story
Là một Nhân viên hoặc Kế toán viên tiền lương,  
Tôi muốn hệ thống tự động tính số thuế thu nhập cá nhân (TNCN) phải nộp theo biểu thuế lũy tiến từng phần của luật thuế Việt Nam,  
Để đảm bảo tính toán lương thưởng chính xác, minh bạch và tuân thủ đúng quy định pháp luật.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Các khoản giảm trừ (Deductions):**
   - Giảm trừ bản thân người nộp thuế: 11,000,000 VND/tháng cố định.
   - Giảm trừ người phụ thuộc: 4,400,000 VND/người/tháng.
   - Các khoản đóng bảo hiểm bắt buộc (BHXH, BHYT, BHTN): trừ trực tiếp vào thu nhập trước thuế.
2. **Xác định thu nhập tính thuế (Taxable Income):**
   $$\text{Thu nhập tính thuế} = \text{Tổng thu nhập} - \text{Bảo hiểm} - \text{Giảm trừ bản thân} - (\text{Số người phụ thuộc} \times 4,400,000)$$
   - Nếu thu nhập tính thuế $\le 0$: Số thuế TNCN phải nộp là 0 VND.
3. **Biểu thuế suất lũy tiến từng phần (7 bậc):**
   - **Bậc 1:** Đến 5 triệu VND: $5\%$
   - **Bậc 2:** Trên 5 đến 10 triệu VND: $10\%$
   - **Bậc 3:** Trên 10 đến 18 triệu VND: $15\%$
   - **Bậc 4:** Trên 18 đến 32 triệu VND: $20\%$
   - **Bậc 5:** Trên 32 đến 52 triệu VND: $25\%$
   - **Bậc 6:** Trên 52 đến 80 triệu VND: $30\%$
   - **Bậc 7:** Trên 80 triệu VND: $35\%$
4. **Kiểm tra hợp lệ đầu vào (Validation):**
   - Tổng thu nhập (`grossIncome`) không được âm ($< 0$).
   - Số người phụ thuộc (`dependents`) phải là số nguyên $\ge 0$. Nếu $< 0$, ném ngoại lệ `InvalidTaxInputException`.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Thu nhập dưới mức giảm trừ bản thân (Không phải đóng thuế)
  Given tổng thu nhập 10,000,000 VND và 0 người phụ thuộc
  When tính thuế TNCN
  Then thu nhập tính thuế là 0 VND
  And số thuế phải nộp là 0 VND

Scenario: Thu nhập chịu thuế rơi vào Bậc 1 (5%)
  Given tổng thu nhập 15,000,000 VND, bảo hiểm 1,500,000 VND, 0 người phụ thuộc
  And giảm trừ gia cảnh là 11,000,000 VND
  When tính thuế TNCN (thu nhập tính thuế: 15tr - 1.5tr - 11tr = 2.5tr)
  Then thuế bậc 1 là 2,500,000 * 5% = 125,000 VND

Scenario: Thu nhập chịu thuế lũy tiến qua nhiều bậc
  Given tổng thu nhập 30,000,000 VND, bảo hiểm 3,000,000 VND, 1 người phụ thuộc (4.4tr)
  When tính thuế TNCN (thu nhập tính thuế: 30tr - 3tr - 11tr - 4.4tr = 11.6tr)
  Then thuế Bậc 1 (5tr * 5% = 250k)
  And thuế Bậc 2 (5tr * 10% = 500k)
  And thuế Bậc 3 (1.6tr * 15% = 240k)
  And tổng thuế TNCN là 990,000 VND
```
