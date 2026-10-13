# 🧬 Báo Cáo Thực Nghiệm Mutation Testing

- **Thời gian thực hiện:** 2026-10-13T07:29:51.759Z
- **Lệnh thực thi:** `npm run experiment:mutation --all`
- **Công thức tính:** `Mutation Score (%) = (Killed + Timeout) / (Total - CompileError) * 100`
- **Số lượng Service đánh giá:** 15 (trên 15 services)
- **Tổng số Mutants sinh ra:** 178
- **Tổng số Mutants hợp lệ (Mẫu số):** 152
- **Tổng số Mutants bị tiêu diệt (Tử số):** 100
- **Mutation Score trung bình:** **65.79%**

## 1. Bảng Tổng Hợp Kết Quả Ground Truth

| Service ID | Phân loại | Tổng Mutants | Hợp lệ (Mẫu số) | Tiêu diệt (Killed) | Sống sót (Survived) | Lỗi biên dịch | **Mutation Score (%)** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **S01_DiscountCalculator** | simple | 13 | 13 | 12 | 1 | 0 | **92.31%** |
| **S02_PasswordValidator** | simple | 8 | 8 | 5 | 3 | 0 | **62.5%** |
| **S03_ShippingFeeCalculator** | simple | 26 | 26 | 21 | 5 | 0 | **80.77%** |
| **S04_TaxCalculator** | simple | 27 | 25 | 15 | 10 | 2 | **60%** |
| **S05_SlugGenerator** | simple | 3 | 3 | 1 | 2 | 0 | **33.33%** |
| **S06_AuthService** | medium | 4 | 3 | 3 | 0 | 1 | **100%** |
| **S07_CartService** | medium | 15 | 13 | 10 | 3 | 2 | **76.92%** |
| **S08_CouponService** | medium | 8 | 8 | 3 | 5 | 0 | **37.5%** |
| **S09_NotificationService** | medium | 5 | 4 | 1 | 3 | 1 | **25%** |
| **S10_UserProfileService** | medium | 11 | 7 | 4 | 3 | 4 | **57.14%** |
| **S11_PaymentService** | complex | 7 | 3 | 3 | 0 | 4 | **100%** |
| **S12_OrderFulfillmentService** | complex | 8 | 4 | 4 | 0 | 4 | **100%** |
| **S13_BookingConcurrencyService** | complex | 17 | 15 | 9 | 6 | 2 | **60%** |
| **S14_SubscriptionRenewalService** | complex | 15 | 13 | 5 | 8 | 2 | **38.46%** |
| **S15_LoyaltyPointService** | complex | 11 | 7 | 4 | 3 | 4 | **57.14%** |
| **TỔNG HỢP / TRUNG BÌNH** | - | **178** | **152** | **100** | **52** | **26** | **65.79%** |

## 2. Chi Tiết Từng Mutant Theo Từng Dịch Vụ

### 🔹 S01_DiscountCalculator (Score: 92.31%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `NUMERIC_LITERAL` | 24 | ✅ KILLED | Thay đổi ngưỡng số học 500000 thành 250000 | - |
| `MUT_002` | `NUMERIC_LITERAL` | 25 | ✅ KILLED | Thay đổi ngưỡng số học 1000000 thành 500000 | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 31 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_004` | `BINARY_EXPRESSION` | 38 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_005` | `BOOLEAN_LITERAL` | 39 | ✅ KILLED | Đổi hằng số false thành true | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 41 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_007` | `BOOLEAN_LITERAL` | 43 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_008` | `BINARY_EXPRESSION` | 46 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_009` | `NUMERIC_LITERAL` | 69 | ✅ KILLED | Thay đổi tỉ lệ thập phân 0.20 thành 0.15 | - |
| `MUT_010` | `CONDITIONAL_BOUNDARY` | 71 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_011` | `NUMERIC_LITERAL` | 71 | ✅ KILLED | Thay đổi tỉ lệ thập phân 0.15 thành 0.10 | - |
| `MUT_012` | `NUMERIC_LITERAL` | 73 | ✅ KILLED | Thay đổi tỉ lệ thập phân 0.05 thành 0.10 | - |
| `MUT_013` | `NUMERIC_LITERAL` | 76 | ✅ KILLED | Thay đổi tỉ lệ thập phân 0.0 thành 0.05 | - |

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

### 🔹 S03_ShippingFeeCalculator (Score: 80.77%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `NUMERIC_LITERAL` | 29 | ✅ KILLED | Thay đổi ngưỡng số học 15000 thành 7500 | - |
| `MUT_002` | `NUMERIC_LITERAL` | 32 | ✅ KILLED | Thay đổi ngưỡng số học 3000 thành 1500 | - |
| `MUT_003` | `NUMERIC_LITERAL` | 33 | ✅ KILLED | Thay đổi ngưỡng số học 5000 thành 2500 | - |
| `MUT_004` | `NUMERIC_LITERAL` | 36 | ✅ KILLED | Thay đổi ngưỡng số học 5000 thành 2500 | - |
| `MUT_005` | `NUMERIC_LITERAL` | 38 | ⚠️ SURVIVED | Thay đổi ngưỡng số học 500000 thành 250000 | - |
| `MUT_006` | `NUMERIC_LITERAL` | 39 | ✅ KILLED | Thay đổi ngưỡng số học 30000 thành 15000 | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 42 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 45 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_009` | `EQUALITY_OPERATOR` | 57 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_010` | `BINARY_EXPRESSION` | 59 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_011` | `BINARY_EXPRESSION` | 59 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_012` | `CONDITIONAL_BOUNDARY` | 63 | ⚠️ SURVIVED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_013` | `EQUALITY_OPERATOR` | 63 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_014` | `BINARY_EXPRESSION` | 67 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_015` | `CONDITIONAL_BOUNDARY` | 79 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_016` | `CONDITIONAL_BOUNDARY` | 83 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_017` | `BINARY_EXPRESSION` | 84 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_018` | `BINARY_EXPRESSION` | 85 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_019` | `BINARY_EXPRESSION` | 85 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_020` | `BINARY_EXPRESSION` | 90 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_021` | `BINARY_EXPRESSION` | 93 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_022` | `BINARY_EXPRESSION` | 94 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_023` | `CONDITIONAL_BOUNDARY` | 99 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_024` | `BINARY_EXPRESSION` | 102 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_025` | `BINARY_EXPRESSION` | 103 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_026` | `EQUALITY_OPERATOR` | 109 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |

### 🔹 S04_TaxCalculator (Score: 60%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `NUMERIC_LITERAL` | 31 | ✅ KILLED | Thay đổi ngưỡng số học 11000000 thành 5500000 | - |
| `MUT_002` | `NUMERIC_LITERAL` | 32 | ✅ KILLED | Thay đổi ngưỡng số học 4400000 thành 2200000 | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 35 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 35 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `NUMERIC_LITERAL` | 36 | ✅ KILLED | Thay đổi tỉ lệ thập phân 0.05 thành 0.10 | - |
| `MUT_006` | `NUMERIC_LITERAL` | 36 | ✅ KILLED | Thay đổi ngưỡng số học 5000000 thành 2500000 | - |
| `MUT_007` | `NUMERIC_LITERAL` | 37 | ✅ KILLED | Thay đổi tỉ lệ thập phân 0.10 thành 0.05 | - |
| `MUT_008` | `NUMERIC_LITERAL` | 37 | ✅ KILLED | Thay đổi ngưỡng số học 10000000 thành 5000000 | - |
| `MUT_009` | `NUMERIC_LITERAL` | 38 | ✅ KILLED | Thay đổi tỉ lệ thập phân 0.15 thành 0.10 | - |
| `MUT_010` | `NUMERIC_LITERAL` | 38 | ✅ KILLED | Thay đổi ngưỡng số học 18000000 thành 9000000 | - |
| `MUT_011` | `NUMERIC_LITERAL` | 39 | ⚠️ SURVIVED | Thay đổi tỉ lệ thập phân 0.20 thành 0.15 | - |
| `MUT_012` | `NUMERIC_LITERAL` | 39 | ⚠️ SURVIVED | Thay đổi ngưỡng số học 32000000 thành 16000000 | - |
| `MUT_013` | `NUMERIC_LITERAL` | 40 | ⚠️ SURVIVED | Thay đổi tỉ lệ thập phân 0.25 thành 0.20 | - |
| `MUT_014` | `NUMERIC_LITERAL` | 40 | ⚠️ SURVIVED | Thay đổi ngưỡng số học 52000000 thành 26000000 | - |
| `MUT_015` | `NUMERIC_LITERAL` | 41 | ⚠️ SURVIVED | Thay đổi tỉ lệ thập phân 0.30 thành 0.25 | - |
| `MUT_016` | `NUMERIC_LITERAL` | 41 | ⚠️ SURVIVED | Thay đổi ngưỡng số học 80000000 thành 40000000 | - |
| `MUT_017` | `NUMERIC_LITERAL` | 42 | ⚠️ SURVIVED | Thay đổi tỉ lệ thập phân 0.35 thành 0.30 | - |
| `MUT_018` | `CONDITIONAL_BOUNDARY` | 46 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_019` | `CONDITIONAL_BOUNDARY` | 50 | ✅ KILLED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_020` | `BINARY_EXPRESSION` | 57 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_021` | `BINARY_EXPRESSION` | 60 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_022` | `CONDITIONAL_BOUNDARY` | 66 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_023` | `BINARY_EXPRESSION` | 68 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_024` | `CONDITIONAL_BOUNDARY` | 70 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_025` | `BINARY_EXPRESSION` | 73 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_026` | `BINARY_EXPRESSION` | 76 | ⚠️ SURVIVED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_027` | `BINARY_EXPRESSION` | 87 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |

### 🔹 S05_SlugGenerator (Score: 33.33%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `BOOLEAN_LITERAL` | 42 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 70 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 73 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |

### 🔹 S06_AuthService (Score: 100%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `EQUALITY_OPERATOR` | 100 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_002` | `EQUALITY_OPERATOR` | 104 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_003` | `BINARY_EXPRESSION` | 111 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 112 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |

### 🔹 S07_CartService (Score: 76.92%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 51 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 51 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 54 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_004` | `EQUALITY_OPERATOR` | 70 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 71 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_006` | `BINARY_EXPRESSION` | 72 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 75 | ✅ KILLED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 84 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 109 | ✅ KILLED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_010` | `EQUALITY_OPERATOR` | 110 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_011` | `EQUALITY_OPERATOR` | 112 | ⚠️ SURVIVED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_012` | `CONDITIONAL_BOUNDARY` | 118 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_013` | `BINARY_EXPRESSION` | 141 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_014` | `BINARY_EXPRESSION` | 142 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_015` | `BINARY_EXPRESSION` | 142 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |

### 🔹 S08_CouponService (Score: 37.5%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 90 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 103 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 103 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 107 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 116 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_006` | `EQUALITY_OPERATOR` | 123 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_007` | `BINARY_EXPRESSION` | 124 | ⚠️ SURVIVED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_008` | `BINARY_EXPRESSION` | 132 | ✅ KILLED | Đổi phép trừ (-) thành phép cộng (+) | - |

### 🔹 S09_NotificationService (Score: 25%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 23 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_002` | `BOOLEAN_LITERAL` | 81 | ⚠️ SURVIVED | Đổi hằng số true thành false | - |
| `MUT_003` | `BOOLEAN_LITERAL` | 83 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_004` | `BOOLEAN_LITERAL` | 88 | ⚠️ SURVIVED | Đổi hằng số false thành true | - |
| `MUT_005` | `BOOLEAN_LITERAL` | 91 | ⚠️ SURVIVED | Đổi hằng số false thành true | - |

### 🔹 S10_UserProfileService (Score: 57.14%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `EQUALITY_OPERATOR` | 72 | COMPILE_ERROR | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 74 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 74 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_004` | `EQUALITY_OPERATOR` | 79 | COMPILE_ERROR | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 92 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `CONDITIONAL_BOUNDARY` | 92 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_007` | `EQUALITY_OPERATOR` | 99 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_008` | `EQUALITY_OPERATOR` | 104 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_009` | `BINARY_EXPRESSION` | 109 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_010` | `BINARY_EXPRESSION` | 109 | ⚠️ SURVIVED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_011` | `NUMERIC_LITERAL` | 109 | ✅ KILLED | Thay đổi ngưỡng số học 100000 thành 50000 | - |

### 🔹 S11_PaymentService (Score: 100%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 79 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 79 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 84 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_004` | `EQUALITY_OPERATOR` | 108 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_005` | `EQUALITY_OPERATOR` | 111 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_006` | `EQUALITY_OPERATOR` | 122 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_007` | `EQUALITY_OPERATOR` | 126 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |

### 🔹 S12_OrderFulfillmentService (Score: 100%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 56 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 56 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `EQUALITY_OPERATOR` | 78 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_004` | `EQUALITY_OPERATOR` | 105 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_005` | `EQUALITY_OPERATOR` | 120 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_006` | `EQUALITY_OPERATOR` | 141 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_007` | `EQUALITY_OPERATOR` | 157 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_008` | `EQUALITY_OPERATOR` | 162 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |

### 🔹 S13_BookingConcurrencyService (Score: 60%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 92 | ⚠️ SURVIVED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 96 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `EQUALITY_OPERATOR` | 110 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_004` | `BOOLEAN_LITERAL` | 110 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 111 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_006` | `EQUALITY_OPERATOR` | 111 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_007` | `BOOLEAN_LITERAL` | 111 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_008` | `BOOLEAN_LITERAL` | 112 | ✅ KILLED | Đổi hằng số false thành true | - |
| `MUT_009` | `BINARY_EXPRESSION` | 119 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_010` | `BINARY_EXPRESSION` | 119 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_011` | `NUMERIC_LITERAL` | 119 | ✅ KILLED | Thay đổi ngưỡng số học 1000 thành 500 | - |
| `MUT_012` | `BINARY_EXPRESSION` | 121 | ⚠️ SURVIVED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_013` | `NUMERIC_LITERAL` | 121 | ⚠️ SURVIVED | Thay đổi ngưỡng số học 1000 thành 500 | - |
| `MUT_014` | `EQUALITY_OPERATOR` | 144 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_015` | `EQUALITY_OPERATOR` | 148 | COMPILE_ERROR | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_016` | `CONDITIONAL_BOUNDARY` | 153 | ⚠️ SURVIVED | Thay đổi điều kiện biên <= thành < | - |
| `MUT_017` | `EQUALITY_OPERATOR` | 153 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |

### 🔹 S14_SubscriptionRenewalService (Score: 38.46%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 28 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 28 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `EQUALITY_OPERATOR` | 68 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
| `MUT_004` | `BINARY_EXPRESSION` | 76 | ⚠️ SURVIVED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_005` | `BINARY_EXPRESSION` | 76 | ⚠️ SURVIVED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_006` | `NUMERIC_LITERAL` | 76 | ⚠️ SURVIVED | Thay đổi ngưỡng số học 1000 thành 500 | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 80 | ✅ KILLED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_008` | `CONDITIONAL_BOUNDARY` | 80 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 95 | ⚠️ SURVIVED | Thay đổi điều kiện biên > thành >= | - |
| `MUT_010` | `BINARY_EXPRESSION` | 96 | ✅ KILLED | Đổi phép cộng (+) thành phép trừ (-) | - |
| `MUT_011` | `BINARY_EXPRESSION` | 96 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_012` | `NUMERIC_LITERAL` | 96 | ✅ KILLED | Thay đổi ngưỡng số học 1000 thành 500 | - |
| `MUT_013` | `BINARY_EXPRESSION` | 112 | ⚠️ SURVIVED | Đổi phép trừ (-) thành phép cộng (+) | - |
| `MUT_014` | `BINARY_EXPRESSION` | 113 | ⚠️ SURVIVED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_015` | `NUMERIC_LITERAL` | 113 | ⚠️ SURVIVED | Thay đổi ngưỡng số học 1000 thành 500 | - |

### 🔹 S15_LoyaltyPointService (Score: 57.14%)

| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `MUT_001` | `CONDITIONAL_BOUNDARY` | 77 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_002` | `CONDITIONAL_BOUNDARY` | 77 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_003` | `CONDITIONAL_BOUNDARY` | 101 | COMPILE_ERROR | Thay đổi điều kiện biên > thành >= | - |
| `MUT_004` | `CONDITIONAL_BOUNDARY` | 101 | COMPILE_ERROR | Thay đổi điều kiện biên < thành <= | - |
| `MUT_005` | `CONDITIONAL_BOUNDARY` | 103 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_006` | `EQUALITY_OPERATOR` | 109 | ✅ KILLED | Đảo ngược toán tử so sánh !== thành === | - |
| `MUT_007` | `CONDITIONAL_BOUNDARY` | 123 | ⚠️ SURVIVED | Thay đổi điều kiện biên < thành <= | - |
| `MUT_008` | `BINARY_EXPRESSION` | 127 | ✅ KILLED | Đổi phép nhân (*) thành phép chia (/) | - |
| `MUT_009` | `CONDITIONAL_BOUNDARY` | 131 | ⚠️ SURVIVED | Thay đổi điều kiện biên >= thành > | - |
| `MUT_010` | `BOOLEAN_LITERAL` | 133 | ✅ KILLED | Đổi hằng số true thành false | - |
| `MUT_011` | `EQUALITY_OPERATOR` | 176 | ✅ KILLED | Đảo ngược toán tử so sánh bằng === thành !== | - |
