# KẾ HOẠCH TRIỂN KHAI DỰ ÁN 4 TUẦN (TEAM 3 NGƯỜI)

> **Đề tài:** Tự động sinh Unit Test theo ngữ cảnh tài liệu nghiệp vụ (BA Requirement) sử dụng Large Language Model (LLM)  
> **Thời gian:** 4 tuần (28 ngày)  
> **Quy mô nhóm:** 3 thành viên  

---

## 👥 1. Phân Chia Vai Trò & Trách Nhiệm Chính

| Thành viên | Vai trò chính | Trọng tâm công việc |
| :--- | :--- | :--- |
| **Thành viên A** | **AI / Prompt Engineering & NCKH** | Pipeline LLM, thiết kế 4 chiến lược Prompt (Zero-shot, Few-shot, CoT, Hybrid), chạy ma trận thực nghiệm, phân tích số liệu khoa học. |
| **Thành viên B** | **Core Engine & Evaluation Pipeline** | Phân tích cú pháp AST (Tree-sitter), bộ trích xuất ngữ cảnh BA (Context Extractor), tích hợp runner đo Code Coverage & Mutation Testing. |
| **Thành viên C** | **VS Code Extension & Automation** | Giao diện VS Code Extension (Sidebar, Webview preview test case), tính năng Auto-fix test fail, đóng gói sản phẩm (`.vsix`), slide & video demo. |

---

## 📅 2. Lịch Trình Chi Tiết Theo Tuần

```
Tuần 1: Chuẩn bị Dataset & Thiết kế Kiến trúc nền móng
Tuần 2: Xây dựng Core Engine & Prototype Extension (E2E)
Tuần 3: Chạy Ma trận Thực nghiệm & Đo lường Chỉ số (Coverage & Mutation)
Tuần 4: Đóng gói Sản phẩm, Hoàn thiện Báo cáo Luận văn & Demo
```

---

### 🟢 TUẦN 1: Chuẩn Bị Dataset & Thiết Lập Kiến Trúc Nền Móng
> **Mục tiêu tuần:** Xây dựng xong bộ benchmark dataset mẫu (10-15 cặp Service + BA doc) và dựng khung sườn kỹ thuật cho cả 3 thành viên.

#### Nhiệm vụ cụ thể:
* **Thành viên A (AI / Prompt):**
  - [ ] Thu thập và chuẩn hóa 10–15 cặp mẫu thực tế: `Tài liệu BA (User Story / SRS)` + `Source Code (Service / Controller)` + `Unit Test chuẩn mẫu (Ground truth)`.
  - [ ] Đăng ký và cấu hình các API keys: Google Gemini Free Tier, DeepSeek API (hoặc Ollama local), OpenAI.
  - [ ] Phác thảo bản thảo ban đầu cho 4 kỹ thuật prompt: Zero-shot, Few-shot, Chain-of-Thought (CoT), Hybrid.
* **Thành viên B (Core Engine):**
  - [ ] Khảo sát và triển khai module phân tích mã nguồn AST (Tree-sitter hoặc ts-morph/javaparser) để bóc tách class name, method signature, parameters, imported dependencies.
  - [ ] Viết parser đọc các định dạng tài liệu BA phổ biến (Markdown, text, cấu trúc JSON).
  - [ ] Thiết kế interface dữ liệu chung `ContextPayload` làm cầu nối giữa các module.
* **Thành viên C (Extension / Dev):**
  - [ ] Khởi tạo dự án VS Code Extension bằng Yeoman (`yo code`).
  - [ ] Dựng khung giao diện: Menu chuột phải vào file code, Command Palette (`Generate Unit Test from BA Context`), Sidebar container.
  - [ ] Thiết lập luồng trao đổi dữ liệu hai chiều giữa Extension Host và Webview panel.

#### 🎯 Kết quả đầu ra (Deliverables) Tuần 1:
- Thư mục `/benchmark-dataset` với 10-15 services hoàn chỉnh.
- Parser đọc AST tách được metadata của method và parser đọc tài liệu BA.
- Extension chạy debug được (F5), mở được sidebar và nhận lệnh menu chuột phải.

---

### 🟡 TUẦN 2: Xây Dựng Core Engine & Tích Hợp Extension (E2E Pipeline)
> **Mục tiêu tuần:** Kết nối hoàn chỉnh luồng dữ liệu từ Extension ➔ Trích xuất Context ➔ Gọi LLM sinh test ➔ Hiển thị và ghi ra file.

#### Nhiệm vụ cụ thể:
* **Thành viên A (AI / Prompt):**
  - [ ] Hoàn thiện chi tiết bộ Prompt Templates (định dạng Output JSON nghiêm ngặt để parser dễ xử lý).
  - [ ] Tối ưu Prompt CoT: Yêu cầu LLM sinh danh sách kịch bản test trước (Happy Path, Edge Cases, Boundary, Exception) rồi mới sinh mã test code.
  - [ ] Viết script tự động (`generate_batch.py` hoặc `.ts`) phục vụ chạy batch test generation qua API.
* **Thành viên B (Core Engine):**
  - [ ] Ghép nối Context Extractor với LLM client (tạo pipeline hoàn chỉnh: File Service + File BA ➔ Context Injection ➔ Prompt ➔ Test Code).
  - [ ] Viết module Post-processor: Bóc tách markdown codeblocks, tự động định dạng mã (Prettier/clang-format), kiểm tra lỗi cú pháp biên dịch cơ bản.
  - [ ] Thiết lập môi trường chạy kiểm thử tự động: Jest / JUnit + script đo độ phủ code (Coverage runner: Istanbul/nyc hoặc JaCoCo).
* **Thành viên C (Extension / Dev):**
  - [ ] Nhúng Core Engine của Thành viên B vào VS Code Extension.
  - [ ] Phát triển Webview Preview: Hiển thị bảng danh sách các kịch bản test được LLM đề xuất, cho phép lập trình viên tích chọn/bỏ chọn test case trước khi tạo file test thật.
  - [ ] Xây dựng màn hình cài đặt Extension (Settings): Lựa chọn model (Gemini, DeepSeek, GPT-4o), cấu hình API Key hoặc Local endpoint (`localhost:11434`).

#### 🎯 Kết quả đầu ra (Deliverables) Tuần 2:
- Bộ prompt templates hoàn chỉnh đặt tại thư mục `/prompts`.
- Engine chạy sinh test tự động đo được Line Coverage và Branch Coverage.
- Extension chạy E2E mượt mà: Chọn file Service ➔ Gợi ý kịch bản test ➔ Người dùng tick chọn ➔ Sinh file unit test trực tiếp trong workspace.

---

### 🟠 TUẦN 3: Chạy Thực Nghiệm Đánh Giá (Metrics & Ma Trận 16 Cấu Hình)
> **Mục tiêu tuần:** Thu thập toàn bộ số liệu định lượng (Coverage, Mutation Score, Execution Pass Rate, Chi phí/Độ trễ) cho báo cáo NCKH.

#### Nhiệm vụ cụ thể:
* **Thành viên A (AI / Prompt):**
  - [ ] Chạy thực nghiệm toàn bộ ma trận (4 Models × 4 Prompts × 10-15 Services = 160–240 lượt sinh test).
  - [ ] Thu thập log chi tiết: Tỉ lệ test build thành công (Compilability Rate), tỉ lệ test pass ngay lần đầu (First-pass Rate).
  - [ ] Đánh giá định lượng về vai trò của tài liệu BA: So sánh test có ngữ cảnh BA vs test chỉ đọc mã nguồn đơn thuần.
* **Thành viên B (Core Engine):**
  - [ ] Thiết lập công cụ Mutation Testing (Stryker Mutator cho TypeScript/JavaScript hoặc PIT cho Java).
  - [ ] Chạy đo Mutation Score (%) cho các bộ test case sinh ra từ từng chiến lược prompt và từng model.
  - [ ] Phân tích các dạng Mutant bị sót: Chỉ ra kỹ thuật CoT / Hybrid tiêu diệt được bao nhiêu mutant logic nghiệp vụ mà Zero-shot bỏ sót.
* **Thành viên C (Extension / Dev):**
  - [ ] Bổ sung cơ chế "Self-Reflection / Auto-Fix": Nếu test sinh ra chạy bị lỗi (Syntax error hoặc Assertion failure), extension tự động gửi error stack trace về LLM để sửa mã (tối đa 1-2 lần lặp).
  - [ ] Tinh chỉnh trải nghiệm người dùng (UX): Thêm thanh tiến trình loading, thông báo toast notification, phím tắt thao tác nhanh.
  - [ ] Thu thập dữ liệu đo đạc thời gian phản hồi (Latency) và số lượng token tiêu thụ trung bình trên Extension thực tế.

#### 🎯 Kết quả đầu ra (Deliverables) Tuần 3:
- File tổng hợp kết quả `experiment_results.csv` chứa toàn bộ chỉ số thực nghiệm.
- Báo cáo chi tiết về Mutation Score và biểu đồ so sánh giữa 4 chiến lược Prompt.
- Tính năng Auto-Fixing vòng lặp hoạt động ổn định trên Extension.

---

### 🔴 TUẦN 4: Đóng Gói Sản Phẩm, Viết Báo Cáo & Chuẩn Bị Bảo Vệ
> **Mục tiêu tuần:** Đóng gói file cài đặt Extension `.vsix`, hoàn thiện toàn văn báo cáo luận văn/nghiên cứu, slide thuyết trình và video demo.

#### Nhiệm vụ cụ thể:
* **Thành viên A (AI / Prompt):**
  - [ ] Soạn thảo các chương lý thuyết & phương pháp: Cơ sở lý thuyết (Transformer, LLM, In-context Learning), Các chiến lược Prompting đề xuất và cách nhúng ngữ cảnh BA.
  - [ ] Soạn thảo chương Kết quả thực nghiệm & Bàn luận: Phân tích số liệu, biểu đồ so sánh hiệu năng các model và hiệu quả chi phí (Gemini Free vs DeepSeek vs OpenAI).
  - [ ] Chuẩn hóa danh mục tài liệu tham khảo theo định dạng chuẩn IEEE / BibTeX.
* **Thành viên B (Core Engine):**
  - [ ] Soạn thảo chương Kiến trúc hệ thống, Cơ chế trích xuất ngữ cảnh AST và Phương pháp luận đo lường kiểm thử phần mềm.
  - [ ] Dọn dẹp codebase: Tối ưu mã nguồn, viết tài liệu hướng dẫn cài đặt và chạy thử nghiệm (`README.md`, Docker script nếu cần).
  - [ ] Kiểm tra và đảm bảo tính tái lập (Reproducibility) của toàn bộ dữ liệu thực nghiệm.
* **Thành viên C (Extension / Dev):**
  - [ ] Đóng gói VS Code Extension thành file phân phối `.vsix` độc lập (sử dụng công cụ `vsce package`).
  - [ ] Sản xuất video demo hoàn chỉnh (thời lượng 3-5 phút): Kịch bản từ nhận tài liệu BA ➔ Extension phân tích ➔ Sinh test ➔ Chạy test pass 100% kèm báo cáo coverage cao.
  - [ ] Thiết kế slide thuyết trình bảo vệ đề tài (PowerPoint / Canva) với đầy đủ sơ đồ kiến trúc và biểu đồ kết quả.

#### 🎯 Kết quả đầu ra (Deliverables) Tuần 4:
- Bản toàn văn Báo cáo đề tài / Luận văn nghiên cứu hoàn chỉnh.
- File cài đặt extension: `context-aware-test-gen-1.0.0.vsix`.
- Video demo sản phẩm thực tế và bộ slide thuyết trình bảo vệ đề tài.

---

## 📊 3. Ma Trận Đóng Góp & Phân Chia Trách Nhiệm (RACI Matrix)

* **R (Responsible):** Người thực hiện chính.
* **A (Accountable):** Người chịu trách nhiệm kiểm duyệt cuối cùng.
* **C (Consulted):** Người đóng góp ý kiến, tham vấn.
* **I (Informed):** Người nhận thông tin tiến độ.

| Gói công việc (Work Packages) | Thành viên A | Thành viên B | Thành viên C |
| :--- | :---: | :---: | :---: |
| **Xây dựng Benchmark Dataset (BA + Code)** | **R / A** | C | I |
| **Phân tích AST & Xây dựng Context Extractor** | I | **R / A** | C |
| **Thiết kế & Tinh chỉnh Prompt Strategies** | **R / A** | C | I |
| **Phát triển Giao diện VS Code Extension** | I | C | **R / A** |
| **Tích hợp Core Engine vào Extension (E2E)** | C | **R** | **R / A** |
| **Thiết lập Runner đo Coverage & Mutation Score** | C | **R / A** | I |
| **Chạy Ma trận Thực nghiệm (160+ test runs)** | **R / A** | C | I |
| **Phát triển tính năng Auto-Fix Loop** | C | C | **R / A** |
| **Đóng gói Extension (`.vsix`) & Video Demo** | I | I | **R / A** |
| **Biên soạn Báo cáo Nghiên cứu / Luận văn** | **R (Chương 2, 4)** | **R (Chương 1, 3)** | **R (Chương 5, Demo)** |

---

## 🛠️ 4. Quy Trình Phối Hợp & Quản Lý Dự Án

1. **Quản lý Task:** Sử dụng Kanban Board (GitHub Projects, Trello hoặc Notion) với 4 cột trạng thái: `To Do`, `In Progress`, `In Review`, `Done`.
2. **Quản lý Source Code:**
   - Phân chia 2 repo rõ ràng:
     - `repo-core-eval`: Chứa dataset, prompt templates, evaluation scripts (Thành viên A & B quản lý chính).
     - `repo-vscode-extension`: Chứa mã nguồn extension và giao diện webview (Thành viên C quản lý chính).
   - Quy ước nhánh: `main` (chạy ổn định), `develop` (nhánh tích hợp), các nhánh tính năng `feature/<tên-task>`.
3. **Lịch Họp Cố Định (Scrum Meetings):**
   - **Thứ Tư hàng tuần (15-20 phút):** Standup giữa tuần kiểm tra tiến độ, xử lý các nút thắt kỹ thuật (blockers).
   - **Chủ Nhật hàng tuần (45 phút):** Tổng kết kết quả tuần (Review Deliverables) và phân công cụ thể cho tuần kế tiếp.
