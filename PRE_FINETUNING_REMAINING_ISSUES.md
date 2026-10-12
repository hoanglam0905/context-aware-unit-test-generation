# Các vấn đề cần xử lý trước khi chuyển sang giai đoạn fine-tuning

**Ngày rà soát:** 10/10/2026  
**Commit được rà soát:** `456be1b` — `feat: address consolidated issues plan to reach 10/10 pre-finetuning readiness`  
**Mục tiêu tài liệu:** Ghi lại các lỗi và khoảng trống còn tồn tại trong ứng dụng, benchmark, dữ liệu và báo cáo trước khi dự án chuyển sang bước tiếp theo.

> **Phạm vi:** Đây là kế hoạch rà soát và sửa lỗi tiền đề. Tài liệu không yêu cầu huấn luyện mô hình, chỉnh tham số train, cài đặt adapter hay sửa mã trong `experiments/training/`. Lượt rà soát này chỉ đọc mã và dữ liệu; chưa chạy test suite hoặc benchmark.

## 1. Kết luận hiện tại

Project đã sửa được một số lỗi quan trọng: khi thiếu Jest, coverage runner không còn trả coverage 100% giả; điểm mutation gán cứng đã được bỏ; pipeline dùng sandbox khi preview; thao tác chấp nhận preview đã có callback lưu file; Auto-Fix đã xét cả lỗi khi chạy test.

Project **chưa nên dùng các số liệu hiện tại làm bằng chứng hoàn thiện**. Các điểm cần giải quyết trước gồm:

1. Traceability tự sinh có thể gán sai hoặc gán nhãn chung cho test case.
2. Báo cáo công bố kết quả chưa có artifact tương ứng trong workspace; mutation harness mới bao phủ một service.
3. Telemetry trong extension tính `success` theo cú pháp, không theo kết quả chạy test.
4. Cờ tắt coverage không được tôn trọng khi pipeline chạy ở chế độ `dryRun`.
5. Bộ kiểm thử và validator chưa được chạy trong môi trường hiện tại vì chưa có `node_modules`.
6. Một số mô tả phạm vi và prompt strategy trong báo cáo không khớp cách mã nguồn đang hoạt động.

## 2. Việc cần xử lý theo mức ưu tiên

### P0 — Phải hoàn tất trước khi tin cậy dữ liệu và kết quả benchmark

#### 2.1. Traceability của các scenario chưa được xác nhận

**Hiện trạng**

`experiments/dataset/export_fine_tuning_dataset.ts` tự dò từ khóa trong tên test để ghép scenario với Gherkin hoặc Business Rule. Chỉ cần trùng một từ khóa, exporter có thể coi là đã tìm thấy liên kết. Khi không tìm thấy, nó tự tạo tham chiếu chung như `AC-STD` hoặc `AC-BND`. Validator hiện chỉ loại một số chuỗi placeholder (`Rule for`, `TODO`, giá trị rỗng), nên các nhãn chung này vẫn qua kiểm tra.

Trong các JSONL hiện tại có 4 scenario validation/test còn tham chiếu chung:

| Service | Scenario | Tham chiếu hiện tại |
|---|---|---|
| `S04_TaxCalculator` | `TC_05`, `TC_06` | `AC-STD: Standard functional behavior...` |
| `S05_SlugGenerator` | `TC_04` | `AC-STD: Standard functional behavior...` |
| `S05_SlugGenerator` | `TC_05` | `AC-BND: Boundary limits...` |

Đây không chứng minh rằng assertion trong test thật sự kiểm tra acceptance criterion được nêu.

**Vì sao phải sửa**

Traceability sai khiến dữ liệu mô tả một mối liên hệ không có căn cứ. Validator báo dữ liệu hợp lệ nhưng người đọc không thể lần từ test đến yêu cầu gốc. Điều đó làm giảm độ tin cậy của benchmark và mọi kết luận rút ra từ nó.

**Cách sửa**

1. Rà soát từng scenario trong cả 15 service, đối chiếu trực tiếp `requirement.md` với test name, input và assertion.
2. Tạo bảng ánh xạ có kiểm soát, ví dụ `scenarioId → AC/BR id → assertion/test name`; ưu tiên trỏ tới mã AC/BR thật trong tài liệu thay vì sinh mô tả chung.
3. Không tự gán `AC-STD`, `AC-BND` hoặc `AC-ERR` khi không tìm thấy liên kết. Đưa scenario vào danh sách cần người rà soát hoặc loại khỏi dữ liệu được xuất cho đến khi xác minh.
4. Sửa validator để từ chối tiền tố chung trên, kiểm tra mã AC/BR có tồn tại trong requirement tương ứng, và báo rõ scenario nào chưa được ánh xạ.
5. Chạy lại exporter sau khi bảng ánh xạ được duyệt; kiểm tra diff JSONL và giữ bản ánh xạ cùng phiên bản dataset.

**Sau khi sửa**

Mỗi scenario được giữ lại đều trỏ tới yêu cầu hoặc quy tắc có thật và assertion cụ thể. Trường hợp chưa xác minh sẽ không được validator âm thầm chấp nhận.

**Tiêu chí hoàn tất**

- Không còn traceability chung hoặc không có nguồn trong JSONL.
- Validator thất bại nếu thiếu AC/BR hợp lệ hoặc mã tham chiếu không tồn tại.
- Có thể lần từ mỗi scenario qua test assertion đến dòng yêu cầu tương ứng.

#### 2.2. Kết quả thực nghiệm trong báo cáo chưa có dữ liệu nguồn để đối chiếu

**Hiện trạng**

`docs/COMPREHENSIVE_PROJECT_REPORT.md` nêu rằng 15 bộ ground-truth test đã chạy trong Docker và báo cáo các giá trị coverage trung bình. Báo cáo cũng nói dữ liệu thô nằm trong `experiments/results/`, nhưng thư mục đó hiện không có trong workspace. `experiments/run_mutation_testing.ts` hiện chạy ground truth cho `S01_DiscountCalculator`; các test sinh chỉ được chạy nếu có file theo tên cố định của S01. Vì vậy mã hiện có chưa chứng minh được ma trận mutation trên toàn bộ benchmark.

**Vì sao phải sửa**

Số liệu không có log, file tổng hợp và cấu hình nguồn không thể được kiểm tra hoặc tái tạo. Chạy mutation trên một service cũng không hỗ trợ kết luận về toàn benchmark.

**Cách sửa**

1. Cài dependency đúng theo lockfile, sau đó chạy validator, test suite và các lệnh đánh giá đã có trong `package.json`.
2. Chạy ground-truth evaluation cho toàn bộ 15 service; lưu log, kết quả từng service và file tổng hợp tại `experiments/results/`.
3. Mở rộng harness mutation để nhận danh sách service và test đầu vào thay vì gắn cố định S01. Mỗi kết quả phải giữ trạng thái mutant và mẫu số dùng để tính score.
4. Nếu chưa chạy được toàn benchmark, sửa báo cáo để ghi rõ số service thực sự đã chạy và giới hạn của kết quả; không trình bày số dự kiến như số đo.
5. Gắn mỗi bảng kết quả với artifact, lệnh chạy, phiên bản mã và thời điểm tạo.

**Sau khi sửa**

Mỗi con số trong báo cáo lần được về kết quả thô. Phạm vi kết luận đúng với phạm vi service đã chạy.

**Tiêu chí hoàn tất**

- Có artifact cho mỗi metric được công bố.
- Mutation được chạy trên các service được nêu trong báo cáo, không dựa trên score nhập tay.
- Báo cáo phân biệt rõ số đo thật, giới hạn thử nghiệm và kế hoạch tương lai.

#### 2.3. Báo cáo mô tả prompt strategy và phạm vi hỗ trợ chưa khớp mã nguồn

**Hiện trạng**

Khi `ablationMode` là `full` (giá trị mặc định từ `ContextExtractor`), `zero-shot`, `few-shot` và `CoT` đều có thể nhận `requirementDoc` và `astSummary`; Hybrid cũng nhận các phần ngữ cảnh đó. Riêng Few-Shot dùng exemplar Discount Calculator viết cố định trong mã nguồn, không phải ví dụ được chọn động từ “Train Set” như báo cáo mô tả. Báo cáo còn trình bày năng lực đa ngôn ngữ rộng, trong khi evaluator thực nghiệm chính hiện dựa trên TypeScript/Jest.

**Vì sao phải sửa**

Người đọc không thể hiểu các strategy khác nhau ở điểm nào hoặc tái tạo điều kiện thực nghiệm nếu bảng mô tả không phản ánh prompt thật. Tên parser hỗ trợ ngôn ngữ không đồng nghĩa đã có runner và benchmark chạy được cho ngôn ngữ đó.

**Cách sửa**

1. Đối chiếu từng dòng trong bảng strategy với nội dung prompt thực tế, gồm BA, AST, exemplar và định dạng đầu ra.
2. Mô tả Few-Shot đúng là đang dùng exemplar cố định; không gọi exemplar đó là ví dụ lấy từ tập train.
3. Ghi rõ phạm vi đã được đánh giá tự động là TypeScript/Jest. Tách parser/prototype hoặc Go demo khỏi tuyên bố đã đánh giá đa ngôn ngữ.
4. Nếu một prompt strategy có chế độ ablation riêng, ghi lại chế độ thực sự dùng trong từng benchmark run.

**Sau khi sửa**

Tài liệu phản ánh đúng đầu vào và phạm vi đã triển khai; người khác có thể hiểu chính xác kết quả đang nói về điều gì.

**Tiêu chí hoàn tất**

- Bảng strategy khớp với code hiện hành.
- Không gọi hỗ trợ parser là hỗ trợ đánh giá đầu-cuối.
- Các giới hạn TypeScript/Jest được ghi rõ ở phần phạm vi và kết luận.

### P1 — Phải sửa để số liệu và hành vi ứng dụng phản ánh đúng trạng thái

#### 2.4. Chỉ số `success` của extension có thể báo thành công khi test fail

**Hiện trạng**

`packages/extension/src/services/test_generation_service.ts` ghi `success` bằng `syntaxValidation.isValid`. Khi mã test đúng cú pháp nhưng Jest fail assertion, metric vẫn được tính là thành công. `ExtensionMetricsCollector` dùng trường này để tính `successRate`, nên tên tỷ lệ hiện gây hiểu sai chất lượng đầu ra.

**Vì sao phải sửa**

Tỷ lệ thành công bị thổi phồng khi test chỉ parse được nhưng không chạy qua. Người dùng và báo cáo cũng không phân biệt được sinh mã, cú pháp hợp lệ, chạy được và assertion pass.

**Cách sửa**

1. Tách trạng thái thành các trường riêng: sinh được, cú pháp hợp lệ, runner có thực thi, suite pass, coverage có dữ liệu.
2. Tính `successRate` theo định nghĩa được ghi rõ; không dùng tính hợp lệ cú pháp thay cho test pass.
3. Khi coverage/test không được chạy, ghi `not_run` hoặc trạng thái tương đương; không tính trường hợp này là pass hay fail nghiệp vụ.
4. Cập nhật UI/toast để nói rõ “đã sinh mã”, “test đã chạy và pass”, hoặc “chưa chạy được”, tránh gom thành một thông báo thành công.

**Sau khi sửa**

Metric thể hiện đúng từng giai đoạn của pipeline, và tỷ lệ pass chỉ tăng khi test thực sự được chạy và pass.

**Tiêu chí hoàn tất**

- Có test bao phủ bốn trường hợp: lỗi cú pháp, runner không chạy, suite fail, suite pass.
- Aggregate không tính suite fail hoặc chưa chạy thành pass.

#### 2.5. Cấu hình tắt coverage bị bỏ qua trong chế độ preview

**Hiện trạng**

Extension gọi pipeline với `dryRun: true`. Điều kiện trong `generator_pipeline.ts` chạy CoverageRunner khi `options.runCoverage || options.dryRun`. Vì vậy `autoRunCoverage=false` vẫn không ngăn coverage chạy ở luồng preview.

**Vì sao phải sửa**

Setting trong giao diện không làm đúng điều người dùng cấu hình; preview có thể chạy Jest ngoài dự kiến, tốn thời gian hoặc báo lỗi môi trường không liên quan tới thao tác chỉ muốn xem mã.

**Cách sửa**

1. Tách rõ hai tùy chọn: `dryRun` quyết định có ghi file đích hay không; `runCoverage` quyết định có chạy test/coverage hay không.
2. Chỉ chạy CoverageRunner khi `runCoverage` bật. Nếu một lệnh nội bộ cần coverage khi dry-run, lệnh đó phải truyền `runCoverage: true` rõ ràng.
3. Thêm kiểm tra cho cả hai cấu hình `dryRun=true, runCoverage=false` và `dryRun=true, runCoverage=true`.

**Sau khi sửa**

Preview không ghi file đích và chỉ chạy test khi cấu hình yêu cầu; setting coverage có hiệu lực nhất quán.

**Tiêu chí hoàn tất**

- Khi `runCoverage=false`, mock/runner không bị gọi dù `dryRun=true`.
- Khi `runCoverage=true`, coverage chạy trên file tạm và file tạm được dọn sau đó.

### P2 — Cần hoàn tất để xác nhận toàn bộ thay đổi

#### 2.6. Chưa có kết quả chạy kiểm chứng trong workspace hiện tại

**Hiện trạng**

Workspace hiện không có thư mục `node_modules`. Vì vậy lần rà soát này chưa xác nhận test suite, dataset validator hoặc compile extension bằng thực thi thật. Đây là khoảng trống kiểm chứng, không phải bằng chứng rằng các test đang fail.

**Vì sao phải sửa**

Đọc mã tĩnh không xác nhận được import, runner, Jest, TypeScript build hoặc cleanup sandbox hoạt động đúng trong môi trường thực tế.

**Cách sửa**

Sau khi xử lý các mục P0/P1, khôi phục dependency từ lockfile và chạy tuần tự các lệnh sau; lưu kết quả chạy để đối chiếu:

```bash
npm ci
npm test -- --runInBand
npm run dataset:validate
npm run compile:extension
```

Nếu lệnh nào thất bại, ghi log và sửa lỗi trước khi đánh dấu điều kiện đó hoàn tất. Không thay số liệu báo cáo bằng kết quả dự kiến.

**Sau khi sửa**

Có bằng chứng chạy thực tế cho test suite, validator và build extension; các lỗi môi trường được tách khỏi lỗi mã nguồn.

**Tiêu chí hoàn tất**

- Lưu log/exit code của cả bốn lệnh.
- Mọi test và validator liên quan tới các sửa đổi đều pass trong môi trường đã khai báo.

#### 2.7. Benchmark hiện nhỏ và chỉ kiểm chứng tự động trên TypeScript/Jest

**Hiện trạng**

Manifest hiện có 15 service, chia 9 train, 3 validation và 3 test; toàn bộ benchmark chính là TypeScript. Đây phù hợp làm bộ pilot nhỏ, nhưng chưa đủ để khẳng định kết quả tổng quát cho nhiều dự án hoặc ngôn ngữ. Go demo riêng không đồng nghĩa pipeline evaluation đã chạy Go.

**Vì sao phải sửa**

Kết quả trên số lượng nhỏ có thể phụ thuộc vào đặc điểm riêng của vài service. Tuyên bố rộng hơn phạm vi benchmark sẽ không được dữ liệu hiện tại hỗ trợ.

**Cách sửa**

1. Trước mắt ghi phạm vi kết luận là benchmark pilot TypeScript/Jest với đúng 15 service.
2. Không dùng kết quả hiện tại để khẳng định hiệu quả trên Python, Go, Java hoặc dự án bất kỳ.
3. Nếu mục tiêu dự án cần kết luận tổng quát, bổ sung service từ nhiều project/nguồn độc lập và xây runner thật cho từng ngôn ngữ trước khi gộp kết quả.

**Sau khi sửa**

Phạm vi tuyên bố phù hợp quy mô dữ liệu; hạn chế của bộ pilot được thể hiện rõ thay vì bị hiểu thành kết quả tổng quát.

**Tiêu chí hoàn tất**

- Báo cáo gọi bộ hiện tại là pilot và nêu rõ TypeScript/Jest, 15 service.
- Mỗi ngôn ngữ được tuyên bố là đã đánh giá phải có test runner và artifact thực tế tương ứng.

## 3. Những sửa đổi đã có trong mã nguồn, không cần lặp lại

Các điểm sau đã được cải thiện trong commit đang rà soát. Cần giữ chúng và xác nhận bằng test ở mục 2.6, nhưng không cần thực hiện lại theo kế hoạch cũ:

- `CoverageRunner` trả `executed: false` khi không nạp được Jest; không còn nhánh trả coverage giả 100%.
- Script mutation không còn gán trực tiếp score cho các strategy; phần còn thiếu là phạm vi chạy hiện mới gắn với S01.
- `GeneratorPipeline` dùng dry-run sandbox, giữ import tương đối và không ghi đè file đích trước khi người dùng chấp nhận.
- Preview đã có callback lưu mã khi người dùng chấp nhận.
- Auto-Fix đã được kích hoạt cho lỗi cú pháp hoặc lỗi assertion sau khi runner thực thi.

## 4. Cổng hoàn tất trước khi chuyển giai đoạn

Chỉ đánh dấu dự án sẵn sàng chuyển bước sau khi:

- [ ] Traceability của các scenario được đối chiếu với yêu cầu và validator từ chối nhãn chung.
- [ ] Các số liệu trong báo cáo có artifact nguồn; phạm vi mutation được nêu đúng.
- [ ] Mô tả prompt strategy và phạm vi ngôn ngữ khớp với code.
- [ ] Telemetry phân biệt sinh mã, syntax, thực thi và pass/fail.
- [ ] `dryRun` và `runCoverage` hoạt động độc lập đúng cấu hình.
- [ ] Test suite, dataset validator và compile extension đã được chạy thành công, có log.
- [ ] Báo cáo gọi rõ benchmark hiện tại là pilot TypeScript/Jest gồm 15 service.

## 5. Đường dẫn đã rà soát

- `experiments/dataset/export_fine_tuning_dataset.ts`
- `experiments/dataset/validate_dataset.ts`
- `experiments/dataset/dataset_manifest.json`
- `experiments/dataset/fine_tuning_train.jsonl`
- `experiments/dataset/fine_tuning_val.jsonl`
- `experiments/dataset/fine_tuning_test.jsonl`
- `experiments/run_mutation_testing.ts`
- `experiments/batch_runner.ts`
- `experiments/evaluate_generated_tests.ts`
- `packages/core/src/pipeline/coverage_runner.ts`
- `packages/core/src/pipeline/generator_pipeline.ts`
- `packages/core/src/prompts/`
- `packages/extension/src/services/test_generation_service.ts`
- `packages/extension/src/services/metrics_collector.ts`
- `docs/COMPREHENSIVE_PROJECT_REPORT.md`
