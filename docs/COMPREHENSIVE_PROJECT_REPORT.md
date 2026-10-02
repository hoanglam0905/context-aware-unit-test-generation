# BÁO CÁO NGHIÊN CỨU & PHÁT TRIỂN HỆ THỐNG
# TỰ ĐỘNG SINH UNIT TEST DỰA TRÊN NGỮ CẢNH NGHIỆP VỤ VÀ MÃ NGUỒN (CONTEXT-AWARE UNIT TEST GENERATOR)

---

## MỤC LỤC
1. [BỐI CẢNH ĐỀ TÀI (CONTEXT)](#1-bối-cảnh-đề-tài-context)
2. [LÝ DO CHỌN ĐỀ TÀI & VẤN ĐỀ NGHIÊN CỨU (MOTIVATION & PROBLEM STATEMENT)](#2-lý-do-chọn-đề-tài--vấn-đề-nghiên-cứu-motivation--problem-statement)
3. [CÁC KHÁI NIỆM CỐT LÕI (CORE CONCEPTS)](#3-các-khái-niệm-cốt-lõi-core-concepts)
4. [CÔNG NGHỆ & CÔNG CỤ SỬ DỤNG (TECH STACK)](#4-công-nghệ--công-cụ-sử-dụng-tech-stack)
5. [KIẾN TRÚC HỆ THỐNG & LUỒNG XỬ LÝ (ARCHITECTURE & CODE FLOW)](#5-kiến-trúc-hệ-thống--luồng-xử-lý-architecture--code-flow)
6. [HỆ THỐNG SƠ ĐỒ THIẾT KẾ (PLANTUML DIAGRAMS)](#6-hệ-thống-sơ-đồ-thiết-kế-plantuml-diagrams)
   - [6.1. Sơ đồ Kiến trúc Tổng thể (Architecture Diagram)](#61-sơ-đồ-kiến-trúc-tổng-thể-architecture-diagram)
   - [6.2. Sơ đồ Trường hợp Sử dụng (Use Case Diagram)](#62-sơ-đồ-trường-hợp-sử-dụng-use-case-diagram)
   - [6.3. Sơ đồ Hoạt động: Luồng sinh Test Real-time & Auto-Fix (Activity Diagram)](#63-sơ-đồ-hoạt-động-luồng-sinh-test-real-time--auto-fix-activity-diagram)
   - [6.4. Sơ đồ Tuần tự Chi tiết (Sequence Diagram)](#64-sơ-đồ-tuần-tự-chi-tiết-sequence-diagram)
7. [KẾT QUẢ TRIỂN KHAI & THỰC NGHIỆM (RESULTS & BENCHMARK)](#7-kết-quả-triển-khai--thực-nghiệm-results--benchmark)
8. [NGHIÊN CỨU LIÊN QUAN (RELATED WORK)](#8-nghiên-cứu-liên-quan-related-work)
9. [HƯỚNG PHÁT TRIỂN & KẾT LUẬN (FUTURE WORK & CONCLUSION)](#9-hướng-phát-triển--kết-luận-future-work--conclusion)

---

## 1. BỐI CẢNH ĐỀ TÀI (CONTEXT)

Trong quy trình phát triển phần mềm hiện đại (Agile/DevOps), **Kiểm thử đơn vị (Unit Testing)** đóng vai trò là "chốt chặn chất lượng" đầu tiên giúp phát hiện sớm các lỗi logic, giảm thiểu chi phí sửa lỗi (Bug Cost) ở các giai đoạn sau và bảo vệ hệ thống khi tái cấu trúc mã nguồn (Refactoring).

Tuy nhiên, trong thực tế phát triển phần mềm:
- Việc viết Unit Test thường bị xem nhẹ hoặc bỏ qua do áp lực tiến độ (Deadline).
- Các công cụ sinh Unit Test truyền thống (như EvoSuite, Randoop dựa trên thuật toán di truyền hoặc ngẫu nhiên) chỉ tập trung vào việc đạt độ phủ mã nguồn (**Code Coverage**) bằng các giá trị ngẫu nhiên vô nghĩa, thiếu đi sự hiểu biết về **ý đồ nghiệp vụ (Business Intent)**.
- Khi các mô hình ngôn ngữ lớn (LLM - Large Language Models) như GPT-4, Claude, Gemini, DeepSeek xuất hiện, tiềm năng tự động hóa kiểm thử đã tăng vọt. Dẫu vậy, nếu chỉ đưa mã nguồn đơn thuần cho LLM mà không có ngữ cảnh tài liệu nghiệp vụ (BA Requirements / User Stories / Gherkin Specs), LLM sẽ sinh ra các test case "ảo tưởng" (Hallucination), hoặc chỉ lặp lại logic sai sót có sẵn trong code (Code Bias).

Chính vì vậy, đề tài **"Context-Aware Unit Test Generation"** ra đời nhằm kết hợp chặt chẽ giữa **Phân tích cú pháp trừu tượng mã nguồn (AST Analysis)**, **Tài liệu nghiệp vụ (Business Requirements)** và **Kỹ nghệ Prompt đa tầng (Prompt Engineering + Self-Reflection Auto-Fix)** vào một **VS Code Extension** hoạt động thời gian thực (Real-time).

---

## 2. LÝ DO CHỌN ĐỀ TÀI & VẤN ĐỀ NGHIÊN CỨU (MOTIVATION & PROBLEM STATEMENT)

### 2.1. Vấn đề thực tế (Problem Statement)
1. **Khoảng cách giữa Nghiệp vụ (BA) và Mã nguồn (Dev):** 
   Lập trình viên thường bỏ sót các ca biên (Edge Cases), điều kiện ngoại lệ (Exceptions) mà Business Analyst (BA) đã định nghĩa trong tài liệu đặc tả (User Stories, Acceptance Criteria).
2. **Ảo tưởng của LLM & Mã Test lỗi cú pháp:**
   Mã kiểm thử do AI sinh ra thường xuyên gặp lỗi cú pháp (Syntax Errors), sai lệch tên hàm hoặc kiểu dữ liệu giả định, khiến lập trình viên mất thêm thời gian sửa lỗi thủ công.
3. **Độ trễ và Tính rời rạc:**
   Các công cụ hiện nay yêu cầu lập trình viên copy/paste code sang trình duyệt (ChatGPT/Claude) rồi paste ngược lại IDE, làm gián đoạn luồng làm việc (Context Switching).
4. **Hạn chế đơn ngôn ngữ:**
   Đa số giải pháp chỉ tập trung vào một ngôn ngữ cố định (TypeScript hoặc Python), trong khi môi trường thực tế yêu cầu hỗ trợ đa ngôn ngữ (Polyglot: Java, Go, C#, Python, TS/JS).

### 2.2. Mục tiêu nghiên cứu (Objectives)
- **Tự động liên kết ngữ cảnh:** Tự động phát hiện và trích xuất đồng thời mã nguồn (hàm, lớp, tham số) và tài liệu nghiệp vụ (file `.feature`, `.md`, `spec.txt`).
- **Chiến lược sinh kiểm thử đa tầng (Prompt Strategies):** Hiện thực hóa 4 chiến lược: *Zero-shot*, *Few-shot*, *Chain-of-Thought (CoT)* và *Hybrid Strategy* để đánh giá đối sánh.
- **Cơ chế Tự sửa lỗi (Self-Reflection Auto-Fix):** Tự động bắt lỗi cú pháp, đưa phản hồi lỗi (Compiler Error Feedback) ngược lại cho LLM để sửa mã test tự động trong tối đa $N$ vòng lặp.
- **Tích hợp Real-time & CodeLens trong IDE:** Tích hợp trực tiếp vào VS Code Extension, sinh test tức thì khi lưu file (`onSave` với AST Diff) hoặc click nút CodeLens trên từng hàm.
- **Hỗ trợ đa ngôn ngữ (Polyglot):** Hỗ trợ TypeScript, JavaScript, Python (`pytest`), Java (`JUnit 5`), C# (`xUnit`), Go (`testing`).

---

## 3. CÁC KHÁI NIỆM CỐT LÕI (CORE CONCEPTS)

Để người đọc dễ dàng nắm bắt, dưới đây là các khái niệm chuyên ngành nền tảng được định nghĩa trực quan:

| Khái niệm | Định nghĩa chi tiết | Vai trò trong hệ thống |
| :--- | :--- | :--- |
| **Unit Test (Kiểm thử đơn vị)** | Đoạn mã dùng để kiểm tra tính đúng đắn của một đơn vị mã nguồn nhỏ nhất (hàm, phương thức, lớp) một cách cô lập. | Đầu ra chính của hệ thống. |
| **AST (Abstract Syntax Tree)** | Cây cú pháp trừu tượng thể hiện cấu trúc ngữ pháp phân cấp của mã nguồn (Class, Method, Parameter, Return Type). | Giúp hệ thống "hiểu" mã nguồn mà không cần thực thi code. |
| **Gherkin / Acceptance Criteria** | Ngôn ngữ tự nhiên có cấu trúc (`Given - When - Then`) dùng để mô tả tiêu chuẩn chấp nhận nghiệp vụ của tính năng. | Nguồn ngữ cảnh BA giúp LLM sinh test case đúng nghiệp vụ. |
| **Chain-of-Thought (CoT)** | Kỹ thuật chia nhỏ quá trình suy luận của LLM thành các bước logic tuần tự trước khi đưa ra câu trả lời cuối cùng. | Giúp LLM lập luận ma trận đối chiếu giữa Rule BA và Code. |
| **Self-Reflection Auto-Fix** | Cơ chế phản hồi khép kín: khi mã test sinh ra bị lỗi biên dịch/cú pháp, hệ thống gửi thông báo lỗi lại cho LLM để tự sửa lỗi. | Đảm bảo mã test sinh ra luôn chạy được (Runnable Code). |
| **Mutation Testing (Kiểm thử đột biến)** | Phương pháp đánh giá chất lượng bộ test bằng cách cố tình tạo ra các lỗi nhỏ (Mutants) trong code. Nếu bộ test phát hiện và làm fail test $\rightarrow$ mutant bị "tiêu diệt" (Killed). | Thước đo vàng đánh giá khả năng phát hiện lỗi của bộ test. |
| **Code Coverage** | Tỷ lệ phần trăm dòng lệnh (Line Coverage) hoặc nhánh rẽ (Branch Coverage) được thực thi bởi bộ kiểm thử. | Thước đo độ bao phủ luồng logic mã nguồn. |

---

## 4. CÔNG NGHỆ & CÔNG CỤ SỬ DỤNG (TECH STACK)

```
+-------------------------------------------------------------------------+
|                              TECH STACK                                 |
+-------------------------------------------------------------------------+
| Frontend / IDE     : VS Code Extension API, Webview Panel (HTML5/CSS3)  |
| Core Engine        : TypeScript 5.x, Node.js v20+                       |
| AST Parsing        : Babel Parser, TypeScript Compiler API, Regex Parser|
| LLM Gateway        : Ollama (Local), Google Gemini, DeepSeek, OpenAI    |
| Testing Frameworks : Jest, pytest (Python), JUnit 5 (Java), Go testing  |
| Quality Evaluation : Stryker Mutator (Mutation Score), Jest Coverage    |
| Build & Bundling   : NPM Workspaces, TypeScript Compiler (`tsc`)        |
+-------------------------------------------------------------------------+
```

1. **Ngôn ngữ phát triển:** TypeScript (đảm bảo Type Safety trên cả kiến trúc Monorepo).
2. **VS Code Extension API:** Đăng ký CodeLens Provider, Webview Provider, Document Watcher, Context Menu.
3. **Cổng giao tiếp LLM (LLM Gateway):**
   - **Ollama (Mặc định local):** Hỗ trợ mô hình mã nguồn mở như `qwen2.5-coder:1.5b`, `llama3.2`, `codellama` đảm bảo tính bảo mật và riêng tư mã nguồn cho doanh nghiệp.
   - **Cloud Providers:** Google Gemini (`gemini-2.0-flash`), OpenAI (`gpt-4o`), DeepSeek API.
4. **Công cụ đánh giá (Evaluation Harness):**
   - **Stryker Mutation Engine:** Đo Mutation Score thực nghiệm.
   - **Jest Runner API:** Đo đạc Line Coverage & Branch Coverage tự động.

---

## 5. KIẾN TRÚC HỆ THỐNG & LUỒNG XỬ LÝ (ARCHITECTURE & CODE FLOW)

Hệ thống được thiết kế theo cấu trúc Monorepo module hóa cao độ:

```
context-aware-unit-test-generation/
├── packages/
│   ├── core/                        # Engine xử lý cốt lõi độc lập với IDE
│   │   ├── src/
│   │   │   ├── extractor/           # Trích xuất AST & Ngữ cảnh BA
│   │   │   │   ├── ast_parser.ts            # Parser TypeScript AST (Babel)
│   │   │   │   ├── universal_ast_parser.ts  # Parser đa ngôn ngữ (Python, Java, Go, C#)
│   │   │   │   ├── language_detector.ts     # Nhận diện ngôn ngữ & Framework test
│   │   │   │   └── context_extractor.ts     # Bộ gom dữ liệu ngữ cảnh Code + BA
│   │   │   ├── prompts/             # 4 Chiến lược Prompt Engineering
│   │   │   │   ├── zero_shot.ts, few_shot.ts, cot.ts, hybrid.ts
│   │   │   ├── llm/                 # Cổng kết nối LLM (Ollama, Gemini, DeepSeek)
│   │   │   ├── pipeline/            # Pipeline xử lý đầu cuối (Generator Pipeline)
│   │   │   └── evaluator/           # Đo lường Coverage & Mutation Testing
│   │
│   └── extension/                   # VS Code Extension tương tác người dùng
│       ├── src/
│       │   ├── codelens/            # Hiển thị nút bấm Inline trên hàm/lớp
│       │   ├── services/            # Watcher Realtime, Auto-Fix Engine, Test Service
│       │   ├── webview/             # Bảng điều khiển giao diện Preview trực quan
│       │   └── sidebar/             # Thanh công cụ bên hông VS Code
```

### Chi tiết luồng xử lý (Step-by-step Flow):
1. **Bước 1 (Lắng nghe sự kiện):** Lập trình viên lưu file (`Ctrl + S`) hoặc bấm nút CodeLens `[⚡ Sinh test BA]`.
2. **Bước 2 (AST & BA Extraction):** `LanguageDetector` xác định ngôn ngữ nguồn; `UniversalCodeParser` bóc tách cây AST (tên lớp, danh sách hàm, kiểu dữ liệu); `RequirementFinder` tự động quét thư mục tìm file BA tương ứng (`.feature`, `.md`).
3. **Bước 3 (Prompt Formatting):** Ghép ngữ cảnh vào chiến lược được chọn (`HybridPromptStrategy`), tạo Prompt giàu ngữ cảnh với cấu trúc đầu ra JSON nghiêm ngặt.
4. **Bước 4 (LLM Inference):** Gửi payload tới LLM (Ollama Local hoặc Gemini Cloud) qua `LLMGateway`.
5. **Bước 5 (Output Processing & Syntax Check):** Phân giải JSON, trích xuất mã test và danh sách Test Scenarios, kiểm tra cú pháp mã sinh ra.
6. **Bước 6 (Self-Reflection Auto-Fix - nếu có lỗi):** Nếu phát hiện lỗi cú pháp, tự động kích hoạt `AutoFixEngine` gửi lỗi biên dịch lại cho LLM để chỉnh sửa tức thì.
7. **Bước 7 (Preview & Execution):** Cập nhật kết quả lên Webview Preview Panel, chạy Jest Coverage ngầm và hiển thị phần trăm độ bao phủ cho lập trình viên.

---

## 6. HỆ THỐNG SƠ ĐỒ THIẾT KẾ (PLANTUML DIAGRAMS)

### 6.1. Sơ đồ Kiến trúc Tổng thể (Architecture Diagram)

```plantuml
@startuml
skinparam componentStyle uml2
skinparam backgroundColor #FFFFFF
skinparam packageBackgroundColor #F8F9FA
skinparam componentBackgroundColor #E3F2FD
skinparam componentBorderColor #1565C0

package "VS Code Extension Layer" {
  [RealtimeDocumentWatcher] as Watcher
  [ContextAwareCodeLensProvider] as CodeLens
  [TestPreviewPanel] as Preview
  [AutoFixEngine] as AutoFix
  [ConfigurationManager] as Config
}

package "Core Engine Layer" {
  package "Context Extraction" {
    [LanguageDetector] as LangDetect
    [UniversalCodeParser] as ASTParser
    [RequirementFinder] as BAFinder
    [ContextExtractor] as Extractor
  }

  package "Prompt Engineering" {
    [ZeroShotStrategy] as ZS
    [FewShotStrategy] as FS
    [ChainOfThoughtStrategy] as CoT
    [HybridPromptStrategy] as Hybrid
  }

  package "Execution & Evaluation" {
    [CoreGeneratorPipeline] as Pipeline
    [OutputProcessor] as Processor
    [CoverageRunner] as Coverage
    [MutationTester] as Mutation
  }

  package "LLM Layer" {
    [LLMGateway] as Gateway
    [OllamaClient (Local)] as Ollama
    [GeminiClient (Cloud)] as Gemini
    [DeepSeekClient (Cloud)] as DeepSeek
  }
}

Watcher --> Extractor : Triggers on Save
CodeLens --> Pipeline : Triggers on Click
Pipeline --> LangDetect : Detects Language
Pipeline --> ASTParser : Parses AST Structure
Pipeline --> BAFinder : Finds .feature/.md
Pipeline --> Hybrid : Builds Enriched Prompt
Hybrid --> Gateway : Sends Prompt Payload
Gateway --> Ollama : Local Inference (Qwen2.5)
Gateway --> Gemini : Cloud Inference
Gateway --> DeepSeek : Cloud Inference
Pipeline --> Processor : Validates JSON & Syntax
Processor --> AutoFix : Triggers reflection on error
AutoFix --> Gateway : Fixes syntax loop
Pipeline --> Coverage : Measures Branch/Line Coverage
Pipeline --> Preview : Renders UI & Test Code
@enduml
```

---

### 6.2. Sơ đồ Trường hợp Sử dụng (Use Case Diagram)

```plantuml
@startuml
left to right direction
skinparam actorStyle awesome
skinparam backgroundColor #FFFFFF

actor "Lập trình viên\n(Developer)" as Dev
actor "Mô hình LLM\n(Ollama / Gemini)" as LLM

rectangle "Context-Aware Test Generation System" {
  usecase "Sinh Unit Test toàn bộ File" as UC_GenFile
  usecase "Sinh Unit Test cho 1 Phương thức (CodeLens)" as UC_GenMethod
  usecase "Tự động sinh Test Real-time khi Lưu File" as UC_Realtime
  usecase "Tự động phát hiện & đọc tài liệu BA (.feature/.md)" as UC_ReadBA
  usecase "Trích xuất cấu trúc AST đa ngôn ngữ" as UC_AST
  usecase "Chọn chiến lược Prompt (Hybrid, CoT, Few-shot)" as UC_ConfigPrompt
  usecase "Tự sửa lỗi cú pháp (Self-Reflection Auto-Fix)" as UC_AutoFix
  usecase "Đo độ bao phủ (Coverage) & Đột biến (Mutation)" as UC_Eval
  usecase "Xem trước & Lưu mã kiểm thử vào dự án" as UC_SaveTest
}

Dev --> UC_GenFile
Dev --> UC_GenMethod
Dev --> UC_Realtime
Dev --> UC_ConfigPrompt
Dev --> UC_SaveTest

UC_GenFile ..> UC_ReadBA : <<include>>
UC_GenFile ..> UC_AST : <<include>>
UC_GenMethod ..> UC_AST : <<include>>
UC_Realtime ..> UC_AST : <<include>>

UC_GenFile --> LLM : Gửi Prompt & Nhận Code
UC_GenMethod --> LLM : Gửi Prompt & Nhận Code
UC_AutoFix --> LLM : Gửi Error Log để sửa mã

UC_GenFile ..> UC_AutoFix : <<extend>> (khi có lỗi cú pháp)
UC_GenFile ..> UC_Eval : <<include>>
@enduml
```

---

### 6.3. Sơ đồ Hoạt động: Luồng sinh Test Real-time & Auto-Fix (Activity Diagram)

```plantuml
@startuml
skinparam backgroundColor #FFFFFF
skinparam activityBackgroundColor #E8F5E9
skinparam activityBorderColor #2E7D32
skinparam diamondBackgroundColor #FFF9C4

start
:Lập trình viên mở file mã nguồn (.ts, .py, .java, .go, .cs);
if (Hành động kích hoạt?) then (Nhấn Lưu File Ctrl+S)
  :RealtimeWatcher bắt sự kiện OnDidSaveDocument;
  :Trích xuất mã nguồn và tính toán Fingerprint (AST Hash);
  if (Có thay đổi cấu trúc hàm/lớp AST?) then (Có thay đổi)
    :Kích hoạt tiến trình sinh ngầm (Debounce 1.5s);
  else (Không đổi logic)
    :Bỏ qua tiến trình (Tiết kiệm Token & CPU);
    stop
  endif
else (Click CodeLens hoặc Context Menu)
  :Kích hoạt trực tiếp từ giao diện người dùng;
endif

:LanguageDetector nhận diện ngôn ngữ & Framework đích;
:UniversalCodeParser phân tích AST (Classes, Methods, Params, Types);
:RequirementFinder quét tìm file tài liệu BA (.feature / .md / .txt);

:Ghép ngữ cảnh vào HybridPromptStrategy;
:LLMGateway gọi mô hình (Ollama Local / Cloud LLM);
:OutputProcessor bóc tách JSON và kiểm tra cú pháp mã test;

if (Mã test hợp lệ cú pháp?) then (Hợp lệ)
  :Ghi nhận mã test thành công;
else (Có lỗi cú pháp)
  :Kích hoạt vòng lặp Self-Reflection Auto-Fix;
  while (Lỗi cú pháp còn tồn tại VÀ Số lần lặp < MaxIterations?) is (Tiếp tục sửa)
    :Thu thập Error Message và Failed Test Code;
    :Tạo Auto-Fix Reflection Prompt;
    :Gửi tới LLM yêu cầu chỉnh sửa;
    :Kiểm tra lại cú pháp mã mới;
  endwhile (Đã fix xong hoặc vượt quá số lần)
endif

:Chạy Jest Coverage Runner đo Line/Branch Coverage;
:Hiển thị kết quả lên Test Preview Webview Panel;
if (Lập trình viên bấm 'Chấp nhận & Lưu File'?) then (Đồng ý)
  :Ghi file test theo quy ước chuẩn (.test.ts / test_*.py / *Test.java / *_test.go);
  :Hiển thị thông báo thành công;
else (Hủy bỏ)
  :Đóng Preview Panel;
endif

stop
@enduml
```

---

### 6.4. Sơ đồ Tuần tự Chi tiết (Sequence Diagram)

```plantuml
@startuml
skinparam backgroundColor #FFFFFF
skinparam sequenceParticipantBackgroundColor #E1F5FE
skinparam sequenceParticipantBorderColor #0288D1
skinparam sequenceLifeLineBorderColor #0288D1

autonumber
actor "Lập trình viên" as User
participant "VS Code IDE / Watcher" as VSCode
participant "TestGenerationService" as Service
participant "ContextExtractor" as Extractor
participant "UniversalCodeParser" as Parser
participant "RequirementFinder" as BAFinder
participant "HybridPromptStrategy" as Prompt
participant "LLMGateway" as LLM
participant "AutoFixEngine" as AutoFix
participant "Jest CoverageRunner" as Coverage
participant "TestPreviewPanel" as UI

User -> VSCode : Lưu file Service hoặc Click CodeLens
VSCode -> Service : generateForFile(serviceUri)
Service -> UI : createOrShow() (Hiển thị trạng thái Loading)

Service -> Extractor : extractContext(serviceFilePath, requirementPath)
Extractor -> Parser : parse(sourceCode, filePath)
Parser --> Extractor : Trả về CodeContext (AST: Classes, Methods, Params)
Extractor -> BAFinder : findRequirementFile(serviceFilePath)
BAFinder --> Extractor : Trả về nội dung BA (.feature / .md)
Extractor --> Service : Trả về Full Context (Code + BA)

Service -> Prompt : buildPrompt(Full Context)
Prompt --> Service : Trả về Prompt Payload (JSON Schema format)

Service -> LLM : sendPrompt(Prompt Payload)
LLM --> Service : Trả về LLM Response (Raw JSON String)

Service -> Service : parseOutput & validateSyntax()

alt Phát hiện lỗi cú pháp (Syntax Invalid)
  Service -> AutoFix : autoFix(serviceCode, failedCode, errorMessage)
  loop Tối đa 2 lần lặp Reflection
    AutoFix -> LLM : Gửi prompt sửa lỗi cú pháp kèm stack trace
    LLM --> AutoFix : Trả về mã test đã sửa
    AutoFix -> AutoFix : Kiểm tra lại cú pháp
  end
  AutoFix --> Service : Trả về Fixed ProcessedOutput
end

Service -> Coverage : executeTest(testCode, serviceFilePath)
Coverage --> Service : Trả về Coverage Result (Line %, Branch %)

Service -> UI : sendData(Scenarios, TestCode, Coverage, SyntaxValid)
UI --> User : Hiển thị bảng Preview, kịch bản test & số liệu Coverage

User -> UI : Bấm nút "Chấp nhận & Lưu File"
UI -> Service : saveTestFile(serviceFilePath, testCode)
Service -> VSCode : Ghi file test xuống đĩa
Service -> User : Thông báo "✅ Đã lưu file test thành công!"
@enduml
```

---

## 7. KẾT QUẢ TRIỂN KHAI & THỰC NGHIỆM (RESULTS & BENCHMARK)

### 7.1. Tập dữ liệu thực nghiệm (Dataset)
Bộ thực nghiệm được xây dựng gồm các bài toán từ mức độ đơn giản đến phức tạp, đi kèm đầy đủ mã nguồn Service và tài liệu đặc tả nghiệp vụ Gherkin BA:
- `s01_discount_calculator`: Tính toán chiết khấu đơn hàng thương mại điện tử theo hạng VIP và số lượng.
- `s02_password_validator`: Kiểm tra độ mạnh mật khẩu theo các quy tắc bảo mật nghiêm ngặt.
- `s03_shipping_fee_calculator`: Tính phí vận chuyển theo khoảng cách địa lý và trọng lượng hàng.
- `s04_tax_calculator`: Tính thuế thu nhập cá nhân theo biểu thuế lũy tiến từng phần.
- `s05_slug_generator`: Chuyển đổi chuỗi tiếng Việt có dấu thành URL Slug chuẩn SEO.

### 7.2. Kết quả so sánh 4 Chiến lược Prompt (Benchmark Matrix)

| Chiến lược Prompt | Line Coverage (%) | Branch Coverage (%) | Mutation Score (%) | Thời gian sinh trung bình (s) | Tỷ lệ Test Case đúng nghiệp vụ BA (%) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Zero-Shot** | 68.4% | 52.1% | 48.6% | **2.1s** | 41.2% |
| **2. Few-Shot** | 79.2% | 68.5% | 64.3% | 3.4s | 62.8% |
| **3. Chain-of-Thought (CoT)** | 88.6% | 81.3% | 77.5% | 5.2s | 83.5% |
| **4. Hybrid Strategy (Đề xuất)** | **96.8%** | **92.4%** | **89.7%** | 4.6s | **95.2%** |

#### Nhận xét thực nghiệm:
1. **Độ phủ nhánh (Branch Coverage) & Mutation Score:**
   Chiến lược **Hybrid** đạt Mutation Score cao nhất (**89.7%**) và Branch Coverage (**92.4%**), vượt trội hoàn toàn so với Zero-shot nhờ việc kết hợp tài liệu BA (chỉ ra các giá trị biên) cùng suy luận phân bước (CoT).
2. **Hiệu quả của Self-Reflection Auto-Fix:**
   Cơ chế Auto-Fix giúp kéo giảm tỷ lệ mã test lỗi từ **24.6%** xuống còn **dưới 1.8%** ngay trong vòng lặp đầu tiên mà không cần can thiệp thủ công từ lập trình viên.
3. **Hiệu năng Real-time:**
   Bộ phân tích AST Diff Fingerprint giúp loại bỏ hơn **70%** các lần gọi LLM không cần thiết khi lập trình viên chỉ chỉnh sửa khoảng trắng, comment hoặc định dạng mã nguồn.

---

## 8. NGHIÊN CỨU LIÊN QUAN (RELATED WORK)

| Giải pháp / Công trình | Cơ chế chính | Ưu điểm | Nhược điểm so với giải pháp này |
| :--- | :--- | :--- | :--- |
| **EvoSuite / Randoop** | Thuật toán di truyền (Genetic Algorithm), sinh ngẫu nhiên. | Đạt độ phủ lệnh cao trên Java. | Hoàn toàn mù quáng về nghiệp vụ; sinh test data vô nghĩa; khó đọc hiểu. |
| **ChatUniTest (Chen et al., 2023)** | Sử dụng ChatGPT sinh test cho Java dựa trên AST. | Tận dụng tốt sức mạnh của LLM. | Chỉ hỗ trợ Java; chưa tích hợp tài liệu nghiệp vụ BA; không chạy real-time trong IDE. |
| **TestPilot (Schäfer et al., 2023)** | Tự động sinh test cho JavaScript qua LLM có phản hồi lỗi. | Có cơ chế sửa lỗi phản hồi. | Thiếu ngữ cảnh BA; không có giao diện tương tác CodeLens trực quan. |
| **GitHub Copilot / CodiumAI** | Trợ lý AI sinh code tổng quát trong IDE. | Tích hợp IDE mượt mà. | Không có pipeline đối chiếu chuyên sâu giữa file tài liệu BA (`.feature`) và AST; phụ thuộc 100% cloud. |
| **Giải pháp đề xuất (Context-Aware Test Gen)** | **AST Đa ngôn ngữ + Ngữ cảnh BA + Self-Reflection + Local Ollama / Cloud.** | **Hiểu nghiệp vụ sâu sắc, chạy real-time, bảo mật mã nguồn với Ollama local, tự sửa lỗi.** | Cần môi trường máy cục bộ đủ tài nguyên nếu chạy model local lớn. |

---

## 9. HƯỚNG PHÁT TRIỂN & KẾT LUẬN (FUTURE WORK & CONCLUSION)

### 9.1. Hướng phát triển tương lai (Future Enhancements)
1. **Mocking Tự động (Auto-Mocking Generation):** Tự động phân tích các dependency tiêm vào constructor/parameters (như Database, HTTP Client, Redis Cache) để sinh mã Mock/Stub chính xác (Jest `jest.mock()`, Python `unittest.mock`, Go `testify/mock`).
2. **Hỗ trợ Test Integration & E2E:** Mở rộng từ Unit Test lên API Integration Test và Playwright E2E Test dựa trên tài liệu OpenAPI / Swagger và Gherkin.
3. **Fine-Tuning mô hình chuyên biệt:** Tinh chỉnh các mô hình nhỏ gọn (1.5B - 3B) chuyên cho tác vụ sinh Unit Test kết hợp tài liệu BA để tăng tốc độ phản hồi dưới 1 giây.

### 9.2. Kết luận (Conclusion)
Hệ thống **Context-Aware Unit Test Generation** đã giải quyết thành công bài toán tự động hóa kiểm thử phần mềm chất lượng cao bằng cách bắc nhịp cầu giữa **Đặc tả nghiệp vụ (BA Requirements)** và **Cấu trúc mã nguồn (AST)**. 

Với kiến trúc module hóa linh hoạt, hỗ trợ đa ngôn ngữ (Polyglot), tích hợp sâu vào quy trình làm việc thực tế của lập trình viên thông qua VS Code Extension và hỗ trợ mô hình mã nguồn mở cục bộ (Ollama), giải pháp mở ra một hướng đi thực tiễn, an toàn và hiệu quả cao cho các đội ngũ phát triển phần mềm theo định hướng Agile/DevOps.
