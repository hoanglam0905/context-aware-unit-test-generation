# Acceptance Checklist & Verification Runbook (VS Code Extension)

Tài liệu này định nghĩa quy trình kiểm thử chấp nhận (User Acceptance Testing - UAT) và các bước kiểm chứng đối với sản phẩm **Context-Aware Unit Test Generator Extension** (`utc2-research-team.context-aware-unit-test-generation-extension`).

---

## 1. Thông tin Phiên bản & Môi trường

- **Extension Name:** Context-Aware Unit Test Generator
- **Version:** `0.1.0`
- **Target IDE:** Visual Studio Code `1.85.0+`
- **Môi trường Test chuẩn:** Docker Node v20 (`experiment-runner`), Ubuntu 22.04 LTS
- **Phân định cấp độ kiểm chứng:**
  - **Tầng 1 (Tự động - Automated CI Suite):** Kiểm chứng tự động trong Docker sandbox / Jest (`packages/extension/src/acceptance.test.ts`) bao gồm: CSP, XSS sanitization, TypeScript AST scenario filtering, path traversal defense, method slice extraction, và mutation refinement logic.
  - **Tầng 2 (Tương tác - Interactive VS Code Host):** Kiểm chứng tương tác trên Extension Development Host (F5 trong VS Code). Những mục này được ghi nhận trung thực là **Chờ kiểm chứng thủ công trên Extension Host** nếu chưa có phiên ghi màn hình/log Extension Host thực tế.

---

## 2. Ma trận Kiểm thử Chấp nhận (UAT Matrix)

| Mã UAT | Kịch bản / Luồng người dùng | Phương pháp kiểm chứng | Trạng thái Tự động (CI / Jest) | Trạng thái Interactive (VS Code Host) | Bằng chứng / Ghi chú kỹ thuật |
|---|---|---|:---:|:---:|---|
| **UAT-01** | **Kích hoạt Extension & CodeLens** | Mock Provider & Editor Text Document | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | `ContextAwareCodeLensProvider` đăng ký selector `typescript` và `javascript`, sinh CodeLens tại class và method level. |
| **UAT-02** | **Sinh Test theo Method (Method-Level Scoping)** | AST ContextExtractor & Prompt Strategy | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | Trích xuất `targetMethodSlice` (tên method, visibility, parameters, returnType, signature) và đưa khối `=== TARGET METHOD UNDER TEST ===` vào AST summary. Đã có test tại `acceptance.test.ts:L185`. |
| **UAT-03** | **An toàn Webview (XSS Protection & CSP)** | Webview HTML Generation & Nonce Test | ✅ ĐẠT | ⏳ Chờ kiểm chứng trên Extension Host | Webview sử dụng `Content-Security-Policy` với cryptographic `nonce`, không dùng `innerHTML` cho mô tả từ LLM mà gán an toàn qua `textContent` và DOM API. Test tại `acceptance.test.ts:L59`. |
| **UAT-04** | **Hiển thị Traceability Trực quan** | Webview HTML & DOM Data Binding | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | Mỗi kịch bản hiển thị Category tag, Badge `🎯 AC/BR Reference` và `➡️ Expected Behavior`. Đã cấu trúc schema `ScenarioItem` trong payload webview. |
| **UAT-05** | **Tương tác Checkbox & Lọc Scenario (AST-based)** | TypeScript Compiler API AST Filter Test | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | Sử dụng TypeScript AST (`ts.createSourceFile`) để nhận diện chính xác phạm vi statement của `it(...)`/`test(...)`, loại bỏ block không được tick mà không làm lệch comment hay brace. Test tại `acceptance.test.ts:L81`. |
| **UAT-06** | **Chấp nhận & Lưu file an toàn (Traversal Defense)** | Host Target Path Resolution & Path Guard | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | Host cố định `_targetOutputPath`, chặn path traversal `..` từ Webview payload. Chỉ ghi file vào workspace khi người dùng bấm chấp nhận. Test tại `acceptance.test.ts:L162`. |
| **UAT-07** | **Tự phục hồi lỗi (Self-Reflection Auto-Fix)** | AutoFixEngine & Diagnostic Pipeline Test | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | Tự động phát hiện lỗi cú pháp hoặc lỗi assertion thất bại khi chạy test, kích hoạt phản hồi gửi mã lỗi cho LLM tối đa 2 vòng lặp. Test tại `auto_fix_engine.test.ts`. |
| **UAT-08** | **Quyền riêng tư & Cloud Disclosures** | Privacy Consent Dialog & Fail-Closed Guard | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | `autoGenerateOnSave` có fallback mặc định fail-closed (`false`). Với cloud provider (Gemini/OpenAI/DeepSeek), hiển thị modal warning dialog xin xác nhận trước khi gửi code/BA ra ngoài. |
| **UAT-09** | **Mutation-Guided Refinement Integration** | MutationGuidedRefiner & Service Command Test | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | Đã nối command `contextAwareTestGen.refineWithMutation` và phương thức `TestGenerationService.refineWithMutation`, phân tích mutant sống sót và tạo đề xuất phản hồi lên preview. Test tại `acceptance.test.ts:L206`. |

---

## 3. Lệnh Kiểm chứng Tự động trong CI / Docker

Toàn bộ các lệnh dưới đây được tự động hóa qua GitHub Actions (`.github/workflows/ci.yml`) (ngoại trừ lệnh số 5 `experiment:mutation --all` là benchmark chuyên sâu chạy độc lập/theo lịch do thời gian chạy ~7 phút), và có thể chạy độc lập trong container Docker `experiment-runner`:

```bash
# 1. Typecheck TypeScript toàn bộ project
npx tsc --noEmit

# 2. Biên dịch Extension bundle sạch
npm run compile:extension

# 3. Chạy toàn bộ Unit & Acceptance Test Suites (Jest)
npm test

# 4. Kiểm định toàn vẹn tập dữ liệu Benchmark & Ground Truth
npm run dataset:validate

# 5. Chạy Mutation Testing toàn bộ 15 Services (độc lập, không phụ thuộc LLM)
npm run experiment:mutation -- --all

# 6. Đóng gói Extension Release VSIX duy nhất (không phụ thuộc interactive)
npm run package:extension
```

---

## 4. Quy trình Đóng gói & Phát hành VSIX Release (CI/CD Pipeline)

- **Artifact phát hành chuẩn duy nhất:** `packages/extension/context-aware-unit-test-generation-extension-0.1.0.vsix`.
- **Loại bỏ trùng lặp:** Đã loại bỏ hoàn toàn file VSIX trùng lặp ở thư mục gốc (`context-aware-unit-test-generation-extension-0.1.0.vsix`), đảm bảo chỉ có duy nhất một artifact release chuẩn tại thư mục gói extension.
- **Tự động hóa CI:** Workflow GitHub Actions (`.github/workflows/ci.yml`) kiểm tra toàn diện:
  1. `npm ci`
  2. `npx tsc --noEmit`
  3. `npm run compile:extension`
  4. `npm test -- --coverage`
  5. `npm run dataset:validate`
  6. `npm run package:extension`

