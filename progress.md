# BẢNG THEO DÕI TIẾN ĐỘ DỰ ÁN (PROJECT PROGRESS TRACKER)

> **Đề tài:** Tự động sinh Unit Test theo ngữ cảnh tài liệu nghiệp vụ (BA Requirement) sử dụng Large Language Model (LLM)  
> **Cập nhật lần cuối:** 2026-09-26  

---

## 📊 1. Tổng Quan Tiến Độ Dự Án Theo Nhánh

| Nhánh | Thành viên đảm nhiệm | Trọng tâm công việc | Trạng thái | Tiến độ |
| :--- | :--- | :--- | :---: | :---: |
| `feature/A` | **Thành viên A** | AI / Prompt Engineering, Benchmark Dataset & Report Generator | **HOÀN THÀNH** | 100% `[████████████████████████████████]` |
| `feature/B` | **Thành viên B** | Core Engine, AST Code Extractor, E2E Pipeline & Mutation Testing | **HOÀN THÀNH** | 100% `[████████████████████████████████]` |
| `feature/C` | **Thành viên C** | VS Code Extension, Webview UI, Auto-fix Loop & Demo Package | **HOÀN THÀNH** | 100% `[████████████████████████████████]` |

---

## 📋 2. Chi Tiết Các Hạng Mục Công Việc Nhánh `feature/C` (Thành viên C)

### ✅ Step 1: Khởi tạo Khung Extension & Webview Setup (ĐÃ HOÀN THÀNH)
- [x] **Manifest Extension (`packages/extension/package.json`):** Đăng ký Commands (`generateTest`, `openSettings`, `openSidebar`), Menu chuột phải trong Editor và Explorer.
- [x] **Sidebar View Provider (`packages/extension/src/sidebar/sidebar_provider.ts`):** Xây dựng giao diện Sidebar panel với trạng thái cấu hình và nút bấm thao tác nhanh.
- [x] **Webview Preview Panel (`packages/extension/src/webview/preview_panel.ts`):** Dựng khung giao diện Preview hiển thị danh sách kịch bản test và mã nguồn kiểm thử.
- [x] **Status Bar & Keybindings:** Đăng ký Status bar item `$(beaker) AI Test Gen` và phím tắt `Ctrl+Shift+U` / `Cmd+Shift+U`.
- [x] **Unit Tests (`packages/extension/src/extension.test.ts`):** 100% Test Passed.

### ✅ Step 2: Tích hợp Core Engine & Webview Tương Tác (ĐÃ HOÀN THÀNH)
- [x] **Configuration Manager (`packages/extension/src/services/config_manager.ts`):** Đồng bộ cấu hình Settings và fallback `.env` cho Gemini, DeepSeek, OpenAI, Ollama Local.
- [x] **Requirement Finder (`packages/extension/src/services/requirement_finder.ts`):** Tự động phát hiện file tài liệu BA tương ứng (`requirement.md`, `spec.md`, `srs.md`, `*.json`) trong workspace.
- [x] **Test Generation Service (`packages/extension/src/services/test_generation_service.ts`):** Điều phối luồng sinh test E2E và ghi file `.test.ts` trực tiếp vào workspace khi người dùng duyệt.
- [x] **Interactive Preview UI:** Hỗ trợ checkbox chọn lọc kịch bản, hiển thị thẻ phân loại (`Happy Path`, `Boundary`, `Exception`) và chỉ số Line/Branch Coverage thời gian thực.
- [x] **Unit Tests (`packages/extension/src/step2.test.ts`):** 100% Test Passed.

### ✅ Step 3: Tính Năng Self-Reflection Auto-Fix & Đo Đạc UX (ĐÃ HOÀN THÀNH)
- [x] **Auto-Fix Engine (`packages/extension/src/services/auto_fix_engine.ts`):** Cơ chế phản xạ (Self-Reflection Loop) tự động sửa lỗi cú pháp TypeScript và assertion failure qua LLM (tối đa 2 vòng lặp).
- [x] **Metrics Collector (`packages/extension/src/services/metrics_collector.ts`):** Ghi nhận và tổng hợp số liệu đo đạc thời gian phản hồi (Latency), số token tiêu thụ và tỉ lệ sửa lỗi thành công.
- [x] **UX Optimization:** Tích hợp Notification Progress Bar, Toast messages và phím tắt nhanh.
- [x] **Unit Tests (`packages/extension/src/step3.test.ts`):** 100% Test Passed.

### ✅ Step 4: Đóng Gói Sản Phẩm, Tài Liệu Hướng Dẫn & Video Demo (ĐÃ HOÀN THÀNH)
- [x] **Tài liệu Hướng Dẫn & Kịch Bản Demo (`docs/extension_guide.md`):** Hướng dẫn cài đặt file `.vsix`, cấu hình API, quy trình sử dụng và kịch bản video demo 4 phân đoạn (3-5 phút).
- [x] **Extension Documentation (`packages/extension/README.md`):** Tài liệu giới thiệu sản phẩm và hướng dẫn đóng gói (`vsce package`).
- [x] **Kiểm thử toàn diện toàn bộ Workspace:** 100% Passed trên cả `packages/core` và `packages/extension`.

---

## 🏆 3. Tổng Kết Thành Quả Đạt Được (Deliverables)

1. **AI Pipeline & Prompt Engineering:** 4 chiến lược Prompting (`Zero-shot`, `Few-shot`, `CoT`, `Hybrid`), 15 Benchmark Services đa tầng độ phức tạp, và bộ Report Generator xuất ma trận số liệu NCKH.
2. **Core Engine & Evaluation Pipeline:** AST Code Parser, BA Requirement Ingestion, Runner đo Line/Branch Coverage và Hệ thống Mutation Testing với 6 toán tử biến dị.
3. **VS Code Extension & Automation:** Tiện ích mở rộng hoàn chỉnh trên VS Code với giao diện Webview Preview tương tác, phím tắt `Ctrl+Shift+U`, tính năng Self-Reflection Auto-Fix và quy trình sinh test E2E 1-click.
