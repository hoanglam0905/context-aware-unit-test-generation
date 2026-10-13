# Acceptance Checklist & Verification Runbook (VS Code Extension)

Tài liệu này định nghĩa quy trình kiểm thử chấp nhận (User Acceptance Testing - UAT) và các bước kiểm chứng thủ công / tự động đối với sản phẩm **Context-Aware Unit Test Generator Extension**.

---

## 1. Thông tin Phiên bản & Môi trường

- **Extension Name:** Context-Aware Unit Test Generator (`utc2-research-team.context-aware-unit-test-generation-extension`)
- **Version:** `0.1.0`
- **Target IDE:** Visual Studio Code `1.85.0+`
- **Môi trường Test chuẩn:** Docker Node v20 (`experiment-runner`), Ubuntu 22.04 LTS

---

## 2. Kịch bản Kiểm thử Chấp nhận End-to-End (UAT Matrix)

| STT | Kịch bản / Luồng người dùng | Các bước thực hiện | Kết quả mong đợi | Trạng thái |
|---|---|---|---|:---:|
| **UAT-01** | **Kích hoạt Extension & CodeLens** | Mở workspace có file TypeScript Service (ví dụ: `experiments/dataset/simple/s01_discount_calculator/service.ts`). | Hiển thị CodeLens phía trên Class (`✨ [Jest] Sinh Unit Test cho: DiscountCalculatorService`) và từng Method (`⚡ [Jest] Sinh test BA cho: calculateDiscount()`). Status Bar hiển thị `$(beaker) AI Test Gen`. | ✅ ĐẠT |
| **UAT-02** | **Sinh Test theo Method (Method-Level Scoping)** | Bấm vào CodeLens `Sinh test BA cho: calculateDiscount()`. | Hệ thống gửi yêu cầu kèm `targetMethodName: 'calculateDiscount'`, thông báo toast hiển thị đúng tên method; prompt tập trung vào chữ ký method và không sinh thừa cho toàn file. | ✅ ĐẠT |
| **UAT-03** | **An toàn Webview (XSS Protection & CSP)** | Webview Preview mở ra nhận payload chứa description có ký tự đặc biệt (`<img onerror=alert(1)>`, `<script>`). | Content Security Policy với cryptographic `nonce` chặn script tùy ý. Nội dung mô tả được gán qua `textContent`, render nguyên văn dưới dạng text thuần, không chèn HTML độc hại. | ✅ ĐẠT |
| **UAT-04** | **Hiển thị Traceability Trực quan** | Xem danh sách kịch bản trong Webview Preview. | Mỗi scenario hiển thị rõ ràng: Category tag, Badge `🎯 AC/BR Reference` (ví dụ: `BR3: Ràng buộc giá trị đơn hàng`), và `➡️ Expected Behavior`. | ✅ ĐẠT |
| **UAT-05** | **Tương tác Checkbox & Lọc Scenario** | Bỏ tick 1 hoặc 2 kịch bản kiểm thử trong danh sách preview. | Khung hiển thị code tự động cập nhật, loại bỏ các block `it(...)` tương ứng với kịch bản bị bỏ chọn. Thông tin số lượng hiển thị đúng: `Đã chọn: X/Y kịch bản`. | ✅ ĐẠT |
| **UAT-06** | **Chấp nhận & Lưu file an toàn** | Bấm nút **💾 Chấp Nhận & Lưu File Test**. | File test được ghi chính xác vào workspace theo đúng các scenario đã chọn. Toast thông báo thành công chỉ hiện sau khi ghi file hoàn tất. Nếu có lỗi I/O, báo lỗi và không hiện toast thành công. | ✅ ĐẠT |
| **UAT-07** | **Tự phục hồi lỗi (Self-Reflection Auto-Fix)** | Sinh mã test có lỗi cú pháp hoặc assertion giả lập. | Hệ thống phát hiện lỗi qua Test Runner, kích hoạt Self-Reflection Auto-Fix gửi mã lỗi cho LLM sửa trong tối đa 2 vòng lặp. | ✅ ĐẠT |
| **UAT-08** | **Quyền riêng tư & Cloud Disclosures** | Chọn Cloud Provider (Gemini / OpenAI / DeepSeek). | Extension hiển thị thông báo quyền riêng tư về việc mã nguồn / BA được gửi tới Cloud provider. `autoGenerateOnSave` ở trạng thái mặc định tắt (`false`) để bảo vệ dữ liệu. | ✅ ĐẠT |
| **UAT-09** | **Mutation-Guided Refinement** | Chạy kiểm thử đột biến phát hiện mutant còn sống sót. | Module `MutationGuidedRefiner` phân tích chi tiết mutant, sinh gợi ý test case biên/đối nghịch và prompt phản hồi nhắm thẳng vào mutant sống sót. | ✅ ĐẠT |

---

## 3. Lệnh Kiểm chứng Tự động trong CI / Docker

```bash
# 1. Typecheck TypeScript
npx tsc --noEmit

# 2. Biên dịch Extension
npm run compile:extension

# 3. Chạy toàn bộ Unit & Acceptance Test Suites
npm test

# 4. Kiểm định tập dữ liệu & Ground Truth
npm run dataset:validate

# 5. Chạy Mutation Testing toàn bộ 15 Services
npm run experiment:mutation -- --all
```
