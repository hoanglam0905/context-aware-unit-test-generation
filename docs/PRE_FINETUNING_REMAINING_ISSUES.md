# Đánh giá lại dự án và kế hoạch hoàn thiện

**Ngày rà soát:** 13/10/2026  
**Commit được rà soát:** `0528ce8` — `feat: address post-commit review with syntax-safe mutation operators, AST filtering, and mutation refinement integration`  
**Phạm vi:** toàn bộ mã nguồn ứng dụng, core pipeline, extension, benchmark, artifact, CI và tài liệu hiện có trong repository.

> **Giới hạn theo yêu cầu của bạn:** bạn chưa bắt đầu fine-tuning. Lần rà soát này không chạy, sửa hoặc đề xuất quy trình huấn luyện; không gọi LLM và không thay đổi mã nguồn ứng dụng. Tôi chỉ đọc mã/tài liệu/artifact và cập nhật file đánh giá này. Không chạy test hay benchmark trong lượt này, vì vậy các kết quả thực nghiệm bên dưới được trích từ artifact đã lưu, chưa được chạy lại độc lập.

## 1. Điểm hiện tại

Điểm là đánh giá kỹ thuật tham khảo từ trạng thái repository, không phải điểm chính thức của giảng viên. Điểm tổng hợp dùng trọng số: sáng tạo 25%, độ hoàn thiện 25%, độ tin cậy/an toàn 20%, bằng chứng đánh giá 20%, tài liệu/tái lập 10%.

| Hạng mục | Điểm | Nhận xét ngắn |
|---|---:|---|
| **Sáng tạo ứng dụng** | **8,8/10** | Đã thêm AST scenario filtering, method metadata, cloud consent và command mutation refinement; ý tưởng có tính ứng dụng rõ. Điểm chưa cao hơn vì refinement chưa thật sự chạy vòng sinh–đánh giá, và đang có đường ghi đè file bằng prompt. |
| **Độ hoàn thiện chức năng** | **7,4/10** | Commit mới nối thêm nhiều luồng và phân biệt UAT tự động/thủ công. Tuy nhiên một số luồng chưa an toàn với trạng thái panel được tái sử dụng; method slice chỉ là metadata/chữ ký; UI vẫn cho chấp nhận lúc loading/lỗi. |
| **Độ tin cậy và an toàn** | **6,8/10** | CSP, host path pinning, AST parser và consent modal là cải thiện. Refinement có thể hiển thị thống kê tổng hợp giả và có thể ghi prompt lên test file; preview filter phía client khác host filter. |
| **Bằng chứng thực nghiệm** | **6,8/10** | Mutation operator mới giảm compile error còn 26/178, tỷ lệ hợp lệ khoảng 85,4%; có ground-truth artifact cho 15 service. Chưa có batch/evaluation artifact của test do LLM sinh; điểm mutation hiện 65,79% trên tập mutant đã thay đổi. |
| **Tài liệu và khả năng tái lập** | **6,8/10** | CI đã thêm compile extension, dataset validation và package. Checklist minh bạch hơn nhưng vẫn có trạng thái Interactive đạt chưa kèm bằng chứng; README/báo cáo còn số liệu cũ và repository có nhiều bản đánh giá trùng. |
| **Tổng thể hiện tại** | **7,5/10** | Có tiến bộ thực chất so với commit trước, nhất là lọc AST, consent, CI và tỷ lệ mutant hợp lệ. Điểm bị giữ lại bởi lỗi nghiêm trọng trong mutation refinement và thiếu bằng chứng chất lượng cho test LLM sinh. |

Không thể cam kết điểm 10 nếu chưa biết rubric của giảng viên và chưa có demo/đánh giá người dùng. Những tiêu chí ở cuối tài liệu là điều kiện kỹ thuật để tiến gần mức đó.

## 2. Điểm mạnh và những phần đã cải thiện

1. **Ý tưởng có ích trong quy trình phát triển:** nối tài liệu nghiệp vụ với mã nguồn để hỗ trợ viết unit test ngay trong IDE, giảm việc chuyển qua lại giữa tài liệu, code và công cụ AI.
2. **Core có cấu trúc tương đối rõ:** parser/context extractor, requirement parser, bốn prompt strategy, LLM gateway, post-processor, coverage runner và mutation runner được tách thành module.
3. **Có ứng dụng VS Code để trình diễn:** CodeLens, sidebar, preview, cấu hình model, sinh test theo file/method và lưu sau khi người dùng chấp nhận.
4. **Webview an toàn hơn:** CSP nonce và `textContent` giảm rủi ro XSS từ nội dung model; host cố định output path nếu đã được cấu hình.
5. **Scenario filtering chuyển sang TypeScript AST** ở host, tránh tự đếm brace để cắt block test. Mapping scenario–test vẫn đang dùng title/description/thứ tự nên chưa chắc chắn trong mọi output.
6. **Method context được nhận diện:** extractor có `targetMethodSlice` và prompt nhận signature mục tiêu; source code và AST summary toàn file vẫn được gửi kèm, nên chưa phải source slice biệt lập.
7. **Có command mutation refinement và privacy modal cloud.** Đây là tiến bộ về mặt luồng sản phẩm, nhưng code refinement hiện có lỗi dùng summary giả và liên kết trạng thái panel; xem mục 4.5.
8. **Mutation artifact mới có tỷ lệ mutant hợp lệ tốt hơn** so với lần trước; điểm số không so trực tiếp được vì tập mutant và toán tử đã đổi.
9. **CI workflow đã thêm** compile extension, dataset validation và đóng gói VSIX; checklist hiện tách kiểm chứng tự động khỏi thao tác trên Extension Host.

## 3. Bằng chứng đang có và giới hạn kết luận

- `experiments/results/ground_truth_eval_summary.json` ghi **15/15 ground-truth suites pass**, tổng **133 test**. Artifact báo line coverage trung bình **98,09%** và branch coverage trung bình **91,76%**. Đây chứng minh bộ test chuẩn hiện có chạy qua trong lần ghi artifact; nó **không** chứng minh test do LLM sinh đạt chất lượng tương tự.
- `experiments/results/mutation_summary.json` và `mutation_report.md` ở commit mới ghi **178 mutant**, trong đó **152 hợp lệ**, **100 killed**, **52 survived**, **26 compile error**, score tổng hợp **65,79%** trên mutant hợp lệ. Tỷ lệ hợp lệ khoảng **85,4%**, cải thiện rõ. Một số service vẫn có 100% trên mẫu nhỏ (ví dụ S06 3 mutant, S11 3, S12 4); report cần trình bày cả denominator và không so trực tiếp với artifact cũ vì tập mutation đã thay đổi.
- `experiments/results/` hiện có ba artifact: ground-truth summary, mutation summary và mutation report. Chưa có `batch_run_manifest.json`, `batch_summary.csv` hay kết quả evaluation của test do model/strategy sinh. Vì vậy chưa có bằng chứng trong workspace để xác nhận chiến lược nào tốt hơn, pass rate của test sinh ra, hay mutation score trên test sinh ra.
- Dataset manifest ghi 15 service, 133 scenario, chia 9/3/3 service với 89/17/27 scenario. Validator kiểm tra phân hoạch, file, schema JSONL và một số mẫu chuỗi traceability; các bước đó không tương đương với đánh giá chuyên gia rằng từng scenario/expected behavior thật sự đúng BA và khớp assertion trong test.
- `docs/ACCEPTANCE_CHECKLIST.md` đã phân biệt trạng thái CI với trạng thái Interactive; phần lớn luồng Interactive đang chờ kiểm chứng. Riêng UAT-03 vẫn ghi Interactive **ĐẠT** dù không có host evidence thấy trong repository. Test path traversal trong `acceptance.test.ts` chỉ kiểm tra giá trị `_targetOutputPath`, chưa gửi payload độc hại và xác nhận host từ chối ghi file.
- `experiments/results/` vẫn chỉ có ground-truth summary và mutation artifacts; chưa có batch manifest/output/evaluation của test do LLM sinh. Module refinement có command mới nhưng chưa có artifact chứng minh test được sinh thêm và mutant sống sót bị diệt sau vòng sửa.

## 4. Các vấn đề còn tồn tại và cách hoàn thiện

### 4.1. Checklist UAT đã minh bạch hơn nhưng vẫn còn dòng thiếu bằng chứng

**Hiện trạng:** Checklist mới tách “Tự động (CI/Jest)” khỏi “Interactive (VS Code Host)” và phần lớn host UAT đang chờ kiểm chứng. Tuy nhiên UAT-03 vẫn đánh dấu Interactive `ĐẠT` mà repository chưa có log/ảnh Extension Host; checklist còn gọi mọi lệnh trong bảng là được tự động hóa qua CI, trong khi workflow không chạy `experiment:mutation --all`. Một số cột tự động cũng mạnh hơn kiểm tra thực tế: UAT-06 test chỉ set rồi đọc `_targetOutputPath`, không gửi path traversal và xác nhận không có file ngoài ý muốn.

**Vì sao phải sửa:** Tách cấp độ kiểm thử là tiến bộ, nhưng một ô `ĐẠT` chưa có evidence và nhầm unit test với kiểm thử luồng thật vẫn có thể làm sai kết luận khi chấm/demo.

**Cách sửa:** Đổi riêng UAT-03 Interactive thành `Chờ kiểm chứng`; ghi rõ mutation benchmark là lệnh chạy riêng nếu không nằm trong CI. Sửa UAT-06 thành kiểm thử message handler với path độc hại, callback và filesystem tạm. Gắn từng trạng thái automated với test cụ thể; gắn trạng thái host với ngày chạy, VS Code version, commit, log/ảnh.

**Sau khi sửa:** Checklist phân biệt được “có test tự động cho một thành phần” với “người dùng đã chạy thành công toàn luồng”.

**Hoàn tất khi:** Không còn trạng thái interactive `ĐẠT` thiếu bằng chứng; mọi dòng tự động tương ứng với test thật đang được CI chạy.

### 4.2. Lọc AST ở host tốt hơn, nhưng mapping và preview vẫn có thể lệch

**Hiện trạng:** Host filter trong `test_code_filter.ts` đã chuyển sang TypeScript AST, đây là sửa đúng. Tuy nhiên scenario được ghép theo `title.includes(id)`, 25 ký tự đầu description, rồi fallback theo vị trí nếu số test block bằng số scenario. `it.each(...)` chưa được nhận diện; nếu parser không tìm ra block nào thì hàm trả nguyên code. Trong khi đó `preview_panel.ts` vẫn lọc code hiển thị bằng thuật toán client-side dựa trên dòng/ID, còn host khi bấm lưu chạy AST filter lần nữa.

**Vì sao phải sửa:** Mapping theo chuỗi hoặc thứ tự có thể gán nhầm khi title gần giống, model đổi cách đặt tên, có test phụ hoặc test parameterized. UI và file lưu dùng hai thuật toán khác nhau nên người dùng có thể duyệt một bộ test nhưng lưu bộ khác.

**Cách sửa:** Tạo ID ổn định cho test block và truyền mapping từ post-processor về UI/host, không suy luận theo title/position. Dùng cùng một kết quả lọc của host để cập nhật preview; xử lý `it.each`, `test.each`, `concurrent` hoặc báo rõ cú pháp chưa hỗ trợ. Với block không mapping được, dừng lưu và yêu cầu người dùng xem lại thay vì trả nguyên hoặc cắt theo dự đoán.

**Sau khi sửa:** Preview và file lưu là cùng một nội dung; chọn/bỏ chọn từng scenario luôn ánh xạ rõ tới test tương ứng.

**Hoàn tất khi:** Có kiểm chứng cho title không chứa ID, title trùng/gần giống, test parameterized, test phụ, zero selection và trường hợp mapping thất bại; nội dung preview bằng nội dung sẽ ghi file.

### 4.3. Consent cloud đã có, nhưng phạm vi đồng ý còn quá rộng

**Hiện trạng:** Cloud provider giờ hiển thị modal và dừng nếu người dùng không chọn đồng ý; `autoGenerateOnSave` fallback đã đổi sang `false`. Consent được lưu bằng một boolean chung cho mọi provider. `PRIVACY_CONSENT_ACKNOWLEDGED` cũng bỏ qua modal khi biến môi trường có giá trị truthy.

**Vì sao phải sửa:** Người dùng đồng ý với một cloud provider có thể bị xem như đã đồng ý cho provider khác sau khi đổi cấu hình. Một biến môi trường có giá trị chuỗi `false` vẫn truthy trong JavaScript và có thể vô tình bỏ qua modal.

**Cách sửa:** Gắn consent với provider và phạm vi dữ liệu được gửi; hỏi lại nếu provider thay đổi. Parse biến môi trường đúng boolean (`true`/`1`) hoặc bỏ đường bypass này; ghi rõ cách thu hồi consent. Giữ fallback auto-generate là `false`.

**Sau khi sửa:** Quyết định gửi code/BA ra ngoài có phạm vi rõ và không bị chuyển ngầm sang dịch vụ khác.

**Hoàn tất khi:** Từng provider được xác nhận riêng; giá trị env `false` không được coi là đồng ý; từ chối/thu hồi chặn request.

### 4.4. Mutation operators đã cải thiện nhưng chưa hoàn toàn cú pháp-an toàn

**Hiện trạng:** Artifact mới giảm compile error từ 166/291 xuống **26/178**; 152 mutant hợp lệ, score **65,79%**. Tỷ lệ hợp lệ 85,4% là tiến bộ. Nhưng `mutators.ts` vẫn làm biến đổi theo dòng bằng regex, không phải AST rewrite như một số phần tài liệu diễn đạt; string/comment/type context có thể gây mutation sai hoặc compile error. Các service có score 100% vẫn chỉ có 3–4 mutant hợp lệ.

**Vì sao phải sửa:** Số compile error đã thấp hơn nhưng vẫn có thể làm lệch phân bố giữa mutator/service. Điểm score cũng phụ thuộc tập operator hiện tại và không thể so thẳng với commit trước sau khi tập mutant thay đổi.

**Cách sửa:** Ưu tiên AST node transformation cho operator; nếu giữ regex thì xác định token span bằng lexer/parser và bỏ qua literal/comment/type-only syntax. Phân loại 26 lỗi còn lại; báo tổng mutant, tỷ lệ hợp lệ, loại lỗi, score và denominator theo từng service/operator. Ghi rõ hai artifact dùng mutant set khác nhau; không gọi 100% trên mẫu nhỏ là chất lượng hoàn hảo.

**Sau khi sửa:** Mutation score phản ánh thay đổi hành vi thực, có tỷ lệ hợp lệ/denominator nhìn thấy được và có thể so sánh giữa lần chạy cùng cấu hình operator.

**Hoàn tất khi:** Mutation set qua kiểm tra cú pháp/type và sanity check; số mutant tối thiểu mỗi service/operator được công bố; report giải thích equivalent mutant và compile error.

### 4.5. Mutation refinement hiện có thể hiển thị số liệu giả và ghi đè test bằng prompt

**Hiện trạng:** Command mới gọi `refineWithMutation`, nhưng đường dẫn `mutation_summary.json` dựa trên `__dirname` đã compile/package và VSIX không chứa thư mục `experiments`. Việc tìm kết quả lại so `serviceId` như `S01_DiscountCalculator` với basename file nguồn (thường là `service` hoặc tên class), nên thường không tìm được summary. Khi không tìm thấy, code tự dựng `MutationSummary` bằng công thức `mutants.length - 2`, đánh dấu hai mutant đầu sống sót và hiển thị score như kết quả thật mà không chạy mutant hay test. Sau đó command đặt feedback prompt vào trường `testCode` của preview chung, không gọi LLM để sinh test, không chạy test/mutant lại. Nếu preview đang mở từ lần Generate trước, `_targetOutputPath` và `_onAcceptCallback` cũ vẫn còn; bấm “Chấp nhận & Lưu” có thể ghi feedback prompt lên file test trước đó. Nút Accept cũng đang bật khi panel mới chỉ hiển thị trạng thái loading hoặc payload báo lỗi.

**Vì sao phải sửa:** Đây vừa là sai lệch số liệu vừa có nguy cơ phá nội dung test người dùng đã có. Một command được giới thiệu là refinement không được báo mutant/score giả hoặc dùng nút lưu test cho văn bản prompt.

**Cách sửa:** Xóa hoàn toàn fabricated fallback; nếu không có summary khớp đúng service/source version thì báo “chưa có kết quả mutation” và không đưa ra score. Lưu manifest ánh xạ canonical service ID ↔ path/hash, hoặc chạy mutation thực trên test suite tương ứng. Tách refinement sang panel read-only, xóa callback/output path cũ và ẩn/vô hiệu hóa Accept; hoặc hoàn thiện đúng vòng: lấy survived mutant thật → gọi LLM → tạo test code → syntax/execution/mutation validate → chỉ cho lưu bản đã duyệt. Mỗi lần đổi nội dung panel phải reset target/callback. Disable Accept trong loading, khi error, khi code rỗng hoặc chưa hợp lệ.

**Sau khi sửa:** Không có metric bịa; refinement không thể ghi đè file test bằng prompt; chỉ test code đã sinh và được kiểm tra mới có thể lưu.

**Hoàn tất khi:** Không còn nhánh dựng summary giả; artifact khớp service và source hash; có kiểm thử click Accept sau khi tái sử dụng panel; kết quả refinement có mutation run trước/sau hoặc UI ghi rõ chỉ là gợi ý.

### 4.6. Method metadata đã có nhưng source vẫn là toàn file

**Hiện trạng:** Extractor tạo `targetMethodSlice` với class, method, parameters, return type và signature; prompt dùng chữ ký này. Nhưng `promptContext.serviceCode` vẫn nhận toàn bộ source, `buildAstSummary` vẫn liệt kê toàn bộ class/method. Nếu không tìm thấy method, `targetMethodSlice` chỉ vắng mặt, còn `targetMethodName` tiếp tục được gửi như prompt text. Overload và method trùng tên giữa class cũng không được xác định duy nhất.

**Vì sao phải sửa:** Đưa signature vào prompt giúp định hướng nhưng chưa bảo đảm output chỉ kiểm thử method mục tiêu. Tên không tồn tại hoặc trùng có thể tạo kết quả sai mà không báo lỗi.

**Cách sửa:** Lấy AST node và source range thực của method, xác nhận symbol/class/overload trước khi gọi model; nếu không tìm thấy thì dừng và báo rõ. Gửi source slice method cùng dependency cần thiết, hoặc ghi tường minh phần code toàn file chỉ là context và kiểm tra output scope. Thêm kiểm thử cho overload/tên trùng, method thiếu, standalone function và nhiều class.

**Sau khi sửa:** Method command có scope xác định, có lỗi đầu vào rõ ràng và không phụ thuộc riêng vào instruction trong prompt.

**Hoàn tất khi:** Prompt/output có target AST duy nhất; các trường hợp thiếu/trùng được xử lý; test không sinh suite cho method ngoài target.

### 4.7. Chưa có benchmark đầu ra của test do LLM sinh

**Hiện trạng:** Batch runner và evaluation/mutation runner đã có; runner mutation đã hỗ trợ tìm output nested. Nhưng thư mục `experiments/results/` hiện chưa có batch manifest, batch summary hoặc generated test output. Artifact đang chứng minh ground truth và mutation của ground truth, chưa chứng minh chất lượng sản phẩm sinh test. README gốc mô tả ma trận 240 experiment nhưng không có artifact tương ứng trong workspace.

**Vì sao phải sửa:** Đây là khoảng trống lớn nhất để kết luận ứng dụng có hiệu quả. Ground truth pass/coverage cao chỉ chứng minh test mẫu chuẩn tốt; không chứng minh LLM tạo được test đúng nghiệp vụ.

**Cách sửa:** Chạy benchmark có kiểm soát sau khi luồng app/runner ổn định; lưu run ID, commit, provider/model/version, prompt strategy, tham số, thời gian, token/cost nếu có, raw response, test sau xử lý, lỗi và coverage/mutation result. So sánh các strategy trên cùng service/context; báo compile rate, execution/pass rate, line/branch coverage, mutation score và traceability theo service, cùng giới hạn mẫu. Không ghi số liệu mô phỏng hoặc kết quả từ ground truth như kết quả model.

**Sau khi sửa:** Có bằng chứng tái lập để trả lời hệ thống sinh được gì, so với baseline nào, trên phạm vi nào và thường thất bại ở đâu.

**Hoàn tất khi:** Có manifest nối được run → cấu hình → output → evaluation; bảng kết quả có cả thành công và lỗi; artifact được lưu và báo cáo trỏ đúng artifact.

### 4.8. Tài liệu đã thu hẹp tuyên bố polyglot nhưng vẫn cần chứng minh E2E TS/JS

**Hiện trạng:** README mới ghi Java/Python/Go/C# là prototype, đây là cải thiện. Tuy nhiên vẫn khẳng định TypeScript/JavaScript đã “kiểm chứng toàn diện End-to-End”; checklist hiện còn nhiều UAT Interactive chờ host. Trong code, CodeLens chỉ đăng ký TypeScript/JavaScript, còn runner/post-processor chính là Jest/TypeScript.

**Vì sao phải sửa:** Phân biệt prototype đã tốt hơn, nhưng tuyên bố E2E phải có bằng chứng Extension Host và không được suy từ unit tests/ground truth suite.

**Cách sửa:** Giữ scope công bố là TypeScript/Jest, JavaScript ở mức nào có thể chứng minh; chỉ dùng “E2E verified” sau khi có host run evidence theo commit. Các ngôn ngữ khác tiếp tục ghi prototype đến khi có adapter đầy đủ: parser/context, test framework, validator, runner và benchmark.

**Sau khi sửa:** Người đọc không nhầm parser prototype với năng lực sinh và chạy test đã hoàn thiện.

**Hoàn tất khi:** Ma trận ngôn ngữ nêu riêng parse/generate/validate/run; mọi tuyên bố E2E gắn với acceptance evidence.

### 4.9. Kiểm định traceability dữ liệu còn dựa nhiều vào cấu trúc chuỗi

**Hiện trạng:** Validator kiểm tra phân hoạch service, schema và một số điều kiện ID/chuỗi. Kiểm tra requirement có nhánh regex chấp nhận từ khóa `Scenario` không gắn với số AC đang xét; validator không chứng minh expected behavior đúng nghiệp vụ, không chứng minh mỗi AC có assertion tương ứng trong test, và không ghi nhận người review nội dung.

**Vì sao phải sửa:** Manifest có thể hợp lệ về mặt JSON nhưng mapping BA → scenario → assertion vẫn sai hoặc chỉ đúng một phần. Các con số “0% leakage/traceability đã kiểm định” hiện dễ bị hiểu rộng hơn điều validator thật sự kiểm tra.

**Cách sửa:** Tách rõ kiểm tra hình thức và review ngữ nghĩa. Làm rule AC/BR khớp đúng ID trong chính requirement; thêm report các AC chưa có scenario, scenario chưa có test block và assertion không truy được; thực hiện review chéo có người kiểm tra và lưu trạng thái/ghi chú. Mô tả split là “service-level partition” và không gọi nó là kiểm chứng mọi dạng nội dung trùng lặp.

**Sau khi sửa:** Có thể kiểm toán từng liên kết requirement → scenario → test; tuyên bố về chất lượng dữ liệu phản ánh đúng mức kiểm chứng.

**Hoàn tất khi:** Không còn AC tham chiếu không tồn tại; mọi mapping có bằng chứng assertion hoặc được đánh dấu rõ là chưa phủ; có biên bản review nội dung.

### 4.10. Tài liệu có tiến bộ nhưng còn số liệu cũ và nhiều bản đánh giá trùng

**Hiện trạng:** README đã ghi rõ một số ngôn ngữ là prototype, nhưng còn tuyên bố TypeScript/JavaScript E2E chưa có host evidence và mô tả RAG/LLM-as-Judge/240 experiments ở các phần thiết kế. `COMPREHENSIVE_PROJECT_REPORT.md` vẫn mô tả S01 là 9 mutant, 8 killed, score 88,89%, trong khi artifact mới là 13 total, 12 killed, 92,31%; report nói refinement tự động cải thiện test dù code mới chỉ hiển thị prompt. Git còn ba file đánh giá cùng chủ đề: hai bản ở root có hậu tố `(1)`/`(2)` và bản `docs/PRE_FINETUNING_REMAINING_ISSUES.md`.

**Vì sao phải sửa:** Người đọc có thể trích nhầm score hoặc kế hoạch; ba tài liệu tương tự làm mất một nguồn sự thật và gây lặp/chênh nội dung. Tài liệu dùng “tự động/refinement” cho luồng chưa tạo/chạy lại test.

**Cách sửa:** Chọn một báo cáo đánh giá duy nhất làm canonical (giữ file trong `docs/`), hợp nhất thông tin mới cần thiết rồi loại bản trùng khỏi repository. Đồng bộ số mutation theo artifact commit `0528ce8`; sửa claim refinement và E2E theo code/evidence. Tách README quickstart khỏi nền tảng lý thuyết/proposal; đánh dấu feature hiện có, prototype và future work.

**Sau khi sửa:** Điểm số, phạm vi và trạng thái tính năng thống nhất giữa README, báo cáo, checklist và artifact; người chấm có một file đánh giá đầy đủ để tra cứu.

**Hoàn tất khi:** Chỉ còn một file đánh giá canonical; số liệu khớp artifact; mọi claim E2E/refinement có evidence hoặc được hạ thành prototype.

### 4.11. CI đã thêm các gate quan trọng; checklist cần khớp workflow

**Hiện trạng:** Workflow mới đã chạy `npm ci`, typecheck, `compile:extension`, `npm test`, `dataset:validate`, package VSIX và upload artifact. Đây là cải thiện đáng kể. Tuy nhiên checklist nói toàn bộ lệnh kiểm chứng tự động qua Actions nhưng mutation `--all` không có trong workflow; workflow cũng chưa cài VSIX/khởi chạy VS Code Extension Host để kiểm tra tương tác. Việc tôi rà soát tĩnh không xác minh run xanh trên GitHub.

**Vì sao phải sửa:** Tài liệu CI phải đúng với những gì workflow thực thi; build/package thành công chưa chứng minh extension cài và hoạt động trong host.

**Cách sửa:** Sửa checklist để đánh dấu mutation full benchmark là lệnh thủ công/scheduled nếu chưa thêm job. Lưu link run CI theo commit. Thêm Extension Host smoke test ở pipeline release; kiểm tra package artifact được tạo từ đúng commit/version. Giữ mutation full run ở job riêng nếu thời gian PR không phù hợp.

**Sau khi sửa:** Người đọc thấy chính xác gate nào tự động, gate nào thủ công; có bằng chứng CI và gói VSIX dùng được.

**Hoàn tất khi:** Checklist khớp YAML; có CI run xanh gắn với release; VSIX cài/activate qua Extension Host.

## 5. Lộ trình ưu tiên để nâng điểm

### Giai đoạn A — Khóa tính đúng và độ tin cậy

1. Sửa lỗi mutation refinement: bỏ summary giả, sửa mapping service, tách panel read-only/flow tạo test thật; reset target/callback khi đổi panel.
2. Disable Accept khi đang loading, lỗi, output rỗng hoặc chưa được kiểm tra; kiểm tra handler lưu file với path độc hại.
3. Dùng AST mapping ổn định cho scenario và cùng một kết quả host-side trong preview/lưu; hỗ trợ hoặc từ chối minh bạch `it.each`.
4. Giới hạn target method bằng AST node/source range và báo lỗi method không tồn tại/trùng.
5. Consent riêng theo provider; parse env đúng boolean. Phần fallback auto-generate đã fail-closed.
6. Phân loại 26 compile-error mutant còn lại và trình bày denominator/tỷ lệ hợp lệ.
7. Giữ checklist interactive ở trạng thái chờ tới khi có host evidence.

### Giai đoạn B — Chứng minh sản phẩm tạo ra kết quả tốt

1. Chạy batch thực với cấu hình được ghim và lưu run manifest/raw artifacts.
2. Đo test sinh theo compile rate, pass rate, coverage, mutation, traceability và latency; so sánh prompt strategies trên cùng tập.
3. Review nội dung benchmark/mapping BA; không dùng pass của ground truth làm bằng chứng cho output LLM.
4. Bổ sung smoke/integration UAT cho VS Code và lưu ảnh/log theo release; workflow CI hiện đã build/package nhưng chưa chạy Extension Host.

### Giai đoạn C — Hoàn thiện phạm vi, trình bày và tính sáng tạo

1. Tiếp tục công bố TypeScript/Jest là phạm vi benchmark; giữ các parser khác ở trạng thái prototype cho đến khi có runner.
2. Đồng bộ README/report/checklist theo artifact mới và gộp các file đánh giá trùng thành một nguồn chính.
3. Làm điểm nhấn sáng tạo có kết quả đo được: BA-to-test traceability phát hiện AC chưa phủ hoặc mutation-guided refinement có score trước/sau thật.
4. Nếu có điều kiện, đánh giá QA/developer về thời gian, test được chấp nhận/chỉnh sửa và mức hữu ích; nêu số người và cách chấm.

## 6. Tiêu chí để tự tin hướng tới 10/10

- [ ] Luồng chính chạy được trong VS Code thật: tìm requirement, sinh preview, chọn test, chạy/hiển thị trạng thái, lưu hoặc hủy.
- [ ] Accept bị khóa khi loading/lỗi; panel refinement không thể ghi prompt hoặc dữ liệu cũ vào file test.
- [ ] Preview và file lưu dùng cùng mapping test AST; trường hợp mơ hồ được báo thay vì lưu khác preview.
- [ ] Cloud consent có phạm vi provider rõ; giá trị env `false` không bị coi là đã đồng ý.
- [ ] Method generation xác định target AST duy nhất, kiểm tra method không tồn tại/trùng và kiểm soát source scope.
- [ ] Mutation refinement chỉ báo số liệu chạy thật; có test code và mutation result trước/sau nếu tuyên bố đã cải thiện.
- [ ] Mutation benchmark có tỷ lệ mutant hợp lệ đủ cao, denominator rõ và không phóng đại score từ mẫu nhỏ.
- [ ] Có benchmark thật của output model, raw artifacts, cấu hình tái lập và phân tích lỗi; kết quả ground truth được báo riêng.
- [ ] BA → scenario → assertion có mapping kiểm chứng được; nội dung dataset có review và provenance rõ.
- [ ] Phạm vi ngôn ngữ trong UI/docs đúng với khả năng parse, generate, validate và run.
- [ ] CI chạy kiểm tra core, extension build và dataset; UAT/release có evidence theo đúng commit.
- [ ] Có ít nhất một cải tiến ứng dụng khác biệt được tích hợp và chứng minh bằng metric hoặc đánh giá người dùng.
- [ ] README và báo cáo phân biệt rõ triển khai, prototype, kết quả và future work.

## 7. Kết luận

Commit `0528ce8` đã xử lý trực tiếp một số nhận xét trước: lọc scenario dùng TypeScript AST ở host, method metadata được thêm vào context, có modal consent cloud, fallback auto-generate tắt, CI build/package extension và mutation artifact mới có tỷ lệ mutant hợp lệ cao hơn. Checklist cũng bắt đầu phân biệt CI với kiểm thử thủ công trên Host.

Điểm tổng thể cập nhật là **7,5/10**. Chưa nên tự chấm 10/10 vì command mutation refinement đang có nguy cơ hiển thị score không chạy thật và ghi prompt đè lên test file nếu panel được tái sử dụng; preview lọc client khác host; source method chưa thực sự bị giới hạn; chưa có benchmark artifact của test do LLM sinh; report/checklist vẫn có claim/số liệu cần khớp lại.

Đánh giá chỉ dựa trên mã, tài liệu và artifact của commit `0528ce8`; test/CI/VS Code extension không được chạy lại trong lượt này. Không có thao tác fine-tuning.
