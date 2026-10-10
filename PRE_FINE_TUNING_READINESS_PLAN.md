# Kế hoạch hoàn thiện project trước khi fine-tuning

**Ngày rà soát:** 09/10/2026  
**Mục tiêu:** Xác định những phần cần sửa trước khi huấn luyện LoRA/QLoRA, lý do cần sửa, thứ tự triển khai và trạng thái project sau mỗi bước.

## 1. Kết luận nhanh

Project đã có nền tảng đáng giữ lại: VS Code extension, pipeline gom mã nguồn và tài liệu BA, bốn prompt strategy, tập benchmark 15 service TypeScript, evaluator Jest và khung mutation testing. Có thể phát triển tiếp theo hướng fine-tuning.

Hiện tại **chưa nên bắt đầu huấn luyện hoặc dùng số liệu hiện có để kết luận fine-tuning tốt hơn**, vì benchmark có nhánh trả về coverage giả, script so sánh mutation gán cứng điểm cho các strategy, và các strategy chưa nhận cùng đầu vào. Báo cáo cũng công bố một số kết quả chưa có artifact thí nghiệm đi kèm trong danh sách file hiện tại. Nếu huấn luyện trên dữ liệu/chỉ số như vậy, khó biết cải thiện đến từ model, prompt, dữ liệu hay lỗi đo lường.

Thứ tự ưu tiên:

1. Sửa tính đúng đắn của phép đo và gỡ số liệu chưa kiểm chứng.
2. Chuẩn hóa cách truyền ngữ cảnh và thiết kế baseline so sánh công bằng.
3. Kiểm định, mở rộng và chia dữ liệu đúng cách.
4. Làm cho luồng extension và model gateway hoạt động đúng, có thể tái lập.
5. Khi baseline ổn định mới chạy fine-tuning pilot.

## 2. Hiện trạng quan sát được

- Benchmark catalog mô tả **15 bài toán**, chia thành 5 simple, 5 medium, 5 complex; dữ liệu chính dùng `service.ts`, `requirement.md` và `ground_truth.test.ts`. Có một thư mục Go demo riêng, nhưng evaluator/mutation runner chính vẫn dùng Jest.
- `ContextExtractor` có phân tích AST và parse tài liệu BA, nhưng `PromptContext` chỉ chứa mã nguồn, tài liệu BA, tên lớp, ngôn ngữ/framework và test pattern. Prompt hiện tại không dùng cấu trúc AST đã trích xuất.
- `hybrid` nhận tài liệu BA; `zero-shot`, `few-shot`, `cot` hiện chủ yếu đưa mã nguồn vào prompt. `few-shot` dùng ví dụ `MathUtil` cố định.
- `CoverageRunner` trả về `executed: true`, suite pass và 100% coverage khi không nạp được Jest.
- `experiments/run_mutation_testing.ts` chạy mutation thật cho ground truth của S01, nhưng điểm của `hybrid` và `zero-shot` được gán trực tiếp trong mã.
- `docs/COMPREHENSIVE_PROJECT_REPORT.md` công bố các con số như 96.8% line coverage, 89.7% mutation score, 95.2% đúng nghiệp vụ, cải thiện Auto-Fix và giảm 70% lần gọi LLM. Chưa thấy raw result/artifact tương ứng trong danh sách file hiện tại.
- `GeminiGateway` được khởi tạo với thứ tự tham số ngược trong `ConfigurationManager`.
- Generator pipeline ghi test vào đường dẫn đầu ra trước khi người dùng bấm chấp nhận; nút chấp nhận trong preview hiện chỉ hiện thông báo. Auto-Fix chỉ được gọi khi mã lỗi cú pháp, và bước kiểm tra sau sửa dùng file trên đĩa có thể vẫn chứa phiên bản cũ.

Các quan sát trên dựa vào mã nguồn hiện có, chưa phải kết quả kiểm thử chạy ở lượt rà soát này.

## 3. Danh sách việc cần sửa theo thứ tự

### P0 — Bắt buộc trước khi dùng kết quả cho nghiên cứu

#### Bước 1. Loại bỏ coverage giả và định nghĩa rõ trạng thái lỗi

**Điểm cần sửa:** `packages/core/src/pipeline/coverage_runner.ts` có nhánh khi không tìm thấy Jest nhưng lại báo đã thực thi thành công, 1/1 test pass và mọi coverage bằng 100%.

**Vì sao phải sửa:** Đây là số liệu sai về mặt thực nghiệm. Máy thiếu dependency hoặc môi trường chạy hỏng có thể làm mô hình trông như đạt coverage hoàn hảo. Điều đó làm hỏng kết luận so sánh trước khi bắt đầu fine-tuning.

**Cách sửa:**

1. Khi không tìm thấy Jest, trả `executed: false`, `suitePassed: false`, không có coverage và có thông báo lỗi cụ thể.
2. Phân biệt rõ: không chạy được, không có test, test lỗi, test pass và coverage không thu được.
3. Chỉ hiển thị/chấm coverage nếu runner thực sự chạy và nhận được coverage map hợp lệ.
4. Trong evaluator, không tính lượt `executed: false` như một lần chạy pass; tổng hợp số lượng lỗi môi trường riêng.

**Sau khi sửa:** Không thể có điểm coverage giả. Mỗi kết quả có thể truy ngược tới lần chạy thành công hoặc lý do không chạy được.

**Hoàn thành khi:** Môi trường thiếu Jest cho kết quả `not executed`; pipeline không báo 100%; bảng tổng hợp phân biệt lỗi môi trường với test fail.

#### Bước 2. Thay số mutation gán cứng bằng chạy thật

**Điểm cần sửa:** `experiments/run_mutation_testing.ts` chỉ chạy mutation trên ground truth của S01 rồi dựng số liệu Hybrid/Zero-Shot bằng các giá trị và phép tính viết sẵn.

**Vì sao phải sửa:** Đây không phải so sánh mutation testing giữa các strategy. Điểm mô phỏng không được đưa vào báo cáo như kết quả thực nghiệm và sẽ làm sai kết luận fine-tuned vs base.

**Cách sửa:**

1. Xóa các giá trị mutation score gán trực tiếp.
2. Đưa test được sinh cho từng service/strategy/model vào `MutationRunner` thật.
3. Lưu từng mutant và trạng thái `KILLED`, `SURVIVED`, `TIMEOUT`, `COMPILE_ERROR`, cùng lỗi chạy nếu có.
4. Không tính lỗi cài đặt, lỗi import, lỗi test harness hoặc mutant không biên dịch như mutant bị tiêu diệt; kiểm tra lại quy tắc phân loại trong `packages/core/src/mutation/mutation_runner.ts`.
5. Báo cả số mutant hợp lệ và số bị loại, không chỉ báo một phần trăm.

**Sau khi sửa:** Mutation score phản ánh khả năng test phát hiện thay đổi logic, có thể lặp lại và đối chiếu trên từng service.

**Hoàn thành khi:** Không còn score dựng sẵn; mỗi số trong báo cáo có file kết quả mutation tương ứng.

#### Bước 3. Đồng bộ báo cáo với dữ liệu có thể kiểm chứng

**Điểm cần sửa:** `docs/COMPREHENSIVE_PROJECT_REPORT.md` có các bảng số liệu và tuyên bố hiệu quả chưa gắn với artifact kết quả. Một số mô tả kiến trúc cũng đang trình bày năng lực rộng hơn runner đang hỗ trợ thực tế.

**Vì sao phải sửa:** Fine-tuning cần baseline đáng tin. Nếu báo cáo cũ giữ số liệu chưa xác minh, người đọc không phân biệt được kết quả đo thật, mục tiêu thiết kế và số minh họa.

**Cách sửa:**

1. Xóa hoặc gắn nhãn rõ là **mục tiêu/minh họa/chưa đo** cho mọi số chưa có dữ liệu nguồn.
2. Chỉ đưa lại kết quả sau khi được sinh bởi evaluator; lưu raw JSON/CSV, log và cấu hình chạy trong `experiments/results/` hoặc đường dẫn tương đương.
3. Mỗi bảng cần ghi số lượt chạy, số service, model/version, strategy, prompt/context version và thời điểm chạy.
4. Sửa các tuyên bố hỗ trợ đa ngôn ngữ/Auto-Fix/realtime cho khớp với luồng chạy thật; hiện evaluator chính là Jest/TypeScript.

**Sau khi sửa:** Báo cáo phân biệt rõ thiết kế, chức năng đã triển khai và kết quả đã đo; không còn số liệu khó truy nguồn.

**Hoàn thành khi:** Mỗi con số trong phần kết quả truy được tới artifact và lệnh/cấu hình đã tạo ra nó.

### P1 — Bắt buộc để thí nghiệm fine-tuning có giá trị

#### Bước 4. Chuẩn hóa đầu vào để so sánh công bằng

**Điểm cần sửa:** Các prompt hiện không nhận cùng ngữ cảnh. `hybrid` có BA requirement; `zero-shot`, `few-shot` và `cot` không đưa BA vào. `few-shot` dùng một ví dụ MathUtil cố định. AST được tạo nhưng thông tin cấu trúc AST chưa được truyền rõ vào prompt.

**Vì sao phải sửa:** Nếu Hybrid tốt hơn, hiện chưa thể kết luận phần cải thiện đến từ strategy hay chỉ do nó được cấp thêm requirement. Khi so sánh base model và fine-tuned model, khác biệt đầu vào cũng làm kết quả không còn cô lập được tác động của fine-tuning.

**Cách sửa:**

1. Định nghĩa một context chuẩn: ngôn ngữ/framework, mã nguồn mục tiêu, AST summary cần thiết, yêu cầu BA/acceptance criteria và quy tắc đầu ra.
2. Dùng cùng context đó cho nhánh **base model** và **fine-tuned model**; chỉ thay adapter/model checkpoint.
3. Nếu vẫn so sánh prompt strategy, các strategy phải nhận cùng nguồn thông tin. Ghi riêng ablation `code-only` và `code + BA` để đo tác động của BA.
4. Thay ví dụ few-shot cố định bằng ví dụ được chọn từ tập train hoặc bỏ few-shot khỏi so sánh chính; tuyệt đối không lấy ví dụ từ tập test.
5. Chuẩn hóa schema đầu ra cho các nhánh, ví dụ `testScenarios`, `acceptanceCriteriaRef`, `testCode`. Không cần huấn luyện model xuất trường suy luận dài; cần đầu ra có thể parse, kiểm thử và truy vết.

**Sau khi sửa:** Có baseline đối chứng rõ ràng: cùng model nền, cùng prompt, cùng dữ liệu vào, cùng cấu hình sinh; biến nghiên cứu là adapter fine-tuned.

**Hoàn thành khi:** Log mỗi lượt chạy ghi được context/prompt version và có thể xác nhận base/FT nhận cùng nội dung đầu vào.

#### Bước 5. Kiểm định chất lượng ground truth và tạo schema dữ liệu huấn luyện

**Điểm cần sửa:** 15 cặp service/requirement/test là tài sản tốt để làm pilot, nhưng chưa đủ để mặc định coi là tập huấn luyện và đánh giá đại diện. Chất lượng `ground_truth.test.ts` và mức truy vết từng acceptance criterion chưa được xác nhận trong kế hoạch dữ liệu.

**Vì sao phải sửa:** Fine-tuning học theo nhãn. Test đích sai, thiếu case biên, import không chạy hoặc không khớp yêu cầu sẽ dạy mô hình lặp lại lỗi đó. Tách ngẫu nhiên các test case của cùng service sang train và test còn tạo rò rỉ dữ liệu.

**Cách sửa:**

1. Rà soát từng mẫu bởi người hiểu yêu cầu và TypeScript/Jest: test có chạy không, có assertion có ý nghĩa không, có kiểm tra hành vi nghiệp vụ không, có bao phủ boundary/exception không.
2. Tạo bảng traceability: `acceptance criterion → scenario → test name/assertion`; ghi chú tiêu chí không thể kiểm thử unit hoặc thiếu thông tin.
3. Chuẩn hóa format JSONL chat/prompt-completion: input chứa source, requirement, framework, output contract; completion chứa schema scenario và mã test đã kiểm định.
4. Ghi metadata riêng: `service_id`, tier, ngôn ngữ, framework, nguồn dữ liệu, người rà soát, phiên bản nhãn. Loại metadata khỏi nội dung completion nếu không muốn model học nhãn định danh.
5. Mở rộng bằng ví dụ đa dạng có nguồn gốc hợp lệ; ví dụ tổng hợp chỉ được dùng sau khi test chạy được và được người rà soát xác nhận. Không tạo hàng loạt bản paraphrase của cùng một service rồi xem như dữ liệu độc lập.
6. Chia train/validation/test theo **service hoặc project**, giữ nguyên test holdout chưa từng dùng chọn prompt, hyperparameter hay checkpoint. Với 15 mẫu hiện tại, kết quả fine-tuning chỉ nên được gọi là pilot; cần bổ sung dữ liệu trước khi tuyên bố tổng quát hóa.

**Sau khi sửa:** Tập dữ liệu có nhãn rõ, kiểm tra được, không trùng service giữa train/test và mỗi completion dùng được để supervised fine-tuning.

**Hoàn thành khi:** Có manifest dataset, báo cáo kiểm định từng mẫu, split file cố định và kiểm tra tự động phát hiện trùng/lệch schema.

#### Bước 6. Làm cho phép đánh giá lặp lại và đầy đủ

**Điểm cần sửa:** Các kết quả cần đi cùng cấu hình chạy; một lần sinh cho một service không phản ánh độ biến thiên của sampling. Evaluation hiện đo compilation/pass/coverage, nhưng cần bảo đảm không trộn lần chạy hỏng và cần bổ sung đánh giá đúng nghiệp vụ có quy trình rõ.

**Vì sao phải sửa:** LLM có thể sinh output khác nhau ở mỗi lần gọi. Nếu chỉ chọn một output đẹp hoặc so sánh bằng các lần gọi khác điều kiện, kết quả dễ thiên lệch. Coverage cao cũng không đồng nghĩa test khớp BA hay phát hiện lỗi logic.

**Cách sửa:**

1. So sánh base và FT trên cùng holdout, prompt, context, framework, token limit, temperature và số lần thử.
2. Chạy nhiều lần sinh độc lập cho mỗi mẫu (số lượt chọn trước và báo cáo minh bạch); không chỉ lưu output tốt nhất.
3. Lưu model/revision, adapter revision, prompt hash, dataset hash/split, cấu hình sinh, thời gian, token, output thô, lỗi compile/run, coverage và mutation result.
4. Báo cáo tối thiểu: tỷ lệ compile, tỷ lệ suite pass theo lượt, line/branch coverage, mutation score thật, tỷ lệ acceptance criteria được test, độ trễ/chi phí.
5. Chấm traceability/đúng nghiệp vụ theo rubric cố định; nếu có thể, dùng hai người chấm độc lập và báo cách xử lý bất đồng.
6. Báo số mẫu và mẫu số cho từng metric; không gộp timeout/lỗi môi trường vào điểm test pass/fail mà không giải thích.

**Sau khi sửa:** Kết quả base-vs-FT có thể tái tạo, có độ biến thiên và phản ánh cả chạy được, chất lượng test, yêu cầu nghiệp vụ lẫn chi phí.

**Hoàn thành khi:** Từ artifact đã lưu có thể tái dựng bảng tổng hợp và xác định chính xác mẫu nào tạo ra mỗi metric.

### P2 — Sửa để sản phẩm demo không làm sai kết quả hoặc trải nghiệm

#### Bước 7. Sửa provider và đưa cấu hình model/adapter thành một lựa chọn rõ ràng

**Điểm cần sửa:** Trong `packages/extension/src/services/config_manager.ts`, `GeminiGateway` nhận tham số theo thứ tự `modelName, apiKey`, nhưng nơi tạo gateway truyền `apiKey, modelName`. Extension vì vậy có thể gọi sai model/credential. Cấu hình model cũng chưa phân biệt rõ base model và adapter fine-tuned.

**Vì sao phải sửa:** Một provider khởi tạo sai làm baseline không ổn định; khi thêm FT dễ nhầm model gốc với adapter hoặc không biết model nào sinh output.

**Cách sửa:** Sửa thứ tự hoặc chuyển sang tham số object có tên; thêm thông tin provider/model/revision/adapter vào metadata từng lượt; giữ cấu hình inference chung giữa các arm. Thêm FT model như provider/adapter option độc lập, không thay ngầm baseline.

**Sau khi sửa:** Chọn provider cho đúng model và có thể truy xuất đầy đủ model dùng trong mỗi lần sinh.

#### Bước 8. Sửa lưu preview và Auto-Fix trước khi dùng kết quả làm demo

**Điểm cần sửa:** `GeneratorPipeline` ghi file test ngay khi nhận `outputTestFilePath`; service gọi pipeline với đường dẫn đích trước khi người dùng chấp nhận. Trong khi đó, nút `ACCEPT_TEST` ở preview hiện chỉ thông báo lưu thành công, không thực hiện lưu. Auto-Fix chỉ chạy với lỗi cú pháp; kiểm tra sau sửa có thể chạy file cũ trên đĩa.

**Vì sao phải sửa:** Người dùng có thể tưởng output chưa được lưu trong lúc file đã bị ghi đè, hoặc nhận thông báo đã lưu dù handler không lưu. Auto-Fix có thể báo thành công dựa trên phiên bản chưa được sửa. Đây làm giảm độ tin cậy của ứng dụng và làm sai số liệu tỷ lệ tự sửa thành công.

**Cách sửa:**

1. Sinh và kiểm tra trong thư mục tạm hoặc bộ nhớ; không chạm file đích trước khi người dùng chọn chấp nhận.
2. Handler `ACCEPT_TEST` phải thực sự ghi nội dung cuối cùng; `REJECT_TEST` phải bỏ output tạm và giữ nguyên file đích.
3. Trước khi chạy test sau Auto-Fix, ghi phiên bản mới vào sandbox riêng hoặc truyền nội dung mới trực tiếp cho runner.
4. Nếu mục tiêu là sửa test lỗi khi chạy, kích hoạt vòng Auto-Fix khi suite fail với error output, không chỉ lỗi syntax. Không được để fix làm yếu/xóa assertion nghiệp vụ để đạt pass.
5. Lưu lịch sử phiên bản và số vòng sửa để evaluator tính tỷ lệ Auto-Fix từ chạy thật.

**Sau khi sửa:** Preview, accept/reject, test runner và Auto-Fix làm việc trên đúng một phiên bản; file người dùng chỉ đổi sau thao tác chấp nhận.

## 4. Trạng thái mong muốn trước lần fine-tuning đầu tiên

Chỉ chuyển sang fine-tuning pilot khi hoàn thành các điều kiện sau:

- [ ] Không có nhánh coverage/mutation nào sinh điểm giả hoặc gán số thủ công.
- [ ] Báo cáo chỉ giữ metric có artifact, lệnh chạy và cấu hình nguồn.
- [ ] Base model và FT arm dùng đúng cùng prompt, source, BA, framework và điều kiện sinh.
- [ ] Có bộ test holdout chia theo service/project; test holdout không bị dùng chọn prompt hay checkpoint.
- [ ] Ground truth đã được rà soát, có mapping acceptance criteria tới test.
- [ ] Có manifest dataset và schema JSONL đã kiểm tra.
- [ ] Mọi lượt sinh lưu model, prompt, dataset/split, output, lỗi và metric.
- [ ] Runner báo rõ lỗi môi trường và không tính lỗi đó thành pass.
- [ ] Mục tiêu pilot giới hạn ở TypeScript/Jest nếu chưa có runner thật cho các ngôn ngữ khác.

## 5. Những việc chưa nên ưu tiên

- Chưa mở rộng thêm nhiều ngôn ngữ/framework trước khi runner tương ứng chạy và đo thật; parser đa ngôn ngữ không đồng nghĩa evaluator đa ngôn ngữ.
- Chưa tuyên bố tổng quát hóa fine-tuning dựa trên 15 mẫu hiện có. Có thể dùng chúng để thử pipeline và phát hiện lỗi dữ liệu.
- Chưa thêm nhiều vòng agent, RAG hoặc self-reflection phức tạp trước khi có baseline đúng; mỗi cơ chế mới sẽ tạo thêm biến gây nhiễu.
- Chưa chọn checkpoint theo tập test; chỉ validation được dùng để chọn cấu hình.

## 6. Kết quả cuối sau khi hoàn thành kế hoạch

Project sẽ có một benchmark đáng tin trước khi có model fine-tuned: input được chuẩn hóa, dữ liệu có kiểm định, holdout không rò rỉ, test được chạy thật, coverage/mutation được tính thật, báo cáo có thể tái tạo và extension không ghi nhầm output. Khi đó, thử nghiệm LoRA/QLoRA có thể trả lời câu hỏi nghiên cứu cụ thể: **fine-tuning có cải thiện khả năng sinh unit test TypeScript/Jest bám yêu cầu BA so với chính model nền trong cùng điều kiện hay không, và cải thiện đó đánh đổi bao nhiêu độ trễ/chi phí?**

Đây là điều kiện để kết quả có sức thuyết phục; nó không đảm bảo trước một mức điểm cụ thể. Điểm số cuối phụ thuộc vào chất lượng dữ liệu, phạm vi đánh giá, cách thực nghiệm và tiêu chí chấm của hội đồng.

## 7. File nguồn cần xử lý

- `packages/core/src/pipeline/coverage_runner.ts`
- `experiments/run_mutation_testing.ts`
- `packages/core/src/mutation/mutation_runner.ts`
- `packages/core/src/extractor/context_extractor.ts`
- `packages/core/src/prompts/zero-shot.ts`
- `packages/core/src/prompts/few-shot.ts`
- `packages/core/src/prompts/chain-of-thought.ts`
- `packages/core/src/prompts/hybrid.ts`
- `experiments/dataset/README.md` và các `ground_truth.test.ts`
- `experiments/evaluate_generated_tests.ts`
- `experiments/batch_runner.ts`
- `experiments/generate_report.ts`
- `docs/COMPREHENSIVE_PROJECT_REPORT.md`
- `packages/extension/src/services/config_manager.ts`
- `packages/core/src/llm/gateway.ts`
- `packages/core/src/pipeline/generator_pipeline.ts`
- `packages/extension/src/services/test_generation_service.ts`
- `packages/extension/src/services/auto_fix_engine.ts`
- `packages/extension/src/webview/preview_panel.ts`
