# Đánh giá tổng thể dự án và kế hoạch hoàn thiện

**Ngày rà soát:** 13/10/2026  
**Commit được rà soát:** `fb76f7c` — `feat: address post-0528ce8 review with read-only mutation preview, AST host filtering, provider consent, and method AST slicing`  
**Phạm vi:** mã nguồn ứng dụng, extension, core pipeline, bộ dữ liệu/benchmark hiện có, artifact, CI và tài liệu trong repository.  
**Giới hạn:** đây là rà soát tĩnh. Tôi không chạy test, benchmark, LLM hay VS Code Extension Host trong lượt này. Theo yêu cầu trước đó, không đánh giá, sửa hoặc thực hiện bất kỳ bước nào liên quan đến fine-tuning. Các con số thực nghiệm bên dưới được đọc từ artifact đã lưu, chưa được chạy lại độc lập.

## 1. Điểm hiện tại

Điểm dưới đây là ước lượng kỹ thuật từ trạng thái repository, không phải điểm chính thức của giảng viên. Trọng số dùng để tổng hợp: sáng tạo 25%, hoàn thiện chức năng 25%, tin cậy/an toàn 20%, bằng chứng đánh giá 20%, tài liệu/tái lập 10%.

| Hạng mục | Điểm | Nhận xét |
|---|---:|---|
| **Sáng tạo ứng dụng** | **8,8/10** | Kết hợp yêu cầu BA, cấu trúc mã nguồn và sinh unit test trong VS Code; có nhiều chiến lược prompt, chọn scenario, auto-fix và gợi ý dựa trên mutation. Phần mutation hiện mới đưa gợi ý, chưa tạo–chạy–đo lại test trong một vòng khép kín. |
| **Độ hoàn thiện chức năng** | **7,8/10** | Luồng sinh có preview, dry-run, lưu sau khi chấp nhận; đã xử lý nhiều lỗi trạng thái panel và thêm lọc AST phía host. Còn các giới hạn ở mapping scenario, định danh method trùng/overload, mutation refinement và kiểm chứng trên Extension Host. |
| **Độ tin cậy và an toàn** | **7,5/10** | Đã có consent theo cloud provider, panel chỉ xem cho refinement, CSP và lọc scenario phía host. Handler lưu file vẫn có nhánh chấp nhận đường dẫn tuyệt đối từ payload nếu không có target path; các luồng consent/lưu file chưa có bằng chứng chạy trên Host trong repository. |
| **Bằng chứng đánh giá** | **6,8/10** | Có artifact ground-truth và mutation trên 15 service. Chưa có kết quả batch của test do các chiến lược prompt sinh ra, nên chưa chứng minh được chất lượng đầu ra chính của đề tài hoặc chiến lược nào tốt hơn. |
| **Tài liệu và khả năng tái lập** | **7,5/10** | CI có typecheck, compile, Jest, validate dataset và đóng gói VSIX; checklist đã đánh dấu UAT Host đang chờ. Một số tài liệu vẫn diễn đạt tính năng/giao thức mạnh hơn phần triển khai và còn các bản kế hoạch trùng nhau. |
| **Tổng thể hiện tại** | **7,8/10** | Sản phẩm có nền tảng ứng dụng rõ và đã sửa nhiều lỗi quan trọng. Điểm còn bị giới hạn chủ yếu bởi thiếu đánh giá đầu ra LLM, refinement chưa khép kín, các ánh xạ còn heuristic và chưa có bằng chứng demo trên VS Code thật. |

Muốn chấm 10/10 cần đối chiếu rubric của giảng viên, hoàn tất các luồng ưu tiên bên dưới và có bằng chứng chạy được trên commit cuối. Không thể bảo đảm điểm tuyệt đối chỉ từ rà soát mã nguồn.

## 2. Ưu điểm và phần đã được cải thiện

1. **Đề tài có giá trị sử dụng cụ thể:** đưa requirement/acceptance criteria và mã nguồn vào một quy trình sinh unit test ngay trong IDE; giảm thao tác chuyển ngữ cảnh giữa tài liệu, editor và công cụ AI.
2. **Kiến trúc có các lớp chức năng rõ:** parser/context extractor, requirement parser, prompt strategies, gateway cho model, post-processing, validation, runner, metrics và extension UI được tổ chức thành module.
3. **Có sản phẩm để trình diễn:** extension có CodeLens, sidebar, cấu hình provider, sinh theo file hoặc symbol, preview, chọn scenario và lưu sau khi người dùng chấp nhận.
4. **Bảo vệ nội dung preview tốt hơn:** Webview dùng CSP nonce và `textContent`/DOM API cho dữ liệu scenario; panel được tái sử dụng thì reset callback và output path cũ. Refinement mở chế độ read-only và ẩn nút lưu.
5. **Lọc scenario được làm ở phía host bằng TypeScript AST:** preview nhận mã đã lọc từ host và khi lưu, host lọc lại theo scenario ID; đã bổ sung nhận diện một số dạng `it.each`/`test.each`.
6. **Xử lý consent cloud rõ hơn:** xác nhận được lưu theo provider; biến môi trường chỉ nhận giá trị `true` hoặc `1`, không coi chuỗi tùy ý như `false` là đồng ý.
7. **Method context tiến thêm một bước:** extractor lấy source slice từ AST, đưa phần triển khai mục tiêu vào prompt và báo lỗi khi không tìm thấy method. Tuy nhiên prompt vẫn gửi toàn bộ source và summary cấu trúc vẫn liệt kê toàn file.
8. **Mutation refinement không còn tự bịa số liệu:** khi không tìm thấy summary phù hợp, command báo thiếu artifact và dừng; kết quả đang được hiển thị dưới dạng phản hồi chỉ xem, không thể ghi đè file test.
9. **Checklist UAT phân biệt automated với Extension Host:** trạng thái tương tác chưa có bằng chứng đã được chuyển về chờ kiểm chứng.
10. **CI có các bước quan trọng:** workflow cài dependencies, typecheck, compile extension, chạy Jest, validate dataset và package VSIX. Mutation benchmark chạy riêng, không nằm trong workflow CI hiện tại.

## 3. Bằng chứng hiện có và giới hạn của bằng chứng

- `experiments/results/ground_truth_eval_summary.json` ghi **15/15 ground-truth suites pass**, tổng **133 test**; artifact báo line coverage trung bình **98,09%** và branch coverage trung bình **91,76%**. Đây là kết quả của bộ ground-truth trong lần chạy được ghi nhận, không chứng minh test do LLM sinh đạt cùng mức.
- `experiments/results/mutation_summary.json` và `mutation_report.md` ghi **178 mutant**, gồm **152 hợp lệ**, **100 killed**, **52 survived**, **26 compile error**. Mutation score trên 152 mutant hợp lệ là **65,79%**; tỷ lệ mutant hợp lệ là khoảng **85,4%**. Một số service đạt 100% với số mutant hợp lệ ít, nên cần xem cả mẫu số.
- Dataset manifest có **15 service, 133 scenario**, phân bổ 9/3/3 service và 89/17/27 scenario theo các nhóm hiện tại. Validator kiểm tra cấu trúc, file, schema và một số quy tắc chuỗi; nó không tự chứng minh tính đúng nghiệp vụ hoặc assertion có thực sự kiểm tra acceptance criteria.
- Thư mục `experiments/results/` có artifact ground-truth và mutation, nhưng không thấy batch manifest/kết quả đánh giá test do prompt strategy sinh. Vì thế hiện chưa có số đo trực tiếp cho pass rate, syntax rate, coverage/mutation score của test sinh ra, hoặc so sánh bốn chiến lược.
- `docs/ACCEPTANCE_CHECKLIST.md` ghi UAT tương tác trên Extension Host đang chờ kiểm chứng. Workflow CI không chạy mutation benchmark toàn bộ; dòng checklist cần tiếp tục nêu rõ benchmark này là lệnh chạy độc lập.
- Không có lệnh test/benchmark nào được chạy trong lần rà soát này. Các kết luận về trạng thái mã dựa trên đọc source/test/docs và artifact trong repository.

## 4. Lỗi và việc còn thiếu — vì sao, cách sửa, kết quả mong đợi

### P1 — Mutation refinement mới tạo gợi ý, chưa phải vòng tự cải thiện

**Hiện trạng:** code tìm summary theo ID đã chuẩn hóa và dùng `MutationGuidedRefiner` để phân tích mutant còn sống sót, tạo scenario gợi ý cùng feedback prompt. Panel là read-only, không ghi prompt đè lên test. Command chưa gọi LLM để sinh test bổ sung, chưa chạy test mới, và chưa chạy mutation lần hai. Summary cũng được ghép theo service ID nhưng chưa xác minh hash/commit của source tương ứng.

**Vì sao cần sửa:** tên gọi và báo cáo có thể khiến người nghe hiểu rằng hệ thống đã tự tinh chỉnh và cải thiện mutation score. Artifact cũ của cùng service có thể không còn đúng với phiên bản source hiện tại.

**Cách sửa:** trước mắt gọi đúng bản chất là **phân tích và đề xuất test từ mutation**; kiểm tra summary có manifest gồm service ID, đường dẫn chuẩn, source hash và cấu hình chạy. Nếu phát triển thành refinement thật, nối luồng: lấy mutant sống sót → sinh test bổ sung → kiểm tra cú pháp → chạy test → chạy lại mutation → ghi score trước/sau cùng artifact. Không hiển thị kết quả cải thiện nếu chưa có lần chạy sau.

**Sau khi sửa:** người dùng biết rõ đây là gợi ý hay vòng tự động hoàn chỉnh; số liệu luôn gắn với đúng source; nếu hoàn tất vòng khép kín, mức cải thiện có thể được xác nhận bằng artifact trước/sau.

**Hoàn tất khi:** không dùng summary sai phiên bản; UI và báo cáo không gọi gợi ý là kết quả refinement đã được xác minh; nếu tuyên bố tự cải thiện thì có test code được sinh và mutation run trước/sau.

### P1 — Ánh xạ scenario với test AST vẫn dựa vào tiêu đề và thứ tự

**Hiện trạng:** AST giúp xác định vùng `it`/`test`, nhưng ghép với scenario bằng cách tìm ID trong title, so một phần đầu description hoặc dùng thứ tự khi số test block bằng số scenario. Nhánh tối ưu “chọn tất cả” so sánh số lượng ID với số scenario, chưa xác minh tập ID có đúng bằng tập ID hợp lệ. Test parameterized được nhận diện như một block; từng dòng dữ liệu bên trong không được ánh xạ thành scenario riêng.

**Vì sao cần sửa:** title do model viết có thể thiếu ID, bị trùng hoặc không theo đúng thứ tự scenario. Khi chọn một phần, test không ghép được có thể bị loại mà không báo; khi có số ID sai nhưng số lượng trùng, host có thể giữ nguyên toàn bộ code.

**Cách sửa:** yêu cầu output có marker ổn định chứa scenario ID ngay cạnh test, hoặc tạo mapping rõ ràng từ test node sang scenario trong kết quả model. Xác nhận tập ID được chọn bằng so sánh tập hợp, kiểm tra mapping 1–1 và hiển thị cảnh báo/dừng nếu mơ hồ. Quy định rõ cách xử lý `each` và dữ liệu test parameterized; không âm thầm bỏ test không ánh xạ được.

**Sau khi sửa:** checkbox, code preview và file lưu có mapping có thể dự đoán; test không bị mất do khác cách đặt tiêu đề.

**Hoàn tất khi:** có kiểm chứng với title trùng/thiếu ID, scenario thiếu/thừa, ID sai, test lồng trong `describe`, `each` thường và `each` dạng template; trường hợp mơ hồ được báo rõ.

### P1 — Method-level prompt có source slice nhưng vẫn gửi toàn bộ file

**Hiện trạng:** extractor đưa source slice của method mục tiêu vào `targetMethodSlice`, ném lỗi nếu không tìm thấy tên. Tuy nhiên `promptContext.serviceCode` vẫn là raw source toàn file, `buildAstSummary` vẫn liệt kê các class/method khác, và lookup theo tên dừng ở method đầu tiên. Các overload hoặc method cùng tên ở nhiều class chưa được định danh duy nhất.

**Vì sao cần sửa:** prompt vẫn có thể bị phân tán sang method khác; CodeLens có thể chọn nhầm overload/class mà chỉ truyền tên method. Điều này làm giảm độ tin cậy của lời khẳng định “sinh test đúng method được chọn”.

**Cách sửa:** truyền định danh gồm class, tên, chữ ký và vị trí AST; từ chối khi lựa chọn không duy nhất. Gửi method source cùng dependency cần thiết (constructor, helper liên quan, imports/type) thay vì toàn bộ file nếu an toàn; nếu vẫn giữ toàn file, ghi rõ đây là context bổ trợ và xác minh output chỉ nhắm method đã chọn.

**Sau khi sửa:** luồng method-level có phạm vi xác định và kết quả dễ kiểm tra hơn, kể cả khi file có overload hoặc nhiều class.

**Hoàn tất khi:** có kiểm chứng method thường, overload, class trùng tên method, function độc lập, method không tồn tại và dependency riêng tư; ambiguity không được tự chọn ngầm.

### P1 — Mutation operators vẫn biến đổi theo dòng/regex

**Hiện trạng:** `packages/core/src/mutation/mutators.ts` vẫn nhận diện/thay toán tử bằng regex trên từng dòng và lọc một số ngữ cảnh bằng chuỗi. Artifact còn 26 compile-error mutant trên tổng 178. Đây chưa phải AST rewrite; các mô tả “AST Mutators syntax-safe” trong báo cáo mạnh hơn cách triển khai hiện tại.

**Vì sao cần sửa:** sửa nhầm literal/comment/type hoặc tạo mutant không hợp lệ có thể làm sai mẫu số và khiến mutation score phụ thuộc lỗi sinh mutant.

**Cách sửa:** ưu tiên sửa AST node với TypeScript Compiler API; nếu giữ một số operator dạng text, dùng lexer/parser để lấy đúng token span và loại trừ comment/literal/type-only context. Phân loại compile error theo nguyên nhân, ghi cấu hình operator/version và báo tổng, hợp lệ, compile error, killed, survived theo service/operator.

**Sau khi sửa:** mutant tác động có chủ đích tới hành vi, tỷ lệ hợp lệ tăng và mutation score có thể tái lập theo đúng cấu hình.

**Hoàn tất khi:** mỗi mutant qua syntax/type sanity check; báo cáo công bố denominator; compile error/equivalent mutant được giải thích; các service có mẫu nhỏ được ghi chú, không trình bày 100% như kết luận mạnh.

### P1 — Chưa có benchmark đầu ra của test do prompt sinh

**Hiện trạng:** artifact hiện tập trung vào ground-truth và mutation score của ground-truth. Không thấy kết quả sinh hàng loạt và đánh giá đầu ra cho Zero-shot, Few-shot, CoT, Hybrid.

**Vì sao cần sửa:** mục tiêu nghiên cứu là đánh giá sinh test và so sánh chiến lược. Coverage tốt của test chuẩn chỉ xác nhận bộ chuẩn, không xác nhận model/chiến lược sinh test có hữu ích hơn.

**Cách sửa:** chạy cùng tập service và cùng điều kiện cho từng chiến lược; cố định model/provider, temperature, token budget, timeout và phiên bản prompt. Lưu prompt/config, đầu ra thô, lỗi, thời gian/token, syntax/compile rate, test pass rate, coverage, mutation score và manifest theo commit. Dùng workspace tạm để test sinh không sửa dataset/gốc; có thể chạy lặp lại các ca có độ ngẫu nhiên và báo độ biến thiên. Đánh giá BA traceability bằng rubric do người chấm rà soát.

**Sau khi sửa:** có bằng chứng trực tiếp để trả lời chiến lược nào sinh test hợp lệ, phát hiện lỗi tốt và bám requirement; kết luận có thể tái tạo.

**Hoàn tất khi:** artifact bao phủ mọi strategy được tuyên bố, ghi cấu hình và commit, có bảng so sánh cùng mẫu số và giới hạn; có đánh giá thủ công cho tính đúng nghiệp vụ.

### P1 — Handler lưu file còn tin đường dẫn tuyệt đối từ Webview khi chưa ghim target

**Hiện trạng:** luồng generate thông thường gọi `setTargetOutput`, nên host dùng output path đã định. Tuy nhiên handler `ACCEPT_TEST` có fallback lấy `msg.payload.outputPath`; guard chặn `..` và đường dẫn tương đối không có target nhưng vẫn chấp nhận đường dẫn tuyệt đối bất kỳ nếu không có `_targetOutputPath`.

**Vì sao cần sửa:** một message lỗi hoặc bị giả mạo có thể yêu cầu ghi ngoài workspace trong các đường gọi panel không ghim target. Đây là nhánh dự phòng hiện không cần thiết cho luồng generate chuẩn.

**Cách sửa:** chỉ cho phép ghi khi host đã đặt target path. Chuẩn hóa path theo nền tảng, xác minh nó nằm trong workspace/đích được cho phép; không dùng `outputPath` do Webview gửi làm nguồn quyết định. Host cũng nên lấy code từ trạng thái preview của host và kiểm tra trạng thái/syntax trước khi ghi.

**Sau khi sửa:** message từ Webview không thể chọn file đích tùy ý; kiểm tra đường dẫn phản ánh đúng quyền ghi thực tế.

**Hoàn tất khi:** test handler với target hợp lệ, đường dẫn traversal, đường dẫn tuyệt đối ngoài workspace, separator Windows/Unix và không có target; xác nhận không tạo file ngoài ý muốn.

### P2 — Chất lượng và traceability của dataset cần người rà soát

**Hiện trạng:** validator kiểm tra phân hoạch, schema và một số quy tắc chuỗi. Kiểm tra cấu trúc không chứng minh scenario/expected behavior đúng yêu cầu, cũng không đảm bảo từng AC có assertion thực chất trong ground-truth test.

**Vì sao cần sửa:** benchmark nhỏ nhưng nếu nhãn hoặc traceability sai thì mọi so sánh prompt có thể phản ánh lỗi dữ liệu thay vì năng lực model.

**Cách sửa:** lập bảng đối chiếu service → requirement → AC → scenario → test/assertion; rà soát bởi người hiểu nghiệp vụ và một người kiểm tra độc lập. Ghi nhận chỗ bất đồng, quyết định cuối và phiên bản dataset. Bổ sung nhóm ca đa dạng hơn nếu muốn khẳng định khả năng tổng quát ngoài 15 service hiện tại.

**Sau khi sửa:** dữ liệu chuẩn có nguồn gốc và quy trình kiểm tra; phần kết luận nêu đúng phạm vi mà benchmark hỗ trợ.

**Hoàn tất khi:** tất cả AC/scenario được truy vết tới assertion hoặc được giải thích vì sao không có assertion trực tiếp; có log người duyệt và danh sách giới hạn.

### P2 — Tài liệu có điểm lệch với cách triển khai và còn bản trùng

**Hiện trạng:** `docs/COMPREHENSIVE_PROJECT_REPORT.md` gọi mutator là “AST Mutators syntax-safe” dù code biến đổi bằng regex theo dòng; phần refinement mô tả khả năng nâng độ nhạy nhưng chưa có vòng LLM sinh và chạy lại test để đo cải thiện. `README.md` có nhiều phần thiết kế/giả định bên cạnh phần đã triển khai. Repository còn cả `CONSOLIDATED_ISSUES_AND_FIX_PLAN.md` và bản `(1).md`, cùng `PRE_FINE_TUNING_READINESS_PLAN.md` với một số chủ đề giao nhau.

**Vì sao cần sửa:** khi demo/bảo vệ, người đọc khó phân biệt chức năng đã chạy được với thiết kế hoặc đề xuất; nhiều bản kế hoạch làm tăng rủi ro thông tin cũ mâu thuẫn.

**Cách sửa:** gắn nhãn rõ **Đã triển khai / Đã kiểm chứng / Chưa kiểm chứng / Đề xuất** cho từng tính năng; sửa claim AST và mutation refinement theo code; thêm commit, lệnh và artifact làm nguồn cho từng kết quả. Chọn một bản đánh giá hiện hành làm nguồn chính, thêm trang mục lục liên kết tới báo cáo/checklist và xử lý bản trùng theo trạng thái tài liệu, không để hai bản cùng được coi là chuẩn.

**Sau khi sửa:** báo cáo, README, checklist và demo cùng mô tả một trạng thái; giảng viên có thể lần từ claim đến mã, test hoặc artifact tương ứng.

**Hoàn tất khi:** không còn claim “đã kiểm chứng/E2E” thiếu evidence; mọi số liệu gắn artifact và commit; tài liệu trùng được đánh dấu lưu trữ hoặc hợp nhất.

### P2 — Cần có bằng chứng UAT trên VS Code thật và luồng consent

**Hiện trạng:** CI chạy typecheck, compile, Jest, dataset validation và package; các mục Interactive trong checklist đang chờ Host. Chưa thấy log/ảnh của Extension Development Host trong repository.

**Vì sao cần sửa:** mock/Jest không cho thấy toàn bộ trải nghiệm hoạt động trên VS Code thật: CodeLens, quyền Webview, provider consent, progress, auto-fix và lưu file.

**Cách sửa:** chạy checklist trên đúng commit phát hành; ghi VS Code/Node, hệ điều hành, provider/model đã dùng, kết quả từng bước, ảnh/log và đường dẫn artifact. Kiểm tra cả từ chối consent, chấp nhận theo từng provider, hủy preview, lỗi model và lưu test.

**Sau khi sửa:** có thể chứng minh sản phẩm dùng được xuyên suốt thay vì chỉ compile hoặc pass unit test.

**Hoàn tất khi:** UAT host có bằng chứng gắn commit; các lỗi phát hiện được xử lý; checklist không ghi `ĐẠT` trước khi có evidence.

### P2 — Claim hỗ trợ ngôn ngữ và nghiên cứu liên quan cần được giới hạn bằng chứng

**Hiện trạng:** báo cáo mới phân biệt TypeScript/Jest là phạm vi benchmark chính và các parser khác là prototype; README vẫn có claim TypeScript/JavaScript “đã kiểm chứng toàn diện End-to-End”. Benchmark hiện có 15 service TypeScript/Jest, còn UAT Host chưa được xác nhận. Các phần Related Work và mốc năm trong README cần có trích dẫn/đường dẫn để người đọc kiểm chứng.

**Vì sao cần sửa:** parser nhận diện được ngôn ngữ không đồng nghĩa sinh, validate, chạy test và đo coverage/mutation thành công trên ngôn ngữ đó. Claim E2E hoặc novelty thiếu nguồn có thể bị phản biện.

**Cách sửa:** lập ma trận cho từng ngôn ngữ: parse, prompt, syntax validation, runner, coverage, benchmark, host evidence. Giới hạn claim theo cột đã chứng minh; gắn trích dẫn gốc cho nghiên cứu và nêu khác biệt cụ thể của đề tài, không chỉ so sánh khái quát.

**Sau khi sửa:** phạm vi sản phẩm và điểm mới được mô tả chính xác; đề tài tập trung vào nền tảng được kiểm chứng.

**Hoàn tất khi:** mọi claim ngôn ngữ/E2E/novelty có bằng chứng hoặc nguồn trực tiếp; phần prototype không bị trình bày như tính năng hoàn chỉnh.

## 5. Lộ trình ưu tiên để tiến gần 10/10

### Giai đoạn A — Chốt tính đúng và an toàn

1. Bịt nhánh ghi đường dẫn từ Webview; chỉ lưu vào host target đã xác minh.
2. Chuẩn hóa scenario ID và mapping AST; từ chối trường hợp mơ hồ thay vì tự đoán.
3. Định danh method bằng class + signature/AST symbol; giới hạn context theo method và dependency cần thiết.
4. Gắn mutation summary với source hash/commit; giữ refinement ở đúng trạng thái “gợi ý” cho tới khi có vòng chạy lại thật.
5. Chuyển mutation operator sang AST/token span và phân loại 26 compile-error mutants.

### Giai đoạn B — Chứng minh chất lượng và tính sáng tạo

6. Tạo batch benchmark cho các prompt strategies trên cùng đầu vào và điều kiện; lưu output, config, log, artifact và manifest.
7. So sánh pass/syntax rate, coverage, mutation score, traceability BA, latency và token cost; báo mẫu số, biến thiên và giới hạn.
8. Rà soát thủ công mapping AC → scenario → assertion; công bố rubric và kết quả đánh giá người dùng/nhà phát triển cho giá trị sử dụng trong IDE.
9. Khi hoàn tất mutation feedback loop, đo trước/sau trên cùng mutant set để chứng minh lợi ích của tính năng sáng tạo này.

### Giai đoạn C — Chốt demo và khả năng tái lập

10. Chạy automated CI và UAT trên Extension Host ở commit phát hành; lưu bằng chứng dễ mở lại.
11. Cập nhật báo cáo, README và checklist theo đúng trạng thái code; thêm nguồn cho related work và giới hạn hỗ trợ ngôn ngữ.
12. Hợp nhất/đánh dấu các tài liệu kế hoạch trùng; giữ một file đánh giá hiện hành và liên kết từ tài liệu chính.

## 6. Tiêu chí nghiệm thu để tự tin hướng tới 10/10

- [ ] Luồng người dùng hoàn chỉnh trên VS Code thật: chọn service/method → tìm requirement → sinh → xem trạng thái/kịch bản → chọn → lưu hoặc hủy.
- [ ] Webview không quyết định đích ghi; host xác minh workspace path và không cho ghi khi chưa có target.
- [ ] Preview và file lưu dùng cùng mapping scenario AST; chọn sai ID hoặc mapping mơ hồ được báo rõ.
- [ ] Consent cloud được kiểm chứng cho từng provider; từ chối thì không gửi code/BA; disclosure nói rõ dữ liệu nào được gửi.
- [ ] Method-level generation xử lý được overload/class trùng tên và không âm thầm chọn method sai.
- [ ] Mutation report dùng mutant hợp lệ, mẫu số minh bạch và source version khớp; refinement được gọi là gợi ý cho tới khi có vòng sinh–chạy–đo lại.
- [ ] Có benchmark đầu ra của các prompt strategy và đánh giá đúng BA traceability; kết luận có dữ liệu và giới hạn.
- [ ] Dataset được rà soát nội dung; mỗi acceptance criterion có traceability tới scenario/assertion hoặc có giải thích.
- [ ] CI và UAT Host có bằng chứng theo commit phát hành; VSIX đã được cài/chạy thử.
- [ ] README/báo cáo/checklist phân biệt rõ chức năng đã triển khai với phần đề xuất; số liệu có artifact truy xuất được.
- [ ] Tuyên bố sáng tạo nêu được điểm mới so với công trình liên quan bằng nguồn và phép so sánh cụ thể.

## 7. Kết luận

Commit `fb76f7c` đã sửa nhiều vấn đề cụ thể của lần đánh giá trước: bỏ mutation summary dựng giả; khớp summary theo ID service; chuyển mutation preview thành read-only; reset callback/path cũ khi tái sử dụng panel; khóa nút lưu ở trạng thái loading/lỗi; chuyển preview filtering qua AST phía host; thêm lọc một số test parameterized; lưu consent theo provider; đưa source slice của method vào prompt và báo lỗi khi không tìm thấy method; cập nhật checklist để UAT Host ở trạng thái chờ.

Các lỗi nghiêm trọng về số liệu giả và nguy cơ ghi đè test bằng prompt đã được xử lý trong code đang xem. Việc còn lại là hoàn thiện đúng bản chất refinement, tăng độ chắc của mapping và method targeting, khóa đường dẫn ghi file, nâng độ hợp lệ của mutation operators, tạo benchmark đầu ra LLM và thu bằng chứng UAT thật.

**Điểm tổng thể hiện tại: 7,8/10.** Dự án đã có nền tảng tốt cho cả sáng tạo ứng dụng lẫn tính đầy đủ, nhưng chưa có kết quả benchmark của test sinh ra và chưa chứng minh trọn luồng sử dụng trên VS Code thật. Vì vậy chưa đủ cơ sở để chấm 10/10.

Đây là đánh giá tĩnh tại commit `fb76f7c`; test, CI, benchmark và Extension Host không được chạy lại trong lượt rà soát này. Không có thao tác nào liên quan đến fine-tuning.
