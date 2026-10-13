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
| **UAT-06** | **Chấp nhận & Lưu file an toàn (Traversal Defense, Host Path Pinning & Host State Guard)** | Host Target Path Resolution, Strict Pinning, Workspace Containment & Host State Invariant | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | Host ghim cố định `_targetOutputPath`, từ chối tuyệt đối đường dẫn từ Webview payload (`msg.payload.outputPath`), chặn triệt để path traversal `..`. Kiểm tra containment bắt buộc đường dẫn thuộc `workspaceFolders` (từ chối lưu khi workspace rỗng hoặc path nằm ngoài workspace), resolve physical realpath để chặn symlink traversal. Kiểm tra host invariant: chỉ chấp nhận khi `_hostState === 'ready'`, từ chối tuyệt đối khi `idle`, `loading` hoặc `error`. Test tại `acceptance.test.ts`. |
| **UAT-07** | **Tự phục hồi lỗi (Self-Reflection Auto-Fix)** | AutoFixEngine & Diagnostic Pipeline Test | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | Tự động phát hiện lỗi cú pháp hoặc lỗi assertion thất bại khi chạy test, kích hoạt phản hồi gửi mã lỗi cho LLM tối đa 2 vòng lặp. Test tại `auto_fix_engine.test.ts`. |
| **UAT-08** | **Quyền riêng tư & Cloud Disclosures** | Privacy Consent Dialog & Fail-Closed Guard | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | `autoGenerateOnSave` có fallback mặc định fail-closed (`false`). Với cloud provider (Gemini/OpenAI/DeepSeek), hiển thị modal warning dialog xin xác nhận trước khi gửi code/BA ra ngoài. |
| **UAT-09** | **Mutation-Guided Test Analysis & Suggestions** | MutationGuidedRefiner & Service Command Test | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | Đã nối command `contextAwareTestGen.refineWithMutation` và phương thức `TestGenerationService.refineWithMutation`, tính mã băm `sourceHash` SHA-256 (64 ký tự hex đầy đủ), kiểm tra divergence giữa mutant và mã dịch vụ, hiển thị preview ở chế độ Read-Only với cảnh báo rõ ràng đây là phân tích và gợi ý heuristic dựa trên mutation summary có sẵn, chưa phải vòng lặp tái thực thi tự động. Test tại `acceptance.test.ts`. |
| **UAT-10** | **Toán tử Đột biến Hợp lệ Cú pháp (Syntax-Safe Mutators)** | TypeScript Compiler API Transpile & Diagnostics Check | ✅ ĐẠT | ⏳ N/A (Core Pipeline) | `CodeMutatorGenerator` xác thực cú pháp từng candidate mutant qua `ts.transpileModule` với `reportDiagnostics: true`, loại bỏ 100% mutant gây lỗi cú pháp TypeScript trước khi thêm vào danh sách mutants; ném lỗi fail-closed nếu compiler module không khả dụng. Test tại `acceptance.test.ts`. |
| **UAT-11** | **Đóng gói VSIX Độc Lập & Tự Chứa (Self-Contained VSIX Packaging)** | Custom Zip Bundler & Runtime Module Resolution Test | ✅ ĐẠT | ⏳ Cần kiểm chứng thủ công trên Host | `packages/extension/scripts/package_extension.js` sử dụng `yauzl`/`yazl` đóng gói VSIX và inject bắt buộc production dependencies (`node_modules/typescript` và `node_modules/dotenv`) vào archive VSIX; ném lỗi fail-closed nếu thiếu dependency nguồn; kiểm tra xác minh các entry zip sau đóng gói. Acceptance test mở archive `.vsix` xác thực dung lượng (>3MB) và các entry runtime. Đảm bảo extension hoạt động độc lập trên cài đặt sạch. Test tại `acceptance.test.ts`. |

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

# 6. Đóng gói Extension Release VSIX tự chứa dependencies (Self-Contained VSIX)
npm run package:extension
```

---

## 4. Quy trình Đóng gói & Phát hành VSIX Release (CI/CD Pipeline)

- **Artifact phát hành chuẩn duy nhất:** `packages/extension/context-aware-unit-test-generation-extension-0.1.0.vsix`.
- **Tự chứa Dependencies (Self-Contained):** Sử dụng `packages/extension/scripts/package_extension.js` để tích hợp toàn bộ runtime dependencies bắt buộc (`typescript` compiler và `dotenv`) trực tiếp vào gói `.vsix`, khắc phục hoàn toàn lỗi phân giải module trên môi trường cài đặt sạch.
- **Loại bỏ trùng lặp:** Đã loại bỏ hoàn toàn file VSIX trùng lặp ở thư mục gốc, đảm bảo chỉ có duy nhất một artifact release chuẩn tại thư mục gói extension.
- **Tự động hóa CI:** Workflow GitHub Actions (`.github/workflows/ci.yml`) kiểm tra toàn diện:
  1. `npm ci`
  2. `npx tsc --noEmit`
  3. `npm run compile:extension`
  4. `npm test -- --coverage`
  5. `npm run dataset:validate`
  6. `npm run package:extension`


