# Đánh giá lại dự án và kế hoạch hoàn thiện

**Ngày rà soát:** 13/10/2026  
**Commit được rà soát:** `146da33` — `feat: achieve 10/10 pre-finetuning readiness with full 15-service mutation isolation, visual traceability, method scoping, and acceptance suite`  
**Phạm vi:** toàn bộ mã nguồn ứng dụng, core pipeline, extension, benchmark, artifact, CI và tài liệu hiện có trong repository.

> **Giới hạn theo yêu cầu của bạn:** bạn chưa bắt đầu fine-tuning. Lần rà soát này không chạy, sửa hoặc đề xuất quy trình huấn luyện; không gọi LLM và không thay đổi mã nguồn ứng dụng. Tôi chỉ đọc mã/tài liệu/artifact và cập nhật file đánh giá này. Không chạy test hay benchmark trong lượt này, vì vậy các kết quả thực nghiệm bên dưới được trích từ artifact đã lưu, chưa được chạy lại độc lập.

## 1. Điểm hiện tại

Điểm là đánh giá kỹ thuật tham khảo từ trạng thái repository, không phải điểm chính thức của giảng viên. Điểm tổng hợp dùng trọng số: sáng tạo 25%, độ hoàn thiện 25%, độ tin cậy/an toàn 20%, bằng chứng đánh giá 20%, tài liệu/tái lập 10%.

| Hạng mục | Điểm | Nhận xét ngắn |
|---|---:|---|
| **Sáng tạo ứng dụng** | **8,5/10** | Kết hợp yêu cầu BA, AST, sinh test bằng LLM, preview trong VS Code và vòng sửa lỗi tạo thành ý tưởng ứng dụng có giá trị. Điểm chưa cao hơn vì mutation-guided refinement mới là module rời, traceability/filter và method scope chưa chắc chắn trong luồng thực. |
| **Độ hoàn thiện chức năng** | **7,0/10** | Có core, extension, nhiều prompt strategy, Auto-Fix, benchmark và UI. Một số tính năng chỉ ở mức prototype hoặc chưa được kiểm chứng xuyên suốt bằng VS Code thật. |
| **Độ tin cậy và an toàn** | **6,8/10** | CSP và render an toàn đã được cải thiện. Lọc scenario dựa trên phân tích chuỗi dễ sai; thông báo cloud chưa phải cơ chế xin chấp thuận; checklist ghi trạng thái đạt vượt quá bằng chứng. |
| **Bằng chứng thực nghiệm** | **6,3/10** | Có kết quả ground-truth đủ 15 service và mutation artifact toàn bộ benchmark. Tuy nhiên hơn nửa mutant không hợp lệ do lỗi biên dịch và chưa có artifact batch của test do LLM sinh để so sánh strategy/model. |
| **Tài liệu và khả năng tái lập** | **6,7/10** | Có báo cáo, manifest, checklist và CI. README tổng vẫn trộn đề xuất với tính năng hiện có; checklist UAT tô xanh khi chưa có biên bản chạy; CI chưa chạy dataset validator hoặc compile/package extension riêng. |
| **Tổng thể hiện tại** | **7,2/10** | Đề tài có ý tưởng tốt và đã tiến xa hơn bản rà soát trước. Các điểm trừ chính nằm ở tính đúng của một số luồng người dùng và chất lượng bằng chứng, không phải thiếu thêm nhiều tính năng trình diễn. |

Không thể cam kết điểm 10 nếu chưa biết rubric của giảng viên và chưa có demo/đánh giá người dùng. Những tiêu chí ở cuối tài liệu là điều kiện kỹ thuật để tiến gần mức đó.

## 2. Điểm mạnh và những phần đã cải thiện

1. **Ý tưởng có ích trong quy trình phát triển:** nối tài liệu nghiệp vụ với mã nguồn để hỗ trợ viết unit test ngay trong IDE, giảm việc chuyển qua lại giữa tài liệu, code và công cụ AI.
2. **Core có cấu trúc tương đối rõ:** parser/context extractor, requirement parser, bốn prompt strategy, LLM gateway, post-processor, coverage runner và mutation runner được tách thành module.
3. **Có ứng dụng VS Code để trình diễn:** CodeLens, sidebar, preview, cấu hình model, sinh test theo file/method và lưu sau khi người dùng chấp nhận.
4. **Webview an toàn hơn bản trước:** có CSP với nonce; description/category từ payload được gán qua DOM API và `textContent`, không còn chèn mô tả bằng `innerHTML`.
5. **Một phần tương tác preview đã được nối:** checkbox cập nhật code preview; host nhận danh sách scenario và lọc lại trước khi lưu. Cách lọc hiện vẫn cần thay (mục 3.2).
6. **Method name đã đi đến prompt:** CodeLens truyền tên method qua service, pipeline và context extractor. Hiện đó là chỉ dẫn bằng prompt, chưa phải giới hạn dữ liệu AST/source ở method (mục 3.6).
7. **Mutation runner đã nhận diện nested output của batch** và từ chối dùng cùng một `--test` cho nhiều service; đây là cải thiện đúng hướng cho khả năng tái lập.
8. **Có CI workflow** cho cài dependency, typecheck, Jest coverage và Docker build. Cần bổ sung các gate riêng của extension/dataset như mục 3.9.

## 3. Bằng chứng đang có và giới hạn kết luận

- `experiments/results/ground_truth_eval_summary.json` ghi **15/15 ground-truth suites pass**, tổng **133 test**. Artifact báo line coverage trung bình **98,09%** và branch coverage trung bình **91,76%**. Đây chứng minh bộ test chuẩn hiện có chạy qua trong lần ghi artifact; nó **không** chứng minh test do LLM sinh đạt chất lượng tương tự.
- `experiments/results/mutation_summary.json` và `mutation_report.md` ghi **291 mutant**, trong đó **125 hợp lệ**, **82 killed**, **43 survived**, **166 compile error**, mutation score tổng hợp **65,6%** trên mutant hợp lệ. Tỷ lệ mutant hợp lệ chỉ khoảng **43%**. Một vài service có điểm 100% nhưng chỉ có 3/22 hoặc 4/32 mutant hợp lệ, nên chưa thể diễn giải là bộ test của các service đó có chất lượng gần tuyệt đối.
- `experiments/results/` hiện có ba artifact: ground-truth summary, mutation summary và mutation report. Chưa có `batch_run_manifest.json`, `batch_summary.csv` hay kết quả evaluation của test do model/strategy sinh. Vì vậy chưa có bằng chứng trong workspace để xác nhận chiến lược nào tốt hơn, pass rate của test sinh ra, hay mutation score trên test sinh ra.
- Dataset manifest ghi 15 service, 133 scenario, chia 9/3/3 service với 89/17/27 scenario. Validator kiểm tra phân hoạch, file, schema JSONL và một số mẫu chuỗi traceability; các bước đó không tương đương với đánh giá chuyên gia rằng từng scenario/expected behavior thật sự đúng BA và khớp assertion trong test.
- `docs/ACCEPTANCE_CHECKLIST.md` đánh dấu UAT-01 đến UAT-09 là **ĐẠT**. Tuy nhiên `packages/extension/src/acceptance.test.ts` chỉ có một số unit test cho CSP/render, lọc scenario và refiner; chúng không chạy toàn bộ VS Code user journey như checklist mô tả. Chưa có log/screenshot/biên bản cho các UAT đó trong artifact hiện thấy.

## 4. Các vấn đề còn tồn tại và cách hoàn thiện

### 4.1. Trạng thái UAT đang khẳng định mạnh hơn bằng chứng

**Hiện trạng:** Checklist ghi toàn bộ 9 kịch bản UAT “ĐẠT”, bao gồm CodeLens, method scope, lưu file, cloud disclosure, Auto-Fix và mutation refinement. Bộ acceptance tự động hiện là unit-level; không có bằng chứng chạy extension trong VS Code Extension Host cho toàn bộ luồng.

**Vì sao phải sửa:** Người chấm hoặc người dùng có thể hiểu checklist là kết quả kiểm thử thực tế. Nếu một luồng hỏng khi demo, tài liệu sẽ làm giảm độ tin cậy của toàn đề tài.

**Cách sửa:** Đổi trạng thái chưa có evidence thành `Chưa kiểm chứng` hoặc `Chưa chạy`. Với mỗi UAT, lưu ngày chạy, phiên bản VS Code/Node, commit, thao tác, kết quả quan sát và ảnh/log. Bổ sung integration/smoke test cho luồng quan trọng: mở service → tìm requirement → sinh preview → chọn scenario → chạy test → lưu/hủy. Chỉ chuyển thành `ĐẠT` sau khi có kết quả.

**Sau khi sửa:** Checklist phản ánh đúng trạng thái sản phẩm; có thể chứng minh từng user journey và phân biệt unit test với kiểm thử chấp nhận thực.

**Hoàn tất khi:** Mỗi dòng UAT có bằng chứng gắn với commit/release; các luồng chính chạy được trên phiên bản VS Code mục tiêu.

### 4.2. Lọc scenario chưa đủ chắc để quyết định test nào được lưu

**Hiện trạng:** `packages/extension/src/webview/test_code_filter.ts` dò `it(...)`/`test(...)` bằng regex và ghép theo ID hoặc 20 ký tự đầu của description. Nếu title do model sinh không chứa ID/đoạn description tương ứng, code có nhánh mặc định giữ test chưa nhận diện. Việc đếm dấu ngoặc nhọn theo từng ký tự cũng dễ lệch với chuỗi, comment, template literal hoặc cú pháp lồng nhau. Acceptance fixture hiện đặt ID trực tiếp vào tên test nên chưa đại diện các đầu ra không có ID.

**Vì sao phải sửa:** Checkbox có thể hiển thị đã bỏ chọn nhưng test tương ứng vẫn được giữ; hoặc lọc nhầm block. Đây là sai lệch giữa UI người dùng duyệt và file thực tế được lưu.

**Cách sửa:** Tạo quan hệ rõ ràng giữa scenario và test block trước khi hiển thị, chẳng hạn metadata có test title duy nhất/marker ổn định do post-processor sinh. Dùng parser AST phù hợp với Jest để nhận diện block test thay vì đếm `{}`. Trên host, chỉ cho phép ID đã có trong `_lastScenarios`, xử lý trường hợp không ánh xạ được theo hướng báo lỗi/đòi người dùng duyệt lại thay vì âm thầm giữ test. Bổ sung ca kiểm tra cho tên test không có ID, ID trùng, callback async, object/string có dấu ngoặc và test lồng.

**Sau khi sửa:** Code nhìn thấy trong preview và code ghi ra đĩa cùng phản ánh chính xác danh sách đã chọn; trường hợp mơ hồ không bị xử lý âm thầm.

**Hoàn tất khi:** Tập scenario được chọn ánh xạ một-một với block test; kiểm tra so sánh preview với nội dung file cho các trường hợp bình thường và biên.

### 4.3. Cloud disclosure chưa phải chấp thuận rõ ràng

**Hiện trạng:** `test_generation_service.ts` chỉ hiển thị thông báo nếu dùng Gemini/OpenAI/DeepSeek rồi vẫn tiếp tục gọi gateway. Mã đọc `process.env.PRIVACY_CONSENT_ACKNOWLEDGED`; setting `contextAwareTestGen.privacyConsentAcknowledged` trong package manifest chưa được dùng tại đây. `autoGenerateOnSave` khai báo mặc định `false`, nhưng `realtime_watcher.ts` dùng fallback `config.get('autoGenerateOnSave', true)`.

**Vì sao phải sửa:** Thông báo không cho người dùng cơ hội từ chối; setting có vẻ như chấp thuận nhưng không điều khiển hành vi. Fallback bật tự động cũng không an toàn nếu cấu hình không được nạp đúng.

**Cách sửa:** Đọc consent từ một nguồn cấu hình VS Code có tên rõ ràng; với provider cloud, dừng và xin xác nhận trước request đầu tiên nếu chưa đồng ý, lưu lựa chọn người dùng và cho phép đổi lại. Thông báo cần nói rõ code và requirement sẽ được gửi đến provider nào. Dùng fallback `false` cho auto-generate; không kích hoạt generation nền khi chưa bật opt-in. Không đưa nội dung code hoặc secret vào log.

**Sau khi sửa:** Người dùng hiểu dữ liệu nào rời máy, tới dịch vụ nào và chủ động bật/từ chối; tự động sinh khi lưu thực sự là opt-in.

**Hoàn tất khi:** Cloud request bị chặn trước consent; lựa chọn từ chối không phát sinh request; mặc định auto-generate tắt cả khi thiếu cấu hình.

### 4.4. Mutation score bị giới hạn bởi tỷ lệ mutant lỗi biên dịch

**Hiện trạng:** Artifact có 291 mutant nhưng 166 compile error. Công thức loại compile error khỏi mẫu số là thông lệ có thể dùng, nhưng nếu chỉ trình bày điểm 65,6% thì che khuất việc chỉ 125 mutant đánh giá được. Các điểm 100% ở một số service được tính trên số mutant hợp lệ rất nhỏ.

**Vì sao phải sửa:** Kết luận về chất lượng test không vững nếu mutation operators thường xuyên tạo ra code không thể đánh giá. Đặc biệt, 100% trên vài mutant không cùng ý nghĩa với 100% trên một tập mutant đủ rộng.

**Cách sửa:** Phân loại 166 lỗi theo mutator, vị trí và nguyên nhân; sửa AST transformation để tạo code hợp lệ, loại/đánh dấu rõ dạng mutation không áp dụng, và xác nhận mutant thay đổi đúng một hành vi. Báo đồng thời tổng mutant, mutant hợp lệ/tỷ lệ hợp lệ, compile error, killed, survived, equivalent/timeout nếu có và score theo từng service. Không so sánh service khi số mutant hợp lệ dưới ngưỡng đã công bố; bổ sung kiểm tra chất lượng của chính mutation operator.

**Sau khi sửa:** Mutation score dễ diễn giải, có phạm vi mẫu đủ tin cậy và người đọc nhìn thấy ngay tỷ lệ mutant dùng được thay vì chỉ một phần trăm tổng hợp.

**Hoàn tất khi:** Tỷ lệ mutant hợp lệ đạt ngưỡng đặt trước và công bố; bảng có denominator rõ; kết luận không gọi score 100% trên mẫu rất nhỏ là chất lượng hoàn hảo.

### 4.5. Mutation-guided refinement chưa được nối vào sản phẩm

**Hiện trạng:** `MutationGuidedRefiner` nằm trong core và có unit test gọi trực tiếp. `rg` theo repository cho thấy chưa có call site từ generator pipeline hoặc extension; report mô tả như thể module tự phân tích mutant rồi gửi prompt phản hồi. Trong refiner, `serviceCode` được nhận nhưng không dùng; các input/assertion gợi ý phần lớn là heuristic tổng quát, chưa chạy để chứng minh chúng diệt mutant cụ thể.

**Vì sao phải sửa:** Đây là điểm sáng tạo nổi bật nhưng nếu chỉ là module độc lập thì sản phẩm chưa có vòng cải thiện dựa trên mutation như tài liệu tuyên bố.

**Cách sửa:** Hoặc ghi rõ đây là prototype và không tuyên bố đã tích hợp, hoặc nối thành luồng có kiểm soát: chọn test suite → nhận mutant sống sót → tạo feedback gắn với đúng mutant → người dùng xem/duyệt → sinh test bổ sung → chạy lại mutant → báo score trước/sau và mutant nào bị diệt. Trước khi đưa feedback vào model, loại mutant compile-error và trường hợp tương đương; kiểm tra đề xuất có phân biệt được original/mutant.

**Sau khi sửa:** Người dùng có thể thấy một cải tiến đo được từ test ban đầu sang test sau refinement, làm rõ đóng góp sáng tạo thay vì chỉ có lớp API.

**Hoàn tất khi:** Có integration test hoặc demo có artifact trước/sau và kết quả mutant tương ứng; nếu chưa tích hợp thì tài liệu ghi rõ prototype.

### 4.6. Sinh test theo method hiện mới là hướng dẫn prompt

**Hiện trạng:** Method name đã đi qua CodeLens → service → pipeline → context extractor và được thêm vào prompt. Tuy nhiên extractor vẫn đưa toàn bộ `serviceCode` và AST summary của cả file vào prompt; chưa xác nhận method tồn tại hay cung cấp source slice/chữ ký method riêng. Vì vậy tiêu đề “method-level scoping” mạnh hơn cơ chế hiện tại.

**Vì sao phải sửa:** Model có thể sinh thêm test cho method khác hoặc dùng nhầm overload/tên trùng. Việc đưa context toàn file cũng khiến demo khó chứng minh chức năng thật sự giới hạn phạm vi.

**Cách sửa:** Lấy node method từ AST, xác nhận symbol và class chứa nó, đưa chữ ký/thân method cùng các dependency cần thiết vào context. Nếu vẫn cần source toàn file để tạo fixture, phân biệt rõ context hỗ trợ với target cần test. Sau sinh, kiểm tra scenario/test title có nhắm đúng method; báo lỗi dễ hiểu nếu method không tìm thấy hoặc tên bị mơ hồ.

**Sau khi sửa:** Lệnh method có đầu vào được giới hạn rõ, sinh output đúng mục tiêu hơn và có thể kiểm chứng bằng kiểm tra target thay vì chỉ dựa vào câu lệnh prompt.

**Hoàn tất khi:** Có kiểm tra cho method hợp lệ, không tồn tại, overload/tên trùng và file nhiều class; output không âm thầm mở rộng sang các method ngoài phạm vi.

### 4.7. Chưa có benchmark đầu ra của test do LLM sinh

**Hiện trạng:** Batch runner và evaluation/mutation runner đã có; runner mutation đã hỗ trợ tìm output nested. Nhưng thư mục `experiments/results/` hiện chưa có batch manifest, batch summary hoặc generated test output. Artifact đang chứng minh ground truth và mutation của ground truth, chưa chứng minh chất lượng sản phẩm sinh test. README gốc mô tả ma trận 240 experiment nhưng không có artifact tương ứng trong workspace.

**Vì sao phải sửa:** Đây là khoảng trống lớn nhất để kết luận ứng dụng có hiệu quả. Ground truth pass/coverage cao chỉ chứng minh test mẫu chuẩn tốt; không chứng minh LLM tạo được test đúng nghiệp vụ.

**Cách sửa:** Chạy benchmark có kiểm soát sau khi luồng app/runner ổn định; lưu run ID, commit, provider/model/version, prompt strategy, tham số, thời gian, token/cost nếu có, raw response, test sau xử lý, lỗi và coverage/mutation result. So sánh các strategy trên cùng service/context; báo compile rate, execution/pass rate, line/branch coverage, mutation score và traceability theo service, cùng giới hạn mẫu. Không ghi số liệu mô phỏng hoặc kết quả từ ground truth như kết quả model.

**Sau khi sửa:** Có bằng chứng tái lập để trả lời hệ thống sinh được gì, so với baseline nào, trên phạm vi nào và thường thất bại ở đâu.

**Hoàn tất khi:** Có manifest nối được run → cấu hình → output → evaluation; bảng kết quả có cả thành công và lỗi; artifact được lưu và báo cáo trỏ đúng artifact.

### 4.8. “Đa ngôn ngữ” hiện là khả năng nhận diện/prototype, chưa phải hỗ trợ đầu-cuối

**Hiện trạng:** `LanguageDetector`/universal parser nhận diện nhiều đuôi file, nhưng CodeLens chỉ đăng ký TypeScript/JavaScript; test post-processing và coverage runner vẫn gắn chặt với TypeScript/Jest. Vì vậy không nên mô tả Python/Java/C#/Go/PHP/C++ như các ngôn ngữ sinh–kiểm chứng test hoàn chỉnh.

**Vì sao phải sửa:** Người dùng có thể mở file được nhận diện nhưng nhận test framework, validator hoặc runner không phù hợp; tuyên bố polyglot cũng khó bảo vệ khi demo.

**Cách sửa:** Trong phiên bản hiện tại, công bố rõ phạm vi **TypeScript/Jest** (và JavaScript nếu pipeline thực chạy được); gọi parser các ngôn ngữ khác là prototype. Nếu muốn hỗ trợ ngôn ngữ khác, tạo adapter đầu-cuối riêng: parser/context, prompt, test framework, syntax/type validator, runner/coverage và benchmark sample. Chỉ thêm vào danh sách supported sau khi có acceptance test cho toàn luồng.

**Sau khi sửa:** Tài liệu và giao diện không hứa tính năng chưa có; hoặc mỗi ngôn ngữ được bật đều có luồng sinh–chạy–đánh giá tương ứng.

**Hoàn tất khi:** Bảng hỗ trợ ghi trạng thái cụ thể cho parse/generate/validate/run; các mục “supported” đều có kiểm thử đầu-cuối.

### 4.9. Kiểm định traceability dữ liệu còn dựa nhiều vào cấu trúc chuỗi

**Hiện trạng:** Validator kiểm tra phân hoạch service, schema và một số điều kiện ID/chuỗi. Kiểm tra requirement có nhánh regex chấp nhận từ khóa `Scenario` không gắn với số AC đang xét; validator không chứng minh expected behavior đúng nghiệp vụ, không chứng minh mỗi AC có assertion tương ứng trong test, và không ghi nhận người review nội dung.

**Vì sao phải sửa:** Manifest có thể hợp lệ về mặt JSON nhưng mapping BA → scenario → assertion vẫn sai hoặc chỉ đúng một phần. Các con số “0% leakage/traceability đã kiểm định” hiện dễ bị hiểu rộng hơn điều validator thật sự kiểm tra.

**Cách sửa:** Tách rõ kiểm tra hình thức và review ngữ nghĩa. Làm rule AC/BR khớp đúng ID trong chính requirement; thêm report các AC chưa có scenario, scenario chưa có test block và assertion không truy được; thực hiện review chéo có người kiểm tra và lưu trạng thái/ghi chú. Mô tả split là “service-level partition” và không gọi nó là kiểm chứng mọi dạng nội dung trùng lặp.

**Sau khi sửa:** Có thể kiểm toán từng liên kết requirement → scenario → test; tuyên bố về chất lượng dữ liệu phản ánh đúng mức kiểm chứng.

**Hoàn tất khi:** Không còn AC tham chiếu không tồn tại; mọi mapping có bằng chứng assertion hoặc được đánh dấu rõ là chưa phủ; có biên bản review nội dung.

### 4.10. README và báo cáo còn trộn thiết kế, prototype và triển khai thật

**Hiện trạng:** README gốc dài và chứa RAG, LLM-as-Judge, dashboard, ma trận 240 experiment cùng cấu trúc/roadmap như thể thuộc hệ thống hoàn chỉnh; artifact tương ứng chưa thấy. `docs/ACCEPTANCE_CHECKLIST.md` cũng đánh dấu UAT đạt như mục 4.1. Một số phần trong báo cáo cần phân biệt kết quả ground truth, kết quả model và hướng phát triển. Extension README đã được sửa provider mặc định về Ollama, đây là tiến bộ.

**Vì sao phải sửa:** Tài liệu là căn cứ để người chấm đánh giá phạm vi, kiến trúc và kết quả. Khi proposal trình bày như triển khai, các phần có thật cũng kém đáng tin.

**Cách sửa:** Tách nhanh thành: README cài đặt/chạy phiên bản hiện tại; báo cáo kiến trúc và kết quả đã có; proposal/future work. Gắn nhãn `Đã triển khai`, `Prototype`, `Chưa triển khai` cho RAG, LLM-as-Judge, dashboard, đa ngôn ngữ và batch experiment. Thống nhất số liệu theo manifest/artifact, sửa link cục bộ không portable và chỉ trích dẫn nguồn có đủ thông tin kiểm tra.

**Sau khi sửa:** Người đọc biết chính xác phần nào demo được, phần nào mới là hướng phát triển; báo cáo có thể đối chiếu với repository.

**Hoàn tất khi:** Quickstart chạy theo cấu hình hiện tại; không có số liệu/feature proposal bị trình bày như kết quả; mọi link và citation truy cập được.

### 4.11. CI chưa kiểm tra đầy đủ các thành phần được tuyên bố

**Hiện trạng:** `.github/workflows/ci.yml` chạy `npm ci`, typecheck, Jest coverage và Docker build; chưa có bước riêng gọi `dataset:validate` hay `compile:extension`/đóng gói extension. Checklist có nêu một số lệnh nhưng chưa biến tất cả thành gate CI.

**Vì sao phải sửa:** Core có thể xanh nhưng extension manifest/bundle hoặc benchmark dataset vẫn lỗi. Điều này làm giảm khả năng cài demo trên máy khác và nguy cơ phát hiện lỗi muộn.

**Cách sửa:** Thêm CI gate cho dataset validator và build extension; kiểm tra manifest command/config/activation tương thích output build. Tạo bước package VSIX sạch và cài smoke test trong VS Code Extension Host ở pipeline release, lưu commit/version của gói. Mutation benchmark toàn bộ có thể chạy theo lịch hoặc workflow riêng vì thời gian và tài nguyên cao; không bắt buộc chạy ở mọi PR.

**Sau khi sửa:** PR xanh đồng nghĩa core, extension bundle và cấu trúc dữ liệu cơ bản đều qua kiểm tra; release có thể truy lại source commit.

**Hoàn tất khi:** CI chạy các gate đã công bố; có release artifact được tạo từ đúng commit và smoke test cài/chạy thành công.

## 5. Lộ trình ưu tiên để nâng điểm

### Giai đoạn A — Khóa tính đúng và độ tin cậy

1. Sửa checklist để chỉ đánh dấu đạt khi có evidence thật.
2. Thay lọc scenario dựa trên regex/brace counting bằng mapping test block rõ ràng và parser.
3. Chặn cloud request khi chưa có consent rõ; đặt auto-generate mặc định fail-closed.
4. Giới hạn method bằng AST/source slice; kiểm tra target method tồn tại.
5. Sửa mutation operators và công bố tỷ lệ mutant hợp lệ bên cạnh score.
6. Tích hợp refiner có kiểm soát hoặc hạ tuyên bố xuống prototype.

### Giai đoạn B — Chứng minh sản phẩm tạo ra kết quả tốt

1. Chạy batch thực với cấu hình được ghim và lưu run manifest/raw artifacts.
2. Đo test sinh theo compile rate, pass rate, coverage, mutation, traceability và latency; so sánh prompt strategies trên cùng tập.
3. Review lại nội dung benchmark/mapping BA với người kiểm tra; không dùng pass của ground truth làm bằng chứng cho output LLM.
4. Bổ sung smoke/integration UAT cho VS Code và lưu ảnh/log theo release.

### Giai đoạn C — Hoàn thiện phạm vi, trình bày và tính sáng tạo

1. Công bố TypeScript/Jest là phạm vi đã kiểm chứng; gắn nhãn các parser khác là prototype đến khi có runner.
2. Đồng bộ README, báo cáo, checklist, manifest và CI với tính năng thật.
3. Làm một điểm nhấn sáng tạo có kết quả đo được: ưu tiên BA-to-test traceability có phát hiện AC chưa phủ, hoặc mutation-guided refinement trước/sau.
4. Nếu có điều kiện, đánh giá với QA/developer: thời gian tiết kiệm, tỷ lệ test được chấp nhận/chỉnh sửa và mức hữu ích; nêu rõ số người tham gia và cách chấm.

## 6. Tiêu chí để tự tin hướng tới 10/10

- [ ] Luồng chính chạy được trong VS Code thật: tìm requirement, sinh preview, chọn test, chạy/hiển thị trạng thái, lưu hoặc hủy.
- [ ] Preview và file lưu có cùng test block theo đúng scenario đã chọn; trường hợp mơ hồ không bị lọc âm thầm.
- [ ] Cloud disclosure là consent trước khi gửi; tự động sinh khi lưu tắt khi chưa opt-in.
- [ ] Method generation được giới hạn/kiểm tra bằng cấu trúc AST, không chỉ dựa vào chỉ dẫn prompt.
- [ ] Mutation benchmark có tỷ lệ mutant hợp lệ đủ cao, denominator rõ và không phóng đại score từ mẫu nhỏ.
- [ ] Có benchmark thật của output model, raw artifacts, cấu hình tái lập và phân tích lỗi; kết quả ground truth được báo riêng.
- [ ] BA → scenario → assertion có mapping kiểm chứng được; nội dung dataset có review và provenance rõ.
- [ ] Phạm vi ngôn ngữ trong UI/docs đúng với khả năng parse, generate, validate và run.
- [ ] CI chạy kiểm tra core, extension build và dataset; UAT/release có evidence theo đúng commit.
- [ ] Có ít nhất một cải tiến ứng dụng khác biệt được tích hợp và chứng minh bằng metric hoặc đánh giá người dùng.
- [ ] README và báo cáo phân biệt rõ triển khai, prototype, kết quả và future work.

## 7. Kết luận

So với lần đánh giá trước, commit `146da33` đã sửa được nhiều lỗi cụ thể: CSP/XSS của preview, chuyển scenario từ checkbox về host, truyền method name vào prompt, tìm batch output nested và bổ sung mutation report cho đủ 15 service. Những điểm này nâng mức hoàn thiện thực tế.

Chưa nên tự chấm 10/10 ở thời điểm này. Ba việc ảnh hưởng mạnh nhất là: **(1)** kiểm chứng đúng luồng UAT và bỏ trạng thái “đạt” chưa có bằng chứng; **(2)** đảm bảo checkbox/method scope không chỉ đúng trong fixture mà đúng với output thật; **(3)** tạo bằng chứng benchmark cho test do LLM sinh và nâng chất lượng mutation set (166/291 mutant lỗi biên dịch). Mutation-guided refinement và cloud consent cũng cần được tích hợp/siết lại trước khi tuyên bố hoàn thiện.

Đánh giá ở trên chỉ dựa trên mã, tài liệu và artifact của commit `146da33`; test/CI/VS Code extension không được chạy lại trong lần này. Không có thao tác fine-tuning.
