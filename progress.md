# BẢNG THEO DÕI TIẾN ĐỘ DỰ ÁN (PROJECT PROGRESS TRACKER)

> **Đề tài:** Tự động sinh Unit Test theo ngữ cảnh tài liệu nghiệp vụ (BA Requirement) sử dụng Large Language Model (LLM)  
> **Cập nhật lần cuối:** 2026-09-26  

---

## 📊 1. Tổng Quan Tiến Độ Dự Án Theo Nhánh

| Nhánh | Thành viên đảm nhiệm | Trọng tâm công việc | Trạng thái | Tiến độ |
| :--- | :--- | :--- | :---: | :---: |
| `feature/A` | **Thành viên A** | AI / Prompt Engineering, Benchmark Dataset & Report Generator | **HOÀN THÀNH** | 100% `[████████████████████████████████]` |
| `feature/B` | **Thành viên B** | Core Engine, AST Code Extractor, E2E Pipeline & Mutation Testing | **HOÀN THÀNH** | 100% `[████████████████████████████████]` |
| `feature/C` | **Thành viên C** | VS Code Extension, Webview UI & Auto-fix Test Runner | **SẴN SÀNG** | Chuẩn bị tích hợp |

---

## 📋 2. Chi Tiết Các Hạng Mục Công Việc Nhánh `feature/B` (Thành viên B)

### ✅ Step 1: Phân tích AST & Context Extractor (ĐÃ HOÀN THÀNH)
- [x] **Data Structures & Interfaces (`packages/core/src/extractor/types.ts`):** Thiết kế `ContextPayload`, `CodeContext`, `RequirementContext` kết nối Core Engine, Prompt Strategies và VS Code Extension.
- [x] **TypeScript AST Parser (`packages/core/src/extractor/ast_parser.ts`):** Sử dụng TypeScript Compiler API bóc tách Class, Method signatures (parameters, return type, visibility, async, static, JSDoc), Imports, Types/Interfaces/Enums.
- [x] **Requirement Parser (`packages/core/src/extractor/requirement_parser.ts`):** Parser tài liệu BA (Markdown, Gherkin Scenarios / Outline / Examples, JSON structured format).
- [x] **Context Extractor (`packages/core/src/extractor/context_extractor.ts`):** Kết hợp Code AST và BA Requirement thành `PromptContext` chuẩn hóa.
- [x] **Unit Tests (`packages/core/src/extractor.test.ts`):** 100% Test Passed.

### ✅ Step 2: Hậu Xử Lý & E2E Generation Pipeline (ĐÃ HOÀN THÀNH)
- [x] **Test Post-Processor (`packages/core/src/pipeline/post_processor.ts`):** Bóc tách markdown codeblocks, phân tích JSON schema, tự động trích xuất danh sách `testScenarios` (Happy Path, Edge Case, Exception) và kiểm tra cú pháp TypeScript bằng Transpiler Diagnostics.
- [x] **Coverage Runner (`packages/core/src/pipeline/coverage_runner.ts`):** Thực thi Jest Runner tự động và thu thập Line / Branch / Function / Statement Coverage.
- [x] **Core Generator Pipeline (`packages/core/src/pipeline/generator_pipeline.ts`):** Luồng E2E hoàn chỉnh từ file Service + BA doc ➔ Prompt Injection ➔ LLM Gateway ➔ Post-processor ➔ Coverage.
- [x] **Unit Tests (`packages/core/src/pipeline.test.ts`):** 100% Test Passed.

### ✅ Step 3: Mutation Testing Pipeline & So Sánh NCKH (ĐÃ HOÀN THÀNH)
- [x] **AST Code Mutators (`packages/core/src/mutation/mutators.ts`):** 6 nhóm toán tử đột biến (`CONDITIONAL_BOUNDARY`, `EQUALITY_OPERATOR`, `BINARY_EXPRESSION`, `BOOLEAN_LITERAL`, `NUMERIC_LITERAL`, `RETURN_VALUE`).
- [x] **Mutation Runner (`packages/core/src/mutation/mutation_runner.ts`):** Thực thi từng cá thể Mutant trong Sandbox Jest cô lập, phân loại `KILLED` vs `SURVIVED` và tính `MutationScore (%)`.
- [x] **Mutation Analyzer (`packages/core/src/mutation/mutation_analyzer.ts`):** So sánh Mutation Score giữa các kỹ thuật Prompt, chứng minh khả năng tiêu diệt lỗi nghiệp vụ của Hybrid Prompting.
- [x] **Script & CLI (`experiments/run_mutation_testing.ts`):** Tích hợp lệnh `npm run experiment:mutation`.
- [x] **Unit Tests (`packages/core/src/mutation.test.ts`):** 100% Test Passed.

### ✅ Step 4: Kiến Trúc Hệ Thống & Bàn Giao (ĐÃ HOÀN THÀNH)
- [x] **Tài liệu Kiến trúc (`docs/core_engine_architecture.md`):** Soạn thảo tài liệu thiết kế hệ thống, sơ đồ tuần tự luồng dữ liệu Mermaid, cơ chế bóc tách AST và phương pháp luận Mutation Testing.
- [x] **Main Entrypoint (`packages/core/src/index.ts`):** Đóng gói và xuất đầy đủ các module core engine cho Extension.
- [x] **Toàn bộ Test Suite:** 100% Passed trên toàn dự án.

---

## 🎯 3. Kế Hoạch Bàn Giao Cho Thành Viên C (VS Code Extension)

- **API Tích hợp:** Nhập trực tiếp `CoreGeneratorPipeline` từ `packages/core`.
- **Dữ liệu hiển thị:** Truy xuất `result.processedOutput.testScenarios` để render danh sách kịch bản test lên Webview Preview cho lập trình viên tick chọn trước khi ghi file test.
- **Auto-Fixing Loop:** Sử dụng `result.processedOutput.syntaxValidation` và `result.execution.errorMessage` để tự động kích hoạt vòng lặp phản hồi sửa mã (Reflection Loop).
