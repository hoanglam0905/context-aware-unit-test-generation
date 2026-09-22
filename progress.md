# BẢNG THEO DÕI TIẾN ĐỘ DỰ ÁN (PROJECT PROGRESS TRACKER)

> **Nhánh phát triển:** `feature/A`  
> **Người thực hiện:** Thành viên A (AI / Prompt Engineering & NCKH)  
> **Đề tài:** Tự động sinh Unit Test theo ngữ cảnh tài liệu nghiệp vụ (BA Requirement) sử dụng Large Language Model (LLM)  
> **Cập nhật lần cuối:** 2026-09-22  

---

## 📊 1. Tổng Quan Tiến Độ Nhánh `feature/A`

```
[████████████████████████░░░░░░░░] 75% Hoàn thành giai đoạn NCKH & Pipeline AI
```

- **Commit đã thực hiện:** 3 (`feat(dataset): expand benchmark dataset to full 15 services with requirements, code, and ground truth tests`)
- **Trạng thái:** Đã hoàn thành trọn vẹn 15 services (5 Simple, 5 Medium, 5 Complex) với đủ 3 file chuẩn (requirement.md, service.ts, ground_truth.test.ts) đạt 100% test pass (133/133 tests).

---

## 📋 2. Chi Tiết Các Hạng Mục Công Việc (Task Checklist)

### Giai đoạn 1: Thiết lập nền móng & Kiến trúc Prompt (ĐÃ HOÀN THÀNH ✅)
- [x] **Cấu trúc dự án:** Tạo `package.json`, `tsconfig.json`, `jest.config.js`, `.gitignore`, `.env.example`.
- [x] **Benchmark Catalog:** Lập danh mục 15 bài toán kiểm thử chia 3 tầng (`Simple`, `Medium`, `Complex`) tại `experiments/dataset/README.md`.
- [x] **3 Bộ Dataset chuẩn đầu tiên:**
  - [x] `S01_DiscountCalculator` (Simple): `requirement.md` (Gherkin), `service.ts`, `ground_truth.test.ts`.
  - [x] `S06_AuthService` (Medium): `requirement.md`, `service.ts`, `ground_truth.test.ts`.
  - [x] `S11_PaymentService` (Complex): `requirement.md`, `service.ts`, `ground_truth.test.ts`.
- [x] **Hệ thống 4 Chiến lược Prompt (`packages/core/src/prompts/`):**
  - [x] `ZeroShotPromptStrategy`: Baseline không có ngữ cảnh BA.
  - [x] `FewShotPromptStrategy`: Có mẫu exemplar chuẩn.
  - [x] `ChainOfThoughtPromptStrategy`: CoT 4 bước (Analysis ➔ Scenarios ➔ Mocking ➔ Test Code).
  - [x] `HybridPromptStrategy`: Nhúng trực tiếp BA Requirement + Code AST + CoT + JSON schema.
  - [x] `PromptStrategyFactory`: Factory pattern gọi chiến lược theo tên.
- [x] **Cổng kết nối LLM Gateway (`packages/core/src/llm/`):**
  - [x] `GeminiGateway`: Kết nối Google Gemini API (v1beta) có tự động retry.
  - [x] `OpenAICompatibleGateway`: Hỗ trợ OpenAI, DeepSeek API và Ollama Local.
  - [x] Bộ trích xuất code block markdown và parser JSON an toàn.
- [x] **Batch Runner cơ bản:** Script `experiments/batch_runner.ts` tự động quét dataset và chạy ma trận.
- [x] **Chạy thử nghiệm ban đầu:** Sinh thành công test case cho `S01` và `S06` bằng Gemini API.
- [x] **Docker hóa môi trường (Reproducibility):** Tạo `Dockerfile`, `docker-compose.yml` (tích hợp Ollama + Experiment Runner) và `DOCKER_GUIDE.md`.
- [x] **CI/CD Pipeline (GitHub Actions):** Tự động Type check, chạy Unit test, xuất báo cáo Coverage artifact và verify Docker build tại `.github/workflows/ci.yml`.
- [x] **Đẩy lên Git:** Đã commit và push nhánh `feature/A` lên GitHub.

---

### Giai đoạn 2: Tối ưu Thử nghiệm & Mở rộng Dataset (ĐÃ HOÀN THÀNH ✅)

#### Commit 2: Khắc phục Rate Limit & Quản lý hàng đợi Request (ĐÃ HOÀN THÀNH ✅)
- [x] Bổ sung cơ chế `requestThrottling` (giãn cách thời gian 15-20s giữa các lần gọi) trong `batch_runner.ts` để không bị vượt hạn mức 5 RPM của Gemini Free Tier.
- [x] Thêm chế độ `MockGateway` cho phép kiểm thử toàn bộ luồng mà không tốn quota API.
- [x] Hỗ trợ tiếp tục chạy từ vị trí bị dừng (`resumeFromCheckpoint` / `skipIfExists`) nếu gặp sự cố ngắt kết nối.


#### Commit 3: Mở rộng Benchmark Dataset lên đủ 15 Services (ĐÃ HOÀN THÀNH ✅)
- [x] **Tier Simple (5/5 services):**
  - [x] `S01_DiscountCalculator`
  - [x] `S02_PasswordValidator`
  - [x] `S03_ShippingFeeCalculator`
  - [x] `S04_TaxCalculator`
  - [x] `S05_SlugGenerator`
- [x] **Tier Medium (5/5 services):**
  - [x] `S06_AuthService`
  - [x] `S07_CartService`
  - [x] `S08_CouponService`
  - [x] `S09_NotificationService`
  - [x] `S10_UserProfileService`
- [x] **Tier Complex (5/5 services):**
  - [x] `S11_PaymentService`
  - [x] `S12_OrderFulfillmentService`
  - [x] `S13_BookingConcurrencyService`
  - [x] `S14_SubscriptionRenewalService`
  - [x] `S15_LoyaltyPointService`

---

### Giai đoạn 3: Đánh giá Chất lượng Test & Phân tích NCKH (KẾ HOẠCH TIẾP THEO ⏳)

#### Commit 4: Bộ đánh giá tính khả thi (Automated Test Evaluator)
- [ ] Viết script `experiments/evaluate_generated_tests.ts`:
  - [ ] Đo **Compilability Rate** (% file test biên dịch TypeScript thành công).
  - [ ] Đo **First-pass Execution Rate** (% test case chạy pass ngay lần đầu bằng Jest).
  - [ ] Đo **Line Coverage & Branch Coverage** tự động trên từng file test do LLM sinh ra.

#### Commit 5: Báo cáo Thống kê & Trực quan hóa số liệu
- [ ] Viết script `experiments/generate_report.ts`:
  - [ ] Tổng hợp ma trận số liệu so sánh giữa 4 kỹ thuật prompt (`Zero-shot` vs `Few-shot` vs `CoT` vs `Hybrid`).
  - [ ] Xuất bảng so sánh định lượng: Số lượng Token tiêu thụ, Độ trễ (Latency), Độ phủ (Coverage).
  - [ ] Sinh biểu đồ Markdown / Mermaid minh họa đóng góp của tài liệu BA.

---

## 📈 3. Nhật Ký Thực Nghiệm (Experiment Log)

| Ngày chạy | Model | Chiến lược Prompt | Service | Trạng thái | Số token | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| 2026-09-19 | Gemini-1.5-Flash | few-shot | S01_DiscountCalculator | **SUCCESS** | 3,414 | Sinh đầy đủ case biên âm/0/NaN. |
| 2026-09-19 | Gemini-1.5-Flash | cot | S01_DiscountCalculator | **SUCCESS** | 5,173 | 224 dòng test code chất lượng cao. |
| 2026-09-19 | Gemini-1.5-Flash | cot | S06_AuthService | **SUCCESS** | 6,445 | Mock 3 dependencies, test đủ lockout 5 lần. |
| 2026-09-20 | Ollama-qwen2.5-coder | zero-shot / few-shot | S01_DiscountCalculator | **SUCCESS** | 1,466 - 1,601 | Sinh đầy đủ logic tính giảm giá theo bậc. |
| 2026-09-20 | Ollama-qwen2.5-coder | **hybrid (BA + Code)** | S01_DiscountCalculator | **SUCCESS** | 2,542 | Xuất JSON schema chuẩn kịch bản test. |
| 2026-09-20 | Ollama-qwen2.5-coder | zero-shot / few-shot | S06_AuthService | **SUCCESS** | 2,013 - 2,064 | Mock UserRepository và TokenService. |
| 2026-09-20 | Ollama-qwen2.5-coder | cot | S06_AuthService | **SUCCESS** | 3,109 | Suy luận lockout 5 lần và các mã lỗi bảo mật. |
| 2026-09-20 | Ollama-qwen2.5-coder | **hybrid (BA + Code)** | S06_AuthService | **SUCCESS** | 2,926 | Bóc tách đầy đủ Acceptance Criteria Gherkin. |
| 2026-09-20 | Ollama-qwen2.5-coder | zero-shot / few-shot | S11_PaymentService | **SUCCESS** | 2,621 - 3,189 | Xử lý Idempotency và payment gateway mock. |
| 2026-09-20 | Ollama-qwen2.5-coder | cot | S11_PaymentService | **SUCCESS** | 3,465 | Phân tích sâu luồng voidTransaction khi timeout. |
| 2026-09-20 | Ollama-qwen2.5-coder | **hybrid (BA + Code)** | S11_PaymentService | **SUCCESS** | 4,047 | 172 dòng JSON + Jest test bao quát cả 5 SC. |


---

## 🎯 4. Kế Hoạch Phối Hợp với Thành Viên B và C

- **Bàn giao cho Thành viên B (Core Engine):**
  - Cung cấp interface `PromptContext` và `PromptStrategyFactory` để Thành viên B tích hợp vào Context Extractor.
  - Bàn giao các service và requirement mẫu để TV B thử nghiệm parser AST.
- **Bàn giao cho Thành viên C (VS Code Extension):**
  - Cung cấp định dạng JSON schema chuẩn của `HybridPromptStrategy` (gồm danh sách `testScenarios` và `testCode`) để TV C render lên giao diện Webview Preview cho người dùng chọn trước khi sinh test.
