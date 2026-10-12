# 🧬 Báo Cáo Thực Nghiệm Mutation Testing

- **Thời gian thực hiện:** 2026-10-12T15:50:35.198Z
- **Lệnh thực thi:** `npm run experiment:mutation`
- **Công thức tính:** `Mutation Score (%) = (Killed + Timeout) / (Total - CompileError) * 100`
- **Số lượng Service đánh giá:** 1 (trên 15 services)
- **Tổng số Mutants sinh ra:** 9
- **Tổng số Mutants hợp lệ (Mẫu số):** 9
- **Tổng số Mutants bị tiêu diệt (Tử số):** 8
- **Mutation Score trung bình:** **88.89%**

## 1. Bảng Tổng Hợp Kết Quả Ground Truth

| Service ID | Phân loại | Tổng Mutants | Hợp lệ (Mẫu số) | Tiêu diệt (Killed) | Sống sót (Survived) | Lỗi biên dịch | **Mutation Score (%)** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **S01_DiscountCalculator** | simple | 9 | 9 | 8 | 1 | 0 | **88.89%** |
| **TỔNG HỢP / TRUNG BÌNH** | - | **9** | **9** | **8** | **1** | **0** | **88.89%** |

## 2. Chi Tiết Từng Mutant Theo Từng Dịch Vụ

### 🔹 S01_DiscountCalculator (Score: 88.89%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `NUMERIC_LITERAL` | 24 | ✅ KILLED | Thay đổi trần giảm giá tối đa 500000 thành 100000 | `should give 15% discount for GOLD tier when amount >= 1,000,000 (Boundary Value)` |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 31 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | `should throw InvalidOrderAmountException when amount is 0` |
| `MUT_003` | `BINARY_EXPRESSION` | 38 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | `should default to REGULAR tier when tier is undefined` |
| `MUT_004` | `BOOLEAN_LITERAL` | 39 | ✅ KILLED | Đổi hằng số false thành true | `should default to REGULAR tier when tier is undefined` |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 41 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `BOOLEAN_LITERAL` | 43 | ✅ KILLED | Đổi hằng số true thành false | `should cap discount amount at 500,000 VND when calculated discount exceeds 500k` |
| `MUT_007` | `BINARY_EXPRESSION` | 46 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | `should give 5% discount for SILVER tier` |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 71 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | `should give 15% discount for GOLD tier when amount >= 1,000,000 (Boundary Value)` |
| `MUT_009` | `NUMERIC_LITERAL` | 71 | ✅ KILLED | Thay đổi tỉ lệ chiết khấu 0.15 thành 0.10 | `should give 15% discount for GOLD tier when amount >= 1,000,000 (Boundary Value)` |
