# Nghiên cứu và Xây dựng Hệ thống Tự động Sinh Test Case từ Software Requirement sử dụng LLM

> **Tên đề tài (EN):** Research and Development of an Automated Test Case Generation System from Software Requirements using Large Language Models
>
> **Lĩnh vực:** Software Engineering × Artificial Intelligence
>
> **Từ khóa:** LLM, Test Case Generation, Prompt Engineering, RAG, Software Testing, Code Coverage, Mutation Testing

---

## Mục lục

- [1. Tổng quan đề tài](#1-tổng-quan-đề-tài)
- [2. Cơ sở lý thuyết](#2-cơ-sở-lý-thuyết)
- [3. Các nghiên cứu liên quan (State of the Art)](#3-các-nghiên-cứu-liên-quan-state-of-the-art)
- [4. Đề xuất kiến trúc hệ thống](#4-đề-xuất-kiến-trúc-hệ-thống)
- [5. So sánh các Chiến lược Prompt Engineering](#5-so-sánh-các-chiến-lược-prompt-engineering)
- [6. Đánh giá Chất lượng Test Case](#6-đánh-giá-chất-lượng-test-case)
- [7. Thiết kế Thực nghiệm](#7-thiết-kế-thực-nghiệm)
- [8. Ứng dụng thực tiễn — VS Code Extension](#8-ứng-dụng-thực-tiễn--vs-code-extension)
- [9. Pipeline hoàn chỉnh: Từ Requirement → Test Case → Test Code](#9-pipeline-hoàn-chỉnh-từ-requirement--test-case--test-code)
- [10. Kế hoạch triển khai](#10-kế-hoạch-triển-khai)
- [11. Tài liệu tham khảo](#11-tài-liệu-tham-khảo)

---

## 1. Tổng quan đề tài

### 1.1. Đặt vấn đề

Trong quy trình phát triển phần mềm, **kiểm thử (testing)** chiếm khoảng **30–40% tổng chi phí** dự án. Việc viết test case thủ công từ tài liệu đặc tả yêu cầu (Software Requirement Specification - SRS) tồn tại nhiều hạn chế:

| Vấn đề | Mô tả |
|--------|-------|
| **Tốn thời gian** | Tester phải đọc hiểu SRS, phân tích logic nghiệp vụ, thiết kế bộ test case |
| **Thiếu bao phủ** | Con người dễ bỏ sót edge case, boundary value, negative scenario |
| **Không nhất quán** | Phong cách, format, mức độ chi tiết test case khác nhau giữa các tester |
| **Khó bảo trì** | Khi requirement thay đổi, phải cập nhật thủ công hàng loạt test case |

### 1.2. Mục tiêu nghiên cứu

1. **Nghiên cứu** khả năng ứng dụng LLM trong việc tự động sinh test case từ requirement
2. **So sánh** hiệu quả các chiến lược prompt (Zero-shot, Few-shot, Chain-of-Thought, Hybrid) trong việc sinh test case
3. **Đánh giá** chất lượng test case sinh ra bằng các metric: coverage, mutation score, precision, recall
4. **Xây dựng** hệ thống ứng dụng thực tiễn dưới dạng VS Code Extension tích hợp vào quy trình phát triển

### 1.3. Phạm vi nghiên cứu

- **Input:** Requirement dạng User Story, SRS document, hoặc source code (service/controller)
- **Output:** Bộ test scenario + test case + test code (unit test / integration test)
- **LLM sử dụng:** GPT-4o, Claude Sonnet, Gemini Pro, DeepSeek Coder (so sánh)
- **Ngôn ngữ target:** TypeScript/JavaScript (Jest), Java (JUnit), Python (pytest)
- **Ứng dụng:** VS Code Extension context-aware

---

## 2. Cơ sở lý thuyết

### 2.1. Kiểm thử phần mềm (Software Testing)

#### 2.1.1. Các kỹ thuật thiết kế test case truyền thống

```
┌─────────────────────────────────────────────────────┐
│              Test Design Techniques                  │
├───────────────────┬─────────────────────────────────┤
│  Black-box        │  White-box                      │
│  ┌──────────────┐ │  ┌────────────────────────────┐ │
│  │ Equivalence  │ │  │ Statement Coverage         │ │
│  │ Partitioning │ │  │ Branch Coverage            │ │
│  │              │ │  │ Path Coverage              │ │
│  │ Boundary     │ │  │ Condition Coverage         │ │
│  │ Value        │ │  │ MC/DC                      │ │
│  │ Analysis     │ │  └────────────────────────────┘ │
│  │              │ │                                 │
│  │ Decision     │ │  Experience-based               │
│  │ Table        │ │  ┌────────────────────────────┐ │
│  │              │ │  │ Error Guessing             │ │
│  │ State        │ │  │ Exploratory Testing        │ │
│  │ Transition   │ │  │ Checklist-based            │ │
│  └──────────────┘ │  └────────────────────────────┘ │
└───────────────────┴─────────────────────────────────┘
```

**Equivalence Partitioning (EP):** Chia miền input thành các lớp tương đương, mỗi lớp chọn 1 đại diện. Ví dụ: tuổi hợp lệ [18-65], dưới 18 (invalid), trên 65 (invalid).

**Boundary Value Analysis (BVA):** Tập trung vào giá trị biên — nơi lỗi thường xảy ra nhất. Ví dụ: 17, 18, 19, 64, 65, 66.

**Decision Table Testing:** Mô hình hóa logic nghiệp vụ phức tạp bằng bảng quyết định.

**State Transition Testing:** Kiểm tra hành vi hệ thống khi chuyển trạng thái.

#### 2.1.2. Các cấp độ kiểm thử

| Cấp độ | Mục đích | Ví dụ |
|--------|----------|-------|
| **Unit Test** | Kiểm tra từng hàm/method riêng lẻ | `createUser()` trả về đúng kết quả |
| **Integration Test** | Kiểm tra tương tác giữa các module | Service → Repository → Database |
| **System Test** | Kiểm tra toàn bộ hệ thống | End-to-end flow |
| **Acceptance Test** | Kiểm tra theo yêu cầu người dùng | User Story completion |

### 2.2. Large Language Model (LLM)

#### 2.2.1. Kiến trúc Transformer

LLM dựa trên kiến trúc **Transformer** (Vaswani et al., 2017) với cơ chế **Self-Attention** cho phép mô hình:
- Hiểu ngữ cảnh dài (long-range dependencies)
- Nắm bắt mối quan hệ giữa các token trong câu
- Sinh text có tính nhất quán cao

```
Input Text → Tokenizer → Embedding → [Transformer Blocks × N] → Output Tokens
                                          ↑
                                   Self-Attention +
                                   Feed-Forward +
                                   Layer Norm
```

#### 2.2.2. Các mô hình LLM nổi bật (2024–2025)

| Model | Provider | Context Window | Điểm mạnh cho Testing |
|-------|----------|---------------|----------------------|
| **GPT-4o** | OpenAI | 128K tokens | Instruction following mạnh, tool-use tốt |
| **Claude 3.5 Sonnet** | Anthropic | 200K tokens | Reasoning sâu, code generation chính xác |
| **Gemini 2.5 Pro** | Google | 1M tokens | Context window cực lớn, repo-level analysis |
| **DeepSeek V3/R1** | DeepSeek | 128K tokens | Chi phí thấp, hiệu suất code tốt |
| **Codestral / Mistral** | Mistral | 32K tokens | Open-weight, self-hosted được |

### 2.3. Prompt Engineering

Prompt Engineering là nghệ thuật thiết kế input cho LLM để đạt output mong muốn.

#### 2.3.1. Các chiến lược chính

```
┌─────────────────────────────────────────────────────────────┐
│                    Prompt Strategies                         │
│                                                             │
│  Zero-shot ──→ Few-shot ──→ Chain-of-Thought ──→ Hybrid    │
│  (Đơn giản)   (Có mẫu)    (Suy luận)          (Kết hợp)   │
│                                                             │
│  Complexity & Quality ──────────────────────────────→        │
│  Token Usage ───────────────────────────────────────→        │
└─────────────────────────────────────────────────────────────┘
```

### 2.4. Retrieval-Augmented Generation (RAG)

RAG kết hợp **retrieval** (truy xuất) và **generation** (sinh) để giảm hallucination:

```
┌──────────┐    ┌──────────────┐    ┌─────────┐    ┌──────────┐
│ Document │───→│ Chunking +   │───→│ Vector  │───→│ Vector   │
│ Corpus   │    │ Embedding    │    │ Store   │    │ Database │
└──────────┘    └──────────────┘    └─────────┘    └────┬─────┘
                                                        │
┌──────────┐    ┌──────────────┐    ┌─────────┐         │
│  Query   │───→│   Retrieve   │───→│ Top-K   │←────────┘
│  (User)  │    │  Similar     │    │ Context │
└──────────┘    └──────────────┘    └────┬────┘
                                         │
                ┌──────────────┐    ┌─────▼────┐    ┌──────────┐
                │  Augmented   │←───│ Prompt   │───→│   LLM    │
                │  Response    │    │ Template │    │ Generate │
                └──────────────┘    └──────────┘    └──────────┘
```

---

## 3. Các nghiên cứu liên quan (State of the Art)

### 3.1. Bảng tổng hợp nghiên cứu

| # | Nghiên cứu | Năm | Phương pháp | Kết quả chính |
|---|------------|-----|-------------|---------------|
| 1 | **TestForge** (Jain & Le Goues) | 2025 | Agentic, feedback-driven, file-level | Pass@1: 84.3%, Line coverage: 44.4%, Mutation score: 33.8% |
| 2 | **Generating High-Level Test Cases from Requirements using LLM** (Industry Study) | 2025 | Non-RAG prompt-based, generalization | 87% test case hợp lệ, 15% test case phát hiện mới |
| 3 | **System Test Case Design from Requirements Specifications** (ChatGPT) | 2024 | GPT-4 + SRS analysis | Giảm 50%+ effort cho draft generation |
| 4 | **LLM Driven Unit Test Case Generation Using Agentic AI** | 2025 | Multi-agent, self-correction | Tự sửa lỗi qua vòng lặp execution-validation |
| 5 | **RATester** (Go) | 2025 | Context-aware, Language Server integration | Dynamic definition lookup, repo-level understanding |
| 6 | **ALMITA** (Evaluation Dataset) | 2025 | Benchmark dataset chuyên biệt | Dataset chuẩn cho đánh giá LLM test generation |
| 7 | **Mutation-Guided Test Generation** (Meta) | 2025 | Mutation feedback loop | Cải thiện mutation score qua vòng lặp phản hồi |

### 3.2. Xu hướng nghiên cứu 2024–2025

```
2023 ──────────── 2024 ──────────── 2025 ──────────── 2026
  │                 │                 │                 │
  │ Single-shot     │ RAG +           │ Agentic +       │ Multi-Agent +
  │ Prompting       │ Few-shot        │ Feedback Loop   │ Self-Healing
  │                 │                 │                 │
  │ Basic test      │ Context-aware   │ File-level +    │ Repo-level +
  │ generation      │ generation      │ Coverage-guided │ CI/CD Integration
  │                 │                 │                 │
  │ Manual eval     │ Coverage        │ Mutation Score  │ Hybrid Metrics +
  │                 │ metrics         │ + LLM-as-Judge  │ Continuous Eval
```

### 3.3. Gap Analysis (Khoảng trống nghiên cứu)

| Gap | Mô tả | Hướng giải quyết |
|-----|--------|-------------------|
| **So sánh chiến lược prompt** | Thiếu nghiên cứu hệ thống so sánh prompt strategies trên cùng dataset | Thực nghiệm so sánh 4 chiến lược |
| **Đánh giá đa chiều** | Hầu hết chỉ dùng coverage, thiếu mutation score + human eval | Framework đánh giá 3 tầng |
| **IDE Integration** | Ít nghiên cứu về tích hợp real-time vào IDE | VS Code Extension |
| **Tiếng Việt** | Chưa có nghiên cứu với requirement tiếng Việt | Thử nghiệm bilingual |

---

## 4. Đề xuất kiến trúc hệ thống

### 4.1. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                          │
│                                                                 │
│  ┌─────────────┐   ┌─────────────────────────────────────────┐ │
│  │   VS Code   │   │          Backend Service                │ │
│  │  Extension  │   │                                         │ │
│  │             │   │  ┌───────────┐  ┌────────────────────┐ │ │
│  │ ┌─────────┐ │   │  │ Requirement│  │  Context Engine    │ │ │
│  │ │ CodeLens│ │   │  │ Parser    │  │                    │ │ │
│  │ │         │ │   │  │           │  │ ┌────────────────┐ │ │ │
│  │ │ Context │◄├───┤  │ ┌───────┐ │  │ │ Code Analyzer  │ │ │ │
│  │ │ Menu    │ │   │  │ │ SRS   │ │  │ │ (AST Parser)   │ │ │ │
│  │ │         │ │   │  │ │ User  │ │  │ ├────────────────┤ │ │ │
│  │ │ Sidebar │ │   │  │ │ Story │ │  │ │ Dependency     │ │ │ │
│  │ │ Panel   │ │   │  │ │ API   │ │  │ │ Resolver       │ │ │ │
│  │ └────┬────┘ │   │  │ │ Spec  │ │  │ ├────────────────┤ │ │ │
│  │      │      │   │  │ └───────┘ │  │ │ Type/Interface │ │ │ │
│  │      │      │   │  └─────┬─────┘  │ │ Extractor      │ │ │ │
│  │      │      │   │        │        │ └────────────────┘ │ │ │
│  │      │      │   │        ▼        └─────────┬──────────┘ │ │
│  │      │      │   │  ┌─────────────────────────▼──────────┐ │ │
│  │      │      │   │  │         Prompt Builder             │ │ │
│  │      │      │   │  │                                    │ │ │
│  │      │      │   │  │  Strategy: ZS | FS | CoT | Hybrid │ │ │
│  │      │      │   │  └──────────────┬─────────────────────┘ │ │
│  │      │      │   │                 │                       │ │
│  │      │      │   │                 ▼                       │ │
│  │      │      │   │  ┌──────────────────────────────────┐  │ │
│  │      │      │   │  │        LLM Gateway               │  │ │
│  │      │      │   │  │  ┌────────┬────────┬───────────┐ │  │ │
│  │      │      │   │  │  │ GPT-4o │ Claude │ Gemini    │ │  │ │
│  │      │      │   │  │  │        │ Sonnet │ Pro       │ │  │ │
│  │      │      │   │  │  │        │        │           │ │  │ │
│  │      │      │   │  │  │        │        │ DeepSeek  │ │  │ │
│  │      │      │   │  │  └────────┴────────┴───────────┘ │  │ │
│  │      │      │   │  └──────────────┬───────────────────┘  │ │
│  │      │      │   │                 │                       │ │
│  │      │      │   │                 ▼                       │ │
│  │      │      │   │  ┌──────────────────────────────────┐  │ │
│  │      ◄──────┼───┤  │      Test Case Generator         │  │ │
│  │  Results    │   │  │                                  │  │ │
│  │  Display    │   │  │  Scenario → Test Case → Code     │  │ │
│  │             │   │  └──────────────┬───────────────────┘  │ │
│  │             │   │                 │                       │ │
│  │             │   │                 ▼                       │ │
│  │             │   │  ┌──────────────────────────────────┐  │ │
│  │             │   │  │      Quality Evaluator           │  │ │
│  │             │   │  │  Coverage │ Mutation │ Validation │  │ │
│  │             │   │  └──────────────────────────────────┘  │ │
│  └─────────────┘   └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2. Các thành phần chính

#### 4.2.1. Requirement Parser
- **Input:** SRS document (PDF/Word/Markdown), User Story, API Specification (OpenAPI/Swagger)
- **Xử lý:** Trích xuất requirement dạng cấu trúc (precondition, action, expected result)
- **Output:** Structured Requirement Object

```json
{
  "id": "REQ-001",
  "title": "User Registration",
  "description": "Hệ thống cho phép người dùng đăng ký tài khoản mới",
  "preconditions": ["Email chưa tồn tại trong hệ thống"],
  "inputs": [
    { "field": "email", "type": "string", "constraints": "valid email format" },
    { "field": "password", "type": "string", "constraints": "min 8 chars, 1 uppercase, 1 number" },
    { "field": "fullName", "type": "string", "constraints": "2-50 characters" }
  ],
  "expected_behavior": "Tạo user mới, gửi email xác nhận, trả về user ID",
  "business_rules": [
    "Email phải unique",
    "Password phải được hash trước khi lưu",
    "Gửi welcome email sau khi tạo thành công"
  ]
}
```

#### 4.2.2. Context Engine
- **Code Analyzer:** Phân tích AST (Abstract Syntax Tree) của source code để hiểu cấu trúc
- **Dependency Resolver:** Tìm và resolve dependencies (imports, services, repositories)
- **Type/Interface Extractor:** Trích xuất type definitions, interfaces, DTOs

```typescript
// Ví dụ: Context Engine phân tích service file
interface ExtractedContext {
  className: string;
  methods: MethodInfo[];
  dependencies: DependencyInfo[];
  interfaces: InterfaceInfo[];
  relatedFiles: string[];
  existingTests: TestInfo[];
}
```

#### 4.2.3. Prompt Builder
Xây dựng prompt theo chiến lược được chọn (chi tiết ở Mục 5).

#### 4.2.4. LLM Gateway
- Abstraction layer cho phép swap model dễ dàng
- Retry logic, rate limiting, error handling
- Token counting và cost tracking

#### 4.2.5. Test Case Generator
Sinh test case qua 3 bước:
1. **Test Scenario:** Xác định các kịch bản cần test
2. **Test Case:** Chi tiết steps, data, expected result
3. **Test Code:** Sinh code runnable (Jest/JUnit/pytest)

#### 4.2.6. Quality Evaluator
Đánh giá chất lượng test case sinh ra (chi tiết ở Mục 6).

### 4.3. Luồng xử lý (Pipeline)

```
         ┌──────────────────────────────────────────────┐
         │              USER ACTION                      │
         │  Developer viết xong UserService.ts           │
         └────────────────────┬─────────────────────────┘
                              │
                              ▼
         ┌──────────────────────────────────────────────┐
         │  STEP 1: Context Collection                   │
         │  • Parse AST of UserService.ts                │
         │  • Find UserRepository, UserDTO, etc.         │
         │  • Locate existing test files                 │
         │  • Read related requirement docs              │
         └────────────────────┬─────────────────────────┘
                              │
                              ▼
         ┌──────────────────────────────────────────────┐
         │  STEP 2: Scenario Generation                  │
         │  • Identify test scenarios from context       │
         │  • Apply BVA, EP, Decision Table              │
         │  • Include positive + negative + edge cases   │
         └────────────────────┬─────────────────────────┘
                              │
                              ▼
         ┌──────────────────────────────────────────────┐
         │  STEP 3: Test Case Detailing                  │
         │  • For each scenario: input, steps, expected  │
         │  • Classify: Happy path / Error / Edge        │
         │  • Prioritize by risk level                   │
         └────────────────────┬─────────────────────────┘
                              │
                              ▼
         ┌──────────────────────────────────────────────┐
         │  STEP 4: Test Code Generation                 │
         │  • Generate runnable test code                │
         │  • Setup mocks/stubs for dependencies         │
         │  • Add assertions for expected behavior       │
         └────────────────────┬─────────────────────────┘
                              │
                              ▼
         ┌──────────────────────────────────────────────┐
         │  STEP 5: Validation & Feedback Loop           │
         │  • Run tests → Check compilation              │
         │  • Analyze coverage                           │
         │  • If failures → Feed error back to LLM       │
         │  • Iterate until quality threshold met        │
         └──────────────────────────────────────────────┘
```

---

## 5. So sánh các Chiến lược Prompt Engineering

### 5.1. Bốn chiến lược nghiên cứu

#### 5.1.1. Zero-shot Prompting

Chỉ cung cấp instruction, không kèm ví dụ.

```
SYSTEM: Bạn là một Software Test Engineer chuyên nghiệp. Hãy tạo test case 
cho requirement được cung cấp.

USER: 
Requirement: "Hệ thống cho phép người dùng đăng ký tài khoản mới. Email phải 
unique, password tối thiểu 8 ký tự gồm chữ hoa và số."

Hãy sinh bộ test case bao gồm: positive, negative, boundary cases.
Output format: JSON array.
```

**Ưu điểm:** Đơn giản, nhanh, ít token
**Nhược điểm:** Thiếu nhất quán, format không đồng đều

#### 5.1.2. Few-shot Prompting

Cung cấp 3–5 ví dụ mẫu (exemplars) để LLM học format và phong cách.

```
SYSTEM: Bạn là một Software Test Engineer. Tạo test case theo đúng format 
trong các ví dụ dưới đây.

USER:
=== VÍ DỤ 1 ===
Requirement: "Người dùng đăng nhập bằng email và password."
Test Cases:
[
  {
    "id": "TC-LOGIN-001",
    "scenario": "Đăng nhập thành công với thông tin hợp lệ",
    "type": "positive",
    "precondition": "Tài khoản đã tồn tại và đã active",
    "input": { "email": "user@example.com", "password": "Valid123" },
    "steps": ["Nhập email", "Nhập password", "Nhấn Login"],
    "expected": "Đăng nhập thành công, redirect đến dashboard",
    "priority": "high"
  },
  {
    "id": "TC-LOGIN-002",
    "scenario": "Đăng nhập thất bại với password sai",
    "type": "negative",
    ...
  }
]

=== YÊU CẦU THỰC TẾ ===
Requirement: "Hệ thống cho phép người dùng đăng ký..."
Hãy sinh test cases theo format tương tự.
```

**Ưu điểm:** Format nhất quán, output quality cao hơn
**Nhược điểm:** Tốn nhiều token, phụ thuộc chất lượng ví dụ

#### 5.1.3. Chain-of-Thought (CoT) Prompting

Yêu cầu LLM suy luận từng bước trước khi sinh output.

```
SYSTEM: Bạn là một Software Test Engineer. Hãy phân tích requirement theo 
từng bước trước khi tạo test case.

USER:
Requirement: "Hệ thống cho phép người dùng đăng ký..."

Hãy thực hiện theo các bước:
1. PHÂN TÍCH: Liệt kê tất cả business rules và constraints
2. PHÂN LOẠI INPUT: Xác định các input fields và domain của chúng
3. ÁP DỤNG KỸ THUẬT: 
   - Equivalence Partitioning: Xác định các lớp tương đương cho mỗi input
   - Boundary Value Analysis: Xác định giá trị biên
   - Decision Table: Tổ hợp các điều kiện
4. SINH TEST CASE: Dựa trên phân tích trên, tạo bộ test case hoàn chỉnh
5. REVIEW: Tự kiểm tra lại xem có thiếu scenario nào không
```

**Ưu điểm:** Phát hiện edge case tốt, reasoning chất lượng cao
**Nhược điểm:** Latency cao, tốn token, có thể verbose

#### 5.1.4. Hybrid Prompting (Đề xuất của nghiên cứu)

**Kết hợp** Few-shot (cho format) + CoT (cho logic) + RAG (cho context).

```
SYSTEM: Bạn là một Senior Software Test Engineer. 
Bạn sẽ được cung cấp:
- Requirement cần test
- Context từ source code (nếu có)
- Ví dụ test case mẫu (để follow format)

Hãy phân tích requirement theo các bước, sau đó sinh test case.

USER:
=== CONTEXT (từ RAG) ===
[Trích xuất từ source code, interfaces, existing tests...]

=== VÍ DỤ FORMAT ===
[1-2 test case mẫu cho format consistency]

=== REQUIREMENT ===
[Requirement cần sinh test case]

=== INSTRUCTIONS ===
1. Phân tích business rules
2. Xác định test techniques phù hợp
3. Sinh test cases theo format mẫu
4. Đảm bảo coverage: positive + negative + boundary + edge
```

**Ưu điểm:** Chất lượng cao nhất, cân bằng giữa quality và consistency
**Nhược điểm:** Phức tạp nhất, tốn nhiều token nhất

### 5.2. Bảng so sánh tổng hợp

| Tiêu chí | Zero-shot | Few-shot | CoT | Hybrid |
|----------|-----------|----------|-----|--------|
| **Độ chính xác** | ★★☆☆☆ | ★★★☆☆ | ★★★★☆ | ★★★★★ |
| **Nhất quán format** | ★★☆☆☆ | ★★★★★ | ★★★☆☆ | ★★★★★ |
| **Edge case discovery** | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | ★★★★★ |
| **Token efficiency** | ★★★★★ | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ |
| **Latency** | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ |
| **Ease of setup** | ★★★★★ | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ |
| **Scalability** | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★☆☆ |

### 5.3. Escalation Ladder (Chiến lược leo thang)

```
START ──→ Zero-shot ──→ Output OK? ──YES──→ DONE
                           │
                          NO
                           │
                           ▼
              Few-shot ──→ Output OK? ──YES──→ DONE
                           │
                          NO (Logic issues)
                           │
                           ▼
              CoT ────→ Output OK? ──YES──→ DONE
                           │
                          NO (Context issues)
                           │
                           ▼
              Hybrid (CoT + Few-shot + RAG) ──→ DONE
```

---

## 6. Đánh giá Chất lượng Test Case

### 6.1. Framework đánh giá 3 tầng

```
┌─────────────────────────────────────────────────────────────┐
│                   EVALUATION FRAMEWORK                       │
│                                                             │
│  TẦNG 1: AUTOMATED METRICS (Tự động, nhanh)                │
│  ┌────────────┬────────────┬────────────┬────────────────┐  │
│  │ Coverage   │ Compilation│ Test       │ Token          │  │
│  │ (Line,     │ Rate       │ Pass Rate  │ Overlap        │  │
│  │  Branch)   │            │            │ (BLEU/ROUGE)   │  │
│  └────────────┴────────────┴────────────┴────────────────┘  │
│                                                             │
│  TẦNG 2: MUTATION TESTING (Sâu, chất lượng assertion)      │
│  ┌────────────┬────────────┬────────────────────────────┐  │
│  │ Mutation   │ Killed     │ Survived                   │  │
│  │ Score      │ Mutants    │ Mutants Analysis           │  │
│  └────────────┴────────────┴────────────────────────────┘  │
│                                                             │
│  TẦNG 3: HUMAN + LLM-AS-JUDGE (Semantic quality)          │
│  ┌────────────┬────────────┬────────────┬────────────────┐  │
│  │ Relevance  │ Complete-  │ Maintain-  │ Readability    │  │
│  │ Score      │ ness       │ ability    │ Score          │  │
│  └────────────┴────────────┴────────────┴────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2. Chi tiết các Metric

#### 6.2.1. Tầng 1 — Automated Metrics

| Metric | Công thức / Mô tả | Ý nghĩa |
|--------|-------------------|----------|
| **Line Coverage** | `(Lines executed / Total lines) × 100%` | Bao nhiêu dòng code được test chạy qua |
| **Branch Coverage** | `(Branches executed / Total branches) × 100%` | Bao nhiêu nhánh logic được cover |
| **Compilation Rate** | `(Compilable tests / Total generated tests) × 100%` | Test sinh ra có compile được không |
| **Test Pass Rate** | `(Passing tests / Total tests) × 100%` | Test có chạy pass không (assertion đúng) |
| **Precision** | `TP / (TP + FP)` | Tỷ lệ test case hợp lệ trong tổng sinh ra |
| **Recall** | `TP / (TP + FN)` | Tỷ lệ scenario được cover / tổng scenario cần cover |
| **F1 Score** | `2 × (Precision × Recall) / (Precision + Recall)` | Harmonic mean của Precision và Recall |

#### 6.2.2. Tầng 2 — Mutation Testing

**Mutation Testing** là kỹ thuật đánh giá chất lượng test suite bằng cách tiêm lỗi (mutant) vào source code, sau đó kiểm tra test có phát hiện được lỗi đó không.

```
Source Code ──→ Mutation Engine ──→ Mutated Code Variants
                                         │
                                         ▼
                              Run Test Suite Against
                              Each Mutant
                                         │
                                    ┌────┴────┐
                                    │         │
                              Test FAILS    Test PASSES
                              (Mutant       (Mutant
                               KILLED ✓)     SURVIVED ✗)
                                    │         │
                                    ▼         ▼
                              Mutation Score = Killed / Total
```

**Các loại mutation operators phổ biến:**

| Operator | Original | Mutated | Mô tả |
|----------|----------|---------|--------|
| AOR (Arithmetic) | `a + b` | `a - b` | Thay đổi phép toán |
| ROR (Relational) | `a > b` | `a >= b` | Thay đổi phép so sánh |
| LCR (Logical) | `a && b` | `a \|\| b` | Thay đổi phép logic |
| SBR (Statement) | `if(x) {...}` | `if(true) {...}` | Thay đổi điều kiện |
| UOI (Unary) | `return x` | `return -x` | Thay đổi unary operator |

**Vì sao mutation score quan trọng hơn coverage?**

```
// Ví dụ: Function cần test
function calculateDiscount(price, isVIP) {
  if (price > 100 && isVIP) {
    return price * 0.8;  // 20% discount
  }
  return price;
}

// Test có coverage 100% nhưng mutation score thấp:
test('should return price', () => {
  const result = calculateDiscount(50, false);
  expect(result).toBeDefined();  // ← Assertion yếu!
});

// Test có mutation score cao:
test('should apply 20% discount for VIP with price > 100', () => {
  expect(calculateDiscount(200, true)).toBe(160);   // ← Cụ thể
  expect(calculateDiscount(200, false)).toBe(200);   // ← Phân biệt
  expect(calculateDiscount(100, true)).toBe(100);    // ← Boundary
  expect(calculateDiscount(101, true)).toBe(80.8);   // ← Boundary
});
```

#### 6.2.3. Tầng 3 — Human + LLM-as-Judge

Sử dụng expert review và/hoặc LLM mạnh hơn (GPT-4) làm "giám khảo" đánh giá.

| Tiêu chí | Thang điểm | Mô tả |
|----------|-----------|-------|
| **Relevance** | 1–5 | Test case có liên quan đến requirement không? |
| **Completeness** | 1–5 | Bộ test case có bao phủ đủ scenario không? |
| **Correctness** | 1–5 | Expected result có đúng không? |
| **Maintainability** | 1–5 | Test code có dễ đọc, dễ bảo trì không? |
| **Readability** | 1–5 | Mô tả scenario có clear không? |

**LLM-as-Judge Prompt:**

```
Bạn là expert reviewer. Hãy đánh giá bộ test case dưới đây theo 5 tiêu chí:
1. Relevance (1-5): Test có liên quan đến requirement?
2. Completeness (1-5): Đã cover đủ scenario chưa?
3. Correctness (1-5): Expected result có đúng logic?
4. Maintainability (1-5): Code test có clean, dễ maintain?
5. Readability (1-5): Mô tả scenario có rõ ràng?

Requirement: [...]
Test Cases: [...]

Output JSON: { "scores": {...}, "missing_scenarios": [...], "issues": [...] }
```

### 6.3. Bảng metric tổng hợp cho so sánh

| Metric Category | Metric | Target | Tool |
|----------------|--------|--------|------|
| **Coverage** | Line Coverage | ≥ 80% | Istanbul/nyc, JaCoCo |
| **Coverage** | Branch Coverage | ≥ 70% | Istanbul/nyc, JaCoCo |
| **Mutation** | Mutation Score | ≥ 60% | Stryker (JS), PIT (Java) |
| **Quality** | Compilation Rate | ≥ 95% | Build tool |
| **Quality** | Test Pass Rate | ≥ 90% | Test runner |
| **Semantic** | Human Relevance | ≥ 4.0/5 | Expert review |
| **Semantic** | LLM-Judge Score | ≥ 4.0/5 | GPT-4 evaluation |
| **Efficiency** | Avg Generation Time | < 30s | Benchmark |
| **Cost** | Avg Cost per Service | < $0.5 | API billing |

---

## 7. Thiết kế Thực nghiệm

### 7.1. Research Questions (RQ)

| RQ | Câu hỏi nghiên cứu |
|----|---------------------|
| **RQ1** | LLM có thể sinh test case từ software requirement với chất lượng tương đương hoặc vượt trội so với manual testing không? |
| **RQ2** | Chiến lược prompt nào (Zero-shot, Few-shot, CoT, Hybrid) cho kết quả tốt nhất về coverage và mutation score? |
| **RQ3** | Việc bổ sung context từ source code (context-aware) cải thiện chất lượng test case bao nhiêu phần trăm? |
| **RQ4** | LLM nào (GPT-4o, Claude, Gemini, DeepSeek) phù hợp nhất cho task sinh test case? |

### 7.2. Dataset thực nghiệm

#### 7.2.1. Xây dựng Dataset

Chuẩn bị **10–15 service classes** từ các dự án thực tế, chia thành 3 mức độ phức tạp:

| Mức độ | Đặc điểm | Ví dụ | Số lượng |
|--------|----------|-------|----------|
| **Simple** | 1-3 methods, ít dependency, logic đơn giản | UserService (CRUD) | 5 |
| **Medium** | 4-7 methods, 2-3 dependencies, business logic | OrderService (validation + calculation) | 5 |
| **Complex** | 8+ methods, nhiều dependency, logic phức tạp | PaymentService (multi-step, external API) | 5 |

#### 7.2.2. Ground Truth

Cho mỗi service, expert tester viết bộ test case "gold standard" bao gồm:
- Danh sách scenario (positive, negative, edge, boundary)
- Test code hoàn chỉnh
- Coverage report
- Mutation score report

### 7.3. Ma trận thực nghiệm

```
                    ┌─────────┬──────────┬─────────┬──────────┐
                    │Zero-shot│ Few-shot │  CoT    │ Hybrid   │
┌───────────────────┼─────────┼──────────┼─────────┼──────────┤
│ GPT-4o            │ E1      │ E2       │ E3      │ E4       │
├───────────────────┼─────────┼──────────┼─────────┼──────────┤
│ Claude Sonnet     │ E5      │ E6       │ E7      │ E8       │
├───────────────────┼─────────┼──────────┼─────────┼──────────┤
│ Gemini Pro        │ E9      │ E10      │ E11     │ E12      │
├───────────────────┼─────────┼──────────┼─────────┼──────────┤
│ DeepSeek Coder    │ E13     │ E14      │ E15     │ E16      │
└───────────────────┴─────────┴──────────┴─────────┴──────────┘

Tổng: 4 models × 4 strategies × 15 services = 240 experiments
Mỗi experiment chạy 3 lần → 720 runs
```

### 7.4. Quy trình thực nghiệm

```
Bước 1: Chuẩn bị Dataset
  │
  ├── Thu thập 15 service classes
  ├── Viết requirement cho mỗi service
  ├── Expert tạo ground truth test cases
  └── Đo baseline coverage & mutation score
  │
Bước 2: Chạy thực nghiệm (cho mỗi cell trong ma trận)
  │
  ├── Build prompt theo strategy
  ├── Call LLM API (3 lần, lấy median)
  ├── Parse output → test files
  ├── Compile check
  ├── Run tests → Coverage report
  ├── Run mutation testing → Mutation score
  └── LLM-as-Judge evaluation
  │
Bước 3: Thu thập & Phân tích kết quả
  │
  ├── So sánh across strategies (cùng model)
  ├── So sánh across models (cùng strategy)
  ├── So sánh with/without context (RQ3)
  ├── Statistical significance (t-test, Wilcoxon)
  └── Correlation analysis (coverage vs mutation)
  │
Bước 4: Tổng hợp & Kết luận
  │
  ├── Best strategy-model combination
  ├── Cost-effectiveness analysis
  ├── Recommendations cho practitioners
  └── Limitations & Future work
```

### 7.5. Ví dụ kết quả mong đợi (Hypothetical)

| Model + Strategy | Coverage | Mutation Score | Compilation | Human Score |
|-----------------|----------|---------------|-------------|-------------|
| GPT-4o + Zero-shot | 62% | 38% | 85% | 3.2/5 |
| GPT-4o + Few-shot | 71% | 45% | 92% | 3.8/5 |
| GPT-4o + CoT | 75% | 52% | 88% | 4.0/5 |
| GPT-4o + Hybrid | **82%** | **58%** | **95%** | **4.3/5** |
| Claude + Hybrid | 80% | 55% | 94% | 4.2/5 |
| Gemini + Hybrid | 78% | 51% | 91% | 4.0/5 |
| DeepSeek + Hybrid | 73% | 48% | 89% | 3.7/5 |
| **Manual (Expert)** | 85% | 65% | 100% | 4.5/5 |

> **Lưu ý:** Bảng trên là **hypothetical** (giả thuyết). Kết quả thực tế sẽ thu được sau khi chạy thực nghiệm.

---

## 8. Ứng dụng thực tiễn — VS Code Extension

### 8.1. Tổng quan Extension

**Tên extension:** `TestGen AI` — Context-Aware Test Case Generator

**Tính năng chính:**
1. 🔍 **Auto-detect:** Tự động nhận diện khi developer viết xong service/controller
2. 📝 **Scenario Suggestion:** Đề xuất bộ kịch bản test case dựa trên context
3. ⚡ **One-click Generation:** Sinh test code runnable chỉ với 1 click
4. 🔄 **Feedback Loop:** Tự chạy test, phát hiện lỗi, tự sửa
5. 📊 **Quality Dashboard:** Hiển thị coverage, mutation score

### 8.2. User Flow

```
Developer viết xong UserService.ts
         │
         ▼
┌────────────────────────────────────────┐
│  💡 TestGen AI: 8 test scenarios       │
│  detected for UserService              │
│                                        │
│  ✅ createUser - Happy path            │
│  ✅ createUser - Duplicate email       │
│  ✅ createUser - Invalid password      │
│  ✅ createUser - Missing required      │
│  ✅ updateUser - Success               │
│  ✅ updateUser - User not found        │
│  ✅ deleteUser - Success               │
│  ✅ deleteUser - Has dependencies      │
│                                        │
│  [Generate All] [Select] [Dismiss]     │
└────────────────────────────────────────┘
         │
         │ Click "Generate All"
         ▼
┌────────────────────────────────────────┐
│  📁 UserService.test.ts (Generated)    │
│                                        │
│  describe('UserService', () => {       │
│    describe('createUser', () => {      │
│      it('should create user...', ...)  │
│      it('should throw on dup...', ...) │
│      ...                               │
│    });                                 │
│  });                                   │
│                                        │
│  Coverage: 78% | Mutation: 52%         │
│  [Run Tests] [Improve] [Accept]        │
└────────────────────────────────────────┘
```

### 8.3. Kiến trúc Extension

```
┌─────────────────────────────────────────────────┐
│                VS Code Extension                 │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │         Extension Host (Node.js)          │   │
│  │                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐ │   │
│  │  │ Commands  │  │ CodeLens │  │ Webview│ │   │
│  │  │ Register  │  │ Provider │  │ Panel  │ │   │
│  │  └────┬─────┘  └────┬─────┘  └───┬────┘ │   │
│  │       │              │             │      │   │
│  │       ▼              ▼             ▼      │   │
│  │  ┌────────────────────────────────────┐   │   │
│  │  │         Core Engine                │   │   │
│  │  │                                    │   │   │
│  │  │  ┌─────────────┐ ┌──────────────┐ │   │   │
│  │  │  │   Context    │ │   Prompt     │ │   │   │
│  │  │  │   Collector  │ │   Builder    │ │   │   │
│  │  │  └──────┬──────┘ └──────┬───────┘ │   │   │
│  │  │         │                │         │   │   │
│  │  │         ▼                ▼         │   │   │
│  │  │  ┌──────────────────────────────┐ │   │   │
│  │  │  │       LLM Client            │ │   │   │
│  │  │  │  (OpenAI / Anthropic /      │ │   │   │
│  │  │  │   vscode.lm / Ollama)       │ │   │   │
│  │  │  └──────────────────────────────┘ │   │   │
│  │  │                                    │   │   │
│  │  │  ┌──────────────────────────────┐ │   │   │
│  │  │  │    Test Runner Integration   │ │   │   │
│  │  │  │  (Jest / JUnit / pytest)     │ │   │   │
│  │  │  └──────────────────────────────┘ │   │   │
│  │  └────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │           Settings / Config               │   │
│  │  • LLM Provider selection                 │   │
│  │  • API Key management (Secret Storage)    │   │
│  │  • Prompt strategy selection              │   │
│  │  • Test framework selection               │   │
│  │  • Language / Coding style                │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 8.4. Tech Stack Extension

| Component | Technology | Lý do |
|-----------|-----------|-------|
| **Extension Framework** | VS Code Extension API | Native integration |
| **Language** | TypeScript | Type-safe, VS Code native |
| **LLM Integration** | `vscode.lm` API + OpenAI SDK | Flexible model switching |
| **AST Parser** | TypeScript Compiler API / Tree-sitter | Code analysis |
| **UI** | WebviewViewProvider | Rich sidebar panel |
| **Storage** | VS Code Secret Storage + Workspace State | Secure key storage |
| **Test Runner** | Jest / Vitest / JUnit CLI | Execute generated tests |
| **Coverage** | Istanbul / JaCoCo | Coverage report |
| **Mutation** | Stryker / PIT | Mutation testing |

### 8.5. Key Features — Chi tiết

#### Feature 1: Context-Aware Detection

```typescript
// Extension tự động phát hiện khi user lưu file service
vscode.workspace.onDidSaveTextDocument(async (document) => {
  if (isServiceFile(document)) {
    const context = await contextCollector.analyze(document);
    const scenarios = await scenarioGenerator.suggest(context);
    showTestSuggestionNotification(scenarios);
  }
});

// Context Collector phân tích:
interface AnalysisResult {
  className: string;
  methods: {
    name: string;
    params: ParameterInfo[];
    returnType: string;
    dependencies: string[];
    complexity: 'simple' | 'medium' | 'complex';
  }[];
  imports: ImportInfo[];
  interfaces: InterfaceDefinition[];
  existingTests: string[];
}
```

#### Feature 2: Multi-Strategy Prompt Generation

```typescript
// Prompt Builder hỗ trợ multiple strategies
class PromptBuilder {
  build(context: AnalysisResult, strategy: PromptStrategy): string {
    switch(strategy) {
      case 'zero-shot':
        return this.buildZeroShot(context);
      case 'few-shot':
        return this.buildFewShot(context, this.getExamples());
      case 'chain-of-thought':
        return this.buildCoT(context);
      case 'hybrid':
        return this.buildHybrid(context, this.getExamples());
    }
  }
}
```

#### Feature 3: Iterative Refinement

```typescript
// Feedback loop: sinh test → chạy → sửa → lặp lại
async function generateWithFeedback(context: AnalysisResult): Promise<TestSuite> {
  let testCode = await llm.generate(promptBuilder.build(context, 'hybrid'));
  
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const result = await testRunner.run(testCode);
    
    if (result.allPassed && result.coverage >= TARGET_COVERAGE) {
      return testCode;  // ✅ Quality threshold met
    }
    
    // Feed errors back to LLM for correction
    const feedbackPrompt = buildFeedbackPrompt(testCode, result.errors, result.coverage);
    testCode = await llm.generate(feedbackPrompt);
  }
  
  return testCode;
}
```

---

## 9. Pipeline hoàn chỉnh: Từ Requirement → Test Case → Test Code

### 9.1. Ví dụ End-to-End

**Input: Requirement (User Story)**

```markdown
## US-001: Đăng ký tài khoản

**Là** người dùng mới,
**Tôi muốn** đăng ký tài khoản,
**Để** sử dụng các dịch vụ của hệ thống.

### Acceptance Criteria:
1. Email phải có format hợp lệ và chưa tồn tại trong hệ thống
2. Password tối thiểu 8 ký tự, phải có ít nhất 1 chữ hoa và 1 số
3. Họ tên từ 2–50 ký tự
4. Sau khi đăng ký thành công, gửi email xác nhận
5. Tài khoản mới ở trạng thái PENDING cho đến khi xác nhận email
```

**Input: Source Code (Service)**

```typescript
// user.service.ts
@Injectable()
export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService,
    private readonly hashService: HashService,
  ) {}

  async register(dto: CreateUserDto): Promise<User> {
    // Check email uniqueness
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashService.hash(dto.password);

    // Create user
    const user = await this.userRepo.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      status: UserStatus.PENDING,
    });

    // Send confirmation email
    await this.emailService.sendConfirmation(user.email, user.id);

    return user;
  }
}
```

**Output Step 1: Test Scenarios (LLM sinh ra)**

```json
{
  "service": "UserService",
  "method": "register",
  "scenarios": [
    {
      "id": "SC-REG-001",
      "name": "Đăng ký thành công với thông tin hợp lệ",
      "type": "positive",
      "technique": "Happy Path",
      "priority": "critical"
    },
    {
      "id": "SC-REG-002",
      "name": "Đăng ký thất bại — email đã tồn tại",
      "type": "negative",
      "technique": "Business Rule",
      "priority": "critical"
    },
    {
      "id": "SC-REG-003",
      "name": "Đăng ký thất bại — email format không hợp lệ",
      "type": "negative",
      "technique": "Equivalence Partitioning",
      "priority": "high"
    },
    {
      "id": "SC-REG-004",
      "name": "Đăng ký thất bại — password quá ngắn (7 ký tự)",
      "type": "boundary",
      "technique": "BVA",
      "priority": "high"
    },
    {
      "id": "SC-REG-005",
      "name": "Đăng ký thành công — password đúng 8 ký tự (boundary)",
      "type": "boundary",
      "technique": "BVA",
      "priority": "high"
    },
    {
      "id": "SC-REG-006",
      "name": "Đăng ký thất bại — password không có chữ hoa",
      "type": "negative",
      "technique": "EP",
      "priority": "medium"
    },
    {
      "id": "SC-REG-007",
      "name": "Đăng ký thất bại — password không có số",
      "type": "negative",
      "technique": "EP",
      "priority": "medium"
    },
    {
      "id": "SC-REG-008",
      "name": "Đăng ký thất bại — họ tên quá ngắn (1 ký tự)",
      "type": "boundary",
      "technique": "BVA",
      "priority": "medium"
    },
    {
      "id": "SC-REG-009",
      "name": "Đăng ký thành công — họ tên 2 ký tự (min boundary)",
      "type": "boundary",
      "technique": "BVA",
      "priority": "medium"
    },
    {
      "id": "SC-REG-010",
      "name": "Đăng ký thất bại — họ tên 51 ký tự (max+1)",
      "type": "boundary",
      "technique": "BVA",
      "priority": "medium"
    },
    {
      "id": "SC-REG-011",
      "name": "Verify password được hash trước khi lưu",
      "type": "security",
      "technique": "Business Rule",
      "priority": "critical"
    },
    {
      "id": "SC-REG-012",
      "name": "Verify email xác nhận được gửi sau đăng ký",
      "type": "integration",
      "technique": "Business Rule",
      "priority": "high"
    },
    {
      "id": "SC-REG-013",
      "name": "Verify user status là PENDING sau đăng ký",
      "type": "state",
      "technique": "State Transition",
      "priority": "high"
    },
    {
      "id": "SC-REG-014",
      "name": "Xử lý lỗi khi email service không khả dụng",
      "type": "error",
      "technique": "Error Guessing",
      "priority": "medium"
    }
  ]
}
```

**Output Step 2: Test Code (LLM sinh ra)**

```typescript
// user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { EmailService } from '../email/email.service';
import { HashService } from '../hash/hash.service';
import { UserStatus } from './user.enum';

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<UserRepository>;
  let emailService: jest.Mocked<EmailService>;
  let hashService: jest.Mocked<HashService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendConfirmation: jest.fn(),
          },
        },
        {
          provide: HashService,
          useValue: {
            hash: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get(UserRepository);
    emailService = module.get(EmailService);
    hashService = module.get(HashService);
  });

  describe('register', () => {
    const validDto = {
      email: 'test@example.com',
      password: 'Valid1234',
      fullName: 'Nguyen Van A',
    };

    // SC-REG-001: Happy path
    it('should register user successfully with valid data', async () => {
      const expectedUser = { id: '1', ...validDto, status: UserStatus.PENDING };
      
      userRepo.findByEmail.mockResolvedValue(null);
      hashService.hash.mockResolvedValue('hashed_password');
      userRepo.create.mockResolvedValue(expectedUser);
      emailService.sendConfirmation.mockResolvedValue(undefined);

      const result = await service.register(validDto);

      expect(result).toEqual(expectedUser);
      expect(userRepo.findByEmail).toHaveBeenCalledWith(validDto.email);
      expect(hashService.hash).toHaveBeenCalledWith(validDto.password);
      expect(userRepo.create).toHaveBeenCalledWith({
        email: validDto.email,
        password: 'hashed_password',
        fullName: validDto.fullName,
        status: UserStatus.PENDING,
      });
    });

    // SC-REG-002: Duplicate email
    it('should throw ConflictException when email already exists', async () => {
      userRepo.findByEmail.mockResolvedValue({ id: '1', email: validDto.email });

      await expect(service.register(validDto))
        .rejects.toThrow(ConflictException);
      
      expect(userRepo.create).not.toHaveBeenCalled();
    });

    // SC-REG-011: Password hashing verification
    it('should hash password before saving to database', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      hashService.hash.mockResolvedValue('securely_hashed');
      userRepo.create.mockResolvedValue({ id: '1' });
      emailService.sendConfirmation.mockResolvedValue(undefined);

      await service.register(validDto);

      expect(hashService.hash).toHaveBeenCalledWith(validDto.password);
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'securely_hashed' })
      );
    });

    // SC-REG-012: Email confirmation sent
    it('should send confirmation email after successful registration', async () => {
      const createdUser = { id: 'user-123', email: validDto.email };
      
      userRepo.findByEmail.mockResolvedValue(null);
      hashService.hash.mockResolvedValue('hashed');
      userRepo.create.mockResolvedValue(createdUser);
      emailService.sendConfirmation.mockResolvedValue(undefined);

      await service.register(validDto);

      expect(emailService.sendConfirmation)
        .toHaveBeenCalledWith(validDto.email, 'user-123');
    });

    // SC-REG-013: User status is PENDING
    it('should create user with PENDING status', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      hashService.hash.mockResolvedValue('hashed');
      userRepo.create.mockResolvedValue({ id: '1', status: UserStatus.PENDING });
      emailService.sendConfirmation.mockResolvedValue(undefined);

      await service.register(validDto);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.PENDING })
      );
    });

    // SC-REG-014: Email service failure
    it('should propagate error when email service fails', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      hashService.hash.mockResolvedValue('hashed');
      userRepo.create.mockResolvedValue({ id: '1', email: validDto.email });
      emailService.sendConfirmation.mockRejectedValue(
        new Error('SMTP connection failed')
      );

      await expect(service.register(validDto))
        .rejects.toThrow('SMTP connection failed');
    });
  });
});
```

---

## 10. Kế hoạch triển khai

### 10.1. Timeline (12 tuần)

```
Tuần 1-2  │████████│ Literature Review & Dataset Preparation
Tuần 3-4  │████████│ System Architecture & Core Engine
Tuần 5-6  │████████│ Prompt Strategy Implementation
Tuần 7-8  │████████│ Experiment Execution (240 experiments)
Tuần 9-10 │████████│ Analysis, Evaluation & VS Code Extension
Tuần 11   │████████│ Paper Writing & Documentation
Tuần 12   │████████│ Review, Defense Preparation
```

### 10.2. Deliverables

| # | Output | Mô tả |
|---|--------|--------|
| 1 | **Research Paper / Thesis** | Báo cáo NCKH đầy đủ với kết quả thực nghiệm |
| 2 | **Experiment Dataset** | 15 service classes + ground truth test cases |
| 3 | **Core Library** | `@testgen/core` — Engine sinh test case (TypeScript) |
| 4 | **VS Code Extension** | `TestGen AI` — Extension ứng dụng thực tiễn |
| 5 | **Evaluation Framework** | Scripts đánh giá coverage, mutation, LLM-as-Judge |
| 6 | **Result Dashboard** | Web dashboard trực quan hóa kết quả thực nghiệm |

### 10.3. Cấu trúc Repository

```
context-aware-unit-test-generation/
├── README.md                          # File này
├── docs/                              # Documentation
│   ├── thesis/                        # Báo cáo NCKH
│   ├── architecture/                  # Kiến trúc hệ thống
│   └── experiment-results/            # Kết quả thực nghiệm
├── packages/
│   ├── core/                          # Core engine
│   │   ├── src/
│   │   │   ├── parsers/               # Requirement & Code parsers
│   │   │   ├── context/               # Context collector
│   │   │   ├── prompts/               # Prompt strategies
│   │   │   │   ├── zero-shot.ts
│   │   │   │   ├── few-shot.ts
│   │   │   │   ├── chain-of-thought.ts
│   │   │   │   └── hybrid.ts
│   │   │   ├── generators/            # Test case generators
│   │   │   ├── evaluators/            # Quality evaluators
│   │   │   └── llm/                   # LLM gateway
│   │   └── package.json
│   ├── vscode-extension/              # VS Code Extension
│   │   ├── src/
│   │   │   ├── extension.ts           # Entry point
│   │   │   ├── commands/              # VS Code commands
│   │   │   ├── providers/             # CodeLens, Webview providers
│   │   │   ├── views/                 # Sidebar panels
│   │   │   └── config/                # Extension settings
│   │   └── package.json
│   └── evaluation/                    # Evaluation framework
│       ├── scripts/                   # Evaluation scripts
│       ├── metrics/                   # Metric calculators
│       └── dashboard/                 # Result visualization
├── experiments/
│   ├── dataset/                       # 15 service classes
│   │   ├── simple/
│   │   ├── medium/
│   │   └── complex/
│   ├── ground-truth/                  # Expert-written test cases
│   ├── results/                       # Raw experiment results
│   └── analysis/                      # Statistical analysis
└── examples/                          # Demo & examples
    ├── sample-services/
    └── generated-tests/
```

---

## 11. Tài liệu tham khảo

### 11.1. Nghiên cứu học thuật

1. **Jain, K., & Le Goues, C.** (2025). "TestForge: Feedback-Driven, Agentic Test Suite Generation." *arXiv preprint arXiv:2503.xxxxx*.

2. **Generating High-Level Test Cases from Requirements using LLM: An Industry Study.** (2025). *arXiv*. — Nghiên cứu về sinh test case cấp cao từ requirement sử dụng prompt-based methods.

3. **System Test Case Design from Requirements Specifications: Insights and Challenges of Using ChatGPT.** (2024). *SBC (Sociedade Brasileira de Computação)*. — Phân tích thực tế về sử dụng ChatGPT cho thiết kế test case từ SRS.

4. **LLM Driven Unit Test Case Generation Using Agentic AI.** (2025). *IRO Journals*. — Framework multi-agent cho sinh unit test với self-correction.

5. **Vaswani, A., et al.** (2017). "Attention is All You Need." *NeurIPS*. — Kiến trúc Transformer nền tảng cho LLM.

6. **Lewis, P., et al.** (2020). "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." *NeurIPS*. — RAG framework gốc.

7. **Wei, J., et al.** (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." *NeurIPS*. — Chain-of-Thought prompting.

8. **Brown, T., et al.** (2020). "Language Models are Few-Shot Learners." *NeurIPS*. — GPT-3 và few-shot learning.

### 11.2. Công nghệ & Frameworks

| Công nghệ | Mô tả | Link |
|-----------|--------|------|
| **VS Code Extension API** | Nền tảng phát triển extension | [docs](https://code.visualstudio.com/api) |
| **OpenAI API** | GPT-4o API | [docs](https://platform.openai.com) |
| **Anthropic API** | Claude API | [docs](https://docs.anthropic.com) |
| **Stryker Mutator** | Mutation testing (JS/TS) | [stryker-mutator.io](https://stryker-mutator.io) |
| **PIT (PiTest)** | Mutation testing (Java) | [pitest.org](https://pitest.org) |
| **Istanbul/nyc** | Code coverage (JS) | [istanbul.js.org](https://istanbul.js.org) |
| **LangChain** | LLM orchestration framework | [langchain.com](https://langchain.com) |
| **Tree-sitter** | Incremental parsing | [tree-sitter.github.io](https://tree-sitter.github.io) |

### 11.3. Datasets & Benchmarks

| Dataset | Mô tả |
|---------|--------|
| **TestGenEval** | Benchmark cho đánh giá LLM test generation |
| **SWE-bench** | Real-world GitHub issues resolution |
| **ALMITA** | Dataset chuyên biệt cho LLM test generation |
| **Defects4J** | Java bug dataset cho mutation testing |
| **HumanEval** | Code generation benchmark (OpenAI) |

---

## Ghi chú

> **Đề tài này** kết hợp hai hướng nghiên cứu:
> 1. **Hướng NCKH thuần túy:** So sánh chiến lược prompt, đánh giá chất lượng test case bằng multi-tier metrics (coverage, mutation score, human evaluation)
> 2. **Hướng ứng dụng thực tiễn:** VS Code Extension context-aware giúp developer sinh test case ngay trong IDE
>
> Cả hai hướng bổ trợ lẫn nhau — nghiên cứu cung cấp evidence-based cho việc chọn chiến lược prompt tối ưu trong extension.

---

*Được tạo bởi hệ thống nghiên cứu tự động sử dụng AI-Research-SKILLs*
*Ngày tạo: 2026-09-19*