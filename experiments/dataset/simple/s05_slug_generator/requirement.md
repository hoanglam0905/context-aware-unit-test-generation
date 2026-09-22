# Requirement: Chuyển đổi tiêu đề thành URL Slug chuẩn SEO (SlugGenerator)

## 1. User Story
Là một Quản trị viên nội dung (Content Creator / SEO Specialist),  
Tôi muốn hệ thống tự động chuẩn hóa và chuyển đổi tiêu đề bài viết (tiếng Việt có dấu) thành đường dẫn URL Slug thân thiện với công cụ tìm kiếm,  
Để tăng thứ hạng SEO và đảm bảo liên kết web không bị lỗi font hoặc lỗi mã hóa ký tự.

## 2. Business Rules (Quy tắc nghiệp vụ)
1. **Chuyển đổi dấu tiếng Việt sang không dấu (Diacritics Removal):**
   - Loại bỏ toàn bộ dấu thanh và các ký tự đặc thù tiếng Việt: `àáạảãâầấậẩẫăằắặẳẵ` $\to$ `a`, `èéẹẻẽêềếệểễ` $\to$ `e`, `đ` $\to$ `d`, `òóọỏõôồốộổỗơờớợởỡ` $\to$ `o`, `ùúụủũưừứựửữ` $\to$ `u`, `ìíịỉĩ` $\to$ `i`, `ỳýỵỷỹ` $\to$ `y`.
2. **Chuẩn hóa chữ hoa / thường (Case Normalization):**
   - Toàn bộ kết quả phải là chữ thường (`lowercase`).
3. **Ký tự ngăn cách và ký tự cấm (Separator & Special Characters):**
   - Ký tự đặc biệt, dấu câu, emoji (`!@#$%^&*()+=[]{}|;:,.<>?/\"'\``) phải bị loại bỏ.
   - Khoảng trắng hoặc nhiều khoảng trắng liên tiếp được thay thế bằng một dấu gạch ngang duy nhất (`-`).
   - Loại bỏ các dấu gạch ngang dư thừa ở đầu (leading) và cuối (trailing) chuỗi slug.
   - Không được phép có hai hay nhiều dấu gạch ngang liên tiếp (ví dụ `--` hoặc `---` phải gộp thành `-`).
4. **Giới hạn độ dài tối đa (Max Length Truncation):**
   - Mặc định độ dài tối đa cho một Slug là 80 ký tự.
   - Khi cắt ngắn: Không được cắt đứt giữa chừng một từ (word-safe truncation). Sau khi cắt tại ranh giới từ, loại bỏ dấu gạch ngang ở cuối.
5. **Ràng buộc đầu vào (Validation):**
   - Nếu tiêu đề đầu vào rỗng, chỉ chứa khoảng trắng hoặc chỉ chứa toàn ký tự đặc biệt bị lọc hết, trả về chuỗi rỗng `""` hoặc ném `InvalidSlugInputException`.

## 3. Acceptance Criteria (Gherkin format)

```gherkin
Scenario: Chuyển đổi tiêu đề tiếng Việt chuẩn có dấu
  Given tiêu đề bài viết "Nghiên Cứu và Phát Triển LLM Cho Kỹ Thuật Phần Mềm!"
  When hệ thống sinh URL slug
  Then slug trả về là "nghien-cuu-va-phat-trien-llm-cho-ky-thuat-phan-mem"

Scenario: Xử lý nhiều khoảng trắng và ký tự đặc biệt lộn xộn
  Given tiêu đề "@# UTC2 -- Chào mừng tân sinh viên   2026!  "
  When hệ thống sinh URL slug
  Then slug trả về là "utc2-chao-mung-tan-sinh-vien-2026"

Scenario: Cắt ngắn an toàn không đứt từ khi vượt quá 30 ký tự
  Given tiêu đề "lap trinh ung dung web voi nextjs va typescript" với maxLength = 30
  When hệ thống sinh URL slug
  Then slug trả về cắt tại ranh giới từ "lap-trinh-ung-dung-web-voi" (26 ký tự)
  And không bị cắt cụt thành "lap-trinh-ung-dung-web-voi-nex"
```
