# Đánh giá tổng thể dự án và kế hoạch hoàn thiện

**Ngày rà soát:** 13/10/2026  
**Commit được rà soát:** `4691b5d` — `feat: harden host path pinning, syntax-safe mutator validation, AST scenario filtering, and method ambiguity detection`  
**Phạm vi:** mã nguồn ứng dụng, extension, core pipeline, bộ dữ liệu/benchmark hiện có, artifact, CI và tài liệu trong repository.  
**Giới hạn:** đây là rà soát tĩnh. Tôi không chạy test, benchmark, LLM hay VS Code Extension Host trong lượt này. Theo yêu cầu trước đó, không đánh giá, sửa hoặc thực hiện bất kỳ bước nào liên quan đến fine-tuning. Các con số thực nghiệm bên dưới được đọc từ artifact đã lưu, chưa được chạy lại độc lập.

## 1. Điểm hiện tại

Điểm dưới đây là ước lượng kỹ thuật từ trạng thái repository, không phải điểm chính thức của giảng viên. Trọng số dùng để tổng hợp: sáng tạo 25%, hoàn thiện chức năng 25%, tin cậy/an toàn 20%, bằng chứng đánh giá 20%, tài liệu/tái lập 10%.

| Hạng mục | Điểm | Nhận xét |
|---|---:|---|
| **Sáng tạo ứng dụng** | **8,8/10** | Kết hợp yêu cầu BA, cấu trúc mã nguồn và sinh unit test trong VS Code; có nhiều chiến lược prompt, chọn scenario, auto-fix và gợi ý dựa trên mutation. Phần mutation hiện mới đưa gợi ý, chưa tạo–chạy–đo lại test trong một vòng khép kín. |
| **Độ hoàn thiện chức năng** | **6,8/10** | Nhiều lỗi luồng preview đã được sửa, nhưng VSIX hiện không đóng gói `typescript` trong khi mã compiled nạp thư viện này lúc load; có nguy cơ extension không kích hoạt trên cài đặt sạch. Mutation refinement và UAT Host vẫn chưa khép kín. |
| **Độ tin cậy và an toàn** | **6,2/10** | Host đã từ chối đường dẫn lưu do Webview tự gửi, nhưng kiểm tra cú pháp phụ thuộc runtime `typescript` không có trong VSIX. Mapping scenario vẫn heuristic; hash nguồn refinement chỉ hiển thị, chưa đối chiếu với summary. |
| **Bằng chứng đánh giá** | **6,5/10** | Ground-truth artifact được cập nhật timestamp; mutation summary vẫn là artifact cũ trước khi đổi mutator và không thể dùng làm số đo cho generator hiện tại. Chưa có batch result của test do prompt sinh. |
| **Tài liệu và khả năng tái lập** | **7,5/10** | CI có typecheck, compile, Jest, validate dataset và đóng gói VSIX; checklist ghi rõ UAT Host đang chờ. Đã xóa một bản kế hoạch trùng, nhưng claim về dependency trong VSIX, mutation score cũ và E2E cần được đồng bộ. |
| **Tổng thể hiện tại** | **7,2/10** | Ý tưởng và code nền vẫn có giá trị, nhưng phát hiện rủi ro đóng gói có thể chặn extension trên cài đặt sạch. Cần xử lý dependency/runtime trước khi coi các cải thiện AST và mutator là năng lực có trong bản phát hành. |

Muốn chấm 10/10 cần đối chiếu rubric của giảng viên, hoàn tất các luồng ưu tiên bên dưới và có bằng chứng chạy được trên commit cuối. Không thể bảo đảm điểm tuyệt đối chỉ từ rà soát mã nguồn.

## 2. Ưu điểm và phần đã được cải thiện

1. **Đề tài có giá trị sử dụng cụ thể:** đưa requirement/acceptance criteria và mã nguồn vào một quy trình sinh unit test ngay trong IDE; giảm thao tác chuyển ngữ cảnh giữa tài liệu, editor và công cụ AI.
2. **Kiến trúc có các lớp chức năng rõ:** parser/context extractor, requirement parser, prompt strategies, gateway cho model, post-processing, validation, runner, metrics và extension UI được tổ chức thành module.
3. **Có sản phẩm để trình diễn:** extension có CodeLens, sidebar, cấu hình provider, sinh theo file hoặc symbol, preview, chọn scenario và lưu sau khi người dùng chấp nhận.
4. **Bảo vệ nội dung preview tốt hơn:** Webview dùng CSP nonce và `textContent`/DOM API cho dữ liệu scenario; panel được tái sử dụng thì reset callback và output path cũ. Refinement mở chế độ read-only và ẩn nút lưu.
5. **Lọc scenario được làm ở phía host bằng TypeScript AST:** đã sửa so sánh “chọn tất cả” sang so tập ID, bỏ fallback ghép theo vị trí. Block không ánh xạ được được giữ lại khi còn scenario được chọn để tránh mất code, nhưng điều này có thể khiến output còn test ngoài lựa chọn; mapping vẫn dựa vào title/ID/description.
6. **Xử lý consent cloud rõ hơn:** xác nhận được lưu theo provider; biến môi trường chỉ nhận giá trị `true` hoặc `1`, không coi chuỗi tùy ý như `false` là đồng ý.
7. **Method context tiến thêm một bước:** extractor có thể nhận `targetClassName`, báo ambiguity khi cùng tên method xuất hiện ở nhiều class, và thêm nhãn cho phần context xung quanh. Overload trong cùng class vẫn chọn method đầu tiên; lệnh CodeLens chưa truyền `targetClassName`.
8. **Mutation suggestions minh bạch hơn:** command hiển thị hash SHA-256 rút gọn của source và cảnh báo đây là gợi ý read-only, chưa tái sinh test. Hash này chưa được so với hash lưu trong mutation artifact nên chưa xác nhận freshness.
9. **Checklist UAT phân biệt automated với Extension Host:** trạng thái tương tác chưa có bằng chứng đã được chuyển về chờ kiểm chứng.
10. **CI có các bước quan trọng:** workflow cài dependencies, typecheck, compile extension, chạy Jest, validate dataset và package VSIX. Mutation benchmark chạy riêng, không nằm trong workflow CI hiện tại. Bản VSIX cần sửa cách đóng gói dependency runtime trước khi coi việc compile/package là đủ.

## 3. Bằng chứng hiện có và giới hạn của bằng chứng

- `experiments/results/ground_truth_eval_summary.json` ghi **15/15 ground-truth suites pass**, tổng **133 test**; artifact báo line coverage trung bình **98,09%** và branch coverage trung bình **91,76%**. Đây là kết quả của bộ ground-truth trong lần chạy được ghi nhận, không chứng minh test do LLM sinh đạt cùng mức.
- `experiments/results/mutation_summary.json` và `mutation_report.md` vẫn ghi **178 mutant**, gồm **152 hợp lệ**, **100 killed**, **52 survived**, **26 compile error** (mutation score cũ **65,79%**). Commit `4691b5d` đổi generator để loại candidate có syntax diagnostic nhưng không cập nhật các mutation artifacts; các con số này phải được xem là **kết quả lịch sử của generator cũ**, không phải kết quả xác nhận cho code hiện tại.
- Dataset manifest có **15 service, 133 scenario**, phân bổ 9/3/3 service và 89/17/27 scenario theo các nhóm hiện tại. Validator kiểm tra cấu trúc, file, schema và một số quy tắc chuỗi; nó không tự chứng minh tính đúng nghiệp vụ hoặc assertion có thực sự kiểm tra acceptance criteria.
- Thư mục `experiments/results/` có artifact ground-truth và mutation, nhưng không thấy batch manifest/kết quả đánh giá test do prompt strategy sinh. Vì thế hiện chưa có số đo trực tiếp cho pass rate, syntax rate, coverage/mutation score của test sinh ra, hoặc so sánh bốn chiến lược.
- `docs/ACCEPTANCE_CHECKLIST.md` ghi UAT tương tác trên Extension Host đang chờ kiểm chứng và thêm UAT syntax filter. Tuy nhiên package command dùng `--no-dependencies`; VSIX cần được kiểm tra riêng về dependency runtime. Workflow CI không chạy mutation benchmark toàn bộ.
- Không có lệnh test/benchmark nào được chạy trong lần rà soát này. Các kết luận về trạng thái mã dựa trên đọc source/test/docs và artifact trong repository.

## 4. Lỗi và việc còn thiếu — vì sao, cách sửa, kết quả mong đợi

### P0 — VSIX không đóng gói dependency `typescript` được dùng lúc chạy

**Hiện trạng:** `packages/extension/package.json` khai báo `typescript` là dependency, nhưng lệnh đóng gói trong `package.json` chạy `vsce package --no-dependencies`. Đọc nội dung VSIX hiện tại cho thấy có compiled JS nhưng không có `node_modules/typescript`. `test_code_filter.ts` biên dịch thành mã gọi `require("typescript")`; `extension.ts` nạp `TestGenerationService`, service nạp `TestPreviewPanel`, và panel nạp module filter này. Vì vậy bản cài từ VSIX có thể lỗi `Cannot find module 'typescript'` khi kích hoạt trên máy không có dependency tình cờ ở ngoài extension. Ngoài ra `CodeMutatorGenerator.isValidSyntax()` trả `true` khi không nạp được TypeScript, nên nhánh fallback tự tắt kiểm tra.

**Vì sao cần sửa:** VSIX là sản phẩm người dùng/giảng viên cài. Compile thành công trong workspace có `node_modules` không chứng minh bản đóng gói chạy được; nếu thiếu dependency thì các tính năng mới về AST và syntax validation không dùng được, thậm chí activation có thể thất bại.

**Cách sửa:** chọn một cơ chế phân phối runtime dependency rõ ràng: bundle extension bằng bundler như esbuild, hoặc đóng gói dependencies production cần thiết và bỏ `--no-dependencies` theo cách phù hợp với quy trình VSCE. Không để `isValidSyntax()` âm thầm trả `true` khi dependency thiếu; báo lỗi/đóng cổng nếu không thể kiểm tra. Sau khi sửa, cài VSIX vào Extension Host/profile sạch để xác nhận module resolution và toàn bộ luồng preview.

**Sau khi sửa:** extension cài từ artifact có đủ module runtime; AST filter, parser và kiểm tra syntax hoạt động giống môi trường phát triển.

**Hoàn tất khi:** trong VSIX có dependency được bundle/đóng gói; cài và kích hoạt được trên môi trường sạch; log không có lỗi resolve module; thử được generate/preview/filter/save trên chính artifact đó.

### P1 — Mutation refinement mới tạo gợi ý, chưa phải vòng tự cải thiện

**Hiện trạng:** code tìm summary theo ID đã chuẩn hóa và dùng `MutationGuidedRefiner` để phân tích mutant còn sống sót, tạo scenario gợi ý cùng feedback prompt. Panel là read-only, không ghi prompt đè lên test. Command chưa gọi LLM để sinh test bổ sung, chưa chạy test mới, và chưa chạy mutation lần hai. UI hiện in hash SHA-256 rút gọn 12 ký tự của source, nhưng hash chỉ để tham khảo; summary không được đối chiếu với hash/commit tương ứng.

**Vì sao cần sửa:** tên gọi và báo cáo có thể khiến người nghe hiểu rằng hệ thống đã tự tinh chỉnh và cải thiện mutation score. Artifact cũ của cùng service có thể không còn đúng với phiên bản source hiện tại.

**Cách sửa:** trước mắt gọi đúng bản chất là **phân tích và đề xuất test từ mutation**; bổ sung manifest gồm service ID, đường dẫn chuẩn, source hash đầy đủ, commit và cấu hình chạy rồi từ chối summary khác source. Nếu phát triển thành refinement thật, nối luồng: lấy mutant sống sót → sinh test bổ sung → kiểm tra cú pháp → chạy test → chạy lại mutation → ghi score trước/sau cùng artifact. Không hiển thị kết quả cải thiện nếu chưa có lần chạy sau.

**Sau khi sửa:** người dùng biết rõ đây là gợi ý hay vòng tự động hoàn chỉnh; số liệu luôn gắn với đúng source; nếu hoàn tất vòng khép kín, mức cải thiện có thể được xác nhận bằng artifact trước/sau.

**Hoàn tất khi:** không dùng summary sai phiên bản; UI và báo cáo không gọi gợi ý là kết quả refinement đã được xác minh; nếu tuyên bố tự cải thiện thì có test code được sinh và mutation run trước/sau.

### P1 — Lọc scenario an toàn hơn nhưng chưa bảo đảm đúng lựa chọn

**Hiện trạng:** commit mới sửa nhánh “chọn tất cả” thành so sánh tập ID chính xác và bỏ fallback ghép theo vị trí. Tuy vậy mapping vẫn tìm ID bằng `title.includes(id)` hoặc so 25 ký tự đầu description. Khi không ánh xạ được, code chỉ cảnh báo rồi giữ block nếu còn scenario được chọn; cách này tránh mất test nhưng có thể lưu test ngoài lựa chọn. Test parameterized vẫn được coi là một AST block thay vì ánh xạ từng dòng dữ liệu.

**Vì sao cần sửa:** `includes` có thể nhầm ID là tiền tố của ID khác; title/description có thể trùng. Bảo toàn block chưa ánh xạ có thể khiến lựa chọn checkbox không khớp file được lưu.

**Cách sửa:** yêu cầu marker scenario ID rõ ràng, so khớp ID theo token chính xác, kiểm tra mapping 1–1. Nếu partial selection có block không ánh xạ được thì dừng lưu hoặc yêu cầu người dùng xác nhận giữ/bỏ block đó; không âm thầm đoán. Quy định rõ cách xử lý `each` và dữ liệu parameterized.

**Sau khi sửa:** checkbox, code preview và file lưu phản ánh cùng một tập scenario; người dùng được báo trước khi mapping chưa rõ.

**Hoàn tất khi:** có kiểm chứng với title trùng/thiếu ID, scenario thiếu/thừa, ID sai, test lồng trong `describe`, `each` thường và `each` dạng template; trường hợp mơ hồ được báo rõ.

### P1 — Method ambiguity đã được phát hiện ở core nhưng chưa đi xuyên suốt UI

**Hiện trạng:** extractor mới có `targetClassName` và báo lỗi khi cùng tên method có mặt ở nhiều class nếu không nêu class. Nhưng CodeLens chỉ truyền `[document.uri, method.name]`; `TestGenerationService` chỉ đưa `targetMethodName` vào pipeline, không truyền class. Do đó UI không thể giải quyết case ambiguity này. Trong một class, lookup vẫn dùng `find` theo tên nên overload chưa được phân biệt. Prompt vẫn gửi `serviceCode` toàn file; AST summary gọi toàn bộ class là “surrounding context & dependencies” dù chưa phân tích phụ thuộc thực sự.

**Vì sao cần sửa:** core có thể từ chối method mơ hồ nhưng không có đường chọn đúng class từ giao diện; overload vẫn có thể bị chọn nhầm. Gọi mọi class khác là dependency có thể gây hiểu nhầm cho model và người đọc.

**Cách sửa:** CodeLens truyền class ID và symbol/signature, mở rộng command/service/pipeline để nhận chúng. Lựa chọn overload bằng chữ ký hoặc source range. Gửi method source cộng dependency đã xác định; nếu giữ toàn file thì gọi đó là context bổ trợ, không khẳng định AST đã phân tích dependency.

**Sau khi sửa:** luồng method-level có phạm vi xác định và kết quả dễ kiểm tra hơn, kể cả khi file có overload hoặc nhiều class.

**Hoàn tất khi:** có kiểm chứng method thường, overload, class trùng tên method, function độc lập, method không tồn tại và dependency riêng tư; ambiguity không được tự chọn ngầm.

### P1 — Syntax validation mới lọc lỗi cú pháp, chưa xác nhận mutant hợp lệ về kiểu/ngữ nghĩa

**Hiện trạng:** `addMutantIfValid()` gọi `transpileModule` và bỏ candidate có syntax diagnostics, đây là cải tiến. Nhưng mutation vẫn được tạo bằng regex trên từng dòng; `transpileModule` không thay thế type-check toàn chương trình và regex có thể sửa operator/literal nằm trong string/comment hoặc tạo thay đổi không có ý nghĩa nghiệp vụ. Nếu không nạp được `typescript`, `isValidSyntax()` hiện trả `true`. Mutation summary chưa được chạy lại sau thay đổi nên số 26 compile error/178 là số lịch sử, không đo generator mới.

**Vì sao cần sửa:** kiểm tra cú pháp không bảo đảm mutant là biến thể hành vi hợp lệ; số liệu cũ không thể dùng để tuyên bố tỷ lệ compile error đã giảm trong commit hiện tại.

**Cách sửa:** nạp/bundle runtime `typescript` một cách bắt buộc; fail-closed nếu không có compiler. Chuyển operator mutation sang AST node/token span để tránh comment/literal/type syntax; chạy type-check/build test riêng để phân loại syntax error và type/compile error. Sau khi chốt generator mới, tạo lại mutation artifacts cùng cấu hình và commit.

**Sau khi sửa:** mutant tác động có chủ đích tới hành vi, tỷ lệ hợp lệ tăng và mutation score có thể tái lập theo đúng cấu hình.

**Hoàn tất khi:** VSIX dùng được compiler runtime; mutant được kiểm tra cú pháp và phân loại compile/type; báo cáo mới gắn đúng code version, denominator và equivalent mutants; service có mẫu nhỏ được ghi chú.

### P1 — Chưa có benchmark đầu ra của test do prompt sinh

**Hiện trạng:** artifact hiện tập trung vào ground-truth và mutation score của ground-truth. Không thấy kết quả sinh hàng loạt và đánh giá đầu ra cho Zero-shot, Few-shot, CoT, Hybrid.

**Vì sao cần sửa:** mục tiêu nghiên cứu là đánh giá sinh test và so sánh chiến lược. Coverage tốt của test chuẩn chỉ xác nhận bộ chuẩn, không xác nhận model/chiến lược sinh test có hữu ích hơn.

**Cách sửa:** chạy cùng tập service và cùng điều kiện cho từng chiến lược; cố định model/provider, temperature, token budget, timeout và phiên bản prompt. Lưu prompt/config, đầu ra thô, lỗi, thời gian/token, syntax/compile rate, test pass rate, coverage, mutation score và manifest theo commit. Dùng workspace tạm để test sinh không sửa dataset/gốc; có thể chạy lặp lại các ca có độ ngẫu nhiên và báo độ biến thiên. Đánh giá BA traceability bằng rubric do người chấm rà soát.

**Sau khi sửa:** có bằng chứng trực tiếp để trả lời chiến lược nào sinh test hợp lệ, phát hiện lỗi tốt và bám requirement; kết luận có thể tái tạo.

**Hoàn tất khi:** artifact bao phủ mọi strategy được tuyên bố, ghi cấu hình và commit, có bảng so sánh cùng mẫu số và giới hạn; có đánh giá thủ công cho tính đúng nghiệp vụ.

### P2 — Path pinning đã sửa, nhưng guard chưa kiểm tra containment và trạng thái ở host

**Hiện trạng:** commit mới từ chối `ACCEPT_TEST` nếu host chưa ghim `_targetOutputPath` và không còn dùng `msg.payload.outputPath`; code test được lấy từ cache host trước payload. Đây là sửa đúng lỗi cũ. Guard sau `path.normalize()` vẫn dùng `normalizedPath.includes('..')`, không xác nhận đường dẫn nằm trong workspace, và host chưa giữ/kiểm tra trạng thái syntax-valid/loading như một invariant độc lập với nút Webview.

**Vì sao cần sửa:** kiểm tra chuỗi `..` không tương đương kiểm tra path nằm trong thư mục cho phép; UI disable không nên là lớp duy nhất ngăn lưu code loading/lỗi nếu message handler được gọi ngoài luồng UI chuẩn.

**Cách sửa:** giữ nguyên host-pinned target; canonicalize path và so containment theo workspace policy (hoặc ghi rõ cho phép lưu cạnh file ngoài workspace). Lưu trạng thái preview/syntax ở host và chỉ nhận Accept khi trạng thái cho phép; dùng kiểm tra path segment thay vì substring.

**Sau khi sửa:** UI và host cùng ngăn lưu khi output chưa hợp lệ; chính sách lưu ngoài workspace có chủ đích và kiểm thử được.

**Hoàn tất khi:** test handler với target hợp lệ/không hợp lệ, traversal Windows/Unix, ngoài workspace, loading/error và không có target; xác nhận không ghi sai file.

### P2 — Chất lượng và traceability của dataset cần người rà soát

**Hiện trạng:** validator kiểm tra phân hoạch, schema và một số quy tắc chuỗi. Kiểm tra cấu trúc không chứng minh scenario/expected behavior đúng yêu cầu, cũng không đảm bảo từng AC có assertion thực chất trong ground-truth test.

**Vì sao cần sửa:** benchmark nhỏ nhưng nếu nhãn hoặc traceability sai thì mọi so sánh prompt có thể phản ánh lỗi dữ liệu thay vì năng lực model.

**Cách sửa:** lập bảng đối chiếu service → requirement → AC → scenario → test/assertion; rà soát bởi người hiểu nghiệp vụ và một người kiểm tra độc lập. Ghi nhận chỗ bất đồng, quyết định cuối và phiên bản dataset. Bổ sung nhóm ca đa dạng hơn nếu muốn khẳng định khả năng tổng quát ngoài 15 service hiện tại.

**Sau khi sửa:** dữ liệu chuẩn có nguồn gốc và quy trình kiểm tra; phần kết luận nêu đúng phạm vi mà benchmark hỗ trợ.

**Hoàn tất khi:** tất cả AC/scenario được truy vết tới assertion hoặc được giải thích vì sao không có assertion trực tiếp; có log người duyệt và danh sách giới hạn.

### P2 — Tài liệu có điểm lệch với cách triển khai và còn bản trùng

**Hiện trạng:** báo cáo đã đổi tên mutation refinement thành phân tích/gợi ý và ghi rõ chưa có vòng tự chạy lại; checklist thêm UAT về syntax validation. Tuy nhiên mô tả mutator vẫn cần phân biệt AST transformation với regex có syntax filter. README còn claim E2E; một bản `(1)` của consolidated plan đã được xóa, nhưng các tài liệu tổng hợp khác vẫn có chủ đề giao nhau và số liệu mutation artifact chưa cập nhật.

**Vì sao cần sửa:** khi demo/bảo vệ, người đọc khó phân biệt chức năng đã chạy được với thiết kế hoặc đề xuất; nhiều bản kế hoạch làm tăng rủi ro thông tin cũ mâu thuẫn.

**Cách sửa:** gắn nhãn rõ **Đã triển khai / Đã kiểm chứng / Chưa kiểm chứng / Đề xuất**; sửa claim E2E/AST theo đúng package runtime và code; cập nhật mutation metrics sau lần chạy generator mới, gắn commit/artifact. Chọn một bản đánh giá hiện hành làm nguồn chính, liên kết từ README và đánh dấu tài liệu cũ là lịch sử hoặc hợp nhất.

**Sau khi sửa:** báo cáo, README, checklist và demo cùng mô tả một trạng thái; giảng viên có thể lần từ claim đến mã, test hoặc artifact tương ứng.

**Hoàn tất khi:** không còn claim “đã kiểm chứng/E2E” thiếu evidence; mọi số liệu gắn artifact và commit; tài liệu trùng được đánh dấu lưu trữ hoặc hợp nhất.

### P2 — Cần có bằng chứng UAT trên VS Code thật và luồng consent

**Hiện trạng:** CI chạy typecheck, compile, Jest, dataset validation và package; checklist để UAT Host chờ kiểm chứng. Bằng chứng đóng gói cho thấy VSIX hiện không có `node_modules/typescript`, nên cần chạy UAT bằng bản cài artifact sau khi sửa dependency chứ không chỉ chạy extension từ workspace.

**Vì sao cần sửa:** mock/Jest không cho thấy toàn bộ trải nghiệm hoạt động trên VS Code thật: CodeLens, quyền Webview, provider consent, progress, auto-fix và lưu file.

**Cách sửa:** sau khi đóng gói đủ dependency, cài VSIX vào Extension Development Host/profile sạch; ghi VS Code/Node, hệ điều hành, provider/model, kết quả từng bước, ảnh/log và hash artifact. Kiểm tra từ chối consent, hủy preview, lỗi model, lọc scenario và lưu test.

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

1. Sửa packaging/runtime dependencies: bundle hoặc đóng gói TypeScript; fail-closed khi syntax checker không có compiler.
2. Hoàn thiện host path guard: containment theo policy và kiểm tra host-side trạng thái syntax/loading.
3. Chuẩn hóa scenario ID/mapping; xử lý rõ block không ánh xạ được và test parameterized.
4. Truyền class/symbol/signature từ CodeLens tới extractor; hỗ trợ overload hoặc báo ambiguity.
5. Gắn mutation summary với source hash/commit; giữ refinement là “gợi ý” cho tới khi có vòng chạy lại thật.
6. Chuyển mutation operator sang AST/token span; tạo lại benchmark vì artifact hiện tại là từ generator cũ.

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
- [ ] VSIX cài trên môi trường sạch có đầy đủ runtime dependencies; extension kích hoạt và sử dụng được AST filter.
- [ ] Webview không quyết định đích ghi; host xác minh path theo workspace policy và không cho ghi khi chưa có target hoặc syntax state chưa hợp lệ.
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

Commit `4691b5d` đã sửa thêm các lỗi cụ thể: host chỉ chấp nhận output path đã ghim, cache host được ưu tiên khi lưu; so sánh scenario bằng tập ID và bỏ ghép test theo vị trí; thêm lọc candidate mutant có lỗi cú pháp; phát hiện method trùng tên giữa nhiều class; hiển thị source hash và làm rõ mutation refinement chỉ là gợi ý; xóa một bản tài liệu trùng.

Các lỗi về số liệu giả, lưu prompt đè lên test và đường dẫn do Webview tự gửi đã được xử lý. Rủi ro lớn nhất hiện tại là VSIX không chứa `typescript` nhưng mã đã biên dịch yêu cầu module này khi nạp; cần xử lý trước khi demo bản cài. Tiếp theo là đóng kín mapping scenario, truyền class/method identity xuyên suốt UI, gắn mutation summary với source hash thật và đánh giá đầu ra prompt.

**Điểm tổng thể hiện tại: 7,2/10.** Điểm sáng tạo vẫn cao, nhưng khả năng chạy của artifact VSIX chưa được chứng minh và có thiếu dependency runtime rõ trong archive. Chưa có benchmark test sinh ra hoặc bằng chứng UAT từ bản cài sạch, nên chưa đủ cơ sở để chấm 10/10.

Đây là đánh giá tĩnh tại commit `4691b5d`; test, CI, benchmark và Extension Host không được chạy lại trong lượt rà soát này. Mutation artifacts chưa được cập nhật sau khi đổi mutator. Không có thao tác nào liên quan đến fine-tuning.
