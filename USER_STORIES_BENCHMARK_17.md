# 17 USER STORY CHỨC NĂNG CỦA DỰ ÁN

Danh sách này lọc 17 User Story từ file tổng hợp, tập trung vào công cụ Context-Aware Unit Test Generator và các tài liệu BA liên quan để giảng viên đối chiếu yêu cầu với test của chính dự án.

Mỗi US được viết theo góc nhìn người dùng, có tiêu chí về luồng chính và trường hợp lỗi. Mã US, người phụ trách và commit tham chiếu được giữ nguyên để truy vết; liên kết Test liên quan dẫn đến kiểm thử module hiện có.

| Thành viên | Phạm vi công việc | Số US |
| --- | --- | ---: |
| A — HoangBD | Prompt, đánh giá, báo cáo thực nghiệm, hỗ trợ đa ngôn ngữ, xử lý phản hồi LLM | 5 |
| B — Lam | AST, tài liệu BA, pipeline, coverage, mutation testing | 5 |
| C — Dung | Extension, requirement, preview, auto-fix, metrics, realtime, hướng dẫn sử dụng | 7 |

Acceptance Criteria mô tả kết quả có thể kiểm tra. Validation nêu cách xử lý khi đầu vào, mã test hoặc quá trình chạy gặp lỗi. Các test được liên kết là điểm bắt đầu để đối chiếu và bổ sung test case.

## 1. Thành viên A — HoangBD

### 2.1.1 A-03 — Tích hợp bốn chiến lược prompt vào thực nghiệm sinh test

- **Người phụ trách:** HoangBD
- **Commit tham chiếu:** `dc95c32`
- **Mã nguồn liên quan:** [`PromptStrategyFactory`](packages/core/src/prompts/index.ts), [`batch_runner.ts`](experiments/batch_runner.ts)
- **Test liên quan:** [`pipeline.test.ts`](packages/core/src/pipeline.test.ts)

**2.1.1.1 User Story**

Là người nghiên cứu chất lượng sinh unit test, tôi muốn hệ thống tích hợp bốn chiến lược prompt và chạy chúng trên cùng bộ dữ liệu benchmark để so sánh ảnh hưởng của từng chiến lược đến kết quả do các mô hình tạo ra.

**2.1.1.2 Tiêu chí chấp nhận**

1. Hệ thống triển khai đủ bốn chiến lược: Zero-shot, Few-shot, Chain-of-Thought (CoT) và Hybrid.
2. Mỗi chiến lược tạo prompt theo cách riêng và khai báo định dạng đầu ra phù hợp: các chiến lược Zero-shot, Few-shot, CoT yêu cầu code block; Hybrid yêu cầu JSON gồm test scenario, reasoning steps và test code.
3. Batch runner kết hợp các model, danh sách chiến lược được cấu hình và service trong bộ dữ liệu để chạy từng tổ hợp thực nghiệm.
4. Kết quả của mỗi tổ hợp được lưu riêng theo service, model và chiến lược, kèm metadata; runner tổng hợp trạng thái, thời gian và token vào file CSV.
5. Khi bật checkpoint mặc định, runner bỏ qua lượt đã có đủ file kết quả và metadata hợp lệ để có thể tiếp tục thực nghiệm.

**2.1.1.3 Mô tả**

Commit `dc95c32` bổ sung bốn prompt template, factory để tạo đúng strategy nội bộ và batch runner để chạy ma trận thực nghiệm trên benchmark dataset. Đây là các phương pháp được đem ra so sánh; riêng Hybrid kết hợp yêu cầu nghiệp vụ, mã nguồn và lập luận có cấu trúc trong một prompt.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Lỗi | Một model hoặc một lượt gọi chiến lược gặp lỗi khi chạy batch. | Ghi trạng thái ERROR cùng thông tin lỗi cho lượt đó, tiếp tục các tổ hợp còn lại và đưa kết quả vào file tổng hợp. |
| Lỗi | Tên strategy không được factory hỗ trợ. | Báo Unknown prompt strategy; không tạo đầu ra như thể lượt chạy thành công. |

**Test đối chiếu:** Pipeline test kiểm tra việc dùng strategy để xây prompt và xử lý kết quả. Repository hiện chưa có test riêng bao phủ toàn bộ ma trận batch; có thể đối chiếu thêm phần triển khai trong `batch_runner.ts`.

### 2.1.2 A-08 — Đánh giá khả năng chạy của test được sinh

- **Người phụ trách:** HoangBD
- **Commit tham chiếu:** `eec7e44`, `1c1e61f`
- **Test liên quan:** [`evaluator.test.ts`](packages/core/src/evaluator.test.ts)

**2.1.2.1 User Story**

Là người phát triển, tôi muốn chạy test do LLM sinh trong môi trường đánh giá để biết test có biên dịch, chạy thành công và kiểm tra được mã nguồn hay không.

**2.1.2.2 Tiêu chí chấp nhận**

1. Evaluator nhận thông tin test cần kiểm tra, mã nguồn dịch vụ, model và chiến lược đã dùng.
2. Evaluator loại bỏ code fence, đọc trường testCode trong JSON và chuẩn hóa import cục bộ trước khi chạy.
3. Nếu test hợp lệ, hệ thống trả số lượng test đạt và lỗi, tỷ lệ pass, coverage cùng trạng thái thực thi.
4. Nếu test có lỗi cú pháp nghiêm trọng, hệ thống ghi nhận compilable = false, không chạy test và lưu thông tin lỗi biên dịch.

**2.1.2.3 Mô tả**

Evaluator thực hiện đánh giá theo từng test được sinh để nhóm có thể so sánh kết quả giữa các model và chiến lược prompt. Kết quả bao gồm khả năng biên dịch, kết quả Jest và số liệu coverage khi có.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Lỗi | Test lỗi cú pháp, không chạy được hoặc có assertion thất bại. | Ghi đúng trạng thái, số test đạt/lỗi và thông tin lỗi; không ghi test lỗi là thành công. |

**Test đối chiếu:** Test evaluator có trường hợp test hợp lệ và không hợp lệ để đối chiếu trạng thái biên dịch và thực thi.

### 2.1.3 A-09 — Tổng hợp và xuất báo cáo so sánh thực nghiệm

- **Người phụ trách:** HoangBD
- **Commit tham chiếu:** `66ff083`
- **Mã nguồn liên quan:** [`generate_report.ts`](experiments/generate_report.ts)
- **Test liên quan:** [`report_generator.test.ts`](packages/core/src/report_generator.test.ts)

**2.1.3.1 User Story**

Là người nghiên cứu, tôi muốn hệ thống tổng hợp kết quả đánh giá test thành báo cáo theo model, chiến lược prompt và độ phức tạp để có thể so sánh các cấu hình thực nghiệm.

**2.1.3.2 Tiêu chí chấp nhận**

1. Report generator đọc số liệu đánh giá và thông tin lượt chạy để tổng hợp kết quả; token và thời gian chạy được lấy từ batch summary hoặc metadata nếu có.
2. Báo cáo thống kê kết quả tổng thể, theo bốn chiến lược prompt, theo độ phức tạp service và theo model.
3. File Markdown có bảng so sánh các chỉ số như tỷ lệ biên dịch, pass rate, line/branch coverage, token và thời gian; đồng thời có biểu đồ Mermaid.
4. Hệ thống xuất `report_summary.md` và `benchmark_matrix.csv` để đọc báo cáo và đối chiếu dữ liệu dạng bảng.

**2.1.3.3 Mô tả**

BenchmarkReportGenerator đọc `evaluation_summary.json` cùng `batch_summary.csv` hoặc metadata, tạo thống kê phục vụ phân tích và lưu báo cáo Markdown, CSV vào thư mục kết quả.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Cảnh báo | File tổng kết đánh giá không tồn tại, JSON không đọc được hoặc thiếu một số chỉ số. | Báo cảnh báo khi JSON lỗi; tiếp tục tạo báo cáo từ dữ liệu còn đọc được. Chỉ số thiếu hiện được gán 0 nên cần kiểm tra dữ liệu nguồn trước khi kết luận. |

**Test đối chiếu:** Test kiểm tra báo cáo đủ bốn chiến lược, tạo file Markdown và CSV, đồng thời xác nhận nội dung ma trận được xuất.

### 2.1.4 A-11 — Nhận diện ngôn ngữ và chuẩn bị tệp test phù hợp

- **Người phụ trách:** HoangBD
- **Commit tham chiếu:** `1eb6a40`, `de98f53`, `d1b8770`, `02b4a39`
- **Test liên quan:** [`polyglot.test.ts`](packages/core/src/extractor/polyglot.test.ts), [`realtime.test.ts`](packages/extension/src/realtime.test.ts)

**2.1.4.1 User Story**

Là lập trình viên, tôi muốn công cụ nhận diện ngôn ngữ của tệp mã nguồn để hệ thống phân tích mã và chuẩn bị test theo đúng quy ước của ngôn ngữ đó.

**2.1.4.2 Tiêu chí chấp nhận**

1. Với tệp có phần mở rộng được hỗ trợ, hệ thống nhận diện TypeScript/JavaScript, Python, Java, C# hoặc Go.
2. Hệ thống chọn framework và tên tệp test tương ứng, ví dụ Jest, pytest, JUnit 5, xUnit hoặc testing của Go.
3. Parser trích xuất class, method hoặc function từ mã nguồn được hỗ trợ để đưa vào ngữ cảnh tạo test.
4. CodeLens và thao tác sinh test sử dụng nhận diện ngôn ngữ để áp dụng cho tài liệu tương ứng.

**2.1.4.3 Mô tả**

Chức năng mở rộng xử lý từ TypeScript/JavaScript sang các ngôn ngữ phổ biến, xác định framework mặc định và vị trí lưu tệp test theo từng quy ước.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Cảnh báo | Tệp có phần mở rộng không nằm trong danh sách cấu hình. | Detector hiện dùng TypeScript làm ngôn ngữ mặc định; cần kiểm tra lại ngôn ngữ trước khi chạy để tránh áp dụng sai framework. |

**Test đối chiếu:** Bộ test đa ngôn ngữ kiểm tra nhận diện, đường dẫn tệp, parser và khả năng tùy chỉnh prompt theo ngôn ngữ.

### 2.1.5 A-12 — Trích xuất mã test từ phản hồi của LLM

- **Người phụ trách:** HoangBD
- **Commit tham chiếu:** `081e8b4`, `4396e58`, `5a48b9a`, `02b4a39`
- **Test liên quan:** [`pipeline.test.ts`](packages/core/src/pipeline.test.ts), [`evaluator.test.ts`](packages/core/src/evaluator.test.ts)

**2.1.5.1 User Story**

Là người dùng công cụ, tôi muốn hệ thống lấy đúng phần mã kiểm thử trong phản hồi của LLM để có thể xem, lưu và chạy test.

**2.1.5.2 Tiêu chí chấp nhận**

1. Hệ thống lấy mã trong code fence Markdown có khai báo ngôn ngữ, chẳng hạn typescript, python, java, csharp hoặc go.
2. Khi phản hồi ở dạng JSON, hệ thống đọc trường testCode cùng danh sách testScenarios nếu có.
3. Khi LLM trả mã trực tiếp mà không có code fence, hệ thống nhận diện và trích xuất đoạn mã kiểm thử.
4. Nếu có cả testScenarios trong JSON và mô tả test trong mã, kết quả giữ lại kịch bản đã cung cấp; nếu thiếu mới trích mô tả từ test code.

**2.1.5.3 Mô tả**

Chuẩn hóa các kiểu phản hồi khác nhau của LLM thành test code và danh sách kịch bản có thể sử dụng ở các bước tiếp theo.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Lỗi | Phản hồi trống hoặc không chứa test code có thể kiểm tra cú pháp. | Đánh dấu đầu ra không hợp lệ và kèm lỗi kiểm tra cú pháp thay vì báo sinh test thành công. |

**Test đối chiếu:** Pipeline và evaluator kiểm tra việc lấy mã từ code fence, JSON và phản hồi dạng văn bản.

## 2. Thành viên B — Lam

### 2.2.1 B-02 — Phân tích cấu trúc mã nguồn TypeScript bằng AST

- **Người phụ trách:** Lam
- **Commit tham chiếu:** `478aa5a`
- **Test liên quan:** [`extractor.test.ts`](packages/core/src/extractor.test.ts)

**2.2.1.1 User Story**

Là công cụ sinh unit test, tôi muốn đọc cấu trúc class và method trong mã nguồn để LLM hiểu đối tượng cần kiểm thử.

**2.2.1.2 Tiêu chí chấp nhận**

1. Parser trích xuất tên class, trạng thái export, class kế thừa hoặc interface được triển khai khi có.
2. Parser nhận diện method, phạm vi truy cập, static/async, tham số, kiểu trả về và comment tài liệu.
3. Parser thu thập imports cùng các định nghĩa interface, type và enum liên quan.
4. Ngữ cảnh mục tiêu phân biệt method có thể kiểm thử với thuộc tính và helper private.

**2.2.1.3 Mô tả**

AST parser dùng TypeScript Compiler API để cung cấp ngữ cảnh cấu trúc thay vì chỉ gửi toàn bộ mã nguồn dưới dạng văn bản.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Lỗi | Tệp mã nguồn không tồn tại hoặc không đọc được. | Trả thông tin lỗi đọc tệp; không tạo metadata của một tệp khác. |

**Test đối chiếu:** Test extractor đối chiếu class, method, tham số, kiểu, import, enum và comment với service mẫu.

### 2.2.2 B-03 — Đọc tài liệu BA và ghép yêu cầu với mã nguồn

- **Người phụ trách:** Lam
- **Commit tham chiếu:** `478aa5a`
- **Test liên quan:** [`extractor.test.ts`](packages/core/src/extractor.test.ts)

**2.2.2.1 User Story**

Là người kiểm thử, tôi muốn hệ thống đọc tài liệu BA cùng mã nguồn để test phản ánh cả hành vi trong code và quy tắc nghiệp vụ.

**2.2.2.2 Tiêu chí chấp nhận**

1. Parser đọc yêu cầu ở dạng Markdown hoặc văn bản; nếu nội dung là JSON hợp lệ, parser lấy thông tin từ các trường tương ứng.
2. Với Markdown, hệ thống tách tiêu đề, User Story, Business Rules, Acceptance Criteria và Constraints khi các mục có mặt.
3. Hệ thống nhận diện Scenario, Scenario Outline, Given, When, Then, And và bảng Examples trong Gherkin.
4. Context Extractor kết hợp requirement với AST, service code, test pattern hiện có và class mục tiêu khi được cung cấp.

**2.2.2.3 Mô tả**

Requirement parser chuyển tài liệu nghiệp vụ thành cấu trúc có thể xử lý; Context Extractor kết hợp cấu trúc đó với mã nguồn thành dữ liệu đầu vào cho prompt.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Cảnh báo | Không có tài liệu BA tương ứng với service. | Tiếp tục với code context và không tự thêm business rule không có trong tài liệu. |

**Test đối chiếu:** Test extractor kiểm tra Markdown, JSON, kịch bản Gherkin và phần ghép code context với BA requirement.

### 2.2.3 B-04 — Sinh và hậu xử lý unit test qua pipeline

- **Người phụ trách:** Lam
- **Commit tham chiếu:** `4125cf6`
- **Test liên quan:** [`pipeline.test.ts`](packages/core/src/pipeline.test.ts)

**2.2.3.1 User Story**

Là lập trình viên, tôi muốn cung cấp mã nguồn và yêu cầu cho một pipeline để nhận được unit test đã được tách kịch bản và kiểm tra cú pháp.

**2.2.3.2 Tiêu chí chấp nhận**

1. Pipeline nhận đường dẫn hoặc nội dung service, tài liệu BA tùy chọn, chiến lược prompt và các tùy chọn đầu ra.
2. Pipeline trích xuất ngữ cảnh, dựng prompt, gọi LLM và chuyển phản hồi thành test code.
3. Đầu ra gồm mã test, danh sách test scenario, reasoning steps nếu được trả về và kết quả kiểm tra cú pháp.
4. Nếu có đường dẫn đầu ra, hệ thống tạo thư mục cần thiết và ghi mã test vào tệp được chỉ định.

**2.2.3.3 Mô tả**

CoreGeneratorPipeline điều phối từ đầu vào service/BA đến kết quả test đã hậu xử lý; các thành phần LLM và extractor có thể được thay bằng mock để kiểm tra luồng.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Lỗi | LLM trả lỗi, không trả mã hoặc mã test có lỗi cú pháp. | Trả lỗi từ LLM hoặc đánh dấu syntaxValidation không hợp lệ kèm thông tin kiểm tra. |

**Test đối chiếu:** Test pipeline kiểm tra tích hợp Context Extractor, Hybrid Prompt, Mock LLM, Post-processor và lưu tệp đầu ra.

### 2.2.4 B-05 — Chạy test và đo code coverage

- **Người phụ trách:** Lam
- **Commit tham chiếu:** `4125cf6`
- **Test liên quan:** [`pipeline.test.ts`](packages/core/src/pipeline.test.ts)

**2.2.4.1 User Story**

Là lập trình viên, tôi muốn chạy test được sinh và nhận kết quả coverage để biết test đã thực thi ra sao và bao phủ code đến mức nào.

**2.2.4.2 Tiêu chí chấp nhận**

1. Pipeline chỉ gọi Jest khi bật runCoverage, có đường dẫn tệp test và test đã qua kiểm tra cú pháp.
2. CoverageRunner báo lỗi rõ ràng nếu tệp test không tồn tại hoặc Jest không thể chạy.
3. Khi test chạy được, kết quả có tổng số test, số test đạt/lỗi, pass rate và trạng thái suite.
4. Coverage có thể chứa line, branch, function và statement percentages; nếu Jest không trả coverage, kết quả ghi nhận việc thiếu chỉ số.

**2.2.4.3 Mô tả**

CoverageRunner thực thi Jest trên test file và trả bản tóm tắt cho CoreGeneratorPipeline. Việc đo coverage là một bước tùy chọn sau khi đã có test hợp lệ.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Lỗi | Thiếu tệp test, Jest lỗi hoặc assertion thất bại. | Đặt executed/suitePassed và errorMessage đúng theo kết quả; không báo coverage thành công khi không thực thi được. |

**Test đối chiếu:** Pipeline test chạy một ground-truth test mẫu và kiểm tra trạng thái thực thi, pass rate và coverage.

### 2.2.5 B-06 — Đánh giá chất lượng test bằng mutation testing

- **Người phụ trách:** Lam
- **Commit tham chiếu:** `1b9e917`
- **Test liên quan:** [`mutation.test.ts`](packages/core/src/mutation.test.ts)

**2.2.5.1 User Story**

Là người đánh giá chất lượng, tôi muốn kiểm tra test trên phiên bản mã có cài lỗi để biết bộ test có phát hiện được thay đổi logic hay không.

**2.2.5.2 Tiêu chí chấp nhận**

1. Mutator tạo biến thể cho điều kiện biên, toán tử so sánh, phép tính, giá trị boolean, số và giá trị trả về.
2. Mutation runner chạy bộ test trên từng mutant trong thư mục thực thi riêng.
3. Mỗi mutant được phân loại KILLED, SURVIVED, TIMEOUT hoặc COMPILE_ERROR; kết quả có thể kèm test phát hiện lỗi.
4. Mutation score được tính từ mutant bị killed và timeout trên tổng mutant hợp lệ; mutant lỗi biên dịch không nằm trong mẫu số.
5. Analyzer so sánh điểm giữa các chiến lược và sinh báo cáo để nhận biết mutant logic nào chỉ bị một chiến lược phát hiện.

**2.2.5.3 Mô tả**

Mutation testing đo sức phát hiện lỗi của test bằng cách thay đổi có kiểm soát các biểu thức trong source code rồi so sánh kết quả chạy test.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Lỗi | Mutant không biên dịch hoặc test chạy quá thời gian. | Ghi riêng COMPILE_ERROR hoặc TIMEOUT và tính mutation score theo đúng số mutant hợp lệ. |

**Test đối chiếu:** Test mutation kiểm tra việc sinh các loại mutant và so sánh mutation score giữa Zero-shot và Hybrid.

## 3. Thành viên C — Dung

### 2.3.1 C-01 — Truy cập lệnh sinh test trong VS Code

- **Người phụ trách:** Dung
- **Commit tham chiếu:** `c1f6ac8`
- **Test liên quan:** [`extension.test.ts`](packages/extension/src/extension.test.ts)

**2.3.1.1 User Story**

Là lập trình viên, tôi muốn dùng lệnh của extension ngay trong VS Code để bắt đầu sinh test từ tệp mã nguồn đang làm việc.

**2.3.1.2 Tiêu chí chấp nhận**

1. Extension đăng ký lệnh sinh test, mở cài đặt cấu hình và mở Sidebar.
2. Lệnh sinh test xuất hiện trong Editor và Explorer khi ngữ cảnh chọn tệp phù hợp.
3. Activity Bar có mục mở Sidebar; giao diện có thể hiển thị trạng thái cấu hình và thao tác sinh test.
4. Extension khai báo metadata, cấu hình provider/strategy và giao diện Webview preview trong package manifest.

**2.3.1.3 Mô tả**

Extension tích hợp khả năng sinh test vào các điểm thao tác quen thuộc trong VS Code: Command Palette, menu chuột phải, Activity Bar và Sidebar.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Cảnh báo | Editor hoặc Explorer chưa có tệp mã nguồn phù hợp được chọn. | Yêu cầu chọn hoặc mở tệp hỗ trợ trước khi gọi lệnh sinh test. |

**Test đối chiếu:** Extension test kiểm tra lệnh, context menu, Sidebar, settings và khung Webview.

### 2.3.2 C-02 — Tự tìm requirement và kết nối Core Engine

- **Người phụ trách:** Dung
- **Commit tham chiếu:** `5906f26`, `98b3edd`
- **Test liên quan:** [`step2.test.ts`](packages/extension/src/step2.test.ts)

**2.3.2.1 User Story**

Là lập trình viên, tôi muốn extension tự tìm tài liệu BA bên cạnh mã nguồn để không phải nhập lại đường dẫn cho mỗi lần sinh test.

**2.3.2.2 Tiêu chí chấp nhận**

1. Extension tìm tên file phổ biến như requirement.md, requirements.md, spec.md, srs.md, ba_doc.md, acceptance_criteria.md và requirement.json trong thư mục service.
2. Nếu chưa tìm thấy, extension kiểm tra thư mục docs, requirements hoặc specs của thư mục cha.
3. Khi tìm được tài liệu, extension gửi đường dẫn service, requirement và cấu hình sinh tới CoreGeneratorPipeline.
4. Nếu không tìm được requirement, extension vẫn có thể sinh test từ code context.

**2.3.2.3 Mô tả**

RequirementFinder tự dò tài liệu theo quy ước tên file; ConfigurationManager lấy provider, chiến lược prompt và coverage setting để khởi chạy pipeline.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Cảnh báo | Không tìm thấy file requirement tại thư mục service hoặc các thư mục tài liệu được hỗ trợ. | Tiếp tục ở chế độ baseline chỉ dùng mã nguồn; không dừng yêu cầu sinh test. |

**Test đối chiếu:** Step2 test có trường hợp tìm thấy requirement, không tìm thấy requirement, đọc cấu hình và khởi tạo LLM gateway.

### 2.3.3 C-03 — Xem trước và lưu unit test được sinh

- **Người phụ trách:** Dung
- **Commit tham chiếu:** `c1f6ac8`, `5906f26`
- **Test liên quan:** [`step2.test.ts`](packages/extension/src/step2.test.ts), [`extension.test.ts`](packages/extension/src/extension.test.ts)

**2.3.3.1 User Story**

Là lập trình viên, tôi muốn xem kịch bản, mã test và chỉ số liên quan để kiểm tra nội dung hệ thống sinh trong VS Code.

**2.3.3.2 Tiêu chí chấp nhận**

1. Preview hiển thị tên service, chiến lược prompt, danh sách scenario và phần mã test.
2. Preview cho biết trạng thái cú pháp; line và branch coverage được hiển thị khi pipeline trả về số liệu.
3. Nút chấp nhận gửi sự kiện ACCEPT_TEST và báo hoàn tất; nút hủy gửi REJECT_TEST và đóng panel.
4. Mã test được ghi ra đường dẫn tệp tương ứng với service theo quy ước tên của ngôn ngữ.

**2.3.3.3 Mô tả**

Webview nhận kết quả từ extension host, trình bày scenario và mã test, đồng thời cung cấp thao tác chấp nhận hoặc đóng bản xem trước. Pipeline ghi đầu ra khi được cấu hình đường dẫn test.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Lỗi | Pipeline không tạo được tệp đầu ra hoặc không trả mã test. | Hiển thị thông tin lỗi/trạng thái cú pháp để người dùng kiểm tra thay vì xác nhận test hợp lệ. |

**Test đối chiếu:** Step2 test kiểm tra lưu đúng nội dung test; extension test kiểm tra sự hiện diện của nguồn Webview và giao thức extension.

### 2.3.4 C-04 — Tự sửa lỗi cú pháp trong test được sinh

- **Người phụ trách:** Dung
- **Commit tham chiếu:** `0788d54`
- **Test liên quan:** [`step3.test.ts`](packages/extension/src/step3.test.ts)

**2.3.4.1 User Story**

Là lập trình viên, tôi muốn extension gửi lại test lỗi cùng thông báo lỗi cho LLM để thử sửa tự động trước khi tôi phải chỉnh code bằng tay.

**2.3.4.2 Tiêu chí chấp nhận**

1. Extension kích hoạt auto-fix khi kết quả test không vượt qua syntax validation.
2. Yêu cầu sửa gồm source code, tài liệu BA nếu có, test lỗi và thông tin lỗi biên dịch.
3. AutoFixEngine thử sửa tối đa hai lần theo mặc định và kiểm tra cú pháp lại sau mỗi lần phản hồi.
4. Kết quả có test code cuối, trạng thái fixed, số lần thử và lịch sử tóm tắt lỗi.

**2.3.4.3 Mô tả**

Vòng lặp self-reflection dùng thông tin lỗi thực tế để yêu cầu LLM sửa mã test. Khi cung cấp đường dẫn test, engine có thể chạy lại test để xác nhận kết quả.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Cảnh báo | Mã test vẫn lỗi sau số lần sửa tối đa hoặc LLM không trả được mã dùng được. | Giữ kết quả và lịch sử lần thử cuối, báo trạng thái chưa sửa thành công để người dùng kiểm tra. |

**Test đối chiếu:** Step3 test gửi mã lỗi cho Mock LLM rồi xác nhận mã mới qua syntax validation và lưu lịch sử một lần sửa.

### 2.3.5 C-05 — Ghi nhận chỉ số mỗi lần sinh test và hỗ trợ phím tắt

- **Người phụ trách:** Dung
- **Commit tham chiếu:** `0788d54`
- **Test liên quan:** [`step3.test.ts`](packages/extension/src/step3.test.ts)

**2.3.5.1 User Story**

Là nhóm phát triển công cụ, tôi muốn ghi nhận thời gian và kết quả sinh test để theo dõi hiệu suất, đồng thời muốn có phím tắt để gọi chức năng nhanh.

**2.3.5.2 Tiêu chí chấp nhận**

1. Mỗi lượt sinh ghi service, provider, chiến lược, độ trễ, số scenario, trạng thái thành công, số lần auto-fix và token nếu nhà cung cấp trả về.
2. Thống kê tổng hợp có tổng lượt sinh, success rate, latency trung bình, token trung bình và số lượt đã kích hoạt auto-fix.
3. Nếu chưa có lượt sinh, các chỉ số tổng hợp trả về 0.
4. Ctrl+Shift+U được khai báo cho Windows/Linux và Cmd+Shift+U cho macOS để gọi lệnh sinh test khi editor đang focus.

**2.3.5.3 Mô tả**

Metrics collector ghi nhận dữ liệu trong phiên chạy extension và hỗ trợ lấy thống kê tổng hợp; keybinding giúp khởi chạy quy trình mà không cần mở menu.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Cảnh báo | Phản hồi của provider không có thông tin token. | Tiếp tục ghi các số liệu còn lại; không đánh dấu cả lượt sinh là lỗi chỉ vì thiếu token. |

**Test đối chiếu:** Step3 test kiểm tra các chỉ số đã ghi, số liệu trung bình, success rate, auto-fix count và phím tắt.

### 2.3.6 C-06 — Sinh lại test khi mã thay đổi và hiển thị CodeLens

- **Người phụ trách:** Dung
- **Commit tham chiếu:** `6569689`
- **Test liên quan:** [`realtime.test.ts`](packages/extension/src/realtime.test.ts)

**2.3.6.1 User Story**

Là lập trình viên, tôi muốn nhận thao tác sinh test ngay trên class hoặc method và tự cập nhật test khi chữ ký mã nguồn thay đổi.

**2.3.6.2 Tiêu chí chấp nhận**

1. CodeLens cung cấp thao tác trên class và method public được parser nhận diện.
2. Khi bật autoGenerateOnSave, extension theo dõi lúc lưu tệp thuộc ngôn ngữ hỗ trợ và bỏ qua tệp test hoặc tệp rỗng.
3. Khi chữ ký class, method, tham số hoặc kiểu trả về đổi, hệ thống chờ debounceDelayMs rồi gọi sinh test.
4. Chỉ thay đổi comment hoặc định dạng không tạo lượt sinh mới nếu chữ ký AST không đổi.
5. Người dùng có thể bật/tắt CodeLens và tự động sinh khi lưu trong cấu hình.

**2.3.6.3 Mô tả**

Realtime watcher so sánh chữ ký AST giữa các lần lưu để chỉ gọi sinh lại test khi cấu trúc mã có thay đổi; CodeLens đưa lệnh tới gần vị trí mã cần kiểm thử.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Thông tin | Auto-generate đang tắt, file lưu là test file, file rỗng hoặc AST signature không đổi. | Không khởi chạy yêu cầu LLM mới. |

**Test đối chiếu:** Realtime test kiểm tra CodeLens, bỏ qua thay đổi comment/format, nhận diện chữ ký thay đổi và cấu hình extension.

### 2.3.7 BA-04 — Viết hướng dẫn sử dụng và kịch bản demo

- **Người phụ trách:** Dung
- **Commit tham chiếu:** `6304a02`
- **Tài liệu liên quan:** [`extension_guide.md`](docs/extension_guide.md), [`README.md`](packages/extension/README.md)
- **Test tham khảo:** [`extension.test.ts`](packages/extension/src/extension.test.ts) kiểm tra một số lệnh và cấu hình của extension; test này không kiểm tra nội dung tài liệu.

**2.3.7.1 User Story**

Là người mới sử dụng extension, tôi muốn có hướng dẫn cài đặt và ví dụ thao tác để tự cấu hình model, sinh test và lưu kết quả vào workspace.

**2.3.7.2 Tiêu chí chấp nhận**

1. Hướng dẫn nêu các bước cài extension từ VSIX và cấu hình provider, model, API key cùng chiến lược prompt.
2. Hướng dẫn mô tả cách khởi chạy sinh test, xem preview và lưu tệp test.
3. README của extension cung cấp tổng quan tính năng, quickstart, cấu hình và cách đóng gói extension.
4. Tài liệu có kịch bản demo minh họa luồng từ mã nguồn và yêu cầu BA đến test được sinh và kết quả đánh giá.

**2.3.7.3 Mô tả**

Commit `6304a02` bổ sung `docs/extension_guide.md` với hướng dẫn sử dụng và kịch bản demo, đồng thời hoàn thiện README riêng cho extension.

**Validation**

| Loại | Tình huống cần xử lý | Kết quả mong đợi |
| --- | --- | --- |
| Cảnh báo | Tên setting, thao tác hoặc quy trình trong tài liệu không còn khớp với extension. | Đối chiếu lại cấu hình và luồng hiện tại, sau đó cập nhật tài liệu trước khi hướng dẫn người dùng. |

**Đối chiếu:** Đây là US về tài liệu nên tiêu chí được kiểm tra bằng review nội dung và chạy thử các bước hướng dẫn; repository chưa có automated test xác nhận nội dung tài liệu.

## 4. Ghi chú đối chiếu

Các liên kết Test mở test module hiện có; với US tài liệu, liên kết dẫn đến tài liệu cần đối chiếu. Có thể đặt từng test case hoặc bước kiểm tra nội dung cạnh tiêu chí tương ứng để chỉ rõ phần nào đã được xác nhận và phần nào cần bổ sung.
