# Tổng hợp lỗi và kế hoạch sửa trước khi fine-tuning

**Ngày rà soát:** 10/10/2026  
**Mục tiêu:** Tập hợp các lỗi và thiếu sót đã phát hiện trong project, giải thích vì sao cần xử lý, hướng sửa cụ thể và trạng thái mong đợi sau khi hoàn tất.

## 1. Tóm tắt hiện trạng

Project đã có những tiến triển quan trọng: bỏ fallback coverage giả 100%, bỏ mutation score gán cứng, bổ sung AST summary vào prompt, tạo manifest dữ liệu và xuất các tập JSONL train/validation/test. Tuy nhiên, các thay đổi này **chưa đủ để bắt đầu fine-tuning có thể đánh giá đáng tin cậy**.

Các điểm nghẽn lớn nhất hiện nay:

1. Test sinh trong sandbox có thể không import được service gốc.
2. Auto-Fix chưa xử lý đúng lỗi test chạy thất bại và chưa xác minh đúng môi trường.
3. JSONL chưa truy vết scenario về acceptance criterion cụ thể; chỉ có 9 mẫu train.
4. Validator chưa kiểm tra tính toàn vẹn của chính các JSONL và phân hoạch manifest.
5. Báo cáo vẫn công bố số liệu không có artifact trong workspace và mô tả một số chức năng sai với mã.
6. Chưa có mã huấn luyện LoRA/QLoRA hoặc cơ chế nạp adapter hoàn chỉnh.
7. Chưa chạy được kiểm thử trong môi trường hiện tại vì thiếu Jest và ts-node.

Điểm tiến độ chuẩn bị cho fine-tuning ở lần rà soát này: **6/10**. Điểm này phản ánh mức sẵn sàng kỹ thuật và thực nghiệm, không phải điểm chấm cuối của đề tài.

## 2. Các hạng mục đã sửa hoặc sửa một phần

### 2.1. Coverage giả 100% — Đã sửa trong mã, chưa xác minh runtime

**File:** [`coverage_runner.ts`](../packages/core/src/pipeline/coverage_runner.ts)

**Trước đây:** Nếu Jest không được nạp, runner trả về suite pass và 100% coverage.

**Hiện trạng:** Nhánh thiếu Jest hiện trả `executed: false`, `suitePassed: false`, không có coverage và có lỗi giải thích. Điều này loại bỏ đường tạo điểm coverage giả đã phát hiện.

**Việc còn cần làm:** Bổ sung test riêng mô phỏng Jest không khả dụng. Test hiện có kiểm tra file test không tồn tại, tình huống này trả về trước nhánh thiếu Jest nên chưa bảo vệ trực tiếp lỗi cũ.

**Sau khi hoàn tất:** Regression test chứng minh rằng dù Jest thiếu hoặc lỗi khởi tạo, evaluator không thể ghi lượt chạy thành pass và không thể tạo coverage 100% giả.

**Tiêu chí xác nhận:** Có test cho trường hợp `runCLI` không khả dụng; kết quả phải là `executed: false`, `suitePassed: false`, `coverage === undefined`.

### 2.2. Mutation score gán cứng — Đã bỏ số gán sẵn, phạm vi chạy còn hẹp

**File:** [`run_mutation_testing.ts`](../experiments/run_mutation_testing.ts), [`mutation_runner.ts`](../packages/core/src/mutation/mutation_runner.ts)

**Trước đây:** Script tạo điểm Hybrid/Zero-Shot bằng các hằng số thay vì chạy mutation test thật.

**Hiện trạng:** Hằng số đã được bỏ. Runner phân biệt assertion fail với lỗi suite không chạy được; compile/runtime error không bị tính thành mutant bị kill.

**Vấn đề còn lại:** Script vẫn cố định service S01 và chỉ tìm một số tên file test đã định trước. Nếu các file đó không có, báo cáo chỉ có kết quả ground truth, chưa tạo được so sánh strategy. Chưa có ma trận mutation thực tế cho toàn bộ benchmark.

**Cách sửa:**

1. Cho script đọc danh sách service và các output thực sự có từ manifest/results, thay vì cố định S01.
2. Chỉ so sánh các strategy/model có kết quả chạy hợp lệ trên cùng một service.
3. Lưu chi tiết mutant, trạng thái, lỗi và kết quả vào artifact theo từng service/model/strategy.
4. Nếu không đủ các arm để so sánh, báo rõ “không đủ dữ liệu”, không sinh bảng so sánh thiếu mà trông như kết quả đầy đủ.
5. Giữ riêng số mutant compile error, timeout, valid, killed, survived và công thức tính score.

**Sau khi sửa:** Mutation score của từng arm đến từ cùng một bộ mutant và cùng một service; mọi tỷ lệ có thể truy ngược tới kết quả từng mutant.

**Tiêu chí xác nhận:** Không còn score thủ công; báo cáo bỏ qua hoặc đánh dấu rõ arm thiếu output; chạy lại cùng cấu hình tạo artifact có thể kiểm tra.

### 2.3. BA và AST trong prompt — Đã cải thiện, cấu hình ablation và báo cáo chưa khớp

**Files:** [`context_extractor.ts`](../packages/core/src/extractor/context_extractor.ts), thư mục [`prompts`](../packages/core/src/prompts)

**Hiện trạng:** Extractor đã tạo `astSummary`; các prompt có thể đưa AST và yêu cầu BA vào. Context hiện mặc định là `full`, vì vậy các strategy hiện nhận thông tin tương đối đồng nhất.

**Vấn đề còn lại:** `ablationMode` chưa được cấu hình xuyên suốt pipeline/batch runner. Báo cáo nói Zero-Shot là code-only và Few-Shot dùng exemplar từ train set, nhưng mã hiện để full context mặc định và Few-Shot vẫn chứa exemplar cố định. Vì vậy mô tả thí nghiệm trong báo cáo không khớp cách chạy thực tế.

**Cách sửa:**

1. Chọn rõ một trong hai thiết kế: so sánh prompt strategy với cùng input; hoặc làm ablation code-only so với code + BA/AST. Có thể triển khai cả hai thành các thí nghiệm riêng.
2. Thêm cấu hình ablation vào `PipelineOptions` và batch runner; ghi `ablationMode` vào metadata từng lượt.
3. Nếu Few-Shot là một arm nghiên cứu, lấy exemplar chỉ từ train split và ghi lại ID exemplar. Không dùng service thuộc validation/test.
4. Cập nhật bảng trong báo cáo theo đúng prompt được thực thi.

**Sau khi sửa:** Có thể xác định điểm khác nhau giữa các arm là prompt strategy hay nguồn ngữ cảnh; không còn nhầm Few-Shot cố định thành Few-Shot lấy từ tập train.

**Tiêu chí xác nhận:** Log từng lượt có prompt/context version, ablation mode, exemplar IDs và model configuration.

## 3. Lỗi và thiếu sót cần sửa

### 3.1. Dry-run coverage chạy test ở thư mục không có service

**Files:** [`generator_pipeline.ts`](../packages/core/src/pipeline/generator_pipeline.ts), [`coverage_runner.ts`](../packages/core/src/pipeline/coverage_runner.ts)

**Hiện trạng:** Extension gọi pipeline với `dryRun: true`. Pipeline đặt test tạm trong `.pipeline_temp/temp.test.ts`, sau đó chạy Jest tại vị trí này. Test sinh thường import service bằng đường dẫn tương đối, nhưng sandbox không chứa file service tương ứng. Import như `./service` vì vậy sẽ trỏ vào thư mục tạm và thất bại.

**Vì sao cần sửa:** Preview có thể báo test không chạy được dù mã test hợp lệ. Coverage khi đó không đại diện cho chất lượng test, và người dùng không thể tin số liệu trong preview.

**Cách sửa:**

1. Tạo sandbox theo từng lượt ở vị trí có thể giữ đúng cấu trúc tương đối của service và test.
2. Sao chép service cùng các dependency nội bộ cần thiết vào sandbox; hoặc dùng evaluator đã có cơ chế chuẩn hóa import và chạy sandbox.
3. Truyền đường dẫn service mục tiêu cho coverage runner để chỉ đo coverage của service đó.
4. Xóa sandbox trong `finally`, kể cả khi Jest ném exception.
5. Bổ sung integration test dùng test có import tương đối tới service.

**Sau khi sửa:** Dry-run kiểm tra đúng output sẽ được lưu, không ghi đè file người dùng và không làm hỏng import tương đối.

**Tiêu chí xác nhận:** Một test sinh trong dry-run import được service, suite chạy thật, coverage trỏ đúng file service và thư mục tạm được dọn sau lượt chạy.

### 3.2. Auto-Fix chưa sửa assertion failure và sandbox thiếu service

**Files:** [`test_generation_service.ts`](../packages/extension/src/services/test_generation_service.ts), [`auto_fix_engine.ts`](../packages/extension/src/services/auto_fix_engine.ts)

**Hiện trạng:** Extension chỉ gọi Auto-Fix khi output lỗi cú pháp. Khi test biên dịch được nhưng assertion fail, vòng sửa không được gọi. Bên trong Auto-Fix, test mới được ghi vào `.autofix_sandbox`, nhưng service không được chép vào đó; import tương đối tới service có thể thất bại trong bước xác minh.

**Vì sao cần sửa:** Cơ chế hiện chưa thực hiện đầy đủ mục tiêu tự sửa test. Một lỗi import do sandbox có thể bị nhầm thành lỗi do nội dung test. Nếu báo cáo tính tỷ lệ Auto-Fix thành công theo cú pháp hợp lệ בלבד, kết quả cũng phóng đại khả năng sửa thực tế.

**Cách sửa:**

1. Sau lần chạy đầu, kích hoạt sửa khi suite lỗi assertion hoặc lỗi compile/import có thể khắc phục; phân loại lỗi môi trường riêng.
2. Chạy phiên bản test mới cùng service và dependency trong sandbox đúng cấu trúc, không kiểm tra file cũ ở vị trí khác.
3. Chỉ đặt `fixed: true` khi suite thực sự chạy và pass; cú pháp hợp lệ một mình không đủ.
4. Bảo vệ chất lượng test: không chấp nhận cách “sửa” bằng xóa assertion, bỏ test case nghiệp vụ hoặc làm assertion yếu đi.
5. Lưu output trước/sau, loại lỗi ban đầu, số vòng lặp và kết quả cuối để đánh giá thật.

**Sau khi sửa:** Auto-Fix chỉ báo thành công khi bộ test mới chạy và pass trong môi trường có đúng service; lỗi môi trường và lỗi logic được phân biệt.

**Tiêu chí xác nhận:** Có test cho syntax error, assertion failure, import error và Jest unavailable; chỉ hai trường hợp sửa thành công và chạy pass mới được tính là fixed.

### 3.3. Acceptance criteria trong JSONL chưa được truy vết thật

**File:** [`export_fine_tuning_dataset.ts`](../experiments/dataset/export_fine_tuning_dataset.ts)

**Hiện trạng:** Script suy ra mô tả scenario từ tên test, nhưng nếu không có tham chiếu thì tạo `acceptanceCriteriaRef` chung dạng `Rule for <service>`. JSONL hiện tại cho thấy các scenario đều dùng tham chiếu chung này; `expectedBehavior` cũng thường là câu mặc định “Asserted successfully in test code”.

**Vì sao cần sửa:** Tập dữ liệu không thể dạy mô hình liên kết test với yêu cầu BA nếu label không chỉ ra AC cụ thể. Tên test có thể gợi ý hành vi nhưng không chứng minh test đáp ứng tiêu chí nào.

**Cách sửa:**

1. Rà soát từng requirement và ground truth test.
2. Tạo mapping có định danh rõ: `AC-ID → test scenario → test name/assertion`.
3. Ghi mô tả kỳ vọng dựa trên assertion cụ thể, không dùng câu mặc định chung.
4. Với scenario không gắn được AC, đánh dấu `unmapped` và không tuyên bố scenario đó có traceability.
5. Bổ sung kiểm tra tự động từ chối dữ liệu có ref placeholder `Rule for ...`, `TODO`, hoặc expected behavior mặc định.

**Sau khi sửa:** Mỗi scenario trong dữ liệu huấn luyện có tham chiếu nghiệp vụ kiểm tra được hoặc được khai báo rõ là không truy vết được.

**Tiêu chí xác nhận:** Không còn placeholder ref trong dữ liệu train/validation/test; người rà soát có thể mở AC và test assertion theo ID.

### 3.4. Tập dữ liệu quá nhỏ cho kết luận fine-tuning

**Files:** [`dataset_manifest.json`](../experiments/dataset/dataset_manifest.json), [`fine_tuning_train.jsonl`](../experiments/dataset/fine_tuning_train.jsonl), [`fine_tuning_val.jsonl`](../experiments/dataset/fine_tuning_val.jsonl), [`fine_tuning_test.jsonl`](../experiments/dataset/fine_tuning_test.jsonl)

**Hiện trạng:** Có 15 service: 9 train, 3 validation và 3 test, mỗi service tạo một record hội thoại. Đây là quy mô phù hợp để kiểm thử exporter hoặc làm pilot nhỏ, nhưng chưa đủ để khẳng định fine-tuning tổng quát hóa.

**Vì sao cần sửa:** Một hoặc hai mẫu khác biệt có thể làm thay đổi mạnh kết quả trên ba service holdout. Tập nhỏ cũng dễ khiến model ghi nhớ cấu trúc riêng của các service thay vì học quy luật sinh test.

**Cách sửa:**

1. Giữ split theo service/project để chống leakage; không chia các test case của cùng service sang nhiều split.
2. Mở rộng số service/domain và tình huống; ưu tiên diversity về dependency, async behavior, boundary, exception và mocking.
3. Bổ sung mẫu tổng hợp chỉ khi có nguồn gốc rõ, chạy được và được rà soát thủ công.
4. Giữ test holdout cố định, không dùng nó chọn prompt, epoch hay checkpoint.
5. Nếu không thể mở rộng kịp, giới hạn kết luận ở **pilot/feasibility study**, nêu rõ số mẫu và độ bất định.

**Sau khi sửa:** Dataset có đủ độ đa dạng cho mục tiêu nghiên cứu hoặc kết luận được giới hạn đúng mức theo quy mô mẫu.

**Tiêu chí xác nhận:** Có manifest, nguồn gốc, split và checklist chất lượng cho từng record; không có service gần trùng giữa train và holdout.

### 3.5. Validator chưa kiểm tra JSONL và tính đầy đủ của split

**File:** [`validate_dataset.ts`](../experiments/dataset/validate_dataset.ts)

**Hiện trạng:** Validator kiểm tra ID giao nhau giữa các mảng split và sự tồn tại của file service/requirement/test. Nó chưa đảm bảo các mảng split là phân hoạch chính xác của toàn bộ service trong manifest; cũng chưa đọc JSONL để đối chiếu số record, schema, ID hoặc split.

**Vì sao cần sửa:** Có thể thiếu service, lặp ID hoặc JSONL cũ nhưng validator vẫn báo split độc lập. Kiểm tra file nguồn không xác nhận file huấn luyện đã xuất ra đúng.

**Cách sửa:**

1. Xác nhận tất cả ID trong split tồn tại trong `manifest.services`, không lặp, và hợp của train/validation/test bằng đúng tập service.
2. Kiểm tra trường `split` của từng service khớp với manifest.
3. Đọc cả ba JSONL; xác nhận parse được từng dòng, có roles/schema bắt buộc, đúng số record và đúng ID của split tương ứng.
4. Phát hiện record trùng, service overlap và nội dung source/requirement/test bị lệch so với file nguồn.
5. Kiểm tra không có placeholder traceability và báo lỗi theo từng record.

**Sau khi sửa:** Lệnh validate là cổng kiểm tra thực sự cho cả nguồn dữ liệu và artifact mà trainer sẽ nạp.

**Tiêu chí xác nhận:** Thử cố tình bỏ, lặp hoặc đổi split một record phải khiến validator thoát với mã lỗi khác 0 và nêu chính xác record sai.

### 3.6. Số liệu trong báo cáo chưa có artifact truy nguồn

**File:** [`COMPREHENSIVE_PROJECT_REPORT.md`](COMPREHENSIVE_PROJECT_REPORT.md)

**Hiện trạng:** Báo cáo tuyên bố 15 ground truth đã chạy trong Docker và đưa các tỷ lệ coverage tổng hợp; đồng thời nói dữ liệu nằm trong `experiments/results/`. Thư mục kết quả này không có trong workspace tại lượt rà soát. Không chạy được `npm test` hoặc `dataset:validate` ở môi trường hiện tại.

**Vì sao cần sửa:** Người đọc không thể tái lập hoặc kiểm tra các số liệu. Dù số có thể từng được đo ở môi trường khác, thiếu raw output và cấu hình khiến tuyên bố hiện tại chưa kiểm chứng được.

**Cách sửa:**

1. Chạy benchmark trên môi trường có dependencies và lưu raw JSON/CSV, log, Docker/config/version cùng lệnh chạy.
2. Chỉ giữ số có artifact nguồn; các số chưa chạy phải đổi thành mục tiêu hoặc trạng thái chưa đo.
3. Tách rõ kết quả ground truth, kết quả sinh bởi model, số liệu pilot và mục tiêu tương lai.
4. Sửa mô tả Stryker nếu đang dùng `MutationRunner` tự viết; không ghi là tích hợp Stryker khi chưa có.
5. Sửa tiêu đề mục 7 bị lặp và cập nhật kết luận để chỉ phản ánh năng lực đã kiểm chứng.

**Sau khi sửa:** Mỗi metric có raw artifact, số mẫu, cấu hình, phiên bản model và cách tính; báo cáo không trộn mục tiêu với kết quả.

**Tiêu chí xác nhận:** Có thể tái tạo bảng từ artifact; đường dẫn `experiments/results/` tồn tại hoặc báo cáo không còn tuyên bố dữ liệu ở đó.

### 3.7. Chưa có trainer LoRA/QLoRA và adapter chưa được nạp

**Files liên quan:** [`config_manager.ts`](../packages/extension/src/services/config_manager.ts), [`types.ts`](../packages/extension/src/types.ts), [`package.json`](../packages/extension/package.json)

**Hiện trạng:** Project có exporter JSONL và một số trường cấu hình model. Chưa thấy script huấn luyện, cấu hình hyperparameter/checkpoint, lưu adapter, hoặc quy trình đánh giá model fine-tuned. `adapterPath` được đọc vào cấu hình nhưng không dùng khi tạo gateway; `fineTunedModel` được dùng như tên model truyền cho provider.

**Vì sao cần sửa:** Chọn một model name không tương đương với huấn luyện hoặc nạp LoRA adapter. Trạng thái hiện tại chưa thể tái tạo quy trình từ JSONL đến model FT và so sánh với base model.

**Cách sửa:**

1. Tạo thư mục train riêng với script SFT LoRA/QLoRA, cấu hình nền tảng/mô hình, tokenizer, sequence length, batch/gradient accumulation, learning rate, epoch, seed và checkpoint policy.
2. Ghi adapter, tokenizer/config, log huấn luyện và hash dataset; không sửa test holdout trong quá trình chọn checkpoint.
3. Chọn rõ cách phục vụ model: nạp adapter tại runtime tương thích, merge adapter thành model mới, hoặc triển khai endpoint model riêng. Ghi rõ cách đó trong README.
4. Chỉ giữ `adapterPath` nếu có thành phần thật sự sử dụng nó; nếu model server nhận một model đã đóng gói/đăng ký, dùng tên model đó và bỏ cấu hình gây hiểu nhầm.
5. Tách cấu hình `baseModel` và `fineTunedModel` để cùng provider, cùng prompt và cùng điều kiện inference.
6. Thêm script benchmark so sánh base/FT tự động trên test holdout và lưu đầy đủ output/metric.

**Sau khi sửa:** Có quy trình tái tạo được từ dataset version đến checkpoint/adapter và có thể chạy hai arm base/FT trong cùng harness.

**Tiêu chí xác nhận:** Một lệnh hoặc tài liệu vận hành đủ chi tiết để huấn luyện lại; metadata run chỉ rõ base revision, adapter revision và dataset hash.

### 3.8. Dependencies thiếu khiến chưa xác minh được các sửa đổi

**Kết quả lệnh tại lần rà soát:** `npm test -- --runInBand` thất bại vì `jest` không được nhận diện; `npm run dataset:validate` thất bại vì `ts-node` không được nhận diện.

**Vì sao cần sửa:** Chưa thể biết test mới có pass, TypeScript có compile, dataset có hợp lệ và ground truth có chạy thật hay không. Đây là hạn chế môi trường hiện tại, không tự nó chứng minh mã nguồn sai.

**Cách sửa:**

1. Cài dependencies đúng theo lockfile tại root bằng quy trình nhóm đang dùng.
2. Chạy test suite, dataset validator và compile extension; lưu log kết quả.
3. Sửa test/code cho tới khi các lệnh qua; không cập nhật báo cáo bằng số liệu suy đoán.
4. Đảm bảo CI hoặc tài liệu hướng dẫn chứa cùng các lệnh để thành viên khác tái lập.

**Sau khi sửa:** Các thay đổi được xác minh trên môi trường chạy thật; có log và kết quả để trích dẫn vào báo cáo.

**Tiêu chí xác nhận:** Jest suite pass, `dataset:validate` pass, TypeScript extension compile pass; các lượt không chạy được được báo là lỗi môi trường chứ không phải pass.

### 3.9. Tài liệu User Story benchmark 15 không có trong workspace

**Hiện trạng:** Trong workspace hiện thấy `docs/USER_STORIES_BENCHMARK_17.md` và `docs/USER_STORIES.md`; không tìm thấy `docs/USER_STORIES_BENCHMARK_15.md` dù tab IDE hiển thị tên đó.

**Vì sao cần xử lý:** Tab có thể trỏ tới file đã đổi tên/di chuyển hoặc file chưa lưu. Nếu người đọc theo liên kết tài liệu không tìm thấy bản được trích dẫn, việc đối chiếu yêu cầu và test bị gián đoạn.

**Cách sửa:** Xác nhận bản 15 US còn cần dùng không. Nếu cần, khôi phục hoặc tạo liên kết chuyển tiếp tới bản chính thức; nếu đã thay bằng bản 17, đóng/xóa tham chiếu cũ và cập nhật README/link.

**Sau khi sửa:** Chỉ còn một nguồn chính thức hoặc có quy tắc chuyển hướng rõ; mọi tài liệu benchmark mở được từ repository.

**Tiêu chí xác nhận:** `rg --files docs` cho thấy đúng file được nhóm chọn làm nguồn chuẩn và các liên kết nội bộ không trỏ tới file mất.

## 4. Thứ tự triển khai khuyến nghị

### Giai đoạn A — Bảo đảm kết quả không sai

1. Cài dependencies và chạy các kiểm thử hiện có.
2. Sửa sandbox dry-run để import service đúng.
3. Sửa Auto-Fix và thêm test cho lỗi syntax/assertion/import/môi trường.
4. Chạy lại benchmark ground truth; lưu artifact thật.
5. Đồng bộ báo cáo với artifact, xóa tuyên bố chưa xác minh.

### Giai đoạn B — Bảo đảm dữ liệu fine-tuning có nhãn đúng

1. Tạo traceability AC → scenario → assertion cho từng service.
2. Sửa exporter để không sinh ref/expected behavior placeholder.
3. Mở rộng dữ liệu hoặc xác định rõ phạm vi pilot.
4. Nâng cấp validator để kiểm tra manifest và ba JSONL.

### Giai đoạn C — Bảo đảm so sánh công bằng và tái lập

1. Chọn thiết kế prompt strategy/ablation và cập nhật batch runner.
2. Sinh baseline cho cùng các service/context/configuration.
3. Chạy mutation thật trên các output có đủ điều kiện.
4. Tạo trainer LoRA/QLoRA, lưu adapter và metadata.
5. So sánh base-vs-FT trên test holdout chưa dùng trong lựa chọn cấu hình.

## 5. Cổng sẵn sàng trước fine-tuning

Chỉ bắt đầu fine-tuning pilot khi các điều kiện sau được đánh dấu hoàn thành:

- [ ] Coverage/mutation không thể trả điểm giả; mọi trường hợp lỗi môi trường được tách riêng.
- [ ] Dry-run và Auto-Fix chạy đúng source/test trong sandbox.
- [ ] Không có placeholder AC reference trong các JSONL dùng huấn luyện/đánh giá.
- [ ] Validator xác nhận manifest, split và JSONL khớp hoàn toàn.
- [ ] Báo cáo hiện tại không chứa số liệu thiếu artifact.
- [ ] Base/FT sử dụng cùng context, prompt, framework, temperature/token budget và holdout.
- [ ] Có script huấn luyện, cấu hình, checkpoint/adapter và log có thể tái tạo.
- [ ] Test suite, dataset validation và compile đã chạy qua trên môi trường có dependencies.

Khi hoàn thành, project sẽ chuyển từ trạng thái **có cấu trúc dữ liệu và thử nghiệm fine-tuning ban đầu** sang trạng thái **có benchmark tin cậy, dữ liệu gắn nhãn có thể kiểm tra và quy trình base-vs-FT tái lập**. Điều đó làm kết quả nghiên cứu thuyết phục hơn; không tự đảm bảo một mức điểm cụ thể.
