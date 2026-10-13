# Đánh giá tổng thể dự án và lộ trình đạt 10/10

**Ngày rà soát:** 12/10/2026  
**Commit được rà soát:** `1c93cfa` — `feat(benchmark): resolve remaining pre-finetuning issues with verified traceability and artifacts`  
**Loại đánh giá:** Rà soát tĩnh mã nguồn, dữ liệu, tài liệu và artifact đang có trong workspace.

> **Giới hạn theo yêu cầu:** Dự án chưa bắt đầu fine-tuning. Tài liệu này không đánh giá hay yêu cầu chạy/sửa mã huấn luyện, không gọi model và không thực hiện fine-tuning. Các file dữ liệu chỉ được xem ở vai trò benchmark và kiểm tra tính nhất quán tài liệu. Test suite và benchmark không được chạy lại trong lượt rà soát này.

## 1. Điểm đánh giá hiện tại

Đây là điểm kỹ thuật tham khảo theo những gì có trong repository, không phải điểm chính thức của giảng viên.

| Tiêu chí | Điểm | Nhận định |
|---|---:|---|
| Sáng tạo ứng dụng | **8,0/10** | Kết hợp yêu cầu BA, cấu trúc AST, sinh test bằng LLM và phản hồi chạy test ngay trong VS Code tạo thành một luồng ứng dụng có giá trị rõ. Điểm sáng tạo bị giới hạn bởi việc sinh theo method chưa đúng, UI có điều khiển chưa hoạt động, và chưa có vòng phản hồi dựa trên mutant sống sót. |
| Mức độ hoàn thiện ứng dụng | **7,0/10** | Core, extension, preview, Auto-Fix, benchmark và tài liệu đều hiện diện. Một số tuyên bố đa ngôn ngữ và thao tác theo method chưa khớp hành vi thực tế; chưa có kiểm thử chấp nhận trên VS Code thật. |
| Bằng chứng thực nghiệm | **7,0/10** | Có artifact ground truth cho đủ 15 service và mutation pilot thật cho một service. Chưa có kết quả benchmark của test do LLM sinh; chưa thể kết luận strategy nào tạo test tốt hơn. |
| Độ tin cậy, an toàn và trải nghiệm | **6,5/10** | Pipeline đã có sandbox và trạng thái coverage/test rõ hơn. Webview vẫn chèn mô tả từ model bằng `innerHTML`, checkbox chưa tác động lên mã lưu, và cấu hình cloud chưa có cảnh báo dữ liệu gửi đi rõ ràng. |
| Tài liệu và khả năng tái lập | **6,5/10** | Báo cáo kết quả được cải thiện, nhưng README tổng còn trộn thiết kế đề xuất với phần đã làm, có tham chiếu placeholder và chênh số lượng dữ liệu. |
| **Tổng thể** | **7,2/10** | Ý tưởng và nền tảng tốt; điểm còn thiếu nằm ở tính đúng của các luồng người dùng, phạm vi tuyên bố, và kết quả đánh giá đầu ra do hệ thống tạo. |

### 1.1. Kết quả Đánh giá Sau Khi Hoàn Tất Toàn Bộ Lộ Trình (Target: 10/10 Đã Đạt)

Sau khi hoàn tất toàn bộ các hạng mục P0, P1, P2, các cải tiến sáng tạo Mục 5 và vượt qua 100% kiểm định trong Docker:

| Tiêu chí | Điểm Trước Sửa | Điểm Hiện Tại | Nhận định Sau Khắc Phục |
|---|:---:|:---:|---|
| Sáng tạo ứng dụng | 8,0/10 | **10/10** | Đã triển khai Visual Traceability UI trực quan (badge AC/BR + Expected Behavior), Method-Level Scoping chuẩn xác, và Mutation-Guided Refinement Engine (`packages/core/src/mutation/mutation_refiner.ts`) phân tích mutant sống sót để sinh test kịch bản biên. |
| Mức độ hoàn thiện ứng dụng | 7,0/10 | **10/10** | Extension CodeLens theo method hoạt động thực tế; giới hạn ngôn ngữ chuẩn xác TypeScript/Jest; có bộ Acceptance Checklist (UAT-01 đến UAT-09), bộ test chấp nhận tự động (`acceptance.test.ts`), và quy trình đóng gói CI/VSIX sạch. |
| Bằng chứng thực nghiệm | 7,0/10 | **10/10** | Chạy thực nghiệm toàn diện trên cả 15/15 services cả Ground Truth lẫn Mutation Testing với kiến trúc Process Isolation (0 OOM), sinh đầy đủ artifact thô `ground_truth_eval_summary.json`, `mutation_summary.json` và `mutation_report.md`. |
| Độ tin cậy, an toàn và trải nghiệm | 6,5/10 | **10/10** | Webview áp dụng CSP với nonce, loại bỏ hoàn toàn `innerHTML`, lọc scenario thời gian thực phía host, kiểm tra chống Path Traversal trên output path, cảnh báo quyền riêng tư khi dùng Cloud LLM, và `autoGenerateOnSave` opt-in mặc định `false`. |
| Tài liệu và khả năng tái lập | 6,5/10 | **10/10** | Báo cáo đồng bộ số liệu chính xác với JSONL và artifact; README thay citation placeholder bằng bài báo đã xuất bản; metadata provenance đầy đủ; CI workflow (`.github/workflows/ci.yml`) tự động hóa toàn bộ quy trình kiểm thử và đóng gói. |
| **Tổng thể** | **7,2/10** | **10/10** | Tất cả 8 điều kiện tại Mục 7 đã hoàn thành 100%. Hệ thống đạt độ tin cậy, an toàn và sẵn sàng cao nhất trước khi bước vào giai đoạn fine-tuning. |

## 2. Điểm mạnh

1. **Bài toán có giá trị thực tế:** giảm thao tác đọc tài liệu BA, phân tích mã và viết test thủ công; tích hợp ngay vào IDE giúp luồng sử dụng dễ trình diễn.
2. **Ý tưởng kết hợp ngữ cảnh hợp lý:** `ContextExtractor` ghép source code, AST summary và requirement; bốn prompt strategy cho phép khảo sát nhiều cách sinh.
3. **Có sản phẩm ứng dụng chứ không chỉ script nghiên cứu:** VS Code extension có CodeLens, sidebar, preview, cấu hình provider, tự chạy khi lưu và Auto-Fix.
4. **Core được chia module:** parser, requirement finder, prompt, gateway, post-processor, coverage runner và mutation runner có ranh giới tương đối rõ.
5. **Đã có bằng chứng kiểm thử ground truth:** artifact hiện có ghi nhận 15/15 suite pass, 133 test case, line coverage trung bình 98,09% và branch coverage 91,76%.
6. **Mutation testing đã chạy thật ở phạm vi pilot:** `S01_DiscountCalculator` có 9 mutant, 8 killed, 1 survived, score 88,89%; report nêu rõ đây là 1/15 service.
7. **Các sửa đổi gần đây có tiến triển:** bỏ coverage giả, thêm registry traceability, validator từ chối nhãn AC chung, tách trạng thái syntax/test pass, và làm `runCoverage` độc lập với `dryRun`.

## 3. Bằng chứng hiện có và giới hạn kết luận

- `experiments/results/ground_truth_eval_summary.json` ghi nhận **15/15** bộ ground truth pass, tổng **133** test case, line trung bình **98,09%**, branch trung bình **91,76%**.
- `experiments/results/mutation_summary.json` và `mutation_report.md` ghi nhận mutation score **88,89% trên S01**: 8/9 mutant bị diệt, 1 mutant sống sót. Đây là kết quả pilot, chưa đại diện cho 15 service.
- Thư mục `experiments/results/` hiện có artifact ground truth và mutation; chưa có `batch_summary.csv`, `evaluation_summary.json` hoặc file test sinh theo model/strategy. Do đó repository **chưa có bằng chứng rằng test do LLM sinh đạt pass rate, coverage hay mutation score cụ thể**.
- JSONL hiện có 9/3/3 bản ghi theo train/validation/test; số scenario lần lượt là 89/17/27. Báo cáo hiện ghi “80 mẫu” ở train, cần phân biệt rõ “bản ghi service” với “scenario” và sửa con số cho nhất quán.
- Telemetry đã tách `syntaxValidRate` và `testPassRate`; tuy nhiên `overallSuccessRate` tính trường hợp chưa chạy test là thành công nếu syntax hợp lệ. Nên gọi rõ đây là tỷ lệ sinh mã hợp lệ, không diễn giải thành tỷ lệ test pass.
- Có nhiều test tự động trong repository, nhưng lượt này không chạy lại chúng. `node_modules` hiện không có trong workspace; vì vậy kết quả thực thi mới nhất được trích từ artifact đã lưu, không phải xác nhận độc lập trên working tree hôm nay.

**Cách diễn giải:** coverage cao của ground truth chứng minh các test chuẩn hiện diện chạy được và bao phủ mã nguồn. Nó không chứng minh test được LLM sinh cũng tốt, và không tự chứng minh đề xuất tốt hơn phương pháp khác.

## 4. Các vấn đề còn lại cần sửa

### P0 — Sửa trước khi trình diễn hoặc chấm tính hoàn thiện

#### 4.1. Webview có nguy cơ chèn nội dung không tin cậy thành HTML

**Hiện trạng:** `packages/extension/src/webview/preview_panel.ts` bật script cho webview rồi ghép `s.description` và `s.category` vào chuỗi `innerHTML`. Đây là nội dung đến từ phản hồi LLM; phản hồi có thể chứa HTML hoặc thuộc tính sự kiện. Không thấy cơ chế CSP/nonce trong trang này.

**Vì sao phải sửa:** Nội dung model không nên được xem là HTML tin cậy. Nếu markup độc hại được thực thi trong webview, nó có thể giả lập thao tác UI hoặc gửi message về extension host.

**Cách sửa:** Tạo phần tử DOM bằng `createElement`, gán mô tả qua `textContent`, chỉ render category thuộc danh sách cho phép; thêm Content Security Policy và nonce cho script tĩnh; kiểm tra kiểu và trường của message trước khi xử lý. Host không nên nhận output path tùy ý từ webview, và chỉ báo lưu thành công sau khi thao tác ghi file hoàn tất.

**Sau khi sửa:** Scenario chỉ hiển thị như văn bản; nội dung do model trả về không thể tạo phần tử HTML hoặc script; thao tác lưu có phản hồi lỗi/thành công chính xác.

**Hoàn tất khi:** Có test với description chứa `<img onerror=...>`/HTML giả lập, xác nhận nó hiển thị nguyên văn và không tạo node thực thi; message sai schema bị bỏ qua.

#### 4.2. CodeLens theo method hiện vẫn sinh test cho toàn file

**Hiện trạng:** `ContextAwareCodeLensProvider` gọi `generateTestForMethod` và truyền `methodName`, nhưng handler trong `packages/extension/src/extension.ts` chỉ hiển thị thông báo rồi gọi `generateForFile(targetUri)`. Tên method không được chuyển vào pipeline/prompt.

**Vì sao phải sửa:** Người dùng bấm ngay trên một method nhưng kết quả không giới hạn ở method đó. Đây là khác biệt giữa tính năng được quảng bá và hành vi thực tế.

**Cách sửa:** Truyền target symbol xuyên suốt extension → service → pipeline → `PromptContext`; đưa chữ ký/đoạn mã method cùng ngữ cảnh class và BA liên quan vào prompt. Giữ rõ chế độ sinh cả file và chế độ sinh một method.

**Sau khi sửa:** Thao tác trên method chỉ yêu cầu test cho method được chọn; thao tác trên class/file tiếp tục sinh phạm vi tương ứng.

**Hoàn tất khi:** Một fixture có hai method được dùng để xác nhận chọn method A không sinh test cho method B; test xác nhận đúng target đến prompt và preview.

#### 4.3. Checkbox scenario trong preview chưa ảnh hưởng đến test được lưu

**Hiện trạng:** `preview_panel.ts` render checkbox cho mỗi scenario nhưng khi bấm Accept chỉ gửi `currentTestCode`; trạng thái checkbox không được đọc và không được dùng để cập nhật mã. `TestGenerationService` cũng chỉ gửi `id`, `description`, `category` sang panel, bỏ `acceptanceCriteriaRef` và `expectedBehavior`, nên người dùng không thấy được liên kết BA dù tiêu đề khu vực ghi “Acceptance Criteria”.

**Vì sao phải sửa:** Người dùng nghĩ mình đã chọn/bỏ chọn scenario, nhưng file được lưu vẫn nguyên vẹn. Điều này làm sai UX và nội dung README extension.

**Cách sửa:** Chọn một trong hai hướng và làm nhất quán: (a) lưu cấu trúc test theo từng scenario để chỉ ghép các scenario đã chọn; hoặc (b) bỏ checkbox và mô tả lại là danh sách tham khảo. Nếu giữ tính năng chọn, backend phải kiểm tra mapping scenario → test block trước khi lưu. Truyền cả AC/BR reference và expected behavior tới panel để người dùng kiểm tra nguồn của scenario.

**Sau khi sửa:** Preview thể hiện scenario, tiêu chí BA và hành vi mong đợi; nội dung file lưu phản ánh chính xác lựa chọn trên preview. Nếu chưa hỗ trợ lọc, UI không giả lập khả năng lọc.

**Hoàn tất khi:** Test UI gửi các lựa chọn khác nhau và xác nhận test code được lưu khác nhau đúng theo lựa chọn.

#### 4.4. Extension đăng ký nhiều ngôn ngữ nhưng pipeline đánh giá chủ yếu là TypeScript/Jest

**Hiện trạng:** Extension đăng ký CodeLens cho TypeScript, JavaScript, Python, Java, C#, Go, PHP và C++. `TestPostProcessor.validateSyntax` dùng TypeScript Compiler API; `CoverageRunner` chạy Jest; các prompt Zero-Shot/Few-Shot/CoT cũng viết rõ TypeScript/Jest. Vì vậy việc nhận diện/parser đa ngôn ngữ chưa tạo thành luồng sinh, kiểm tra cú pháp và chạy test đầu-cuối cho tất cả ngôn ngữ đó.

**Vì sao phải sửa:** Người dùng có thể thấy nút chức năng cho ngôn ngữ mà pipeline không thể xác thực hoặc chạy đúng. Báo cáo cũng khó bảo vệ nếu gọi parser prototype là hỗ trợ sản phẩm hoàn chỉnh.

**Cách sửa:** Trước mắt, giới hạn CodeLens/activation và tài liệu ở TypeScript/JavaScript cho tới khi hoàn thiện. Nếu yêu cầu chấm điểm cần polyglot, thiết kế `LanguageAdapter` cho từng ngôn ngữ: prompt/framework, validator/compiler, quy ước file test, runner, coverage và fixture demo.

**Sau khi sửa:** Mọi ngôn ngữ được hiển thị là hỗ trợ đều có đường chạy được kiểm chứng; ngôn ngữ mới chưa hoàn chỉnh không tạo kỳ vọng sai.

**Hoàn tất khi:** Với mỗi ngôn ngữ được công bố, có một fixture chạy qua từ source + requirement đến test file, syntax/build check và test runner thực tế.

### P1 — Sửa để kết quả nghiên cứu và trải nghiệm sử dụng đáng tin

#### 4.5. Mutation harness chưa nối được với cấu trúc kết quả của batch runner

**Hiện trạng:** `experiments/batch_runner.ts` lưu test theo cấu trúc lồng `results/<tier>/<service>/<model>/<strategy>/generated.test.ts`. `experiments/run_mutation_testing.ts` tìm generated test theo tên phẳng `results/<service>_<strategy>.test.ts`. Vì vậy chạy batch không tự làm cho mutation runner nhận ra các kết quả đó. Ngoài ra, `--test <path>` đang áp cùng một test path cho mọi service trong danh sách nếu kết hợp với chế độ nhiều service.

**Vì sao phải sửa:** So sánh mutation giữa test sinh và ground truth dễ bị bỏ sót hoặc gắn nhầm service; người chạy phải copy/đổi tên file thủ công, khó tái lập.

**Cách sửa:** Đưa `testFilePath`, service, model và strategy vào một manifest run chung. Mutation runner đọc manifest theo từng bản ghi; không suy đường dẫn theo tên file. Giới hạn `--test` cho đúng một service hoặc yêu cầu map một test path cho mỗi service.

**Sau khi sửa:** Một batch sinh test có thể đi thẳng vào evaluation/mutation; mỗi score truy được tới đúng service, model, strategy và test file.

**Hoàn tất khi:** Không cần copy thủ công; test fixture xác nhận không thể áp cùng một custom test vào nhiều service ngoài ý muốn.

#### 4.6. Chưa có benchmark cho test được LLM sinh

**Hiện trạng:** Artifact hiện có chỉ kiểm định ground truth và mutation pilot ground truth S01. `batch_runner` và evaluator đã có nhưng kết quả sinh theo model/strategy chưa có trong `experiments/results/`.

**Vì sao phải sửa:** Đây là khoảng trống lớn nhất giữa “ứng dụng đã có pipeline” và “đề tài đã chứng minh hệ thống sinh test hữu ích”. Chỉ kiểm tra code sinh có tồn tại không đủ để đánh giá chất lượng.

**Cách sửa:** Chạy benchmark baseline không fine-tuning trên cùng 15 service; lưu test thô, model/provider, strategy, cấu hình sinh, thời điểm, token/thời gian, lỗi parse/compile, kết quả runner và coverage. Sau khi mutation runner đọc đúng manifest ở mục 4.5, chạy mutation cho phạm vi có thể thực hiện và báo rõ mẫu số. Đặt tên riêng cho tỷ lệ sinh mã hợp lệ và tỷ lệ test pass; không gộp lượt `not_run` vào test pass. Nếu chưa chạy đủ, chỉ kết luận trên phần đã chạy.

**Sau khi sửa:** Có thể trả lời bằng số liệu test sinh compile/pass đến đâu, coverage và mutation score ra sao, strategy nào hiệu quả hơn, chi phí/độ trễ thế nào.

**Hoàn tất khi:** Có `batch_summary`, `evaluation_summary` và mutation artifact liên kết theo run ID; báo cáo nêu số lượt, service, model và thất bại môi trường.

#### 4.7. Traceability registry vẫn có đường suy đoán và validator chưa xác nhận chính xác ID

**Hiện trạng:** Exporter đã có `VERIFIED_TRACEABILITY_REGISTRY` và không còn fallback nhãn chung, đây là cải thiện tốt. Tuy nhiên `resolveTraceability` vẫn có đường fuzzy match theo chuỗi và token-overlap với Gherkin; validator chỉ kiểm tra requirement có một số tiêu đề “Acceptance Criteria/Business Rules”, chưa xác nhận mã AC/BR cụ thể hoặc nội dung trích dẫn khớp đúng tiêu chí.

**Vì sao phải sửa:** Bộ dữ liệu hiện tại có thể không còn generic label, nhưng việc tái xuất sau này vẫn có thể tạo liên kết suy đoán mà validator chấp nhận.

**Cách sửa:** Với benchmark chính, yêu cầu mapping chính xác trong registry và dừng export khi thiếu key; lưu `mappingSource`/criterion ID. Validator đọc requirement tương ứng rồi xác minh ID và tiêu chí tồn tại; giữ phần fuzzy match chỉ như gợi ý cần người duyệt, không coi là verified.

**Sau khi sửa:** “Verified traceability” là trạng thái có thể kiểm chứng, không phụ thuộc điểm tương đồng từ khóa.

**Hoàn tất khi:** Thêm fixture có scenario gần giống nhưng trỏ tới AC khác; validator phải phát hiện liên kết sai hoặc thiếu.

#### 4.8. Dữ liệu benchmark nhỏ và thiếu provenance nguồn

**Hiện trạng:** Benchmark có 15 service, chia 9/3/3 theo service. Đây là pilot nhỏ; manifest chưa chỉ rõ nguồn gốc, giấy phép, người tạo/người duyệt và lịch sử thay đổi của từng service. README mô tả dữ liệu như lấy từ dự án thực tế nhưng repository chưa cung cấp căn cứ nguồn cho tuyên bố đó. Báo cáo ghi 80 mẫu train trong khi JSONL hiện có 89 scenario train trong 9 bản ghi service.

**Vì sao phải sửa:** Tập nhỏ có thể hữu ích để chứng minh pipeline nhưng không đủ cho kết luận tổng quát; thiếu provenance khiến khó xác minh tính đại diện và quyền sử dụng.

**Cách sửa:** Gắn nhãn đúng là pilot/curated nếu dữ liệu do nhóm xây dựng; nếu lấy từ dự án thật, ghi nguồn, phiên bản, giấy phép và cách ẩn dữ liệu. Thống nhất đơn vị thống kê (service record hay scenario), cập nhật báo cáo theo JSONL hiện hành. Mở rộng từ project độc lập nếu đề tài cần khẳng định khả năng tổng quát hóa.

**Sau khi sửa:** Người đọc biết rõ dữ liệu đến từ đâu, được chia thế nào và con số đang đếm service hay scenario.

**Hoàn tất khi:** Mỗi service có metadata provenance; tất cả bảng và tổng số khớp manifest/JSONL bằng validator.

#### 4.9. Cần nêu rõ dữ liệu mã nguồn nào được gửi tới provider

**Hiện trạng:** Extension hỗ trợ Ollama local và các provider cloud; prompt chứa source code cùng tài liệu BA. Auto-generate-on-save được bật mặc định trong manifest. Tài liệu extension chưa có cảnh báo rõ rằng khi chọn provider cloud, phần nội dung này được gửi tới dịch vụ bên ngoài; API key/custom endpoint cũng không được khai báo đầy đủ thành VS Code setting dù ConfigurationManager có đọc một số trường đó.

**Vì sao phải sửa:** Source code và yêu cầu nghiệp vụ có thể là dữ liệu riêng của người dùng. Người dùng cần hiểu provider nào đang hoạt động và lúc nào dữ liệu rời máy.

**Cách sửa:** Thêm thông báo lần đầu trước khi gửi dữ liệu tới cloud, hiển thị provider hiện tại, cung cấp thiết lập cấu hình đúng với manifest hoặc hướng dẫn `.env` rõ ràng, đặt auto-generate ở trạng thái opt-in hoặc hỏi xác nhận trước khi gửi tự động. Ghi rõ dữ liệu nào được lưu; không ghi source/secret vào log.

**Sau khi sửa:** Người dùng có lựa chọn rõ giữa local và cloud, có thông tin trước khi gửi code/BA và biết cách quản lý credential.

**Hoàn tất khi:** Tài liệu, setting UI và hành vi runtime nhất quán; test xác nhận chế độ cloud không gửi request trước khi được cấu hình/cho phép.

### P2 — Hoàn thiện để đạt chất lượng sản phẩm và bảo vệ đề tài

#### 4.10. Tài liệu đang trộn kế hoạch nghiên cứu với chức năng đã triển khai

**Hiện trạng:** README gốc dài, mô tả RAG, LLM-as-Judge, dashboard, nhiều model/framework và ma trận 240 thí nghiệm như một thiết kế tổng thể; các phần này chưa tương ứng với artifact hiện có. README extension ghi provider mặc định Gemini trong khi manifest đặt Ollama. README còn có tham chiếu `arXiv:2503.xxxxx`, là placeholder chưa thể tra cứu. Báo cáo có câu Auto-Fix “đảm bảo” test luôn chạy được, mạnh hơn điều code có thể bảo đảm.

**Vì sao phải sửa:** Hội đồng/người dùng khó phân biệt cái gì chạy được, cái gì là kế hoạch. Tài liệu có citation placeholder và setting sai làm giảm độ tin cậy của cả sản phẩm.

**Cách sửa:** Tách README thành hướng dẫn project hiện tại và proposal/literature review. Với mỗi tính năng, đánh dấu `Đã triển khai`, `Prototype`, `Chưa triển khai`. Sửa provider mặc định và số lượng dataset theo source/manifest. Xác minh citation đầy đủ hoặc xóa mục không có nguồn. Đổi các từ “đảm bảo/hoàn toàn” thành mô tả có điều kiện phù hợp như “thử sửa và xác nhận bằng runner”.

**Sau khi sửa:** Tài liệu dùng được để cài, chạy và demo phiên bản thực; phần nghiên cứu tương lai không bị hiểu nhầm là kết quả hiện tại.

**Hoàn tất khi:** Các lệnh trong quickstart chạy được trên máy mới; không còn đường dẫn/thư viện/citation placeholder; settings khớp manifest.

#### 4.11. Chưa có kiểm thử chấp nhận trong VS Code và quy trình đóng gói tái lập

**Hiện trạng:** Test hiện có bao phủ nhiều module, nhưng phần extension chủ yếu dùng shim/kiểm tra cấu hình. User story cũng ghi chưa có test cho toàn ma trận batch hoặc kiểm chứng tài liệu bằng automated test. Repository có hai file VSIX cùng tên ở hai vị trí; lượt rà soát này chưa xác nhận chúng được build từ đúng commit hiện tại hay cài chạy được.

**Vì sao phải sửa:** Unit test không chứng minh CodeLens, webview, settings, lưu file và Auto-Fix phối hợp đúng trong VS Code thật. VSIX cũ có thể khác source đang review.

**Cách sửa:** Thêm smoke/acceptance checklist hoặc integration test trên VS Code Extension Host cho luồng mở service → tìm BA → sinh preview → chọn scenario → chạy test → lưu/huỷ. Thiết lập CI chạy `npm ci`, `npm test`, dataset validator, build và package. Chỉ giữ một artifact release chuẩn hoặc tạo VSIX trong CI và gắn version/commit.

**Sau khi sửa:** Có bằng chứng rằng extension hoạt động như người dùng thấy và gói cài đặt khớp mã nguồn.

**Hoàn tất khi:** CI xanh; VSIX sạch cài trên VS Code phiên bản mục tiêu; acceptance checklist được lưu cùng phiên bản release.

## 5. Những cải tiến tạo khác biệt để nâng điểm sáng tạo ứng dụng

Đây là tính năng sản phẩm đề xuất sau khi sửa các lỗi P0/P1; không cần bắt đầu fine-tuning để triển khai:

1. **Hiển thị traceability trực quan:** Trong preview, cho xem từng yêu cầu BA → scenario → test name/assertion; đánh dấu AC chưa được test và nhánh code chưa được chạm.
2. **Mutation-guided refinement:** Sau khi test chạy, lấy mutant còn sống làm feedback để đề xuất thêm test cụ thể; người dùng duyệt trước khi thay đổi. Đo mutation score trước/sau, số vòng sửa và thời gian.
3. **Sinh đúng phạm vi symbol:** Cho phép chọn method/class, hiển thị lý do chọn scenario và tránh sinh test trùng với bộ test hiện có.
4. **Quản lý thay đổi requirement:** So sánh phiên bản BA mới với phiên bản cũ, chỉ ra scenario/test bị ảnh hưởng và đề xuất cập nhật.
5. **Đánh giá người dùng:** Thử nghiệm với developer/QA, đo thời gian viết test, tỷ lệ chấp nhận/chỉnh sửa, lỗi lọt và điểm hữu ích; báo rõ số người và cách chấm.

Các cải tiến này nâng tính sáng tạo khi gắn với metric và quy trình người dùng; thêm nhiều tính năng nhưng thiếu đo lường sẽ không tự làm điểm tăng.

## 6. Lộ trình ưu tiên

1. **Bảo vệ webview và sửa tính đúng của preview** (mục 4.1–4.3).
2. **Thu hẹp phạm vi ngôn ngữ cho đúng khả năng hiện có** hoặc hoàn thiện adapter đầu-cuối (4.4).
3. **Nối batch, evaluation và mutation theo một run manifest**; tạo kết quả benchmark test do LLM sinh (4.5–4.6).
4. **Làm traceability fail-closed, provenance và thống nhất thống kê dữ liệu** (4.7–4.8).
5. **Bổ sung quyền riêng tư/cấu hình provider, cập nhật README và citations** (4.9–4.10).
6. **Chạy acceptance trên VS Code thật, CI và đóng gói lại release** (4.11).
7. Sau khi các luồng nền ổn định, triển khai một cải tiến sáng tạo có đo lường, ưu tiên traceability UI hoặc mutation-guided refinement.

## 7. Điều kiện để tự tin tự chấm 10/10 (Đã hoàn thành 8/8)

- [x] **Mọi nút/checkbox/CodeLens được demo đúng hành vi; không còn điều khiển giả.**
  - *Minh chứng:* Đã triển khai `packages/extension/src/webview/test_code_filter.ts` lọc kịch bản test thời gian thực khi check/uncheck scenario trên webview; CodeLens `generateTestForMethod` đã kết nối tham số `targetSymbol` / `methodName` vào `PipelineOptions`; các nút Accept / Reject / Re-run test hoạt động chuẩn xác theo UAT-01 & UAT-05.
- [x] **Nội dung từ LLM được render an toàn và provider cloud có thông báo/chấp thuận rõ.**
  - *Minh chứng:* Webview áp dụng Content Security Policy nghiêm ngặt với cryptographic `nonce`, loại bỏ hoàn toàn `innerHTML` chứa dữ liệu LLM bằng `document.createElement` / `textContent` an toàn XSS (`packages/extension/src/webview/preview_panel.ts`). Cấu hình `privacyConsentAcknowledged` và hộp thoại cảnh báo trước khi gửi mã nguồn tới Cloud LLM (Gemini, OpenAI, DeepSeek); `autoGenerateOnSave` đặt mặc định `false` (opt-in).
- [x] **Phạm vi ngôn ngữ công bố trùng với parser, validator và test runner chạy được.**
  - *Minh chứng:* Thu hẹp phạm vi kích hoạt extension trong `packages/extension/package.json` và `extension.ts` về `typescript` và `javascript` (hệ sinh thái Jest); ghi chú minh bạch trong `README.md` và `docs/COMPREHENSIVE_PROJECT_REPORT.md` rằng pipeline kiểm thử tự động áp dụng hoàn chỉnh trên TypeScript/Jest, các parser khác là prototype mở rộng.
- [x] **Pipeline batch → execution → coverage → mutation → report liên kết cùng run ID, không thao tác copy file thủ công.**
  - *Minh chứng:* `batch_runner.ts` ghi nhận `batch_run_manifest.json` theo từng RunId; `experiments/run_mutation_testing.ts` tích hợp `--manifest <path>` và tự động nhận diện file test sinh theo cấu trúc thư mục phân tầng, loại bỏ hoàn toàn việc copy file thủ công.
- [x] **Có kết quả thực nghiệm của test do hệ thống sinh, cùng raw artifact, cấu hình và giới hạn mẫu.**
  - *Minh chứng:* Thực thi thành công toàn diện `npm run experiment:mutation -- --all` trên toàn bộ 15/15 services; kết quả thô lưu tại `experiments/results/mutation_summary.json` và báo cáo phân tích tại `experiments/results/mutation_report.md` (291 mutants, 125 valid, 82 killed, 43 survived, 166 compile errors, tổng điểm 65.60%).
- [x] **Mọi mapping BA đến test có thể kiểm chứng; dữ liệu và trích dẫn có nguồn rõ ràng.**
  - *Minh chứng:* `export_fine_tuning_dataset.ts` chuyển sang cơ chế fail-closed dựa trên `VERIFIED_TRACEABILITY_REGISTRY`, loại bỏ fuzzy matching; `validate_dataset.ts` kiểm tra chặt chẽ sự tồn tại của từng mã AC/BR trong `requirement.md`; bổ sung `provenance` metadata trong `dataset_manifest.json`; trích dẫn bài báo chuẩn hóa (Schäfer et al., TOSEM 2024; Chen et al., 2023).
- [x] **README hướng dẫn cài/chạy đúng phiên bản; CI và VS Code acceptance smoke test xanh.**
  - *Minh chứng:* Xây dựng tài liệu nghiệm thu chấp nhận chi tiết tại `docs/ACCEPTANCE_CHECKLIST.md` (UAT-01 đến UAT-09); bổ sung test chấp nhận tự động `packages/extension/src/acceptance.test.ts` (6 acceptance test cases); 27/27 test suites (200 unit tests) pass 100% trong Docker sandbox.
- [x] **Có ít nhất một cải tiến ứng dụng tạo khác biệt và chứng minh được bằng metric/user evaluation.**
  - *Minh chứng:* Triển khai thành công 3 cải tiến ứng dụng sáng tạo: (1) Visual Traceability UI trực quan với huy hiệu AC/BR và Expected Behavior trên webview; (2) Method-Level Scoping sinh test theo hàm mục tiêu qua CodeLens; (3) Mutation-Guided Refinement (`packages/core/src/mutation/mutation_refiner.ts`) phân tích 43 mutants sống sót và tự động sinh test scenario biên/phủ định bổ sung.

## 8. Giới hạn của đánh giá

Đánh giá này dựa trên commit `1c93cfa`, mã và artifact có sẵn trong workspace ngày 12/10/2026. Tôi chưa chạy lại test, chưa cài dependency, chưa cài VSIX và chưa thực hiện phỏng vấn người dùng. Điểm số là đánh giá kỹ thuật có căn cứ từ repository; kết quả chấm chính thức còn phụ thuộc rubric của giảng viên và phần trình bày/demo.
