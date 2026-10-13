# Đánh giá tổng thể dự án và kế hoạch hoàn thiện

**Ngày rà soát:** 14/10/2026

**Commit được rà soát:** `813508a` — `feat: bundle self-contained VSIX, enforce fail-closed mutator syntax, harden host state, and scope class-method symbols`
**Phạm vi:** mã nguồn ứng dụng, extension, core pipeline, bộ dữ liệu/benchmark hiện có, artifact, CI và tài liệu trong repository.  
**Giới hạn:** đây là rà soát tĩnh. Tôi không chạy test, benchmark, LLM hay VS Code Extension Host trong lượt này. Theo yêu cầu trước đó, không đánh giá, sửa hoặc thực hiện bất kỳ bước nào liên quan đến fine-tuning. Các con số thực nghiệm bên dưới được đọc từ artifact đã lưu, chưa được chạy lại độc lập.

## 1. Điểm hiện tại

Điểm dưới đây là ước lượng kỹ thuật từ trạng thái repository, không phải điểm chính thức của giảng viên. Trọng số dùng để tổng hợp: sáng tạo 25%, hoàn thiện chức năng 25%, tin cậy/an toàn 20%, bằng chứng đánh giá 20%, tài liệu/tái lập 10%.

| Hạng mục | Điểm | Nhận xét |
|---|---:|---|
| **Sáng tạo ứng dụng** | **8,8/10** | Kết hợp yêu cầu BA, cấu trúc mã nguồn và sinh unit test trong VS Code; có nhiều chiến lược prompt, chọn scenario, auto-fix và gợi ý dựa trên mutation. Phần mutation hiện mới đưa gợi ý, chưa tạo–chạy–đo lại test trong một vòng khép kín. |
| **Độ hoàn thiện chức năng** | **7,6/10** | Commit mới tự đóng gói `typescript` và `dotenv` vào VSIX, đồng thời truyền class name qua lệnh sinh test. Tuy vậy chưa có bằng chứng cài/chạy artifact trên Extension Host sạch; refinement chưa khép vòng và một số luồng còn heuristic. |
| **Độ tin cậy và an toàn** | **7,2/10** | Host ghim output path, kiểm tra containment khi có workspace, giữ trạng thái preview và fail-closed khi thiếu compiler. Còn đường ACCEPT ở `idle`, chính sách ngoài workspace/symlink chưa chặt, scenario không ánh xạ vẫn được giữ, và source divergence chỉ là heuristic substring. |
| **Bằng chứng đánh giá** | **6,5/10** | Ground-truth artifact ghi 15/15 suites; mutation summary là kết quả lịch sử trước mutator mới. Chưa có benchmark đầu ra của test do prompt sinh hoặc bằng chứng UAT trên bản VSIX cài sạch. |
| **Tài liệu và khả năng tái lập** | **7,5/10** | CI/checklist có thêm các bước packaging, state guard và syntax validation. Tuy nhiên acceptance test đang trỏ sai tên VSIX rồi bỏ qua assertion nếu không tìm thấy; một số claim UAT về containment/độc lập vẫn mạnh hơn bằng chứng hiện có. |
| **Tổng thể hiện tại** | **7,6/10** | Tính sẵn sàng phát hành đã tiến bộ rõ vì runtime dependency có trong VSIX và lỗi thiếu compiler đã được đóng. Điểm còn bị giới hạn bởi chưa xác minh bản cài thật, benchmark test sinh, số liệu mutation mới và một số rủi ro mapping/host-state. |

Muốn chấm 10/10 cần đối chiếu rubric của giảng viên, hoàn tất các luồng ưu tiên bên dưới và có bằng chứng chạy được trên commit cuối. Không thể bảo đảm điểm tuyệt đối chỉ từ rà soát mã nguồn.

Điểm tổng hợp là điểm có trọng số: 8,8×25% + 7,6×25% + 7,2×20% + 6,5×20% + 7,5×10% = **7,59**, làm tròn thành **7,6/10**.

## 2. Ưu điểm và phần đã được cải thiện

1. **Đề tài có giá trị sử dụng cụ thể:** đưa requirement/acceptance criteria và mã nguồn vào một quy trình sinh unit test ngay trong IDE; giảm thao tác chuyển ngữ cảnh giữa tài liệu, editor và công cụ AI.
2. **Kiến trúc có các lớp chức năng rõ:** parser/context extractor, requirement parser, prompt strategies, gateway cho model, post-processing, validation, runner, metrics và extension UI được tổ chức thành module.
3. **Có sản phẩm để trình diễn:** extension có CodeLens, sidebar, cấu hình provider, sinh theo file hoặc symbol, preview, chọn scenario và lưu sau khi người dùng chấp nhận.
4. **Bảo vệ nội dung preview tốt hơn:** Webview dùng CSP nonce và `textContent`/DOM API cho dữ liệu scenario; panel được tái sử dụng thì reset callback và output path cũ. Refinement mở chế độ read-only và ẩn nút lưu.
5. **Lọc scenario được làm ở phía host bằng TypeScript AST:** so sánh “chọn tất cả” theo tập ID, nhận ID theo ranh giới token và bỏ fallback ghép theo vị trí. Block không ánh xạ được vẫn được giữ lại khi còn scenario được chọn để tránh mất code; do đó output có thể còn test ngoài lựa chọn. Ghép mô tả dựa trên việc title chứa 30 ký tự đầu của description và test parameterized chưa được ánh xạ đến từng case dữ liệu.
6. **Xử lý consent cloud rõ hơn:** xác nhận được lưu theo provider; biến môi trường chỉ nhận giá trị `true` hoặc `1`, không coi chuỗi tùy ý như `false` là đồng ý.
7. **Method context tiến thêm một bước:** CodeLens truyền class name qua command/service tới extractor; extractor báo ambiguity khi cùng tên method xuất hiện ở nhiều class. Overload trong cùng class vẫn chọn implementation đầu tiên có body, nên chưa chọn được theo chữ ký.
8. **Mutation suggestions minh bạch hơn:** command tính và hiển thị SHA-256 đầy đủ/rút gọn, cảnh báo đây là gợi ý read-only, chưa tái sinh test. Tuy nhiên source freshness chưa được xác minh bằng manifest/hash của artifact: code chỉ kiểm tra `originalCode` của mutant còn sống có xuất hiện đâu đó trong source hay không rồi cảnh báo.
9. **Checklist UAT phân biệt automated với Extension Host:** trạng thái tương tác chưa có bằng chứng đã được chuyển về chờ kiểm chứng.
10. **CI và đóng gói có tiến triển:** workflow có typecheck, compile, Jest, validate dataset và package; script đóng gói tùy chỉnh inject `typescript`/`dotenv` vào VSIX. Đã kiểm tra cấu trúc archive có các thư viện này, nhưng chưa chứng minh extension cài và chạy trên Extension Host sạch. Mutation benchmark vẫn chạy riêng, không nằm trong CI hiện tại.

## 3. Bằng chứng hiện có và giới hạn của bằng chứng

- `experiments/results/ground_truth_eval_summary.json` ghi **15/15 ground-truth suites pass**, tổng **133 test**; artifact báo line coverage trung bình **98,09%** và branch coverage trung bình **91,76%**. Đây là kết quả của bộ ground-truth trong lần chạy được ghi nhận, không chứng minh test do LLM sinh đạt cùng mức.
- `experiments/results/mutation_summary.json` và `mutation_report.md` vẫn ghi **178 mutant**, gồm **152 hợp lệ**, **100 killed**, **52 survived**, **26 compile error** (mutation score lịch sử **65,79%**). Mutator đã đổi để lọc syntax diagnostic và fail-closed khi thiếu TypeScript; artifacts chưa chạy lại sau thay đổi này, vì vậy không được dùng các con số trên làm kết quả cho generator ở commit `813508a`.
- Dataset manifest có **15 service, 133 scenario**, phân bổ 9/3/3 service và 89/17/27 scenario theo các nhóm hiện tại. Validator kiểm tra cấu trúc, file, schema và một số quy tắc chuỗi; nó không tự chứng minh tính đúng nghiệp vụ hoặc assertion có thực sự kiểm tra acceptance criteria.
- Thư mục `experiments/results/` có artifact ground-truth và mutation, nhưng không thấy batch manifest/kết quả đánh giá test do prompt strategy sinh. Vì thế hiện chưa có số đo trực tiếp cho pass rate, syntax rate, coverage/mutation score của test sinh ra, hoặc so sánh bốn chiến lược.
- `docs/ACCEPTANCE_CHECKLIST.md` ghi UAT tương tác trên Extension Host đang chờ kiểm chứng; VSIX hiện đã được script đóng gói bổ sung `typescript` và `dotenv`. Cần sửa nội dung UAT đang tuyên bố containment bắt buộc dù code bỏ qua khi workspace rỗng, và tuyên bố package chạy độc lập dù chưa có Host evidence. Test packaging còn trỏ nhầm tên file và assertion size có thể bị bỏ qua. Workflow CI không chạy mutation benchmark toàn bộ.
- Không có lệnh test/benchmark nào được chạy trong lần rà soát này. Các kết luận về trạng thái mã dựa trên đọc source/test/docs và artifact trong repository.

## 4. Lỗi và việc còn thiếu — vì sao, cách sửa, kết quả mong đợi

### P1 — VSIX đã nhúng runtime dependency, nhưng kiểm thử đóng gói có thể bỏ qua và chưa có UAT Host

**Hiện trạng:** `packages/extension/scripts/package_extension.js` tạo VSIX rồi bổ sung `extension/node_modules/typescript` và `extension/node_modules/dotenv`; kiểm tra archive tĩnh xác nhận các thư viện cùng compiled filter có trong gói. Tuy nhiên `addDir()` chỉ cảnh báo rồi bỏ qua nếu thư mục dependency bắt buộc không tồn tại, sau đó script vẫn có thể báo đóng gói thành công. `CodeMutatorGenerator.isValidSyntax()` hiện fail-closed nếu TypeScript không khả dụng. Ngoài ra `packages/extension/src/acceptance.test.ts` tìm `context-aware-test-gen-0.1.0.vsix`, trong khi artifact thực tế tên `context-aware-unit-test-generation-extension-0.1.0.vsix`; assertion kích thước nằm trong `if (existsSync(...))`, nên sai path sẽ làm phần kiểm tra archive im lặng bị bỏ qua. Test cũng mới kiểm tra script/nội dung cơ bản, không chứng minh module load trong VS Code. UAT Extension Host vẫn đang chờ.

**Vì sao cần sửa:** lỗi thiếu dependency đã được xử lý trong cách tạo archive, nhưng test false-green có thể khiến packaging regressions lọt qua. Nội dung archive tĩnh chưa chứng minh extension kích hoạt, nạp module và chạy luồng người dùng trên bản cài sạch.

**Cách sửa:** với dependency runtime bắt buộc, script đóng gói phải throw/exit lỗi nếu thư mục nguồn thiếu; sau khi tạo archive phải kiểm tra entry `typescript`/`dotenv`. Sửa test trỏ tới đúng tên VSIX; nếu artifact không có thì fail thay vì skip. Kiểm tra danh sách entry bên trong archive và sự hiện diện của runtime dependencies. Sau đó cài chính VSIX vào Extension Development Host/profile sạch, kiểm tra activation, filter, syntax checker và luồng generate/preview/save; lưu phiên bản VS Code, log và hash artifact.

**Sau khi sửa:** CI phát hiện được gói thiếu/sai dependency thay vì bỏ qua; có bằng chứng rằng artifact phát hành hoạt động trong môi trường cài sạch.

**Hoàn tất khi:** script và test đều thất bại nếu dependency/VSIX thiếu hoặc sai tên; archive assertion xác nhận các module runtime; UAT Host gắn với commit/artifact và không có lỗi load module.

### P1 — Mutation refinement mới tạo gợi ý, chưa phải vòng tự cải thiện

**Hiện trạng:** code tìm summary theo ID đã chuẩn hóa và dùng `MutationGuidedRefiner` để phân tích mutant còn sống sót, tạo scenario gợi ý cùng feedback prompt. Panel là read-only, không ghi prompt đè lên test. Command chưa gọi LLM để sinh test bổ sung, chưa chạy test mới, và chưa chạy mutation lần hai. UI in SHA-256 đầy đủ/rút gọn của source và thử phát hiện divergence nếu `originalCode` của mutant không xuất hiện trong source hiện tại; đây chỉ là substring heuristic, không đối chiếu hash/commit của summary.

**Vì sao cần sửa:** tên gọi và báo cáo có thể khiến người nghe hiểu rằng hệ thống đã tự tinh chỉnh và cải thiện mutation score. Artifact cũ của cùng service có thể không còn đúng với phiên bản source hiện tại.

**Cách sửa:** trước mắt gọi đúng bản chất là **phân tích và đề xuất test từ mutation**; bổ sung manifest gồm service ID, đường dẫn chuẩn, source hash đầy đủ, commit và cấu hình chạy rồi từ chối summary khác source. Không coi sự hiện diện của một đoạn code con là xác minh phiên bản. Nếu phát triển thành refinement thật, nối luồng: lấy mutant sống sót → sinh test bổ sung → kiểm tra cú pháp → chạy test → chạy lại mutation → ghi score trước/sau cùng artifact. Không hiển thị kết quả cải thiện nếu chưa có lần chạy sau.

**Sau khi sửa:** người dùng biết rõ đây là gợi ý hay vòng tự động hoàn chỉnh; số liệu luôn gắn với đúng source; nếu hoàn tất vòng khép kín, mức cải thiện có thể được xác nhận bằng artifact trước/sau.

**Hoàn tất khi:** không dùng summary sai phiên bản; UI và báo cáo không gọi gợi ý là kết quả refinement đã được xác minh; nếu tuyên bố tự cải thiện thì có test code được sinh và mutation run trước/sau.

### P1 — Lọc scenario an toàn hơn nhưng chưa bảo đảm đúng lựa chọn

**Hiện trạng:** commit mới sửa nhánh “chọn tất cả” thành so sánh tập ID chính xác, nhận ID theo ranh giới token và bỏ fallback ghép theo vị trí. Tuy vậy ghép bằng description chỉ so title với 30 ký tự đầu của description. Khi không ánh xạ được, code cảnh báo rồi giữ block nếu còn scenario được chọn; cách này tránh mất test nhưng có thể lưu test ngoài lựa chọn. Test parameterized vẫn được coi là một AST block thay vì ánh xạ từng dòng dữ liệu.

**Vì sao cần sửa:** ghép mô tả không phải định danh ổn định và có thể nhầm khi tiêu đề trùng/đổi; bảo toàn block chưa ánh xạ có thể khiến lựa chọn checkbox không khớp file được lưu.

**Cách sửa:** yêu cầu marker scenario ID rõ ràng, so khớp ID theo token chính xác, kiểm tra mapping 1–1. Nếu partial selection có block không ánh xạ được thì dừng lưu hoặc yêu cầu người dùng xác nhận giữ/bỏ block đó; không âm thầm đoán. Quy định rõ cách xử lý `each` và dữ liệu parameterized.

**Sau khi sửa:** checkbox, code preview và file lưu phản ánh cùng một tập scenario; người dùng được báo trước khi mapping chưa rõ.

**Hoàn tất khi:** có kiểm chứng với title trùng/thiếu ID, scenario thiếu/thừa, ID sai, test lồng trong `describe`, `each` thường và `each` dạng template; trường hợp mơ hồ được báo rõ.

### P1 — Đã truyền class identity; vẫn chưa phân biệt overload/symbol chính xác

**Hiện trạng:** CodeLens hiện truyền class name qua command và `TestGenerationService` tới extractor; extractor báo lỗi khi cùng tên method có mặt ở nhiều class nếu không nêu class. Trong một class, lookup vẫn chọn implementation đầu tiên theo tên nên overload chưa được phân biệt. Prompt vẫn gửi `serviceCode` toàn file; AST summary chưa phân tích dependency thực sự.

**Vì sao cần sửa:** class identity giải quyết được trường hợp cùng method name ở nhiều class, nhưng overload cùng tên trong một class vẫn có thể bị chọn sai. Gửi cả file cũng làm ranh giới giữa method đang kiểm thử và context bổ trợ kém rõ; gọi mọi class khác là dependency có thể gây hiểu nhầm cho model và người đọc.

**Cách sửa:** mở rộng CodeLens/command/service/pipeline để truyền symbol/signature hoặc source range ổn định, không chỉ class name. Lựa chọn overload bằng chữ ký hoặc source range. Gửi method source cộng dependency đã xác định; nếu giữ toàn file thì gọi đó là context bổ trợ, không khẳng định AST đã phân tích dependency.

**Sau khi sửa:** luồng method-level có phạm vi xác định và kết quả dễ kiểm tra hơn, kể cả khi file có overload hoặc nhiều class.

**Hoàn tất khi:** có kiểm chứng method thường, overload, class trùng tên method, function độc lập, method không tồn tại và dependency riêng tư; ambiguity không được tự chọn ngầm.

### P1 — Syntax validation mới lọc lỗi cú pháp, chưa xác nhận mutant hợp lệ về kiểu/ngữ nghĩa

**Hiện trạng:** `addMutantIfValid()` gọi `transpileModule` và bỏ candidate có syntax diagnostics; `isValidSyntax()` fail-closed nếu không nạp được TypeScript. Nhưng mutation vẫn được tạo bằng regex trên từng dòng; `transpileModule` không thay thế type-check toàn chương trình và regex có thể sửa operator/literal nằm trong string/comment hoặc tạo thay đổi không có ý nghĩa nghiệp vụ. Mutation summary chưa được chạy lại sau thay đổi nên số 26 compile error/178 là số lịch sử, không đo generator mới.

**Vì sao cần sửa:** kiểm tra cú pháp không bảo đảm mutant là biến thể hành vi hợp lệ; số liệu cũ không thể dùng để tuyên bố tỷ lệ compile error đã giảm trong commit hiện tại.

**Cách sửa:** giữ runtime `typescript` bắt buộc trong artifact và fail-closed nếu không có compiler. Chuyển operator mutation sang AST node/token span để tránh comment/literal/type syntax; chạy type-check/build test riêng để phân loại syntax error và type/compile error. Sau khi chốt generator mới, tạo lại mutation artifacts cùng cấu hình và commit.

**Sau khi sửa:** mutant tác động có chủ đích tới hành vi, tỷ lệ hợp lệ tăng và mutation score có thể tái lập theo đúng cấu hình.

**Hoàn tất khi:** VSIX dùng được compiler runtime; mutant được kiểm tra cú pháp và phân loại compile/type; báo cáo mới gắn đúng code version, denominator và equivalent mutants; service có mẫu nhỏ được ghi chú.

### P1 — Chưa có benchmark đầu ra của test do prompt sinh

**Hiện trạng:** artifact hiện tập trung vào ground-truth và mutation score của ground-truth. Không thấy kết quả sinh hàng loạt và đánh giá đầu ra cho Zero-shot, Few-shot, CoT, Hybrid.

**Vì sao cần sửa:** mục tiêu nghiên cứu là đánh giá sinh test và so sánh chiến lược. Coverage tốt của test chuẩn chỉ xác nhận bộ chuẩn, không xác nhận model/chiến lược sinh test có hữu ích hơn.

**Cách sửa:** chạy cùng tập service và cùng điều kiện cho từng chiến lược; cố định model/provider, temperature, token budget, timeout và phiên bản prompt. Lưu prompt/config, đầu ra thô, lỗi, thời gian/token, syntax/compile rate, test pass rate, coverage, mutation score và manifest theo commit. Dùng workspace tạm để test sinh không sửa dataset/gốc; có thể chạy lặp lại các ca có độ ngẫu nhiên và báo độ biến thiên. Đánh giá BA traceability bằng rubric do người chấm rà soát.

**Sau khi sửa:** có bằng chứng trực tiếp để trả lời chiến lược nào sinh test hợp lệ, phát hiện lỗi tốt và bám requirement; kết luận có thể tái tạo.

**Hoàn tất khi:** artifact bao phủ mọi strategy được tuyên bố, ghi cấu hình và commit, có bảng so sánh cùng mẫu số và giới hạn; có đánh giá thủ công cho tính đúng nghiệp vụ.

### P2 — Host path pinning đã có; state và containment còn hở

**Hiện trạng:** commit mới từ chối `ACCEPT_TEST` nếu host chưa ghim `_targetOutputPath` và không còn dùng `msg.payload.outputPath`; code test được lấy từ cache host trước payload. Host hiện kiểm tra containment nếu có `workspaceFolders`, nhưng bỏ qua containment khi danh sách workspace rỗng. Guard `split(path.sep).includes('..')` chạy sau `path.resolve()` nên không thay thế containment/canonicalization. Ngoài ra handler chỉ từ chối `loading` và `error`, không bắt buộc trạng thái là `ready`; ở `idle`, nhánh fallback vẫn có thể nhận `msg.payload.testCode` nếu host cache trống. Kiểm tra containment hiện dựa trên đường dẫn từ vựng, không resolve symlink.

**Vì sao cần sửa:** trạng thái `idle` không chứng minh preview đã sẵn sàng, còn containment bị bỏ qua khi không có workspace. Đường dẫn pinned giảm đáng kể rủi ro payload tùy ý, nhưng chính sách lưu và invariant host vẫn chưa nhất quán với claim “bắt buộc thuộc workspace” trong checklist. Symlink trong workspace có thể trỏ ra ngoài nếu chính sách cần chặn cả đường dẫn vật lý.

**Cách sửa:** giữ host-pinned target; quy định rõ hành vi khi không có workspace (từ chối hoặc cho phép theo cấu hình), so containment cho mọi trường hợp cần giới hạn và dùng `realpath` nếu cần chặn symlink escape. Chỉ nhận Accept khi `_hostState === 'ready'`, có cached test code hợp lệ và target hợp lệ; bỏ fallback payload cho code nếu host chưa có bản cache. Cập nhật checklist khớp với chính sách thực tế.

**Sau khi sửa:** host tự bảo đảm lưu đúng bản preview đã kiểm tra; trạng thái loading/error/idle không thể vượt qua bằng message trực tiếp; phạm vi đường dẫn được xác định rõ và kiểm chứng được.

**Hoàn tất khi:** test handler với target hợp lệ/không hợp lệ, traversal Windows/Unix, ngoài workspace, loading/error và không có target; xác nhận không ghi sai file.

### P2 — Chất lượng và traceability của dataset cần người rà soát

**Hiện trạng:** validator kiểm tra phân hoạch, schema và một số quy tắc chuỗi. Kiểm tra cấu trúc không chứng minh scenario/expected behavior đúng yêu cầu, cũng không đảm bảo từng AC có assertion thực chất trong ground-truth test.

**Vì sao cần sửa:** benchmark nhỏ nhưng nếu nhãn hoặc traceability sai thì mọi so sánh prompt có thể phản ánh lỗi dữ liệu thay vì năng lực model.

**Cách sửa:** lập bảng đối chiếu service → requirement → AC → scenario → test/assertion; rà soát bởi người hiểu nghiệp vụ và một người kiểm tra độc lập. Ghi nhận chỗ bất đồng, quyết định cuối và phiên bản dataset. Bổ sung nhóm ca đa dạng hơn nếu muốn khẳng định khả năng tổng quát ngoài 15 service hiện tại.

**Sau khi sửa:** dữ liệu chuẩn có nguồn gốc và quy trình kiểm tra; phần kết luận nêu đúng phạm vi mà benchmark hỗ trợ.

**Hoàn tất khi:** tất cả AC/scenario được truy vết tới assertion hoặc được giải thích vì sao không có assertion trực tiếp; có log người duyệt và danh sách giới hạn.

### P2 — Tài liệu có điểm lệch với cách triển khai và còn bản trùng

**Hiện trạng:** báo cáo đã đổi tên mutation refinement thành phân tích/gợi ý và ghi rõ chưa có vòng tự chạy lại; checklist thêm UAT về syntax validation và packaging. Tuy nhiên checklist còn nói containment bắt buộc dù code bỏ qua khi workspace rỗng; UAT-11 khẳng định hoạt động trên cài đặt sạch khi mới xác nhận các dependency được inject vào archive, chưa có Host evidence. README còn claim TypeScript/JavaScript đã kiểm chứng toàn diện E2E; `docs/extension_guide.md` vẫn hướng dẫn cài một tên VSIX cũ và nêu coverage trên 95%/test pass 100% như đặc tính; một bản `(1)` của consolidated plan đã được xóa, nhưng các tài liệu tổng hợp khác còn chủ đề giao nhau và số liệu mutation chưa cập nhật. Mô tả mutator cần phân biệt AST transformation với regex có syntax filter.

**Vì sao cần sửa:** khi demo/bảo vệ, người đọc khó phân biệt chức năng đã chạy được với thiết kế hoặc đề xuất; nhiều bản kế hoạch làm tăng rủi ro thông tin cũ mâu thuẫn.

**Cách sửa:** gắn nhãn rõ **Đã triển khai / Đã kiểm chứng / Chưa kiểm chứng / Đề xuất**; sửa claim E2E/AST/containment/self-contained và số coverage/pass rate theo đúng code cùng evidence; cập nhật đường dẫn VSIX trong hướng dẫn. Cập nhật mutation metrics sau lần chạy generator mới, gắn commit/artifact. Sửa packaging test sai path và bỏ điều kiện cho phép skip. Chọn một bản đánh giá hiện hành làm nguồn chính, liên kết từ README và đánh dấu tài liệu cũ là lịch sử hoặc hợp nhất.

**Sau khi sửa:** báo cáo, README, checklist và demo cùng mô tả một trạng thái; giảng viên có thể lần từ claim đến mã, test hoặc artifact tương ứng.

**Hoàn tất khi:** không còn claim “đã kiểm chứng/E2E” thiếu evidence; mọi số liệu gắn artifact và commit; tài liệu trùng được đánh dấu lưu trữ hoặc hợp nhất.

### P2 — Cần có bằng chứng UAT trên VS Code thật và luồng consent

**Hiện trạng:** CI chạy typecheck, compile, Jest, dataset validation và package; cấu trúc VSIX đã được kiểm tra tĩnh và có `typescript`/`dotenv`. Checklist vẫn để UAT Host chờ kiểm chứng. Chưa có bằng chứng cài artifact trên profile sạch và chạy trọn luồng thực tế.

**Vì sao cần sửa:** mock/Jest không cho thấy toàn bộ trải nghiệm hoạt động trên VS Code thật: CodeLens, quyền Webview, provider consent, progress, auto-fix và lưu file.

**Cách sửa:** cài VSIX hiện tại vào Extension Development Host/profile sạch; ghi VS Code/Node, hệ điều hành, provider/model, kết quả từng bước, ảnh/log và hash artifact. Kiểm tra activation/module resolution, từ chối consent, hủy preview, lỗi model, lọc scenario và lưu test.

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

1. Chốt kiểm chứng packaging: sửa test sai tên VSIX, bắt buộc archive assertion và cài bản VSIX hiện tại lên Host sạch.
2. Hoàn thiện host invariant: ACCEPT chỉ ở `ready`, không nhận code payload thay cache; định nghĩa containment khi workspace rỗng và xử lý symlink theo policy.
3. Chuẩn hóa scenario ID/mapping; partial selection phải dừng hoặc yêu cầu xác nhận khi block không ánh xạ được; xác định hành vi cho `each`/parameterized.
4. Bổ sung symbol/signature hoặc source range từ CodeLens tới extractor; hỗ trợ overload hoặc báo ambiguity.
5. Gắn mutation summary với source hash/commit thực; giữ refinement là “gợi ý” cho tới khi có vòng chạy lại thật.
6. Chuyển mutation operator sang AST/token span; tạo lại benchmark vì artifact hiện tại có trước mutator mới.

### Giai đoạn B — Chứng minh chất lượng và tính sáng tạo

7. Tạo batch benchmark cho các prompt strategies trên cùng đầu vào và điều kiện; lưu output, config, log, artifact và manifest.
8. So sánh pass/syntax rate, coverage, mutation score, traceability BA, latency và token cost; báo mẫu số, biến thiên và giới hạn.
9. Rà soát thủ công mapping AC → scenario → assertion; công bố rubric và kết quả đánh giá người dùng/nhà phát triển cho giá trị sử dụng trong IDE.
10. Nếu sau này hoàn thiện mutation feedback loop, đo trước/sau trên cùng mutant set để chứng minh lợi ích của tính năng sáng tạo này.

### Giai đoạn C — Chốt demo và khả năng tái lập

11. Chạy automated CI và UAT trên Extension Host ở commit phát hành; lưu bằng chứng dễ mở lại.
12. Cập nhật báo cáo, README và checklist theo đúng trạng thái code; thêm nguồn cho related work và giới hạn hỗ trợ ngôn ngữ.
13. Hợp nhất/đánh dấu các tài liệu kế hoạch trùng; giữ một file đánh giá hiện hành và liên kết từ tài liệu chính.

## 6. Tiêu chí nghiệm thu để tự tin hướng tới 10/10

- [ ] Luồng người dùng hoàn chỉnh trên VS Code thật: chọn service/method → tìm requirement → sinh → xem trạng thái/kịch bản → chọn → lưu hoặc hủy.
- [ ] VSIX cài trên môi trường sạch có đầy đủ runtime dependencies; extension kích hoạt và sử dụng được AST filter.
- [ ] Webview không quyết định đích ghi; host chỉ nhận ACCEPT ở `ready`, lấy code từ cache đã kiểm tra và áp dụng rõ ràng chính sách workspace/path.
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

Commit `813508a` đóng gói `typescript`/`dotenv` vào VSIX, fail-closed khi compiler không có, giữ trạng thái preview ở host, thêm kiểm tra containment theo workspace khi có workspace, truyền class name xuyên CodeLens/service/extractor, lọc ID theo token boundary và cảnh báo divergence nguồn. Đây là tiến triển thực chất so với lần rà soát trước; lỗi thiếu dependency runtime không còn là P0 theo cấu trúc archive đã kiểm tra.

Các việc có ảnh hưởng lớn nhất hiện tại là: (1) sửa false-green trong packaging test và chạy UAT trên VSIX cài sạch; (2) yêu cầu host state `ready` và chốt path policy; (3) không giữ âm thầm block scenario chưa ánh xạ khi partial selection; (4) gắn summary mutation với source hash/commit, thay heuristic substring; (5) tạo lại mutation metrics và benchmark trực tiếp đầu ra prompt. Overload vẫn chưa được phân biệt, và tài liệu acceptance cần khớp với code/evidence.

**Điểm tổng thể hiện tại: 7,6/10** (sáng tạo **8,8/10**). Điểm tăng vì lỗi đóng gói runtime đã được sửa trong artifact và method identity/scenario matching/host guards được cải thiện. Chưa thể chấm cao hơn đáng kể khi chưa có test sinh được benchmark, mutation report mới và bằng chứng UAT Host; các điểm nêu trên cũng cần khép lại để hướng tới 10/10 về sáng tạo ứng dụng lẫn độ đầy đủ.

Đây là rà soát tĩnh tại commit `813508a`; không chạy test, CI, benchmark hoặc Extension Host trong lượt này. Mutation artifacts chưa được cập nhật sau khi đổi mutator. Theo yêu cầu đã nêu trước đó, không có thao tác nào liên quan đến fine-tuning.