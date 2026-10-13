# 🧬 Báo Cáo Thực Nghiệm Mutation Testing

- **Thời gian thực hiện:** 2026-10-13T03:13:22.181Z
- **Lệnh thực thi:** `npm run experiment:mutation --all`
- **Công thức tính:** `Mutation Score (%) = (Killed + Timeout) / (Total - CompileError) * 100`
- **Số lượng Service đánh giá:** 15 (trên 15 services)
- **Tổng số Mutants sinh ra:** 291
- **Tổng số Mutants hợp lệ (Mẫu số):** 125
- **Tổng số Mutants bị tiêu diệt (Tử số):** 82
- **Mutation Score trung bình:** **65.6%**

## 1. Bảng Tổng Hợp Kết Quả Ground Truth

| Service ID | Phân loại | Tổng Mutants | Hợp lệ (Mẫu số) | Tiêu diệt (Killed) | Sống sót (Survived) | Lỗi biên dịch | **Mutation Score (%)** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **S01_DiscountCalculator** | simple | 9 | 9 | 8 | 1 | 0 | **88.89%** |
| **S02_PasswordValidator** | simple | 8 | 8 | 5 | 3 | 0 | **62.5%** |
| **S03_ShippingFeeCalculator** | simple | 21 | 21 | 16 | 5 | 0 | **76.19%** |
| **S04_TaxCalculator** | simple | 14 | 12 | 9 | 3 | 2 | **75%** |
| **S05_SlugGenerator** | simple | 5 | 3 | 1 | 2 | 2 | **33.33%** |
| **S06_AuthService** | medium | 14 | 3 | 3 | 0 | 11 | **100%** |
| **S07_CartService** | medium | 27 | 13 | 10 | 3 | 14 | **76.92%** |
| **S08_CouponService** | medium | 18 | 8 | 3 | 5 | 10 | **37.5%** |
| **S09_NotificationService** | medium | 17 | 5 | 1 | 4 | 12 | **20%** |
| **S10_UserProfileService** | medium | 26 | 6 | 3 | 3 | 20 | **50%** |
| **S11_PaymentService** | complex | 22 | 3 | 3 | 0 | 19 | **100%** |
| **S12_OrderFulfillmentService** | complex | 32 | 4 | 4 | 0 | 28 | **100%** |
| **S13_BookingConcurrencyService** | complex | 31 | 13 | 8 | 5 | 18 | **61.54%** |
| **S14_SubscriptionRenewalService** | complex | 26 | 10 | 4 | 6 | 16 | **40%** |
| **S15_LoyaltyPointService** | complex | 21 | 7 | 4 | 3 | 14 | **57.14%** |
| **TỔNG HỢP / TRUNG BÌNH** | - | **291** | **125** | **82** | **43** | **166** | **65.6%** |

## 2. Chi Tiết Từng Mutant Theo Từng Dịch Vụ

### 🔹 S01_DiscountCalculator (Score: 88.89%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `NUMERIC_LITERAL` | 24 | ✅ KILLED | Thay đổi trần giảm giá tối đa 500000 thành 100000 | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 31 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_003` | `BINARY_EXPRESSION` | 38 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_004` | `BOOLEAN_LITERAL` | 39 | ✅ KILLED | Đổi hằng số false thành true | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 41 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `BOOLEAN_LITERAL` | 43 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_007` | `BINARY_EXPRESSION` | 46 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 71 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_009` | `NUMERIC_LITERAL` | 71 | ✅ KILLED | Thay đổi tỉ lệ chiết khấu 0.15 thành 0.10 | - |

### 🔹 S02_PasswordValidator (Score: 62.5%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `BOOLEAN_LITERAL` | 33 | ✅ KILLED | Đổi hằng số false thành true | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 45 | ✅ KILLED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 47 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `EQUALITY_OPERATOR` | 64 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 69 | ⚠️ SURVIVED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_006` | `EQUALITY_OPERATOR` | 77 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_007` | `EQUALITY_OPERATOR` | 81 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 85 | ⚠️ SURVIVED | Thay đổi điều kiện biên >= thành > | - |

### 🔹 S03_ShippingFeeCalculator (Score: 76.19%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `NUMERIC_LITERAL` | 38 | ⚠️ SURVIVED | Thay đổi trần giảm giá tối đa 500000 thành 100000 | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 42 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 45 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_004` | `EQUALITY_OPERATOR` | 57 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_005` | `BINARY_EXPRESSION` | 59 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_006` | `BINARY_EXPRESSION` | 59 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 63 | ⚠️ SURVIVED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_008` | `EQUALITY_OPERATOR` | 63 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_009` | `BINARY_EXPRESSION` | 67 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 79 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 83 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_012` | `BINARY_EXPRESSION` | 84 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_013` | `BINARY_EXPRESSION` | 85 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_014` | `BINARY_EXPRESSION` | 85 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_015` | `BINARY_EXPRESSION` | 90 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_016` | `BINARY_EXPRESSION` | 93 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_017` | `BINARY_EXPRESSION` | 94 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_018` | `CONDITIONAL_BOUNDARY` | 99 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_019` | `BINARY_EXPRESSION` | 102 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_020` | `BINARY_EXPRESSION` | 103 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_021` | `EQUALITY_OPERATOR` | 109 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |

### 🔹 S04_TaxCalculator (Score: 75%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 35 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 35 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `NUMERIC_LITERAL` | 36 | ✅ KILLED | Thay đổi trần giảm giá tối đa 500000 thành 100000 | - |
| `MUT_004` | `NUMERIC_LITERAL` | 38 | ✅ KILLED | Thay đổi tỉ lệ chiết khấu 0.15 thành 0.10 | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 46 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 50 | ✅ KILLED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `BINARY_EXPRESSION` | 57 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_008` | `BINARY_EXPRESSION` | 60 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 66 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_010` | `BINARY_EXPRESSION` | 68 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 70 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_012` | `BINARY_EXPRESSION` | 73 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_013` | `BINARY_EXPRESSION` | 76 | ⚠️ SURVIVED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_014` | `BINARY_EXPRESSION` | 87 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |

### 🔹 S05_SlugGenerator (Score: 33.33%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 15 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 15 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `BOOLEAN_LITERAL` | 42 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 70 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 73 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |

### 🔹 S06_AuthService (Score: 100%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 64 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 64 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 65 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 65 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 69 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 69 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 73 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 73 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 85 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 85 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_011` | `EQUALITY_OPERATOR` | 100 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_012` | `EQUALITY_OPERATOR` | 104 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_013` | `BINARY_EXPRESSION` | 111 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_014` | `CONDITIONAL_BOUNDARY` | 112 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |

### 🔹 S07_CartService (Score: 76.92%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 33 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 33 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 37 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 37 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 38 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 38 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 51 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 51 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 53 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 53 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 54 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_012` | `EQUALITY_OPERATOR` | 70 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_013` | `CONDITIONAL_BOUNDARY` | 71 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_014` | `BINARY_EXPRESSION` | 72 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_015` | `CONDITIONAL_BOUNDARY` | 75 | ✅ KILLED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_016` | `CONDITIONAL_BOUNDARY` | 84 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_017` | `CONDITIONAL_BOUNDARY` | 103 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_018` | `CONDITIONAL_BOUNDARY` | 103 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_019` | `CONDITIONAL_BOUNDARY` | 109 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_020` | `EQUALITY_OPERATOR` | 110 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_021` | `EQUALITY_OPERATOR` | 112 | ⚠️ SURVIVED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_022` | `CONDITIONAL_BOUNDARY` | 118 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_023` | `CONDITIONAL_BOUNDARY` | 136 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_024` | `CONDITIONAL_BOUNDARY` | 136 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_025` | `BINARY_EXPRESSION` | 141 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_026` | `BINARY_EXPRESSION` | 142 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_027` | `BINARY_EXPRESSION` | 142 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |

### 🔹 S08_CouponService (Score: 37.5%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 69 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 69 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 70 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 70 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 74 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 74 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 75 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 75 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 89 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 89 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 90 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_012` | `CONDITIONAL_BOUNDARY` | 103 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_013` | `CONDITIONAL_BOUNDARY` | 103 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_014` | `CONDITIONAL_BOUNDARY` | 107 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_015` | `CONDITIONAL_BOUNDARY` | 116 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_016` | `EQUALITY_OPERATOR` | 123 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_017` | `BINARY_EXPRESSION` | 124 | ⚠️ SURVIVED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_018` | `BINARY_EXPRESSION` | 132 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |

### 🔹 S09_NotificationService (Score: 20%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 23 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 27 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 38 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 38 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 42 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 42 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 46 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 46 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 65 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 65 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 67 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_012` | `BOOLEAN_LITERAL` | 81 | ⚠️ SURVIVED | Đổi hằng số true thành false | - |
| `MUT_013` | `BOOLEAN_LITERAL` | 83 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_014` | `BOOLEAN_LITERAL` | 88 | ⚠️ SURVIVED | Đổi hằng số false thành true | - |
| `MUT_015` | `BOOLEAN_LITERAL` | 91 | ⚠️ SURVIVED | Đổi hằng số false thành true | - |
| `MUT_016` | `CONDITIONAL_BOUNDARY` | 113 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_017` | `CONDITIONAL_BOUNDARY` | 113 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |

### 🔹 S10_UserProfileService (Score: 50%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 45 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 45 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 46 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 46 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 47 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 47 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 51 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 51 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 52 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 52 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 56 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_012` | `CONDITIONAL_BOUNDARY` | 56 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_013` | `CONDITIONAL_BOUNDARY` | 66 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_014` | `CONDITIONAL_BOUNDARY` | 66 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_015` | `EQUALITY_OPERATOR` | 72 | COMPILE_ERROR | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_016` | `CONDITIONAL_BOUNDARY` | 74 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_017` | `CONDITIONAL_BOUNDARY` | 74 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_018` | `EQUALITY_OPERATOR` | 79 | COMPILE_ERROR | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_019` | `CONDITIONAL_BOUNDARY` | 92 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_020` | `CONDITIONAL_BOUNDARY` | 92 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_021` | `EQUALITY_OPERATOR` | 99 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_022` | `EQUALITY_OPERATOR` | 104 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_023` | `BINARY_EXPRESSION` | 109 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_024` | `BINARY_EXPRESSION` | 109 | ⚠️ SURVIVED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_025` | `CONDITIONAL_BOUNDARY` | 122 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_026` | `CONDITIONAL_BOUNDARY` | 122 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |

### 🔹 S11_PaymentService (Score: 100%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 73 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 73 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 74 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 74 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 78 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 78 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 79 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 79 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 80 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 80 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 84 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_012` | `CONDITIONAL_BOUNDARY` | 88 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_013` | `CONDITIONAL_BOUNDARY` | 89 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_014` | `CONDITIONAL_BOUNDARY` | 89 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_015` | `CONDITIONAL_BOUNDARY` | 93 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_016` | `CONDITIONAL_BOUNDARY` | 93 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_017` | `CONDITIONAL_BOUNDARY` | 104 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_018` | `CONDITIONAL_BOUNDARY` | 104 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_019` | `EQUALITY_OPERATOR` | 108 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_020` | `EQUALITY_OPERATOR` | 111 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_021` | `EQUALITY_OPERATOR` | 122 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_022` | `EQUALITY_OPERATOR` | 126 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |

### 🔹 S12_OrderFulfillmentService (Score: 100%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 46 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 46 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 47 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 47 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 51 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 51 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 52 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 52 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 56 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 56 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 60 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_012` | `CONDITIONAL_BOUNDARY` | 60 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_013` | `CONDITIONAL_BOUNDARY` | 64 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_014` | `CONDITIONAL_BOUNDARY` | 64 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_015` | `CONDITIONAL_BOUNDARY` | 76 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_016` | `CONDITIONAL_BOUNDARY` | 76 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_017` | `EQUALITY_OPERATOR` | 78 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_018` | `CONDITIONAL_BOUNDARY` | 103 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_019` | `CONDITIONAL_BOUNDARY` | 103 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_020` | `EQUALITY_OPERATOR` | 105 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_021` | `CONDITIONAL_BOUNDARY` | 118 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_022` | `CONDITIONAL_BOUNDARY` | 118 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_023` | `EQUALITY_OPERATOR` | 120 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_024` | `CONDITIONAL_BOUNDARY` | 139 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_025` | `CONDITIONAL_BOUNDARY` | 139 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_026` | `EQUALITY_OPERATOR` | 141 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_027` | `CONDITIONAL_BOUNDARY` | 155 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_028` | `CONDITIONAL_BOUNDARY` | 155 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_029` | `EQUALITY_OPERATOR` | 157 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_030` | `EQUALITY_OPERATOR` | 162 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_031` | `CONDITIONAL_BOUNDARY` | 177 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_032` | `CONDITIONAL_BOUNDARY` | 177 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |

### 🔹 S13_BookingConcurrencyService (Score: 61.54%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 58 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 58 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 59 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 59 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 63 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 63 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 64 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 64 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 65 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 65 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 66 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_012` | `CONDITIONAL_BOUNDARY` | 66 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_013` | `CONDITIONAL_BOUNDARY` | 89 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_014` | `CONDITIONAL_BOUNDARY` | 89 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_015` | `CONDITIONAL_BOUNDARY` | 92 | ⚠️ SURVIVED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_016` | `CONDITIONAL_BOUNDARY` | 96 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_017` | `EQUALITY_OPERATOR` | 110 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_018` | `BOOLEAN_LITERAL` | 110 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_019` | `CONDITIONAL_BOUNDARY` | 111 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_020` | `EQUALITY_OPERATOR` | 111 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_021` | `BOOLEAN_LITERAL` | 111 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_022` | `BOOLEAN_LITERAL` | 112 | ✅ KILLED | Đổi hằng số false thành true | - |
| `MUT_023` | `BINARY_EXPRESSION` | 119 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_024` | `BINARY_EXPRESSION` | 119 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_025` | `BINARY_EXPRESSION` | 121 | ⚠️ SURVIVED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_026` | `CONDITIONAL_BOUNDARY` | 138 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_027` | `CONDITIONAL_BOUNDARY` | 138 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_028` | `EQUALITY_OPERATOR` | 144 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_029` | `EQUALITY_OPERATOR` | 148 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_030` | `CONDITIONAL_BOUNDARY` | 153 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_031` | `EQUALITY_OPERATOR` | 153 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |

### 🔹 S14_SubscriptionRenewalService (Score: 40%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 14 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 14 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 28 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 28 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 32 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 32 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 33 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 33 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 37 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 37 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 42 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_012` | `CONDITIONAL_BOUNDARY` | 42 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_013` | `CONDITIONAL_BOUNDARY` | 43 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_014` | `CONDITIONAL_BOUNDARY` | 43 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_015` | `CONDITIONAL_BOUNDARY` | 61 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_016` | `CONDITIONAL_BOUNDARY` | 61 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_017` | `EQUALITY_OPERATOR` | 68 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_018` | `BINARY_EXPRESSION` | 76 | ⚠️ SURVIVED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_019` | `BINARY_EXPRESSION` | 76 | ⚠️ SURVIVED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_020` | `CONDITIONAL_BOUNDARY` | 80 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_021` | `CONDITIONAL_BOUNDARY` | 80 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_022` | `CONDITIONAL_BOUNDARY` | 95 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_023` | `BINARY_EXPRESSION` | 96 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_024` | `BINARY_EXPRESSION` | 96 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_025` | `BINARY_EXPRESSION` | 112 | ⚠️ SURVIVED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_026` | `BINARY_EXPRESSION` | 113 | ⚠️ SURVIVED | Đổi phép nhân (*) thành phép chia (/) | - |

### 🔹 S15_LoyaltyPointService (Score: 57.14%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 64 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 64 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 65 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 65 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 69 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 69 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 73 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 73 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 77 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 77 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_011` | `CONDITIONAL_BOUNDARY` | 81 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_012` | `CONDITIONAL_BOUNDARY` | 81 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_013` | `CONDITIONAL_BOUNDARY` | 101 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_014` | `CONDITIONAL_BOUNDARY` | 101 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_015` | `CONDITIONAL_BOUNDARY` | 103 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_016` | `EQUALITY_OPERATOR` | 109 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_017` | `CONDITIONAL_BOUNDARY` | 123 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_018` | `BINARY_EXPRESSION` | 127 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_019` | `CONDITIONAL_BOUNDARY` | 131 | ⚠️ SURVIVED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_020` | `BOOLEAN_LITERAL` | 133 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_021` | `EQUALITY_OPERATOR` | 176 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
