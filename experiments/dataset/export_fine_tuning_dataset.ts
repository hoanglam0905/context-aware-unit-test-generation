import * as fs from 'fs';
import * as path from 'path';
import { ContextExtractor } from '../../packages/core/src/extractor/context_extractor';
import { TestPostProcessor } from '../../packages/core/src/pipeline/post_processor';

interface ManifestService {
  id: string;
  tier: string;
  name: string;
  folder: string;
  serviceFile: string;
  requirementFile: string;
  testFile: string;
  split: 'train' | 'validation' | 'test';
  targetClass: string;
  domain: string;
  acceptanceCriteriaCount: number;
}

interface Manifest {
  version: string;
  splits: {
    train: string[];
    validation: string[];
    test: string[];
  };
  services: ManifestService[];
}

const VERIFIED_TRACEABILITY_REGISTRY: Record<
  string,
  Record<string, { acRef: string; expected: string; category: string }>
> = {
  S01_DiscountCalculator: {
    'throw invalidorderamountexception when amount is 0': {
      acRef: 'BR3: Ràng buộc giá trị đơn hàng (orderAmount > 0)',
      expected: 'Ném ngoại lệ InvalidOrderAmountException khi giá trị đơn hàng bằng 0',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidorderamountexception when amount is negative': {
      acRef: 'BR3: Ràng buộc giá trị đơn hàng (orderAmount > 0)',
      expected: 'Ném ngoại lệ InvalidOrderAmountException khi giá trị đơn hàng là số âm',
      category: 'EXCEPTION_HANDLING',
    },
    'default to regular tier when tier is undefined': {
      acRef: 'BR1: Hạng thành viên mặc định là REGULAR',
      expected: 'Tự động áp dụng hạng REGULAR với chiết khấu 0% khi không truyền tham số tier',
      category: 'NORMAL_FLOW',
    },
    'default to regular tier when tier is invalid string': {
      acRef: 'BR1: Hạng thành viên mặc định là REGULAR',
      expected: 'Tự động áp dụng hạng REGULAR khi chuỗi tier không hợp lệ',
      category: 'NORMAL_FLOW',
    },
    'give 0% discount for regular tier': {
      acRef: 'AC1: Khách hàng REGULAR được hưởng chiết khấu cơ bản 0%',
      expected: 'Tính toán chính xác tỷ lệ chiết khấu 0% và số tiền sau giảm',
      category: 'NORMAL_FLOW',
    },
    'give 5% discount for silver tier': {
      acRef: 'AC1: Khách hàng SILVER được hưởng chiết khấu 5%',
      expected: 'Tính toán chính xác tỷ lệ chiết khấu 5% cho thành viên SILVER',
      category: 'NORMAL_FLOW',
    },
    'give 10% discount for gold tier when amount < 1,000,000': {
      acRef: 'AC1: Khách hàng GOLD được hưởng chiết khấu 10%',
      expected: 'Tính toán chính xác tỷ lệ chiết khấu 10% cho thành viên GOLD khi đơn dưới 1 triệu',
      category: 'NORMAL_FLOW',
    },
    'give 15% discount for gold tier when amount >= 1,000,000 (boundary value)': {
      acRef: 'AC1: Khách hàng GOLD được hưởng chiết khấu 15% khi đơn từ 1 triệu',
      expected: 'Áp dụng mức chiết khấu 15% tại ngưỡng biên 1,000,000 VND cho GOLD tier',
      category: 'BOUNDARY_VALUE',
    },
    'give 20% discount for platinum tier without reaching cap': {
      acRef: 'AC1: Khách hàng PLATINUM được hưởng chiết khấu 20%',
      expected: 'Tính toán chính xác tỷ lệ chiết khấu 20% cho thành viên PLATINUM',
      category: 'NORMAL_FLOW',
    },
    'cap discount amount at 500,000 vnd when calculated discount exceeds 500k': {
      acRef: 'BR2: Hạn mức giảm giá tối đa (Max Discount Cap = 500,000 VND)',
      expected: 'Giới hạn số tiền giảm giá không vượt quá 500,000 VND và gắn cờ isCapped = true',
      category: 'BOUNDARY_VALUE',
    },
    'cap discount amount for gold tier with very large order': {
      acRef: 'BR2: Hạn mức giảm giá tối đa (Max Discount Cap = 500,000 VND)',
      expected: 'Giới hạn chiết khấu ở mức trần 500,000 VND cho đơn hàng giá trị lớn',
      category: 'BOUNDARY_VALUE',
    },
  },

  S02_PasswordValidator: {
    'reject empty password': {
      acRef: 'BR1: Kiểm tra ràng buộc đầu vào không được rỗng',
      expected: 'Từ chối mật khẩu khi chuỗi rỗng',
      category: 'EXCEPTION_HANDLING',
    },
    'reject password containing spaces': {
      acRef: 'BR1: Mật khẩu không được chứa khoảng trắng',
      expected: 'Từ chối mật khẩu có chứa ký tự khoảng trắng',
      category: 'NORMAL_FLOW',
    },
    'reject password with less than 8 characters': {
      acRef: 'BR1: Độ dài mật khẩu tối thiểu 8 ký tự',
      expected: 'Từ chối mật khẩu khi độ dài dưới 8 ký tự',
      category: 'BOUNDARY_VALUE',
    },
    'reject password longer than 32 characters': {
      acRef: 'BR1: Độ dài mật khẩu tối đa 32 ký tự',
      expected: 'Từ chối mật khẩu khi độ dài vượt quá 32 ký tự',
      category: 'BOUNDARY_VALUE',
    },
    'reject password missing uppercase letters': {
      acRef: 'BR2: Mật khẩu phải chứa ít nhất 1 chữ cái in hoa',
      expected: 'Từ chối mật khẩu khi thiếu chữ cái in hoa',
      category: 'NORMAL_FLOW',
    },
    'reject password missing lowercase letters': {
      acRef: 'BR2: Mật khẩu phải chứa ít nhất 1 chữ cái in thường',
      expected: 'Từ chối mật khẩu khi thiếu chữ cái in thường',
      category: 'NORMAL_FLOW',
    },
    'reject password missing numbers': {
      acRef: 'BR3: Mật khẩu phải chứa ít nhất 1 chữ số',
      expected: 'Từ chối mật khẩu khi không có chữ số nào',
      category: 'NORMAL_FLOW',
    },
    'reject password missing special characters': {
      acRef: 'BR4: Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt',
      expected: 'Từ chối mật khẩu khi thiếu ký tự đặc biệt',
      category: 'NORMAL_FLOW',
    },
    'reject password containing username (case-insensitive)': {
      acRef: 'BR5: Mật khẩu không được chứa tên người dùng (Username)',
      expected: 'Từ chối mật khẩu khi chứa username không phân biệt hoa thường',
      category: 'NORMAL_FLOW',
    },
    'reject password identical to current password': {
      acRef: 'BR6: Mật khẩu mới không được trùng với mật khẩu hiện tại',
      expected: 'Từ chối mật khẩu mới khi trùng khớp với mật khẩu cũ',
      category: 'NORMAL_FLOW',
    },
    'evaluate as medium when all rules pass but length < 12': {
      acRef: 'AC2: Đánh giá độ mạnh MEDIUM khi đạt các quy tắc nhưng độ dài dưới 12',
      expected: 'Đánh giá độ mạnh mật khẩu ở mức MEDIUM',
      category: 'NORMAL_FLOW',
    },
    'evaluate as strong when length >= 12 and >= 2 special characters': {
      acRef: 'AC1: Đánh giá độ mạnh STRONG khi độ dài >= 12 và có >= 2 ký tự đặc biệt',
      expected: 'Đánh giá độ mạnh mật khẩu ở mức STRONG',
      category: 'NORMAL_FLOW',
    },
  },

  S03_ShippingFeeCalculator: {
    'throw invalidshippinginputexception when distance is <= 0': {
      acRef: 'BR1: Ràng buộc khoảng cách giao hàng (distanceKm > 0)',
      expected: 'Ném ngoại lệ InvalidShippingInputException khi khoảng cách không dương',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidshippinginputexception when weight is <= 0': {
      acRef: 'BR2: Ràng buộc khối lượng hàng hóa (weightKg > 0)',
      expected: 'Ném ngoại lệ InvalidShippingInputException khi khối lượng không dương',
      category: 'EXCEPTION_HANDLING',
    },
    'return fixed 15,000 vnd base fee for distance <= 5 km': {
      acRef: 'AC1: Cước phí cơ bản cho khoảng cách <= 5 km',
      expected: 'Áp dụng mức cước phí cơ bản cố định 15,000 VND',
      category: 'BOUNDARY_VALUE',
    },
    'calculate base fee correctly for distance between 5 and 20 km (boundary test)': {
      acRef: 'BR1: Cước phí cơ bản cho khoảng cách từ 5 đến 20 km',
      expected: 'Tính cước phí lũy tiến chính xác theo bậc 5-20 km',
      category: 'BOUNDARY_VALUE',
    },
    'calculate base fee correctly for distance > 20 km': {
      acRef: 'BR1: Cước phí cơ bản cho khoảng cách > 20 km',
      expected: 'Tính cước phí cự ly xa trên 20 km',
      category: 'NORMAL_FLOW',
    },
    'be free of weight surcharge for weight <= 2 kg': {
      acRef: 'BR2: Miễn phí phụ phí khối lượng cho hàng <= 2 kg',
      expected: 'Phụ phí khối lượng bằng 0 VND khi kiện hàng dưới hoặc bằng 2 kg',
      category: 'BOUNDARY_VALUE',
    },
    'charge 5,000 vnd per extra kg rounded up': {
      acRef: 'BR2: Phụ phí 5,000 VND cho mỗi kg vượt định mức làm tròn lên',
      expected: 'Tính phụ phí làm tròn lên từng kg vượt quá 2 kg',
      category: 'NORMAL_FLOW',
    },
    'apply 1.5 multiplier for express shipping method': {
      acRef: 'BR3: Phương thức giao hàng EXPRESS nhân hệ số 1.5',
      expected: 'Nhân hệ số 1.5 vào toàn bộ tổng cước phí giao hàng hỏa tốc',
      category: 'NORMAL_FLOW',
    },
    'deduct up to 30,000 vnd for standard orders >= 500,000 vnd': {
      acRef: 'AC3: Miễn giảm phí giao hàng tối đa 30,000 VND cho đơn hàng STANDARD >= 500,000 VND',
      expected: 'Khấu trừ phí vận chuyển tối đa 30,000 VND cho đơn hàng giá trị cao',
      category: 'NORMAL_FLOW',
    },
    'not apply freeship discount for express orders even if subtotal >= 500,000 vnd': {
      acRef: 'BR4: Không áp dụng freeship cho đơn hàng EXPRESS',
      expected: 'Giữ nguyên toàn bộ phí vận chuyển không giảm trừ đối với gói EXPRESS',
      category: 'NORMAL_FLOW',
    },
  },

  S04_TaxCalculator: {
    'throw invalidtaxinputexception when grossincome is negative': {
      acRef: 'BR4: Kiểm tra hợp lệ đầu vào (grossIncome >= 0)',
      expected: 'Ném ngoại lệ InvalidTaxInputException khi thu nhập trước thuế âm',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidtaxinputexception when dependentscount is negative': {
      acRef: 'BR4: Kiểm tra hợp lệ đầu vào (dependentsCount >= 0)',
      expected: 'Ném ngoại lệ InvalidTaxInputException khi số người phụ thuộc âm',
      category: 'EXCEPTION_HANDLING',
    },
    'result in 0 tax when gross income is below personal deduction (11m)': {
      acRef: 'AC1: Thu nhập dưới mức giảm trừ bản thân (Không phải đóng thuế)',
      expected: 'Thu nhập tính thuế và tổng thuế thu nhập bằng 0 VND khi thu nhập dưới 11M',
      category: 'NORMAL_FLOW',
    },
    'consider insurance and dependents in total deductions': {
      acRef: 'BR1: Các khoản giảm trừ (bản thân, người phụ thuộc, bảo hiểm)',
      expected: 'Khấu trừ đầy đủ bảo hiểm, giảm trừ bản thân 11M và mỗi người phụ thuộc 4.4M',
      category: 'NORMAL_FLOW',
    },
    'calculate bracket 1 (5%) correctly': {
      acRef: 'AC2: Thu nhập chịu thuế rơi vào Bậc 1 (5%)',
      expected: 'Thuế suất 5% áp dụng cho phần thu nhập tính thuế đến 5 triệu VND',
      category: 'NORMAL_FLOW',
    },
    'calculate across 3 brackets correctly (tier 1, 2, and 3)': {
      acRef: 'AC3: Thu nhập chịu thuế lũy tiến qua nhiều bậc',
      expected: 'Tính thuế lũy tiến chính xác qua các bậc 1 (5%), 2 (10%), 3 (15%)',
      category: 'NORMAL_FLOW',
    },
  },

  S05_SlugGenerator: {
    'throw invalidsluginputexception when input is empty or whitespace': {
      acRef: 'BR5: Ràng buộc đầu vào (tiêu đề không được rỗng hoặc chỉ có khoảng trắng)',
      expected: 'Ném ngoại lệ InvalidSlugInputException khi chuỗi đầu vào trống hoặc chỉ chứa khoảng trắng',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidsluginputexception when input only contains special symbols': {
      acRef: 'BR5: Ràng buộc đầu vào (tiêu đề không được chỉ chứa ký tự đặc biệt)',
      expected: 'Ném ngoại lệ InvalidSlugInputException khi toàn bộ ký tự bị lọc bỏ',
      category: 'EXCEPTION_HANDLING',
    },
    'convert complex vietnamese accents to clean ascii slug': {
      acRef: 'AC1: Chuyển đổi tiêu đề tiếng Việt chuẩn có dấu',
      expected: 'Khử sạch toàn bộ dấu tiếng Việt thành chuỗi ký tự ASCII thuần',
      category: 'NORMAL_FLOW',
    },
    'handle letter đ and đ correctly': {
      acRef: 'BR1: Chuyển đổi dấu tiếng Việt sang không dấu (đ -> d)',
      expected: 'Chuyển đổi chính xác ký tự Đ và đ thành d trong slug',
      category: 'NORMAL_FLOW',
    },
    'collapse multiple hyphens and trim edge separators': {
      acRef: 'AC2: Xử lý nhiều khoảng trắng và ký tự đặc biệt lộn xộn',
      expected: 'Gộp các dấu gạch ngang liên tiếp thành một dấu gạch ngang duy nhất và cắt bỏ ở hai đầu',
      category: 'BOUNDARY_VALUE',
    },
    'support custom separator like underscore (_)': {
      acRef: 'BR3: Ký tự ngăn cách tùy chỉnh (Custom separator)',
      expected: 'Cho phép tùy biến ký tự phân tách giữa các từ thành dấu gạch dưới',
      category: 'NORMAL_FLOW',
    },
    'perform word-safe truncation when exceeding maxlength': {
      acRef: 'AC3: Cắt ngắn an toàn không đứt từ khi vượt quá 30 ký tự',
      expected: 'Cắt ngắn chuỗi slug tại ranh giới từ nguyên vẹn mà không làm đứt đôi từ ngữ',
      category: 'BOUNDARY_VALUE',
    },
  },

  S06_AuthService: {
    'throw validationerror when email is empty': {
      acRef: 'BR1: Định dạng Email và Mật khẩu đầu vào',
      expected: 'Ném ngoại lệ ValidationError khi email đầu vào bị rỗng',
      category: 'EXCEPTION_HANDLING',
    },
    'throw validationerror when password is empty': {
      acRef: 'BR1: Định dạng Email và Mật khẩu đầu vào',
      expected: 'Ném ngoại lệ ValidationError khi mật khẩu đầu vào bị rỗng',
      category: 'EXCEPTION_HANDLING',
    },
    'throw validationerror when email format is invalid': {
      acRef: 'BR1: Định dạng Email hợp lệ',
      expected: 'Ném ngoại lệ ValidationError khi định dạng email sai cú pháp chuẩn',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidcredentialserror when user does not exist in db': {
      acRef: 'BR2: Xác thực thông tin người dùng trong cơ sở dữ liệu',
      expected: 'Ném ngoại lệ InvalidCredentialsError khi không tìm thấy tài khoản người dùng',
      category: 'EXCEPTION_HANDLING',
    },
    'throw accountlockederror immediately if user is already locked': {
      acRef: 'BR3: Chính sách khóa tài khoản (Tài khoản đang ở trạng thái LOCKED)',
      expected: 'Từ chối đăng nhập và ném ngoại lệ AccountLockedError ngay lập tức',
      category: 'EXCEPTION_HANDLING',
    },
    'throw accountnotverifiederror if user is pending_verification': {
      acRef: 'BR4: Tài khoản chưa kích hoạt PENDING_VERIFICATION',
      expected: 'Ném ngoại lệ AccountNotVerifiedError khi người dùng chưa xác thực email',
      category: 'EXCEPTION_HANDLING',
    },
    'increment failedattempts and throw invalidcredentialserror on wrong password (< 5 times)': {
      acRef: 'AC2: Đăng nhập sai mật khẩu dưới 5 lần tăng số lần thử',
      expected: 'Tăng failedAttempts lên 1 và ném ngoại lệ InvalidCredentialsError',
      category: 'NORMAL_FLOW',
    },
    'lock account and throw accountlockederror when reaching 5 failed attempts': {
      acRef: 'AC3: Tự động khóa tài khoản khi sai mật khẩu 5 lần liên tiếp',
      expected: 'Chuyển trạng thái sang LOCKED và ném ngoại lệ AccountLockedError ở lần thử thứ 5',
      category: 'BOUNDARY_VALUE',
    },
    'reset failedattempts to 0, update lastloginat, and return tokens on success': {
      acRef: 'AC1: Đăng nhập thành công và cấp phát Token',
      expected: 'Reset failedAttempts về 0, cập nhật lastLoginAt và trả về accessToken/refreshToken',
      category: 'NORMAL_FLOW',
    },
  },

  S07_CartService: {
    'create new cart and add item when cart does not exist': {
      acRef: 'AC1: Thêm sản phẩm mới vào giỏ hàng trống',
      expected: 'Khởi tạo giỏ hàng mới và thêm sản phẩm đầu tiên với số lượng tương ứng',
      category: 'NORMAL_FLOW',
    },
    'accumulate quantity when adding an item that already exists in cart': {
      acRef: 'AC2: Cộng dồn số lượng sản phẩm đã có trong giỏ hàng',
      expected: 'Cộng dồn số lượng mặt hàng đã tồn tại trong giỏ hàng',
      category: 'NORMAL_FLOW',
    },
    'throw outofstockexception when inventory is insufficient': {
      acRef: 'AC3: Báo lỗi OutOfStockException khi số lượng vượt tồn kho',
      expected: 'Ném ngoại lệ OutOfStockException khi yêu cầu số lượng vượt quá số dư kho',
      category: 'EXCEPTION_HANDLING',
    },
    'throw exceedmaxpurchaselimitexception when requested quantity exceeds item limit': {
      acRef: 'BR4: Giới hạn số lượng mua tối đa cho mỗi mặt hàng',
      expected: 'Ném ngoại lệ ExceedMaxPurchaseLimitException khi vượt trần mua hàng',
      category: 'BOUNDARY_VALUE',
    },
    'remove item when updating quantity to 0': {
      acRef: 'BR5: Tự động xóa sản phẩm khi cập nhật số lượng về 0',
      expected: 'Loại bỏ mặt hàng khỏi giỏ khi lập trình viên cập nhật số lượng bằng 0',
      category: 'NORMAL_FLOW',
    },
    'remove item via removeitem method': {
      acRef: 'AC4: Xóa sản phẩm khỏi giỏ hàng',
      expected: 'Xóa hoàn toàn sản phẩm khỏi danh sách item của giỏ hàng',
      category: 'NORMAL_FLOW',
    },
  },

  S08_CouponService: {
    'throw couponnotfoundexception when coupon code does not exist': {
      acRef: 'BR1: Kiểm tra sự tồn tại của mã Coupon',
      expected: 'Ném ngoại lệ CouponNotFoundException khi mã giảm giá không tồn tại',
      category: 'EXCEPTION_HANDLING',
    },
    'throw couponinactiveexception when coupon is deactivated': {
      acRef: 'BR1: Kiểm tra trạng thái hoạt động của mã Coupon',
      expected: 'Ném ngoại lệ CouponInactiveException khi coupon đang bị vô hiệu hóa',
      category: 'EXCEPTION_HANDLING',
    },
    'throw couponexpiredexception when current date is outside validity window': {
      acRef: 'BR2: Thời hạn hiệu lực của mã giảm giá',
      expected: 'Ném ngoại lệ CouponExpiredException khi coupon đã hết hạn sử dụng',
      category: 'BOUNDARY_VALUE',
    },
    'throw couponexhaustedexception when usage reaches max limit': {
      acRef: 'AC3: Báo lỗi khi mã Coupon đã hết lượt sử dụng',
      expected: 'Ném ngoại lệ CouponExhaustedException khi đạt giới hạn lượt dùng tối đa',
      category: 'BOUNDARY_VALUE',
    },
    'throw couponalreadyusedbyuserexception if user already used this coupon': {
      acRef: 'BR4: Mỗi người dùng chỉ được sử dụng coupon một lần',
      expected: 'Ném ngoại lệ CouponAlreadyUsedByUserException nếu người dùng đã áp dụng trước đó',
      category: 'EXCEPTION_HANDLING',
    },
    'throw couponconditionnotmetexception when order subtotal is below min requirement': {
      acRef: 'AC4: Báo lỗi khi đơn hàng chưa đạt giá trị tối thiểu',
      expected: 'Ném ngoại lệ CouponConditionNotMetException khi giá trị đơn hàng dưới mức tối thiểu',
      category: 'BOUNDARY_VALUE',
    },
    'cap discount to maxdiscountamount (300,000 vnd) for large percentage discount': {
      acRef: 'AC1: Áp dụng coupon phần trăm và giới hạn mức giảm tối đa',
      expected: 'Giới hạn số tiền giảm giá không vượt quá trần 300,000 VND',
      category: 'BOUNDARY_VALUE',
    },
    'calculate fixed_amount discount properly': {
      acRef: 'AC2: Áp dụng coupon giảm số tiền cố định',
      expected: 'Khấu trừ đúng số tiền cố định theo giá trị định sẵn của coupon',
      category: 'NORMAL_FLOW',
    },
  },

  S09_NotificationService: {
    'deliver via push when it is successful and not call email or sms': {
      acRef: 'AC1: Gửi thành công ngay từ kênh ưu tiên số 1 (PUSH)',
      expected: 'Gửi thành công qua PUSH và dừng luồng xử lý không gọi tiếp sang EMAIL hoặc SMS',
      category: 'NORMAL_FLOW',
    },
    'fallback to email when push fails (returns false)': {
      acRef: 'AC2: Tự động chuyển sang EMAIL khi kênh PUSH thất bại',
      expected: 'Tự động kích hoạt kênh EMAIL khi kênh PUSH trả về kết quả false',
      category: 'NORMAL_FLOW',
    },
    'fallback to sms when both push and email throw exceptions': {
      acRef: 'AC3: Tự động chuyển sang SMS khi cả PUSH và EMAIL đều thất bại',
      expected: 'Chuyển sang kênh cứu cánh cuối cùng là SMS khi cả hai kênh đầu gặp sự cố',
      category: 'NORMAL_FLOW',
    },
    'throw allnotificationchannelsfailedexception when all channels fail': {
      acRef: 'AC4: Báo lỗi khi tất cả các kênh thông báo đều thất bại',
      expected: 'Ném ngoại lệ AllNotificationChannelsFailedException khi toàn bộ kênh thất bại',
      category: 'EXCEPTION_HANDLING',
    },
    'skip channels if corresponding contact info is missing': {
      acRef: 'BR3: Bỏ qua kênh thông báo nếu thiếu thông tin liên lạc',
      expected: 'Tự động bỏ qua kênh và chuyển tiếp nếu người nhận thiếu địa chỉ hoặc token tương ứng',
      category: 'NORMAL_FLOW',
    },
  },

  S10_UserProfileService: {
    'throw usernotfoundexception when user is not found': {
      acRef: 'BR1: Kiểm tra người dùng tồn tại trong hệ thống',
      expected: 'Ném ngoại lệ UserNotFoundException khi không tìm thấy hồ sơ người dùng',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidprofiledataexception if fullname is shorter than 2 chars': {
      acRef: 'BR1: Ràng buộc độ dài họ tên tối thiểu 2 ký tự',
      expected: 'Ném ngoại lệ InvalidProfileDataException khi họ tên dưới 2 ký tự',
      category: 'BOUNDARY_VALUE',
    },
    'throw invalidprofiledataexception if fullname exceeds 50 chars': {
      acRef: 'BR1: Ràng buộc độ dài họ tên tối đa 50 ký tự',
      expected: 'Ném ngoại lệ InvalidProfileDataException khi họ tên vượt quá 50 ký tự',
      category: 'BOUNDARY_VALUE',
    },
    'throw invalidprofiledataexception on invalid vn phone format': {
      acRef: 'BR1: Định dạng số điện thoại Việt Nam hợp lệ',
      expected: 'Ném ngoại lệ InvalidProfileDataException khi số điện thoại sai cấu trúc',
      category: 'EXCEPTION_HANDLING',
    },
    'successfully update profile with valid details': {
      acRef: 'AC4: Cập nhật họ tên và số điện thoại hợp lệ thành công',
      expected: 'Cập nhật thành công thông tin hồ sơ và lưu vào kho dữ liệu',
      category: 'NORMAL_FLOW',
    },
    'throw usernotfoundexception if user does not exist': {
      acRef: 'BR2: Kiểm tra người dùng khi yêu cầu đổi email',
      expected: 'Ném ngoại lệ UserNotFoundException khi người dùng yêu cầu đổi email không tồn tại',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidprofiledataexception if new email is identical to current email': {
      acRef: 'BR2: Email mới không được trùng với email hiện tại',
      expected: 'Ném ngoại lệ InvalidProfileDataException khi email mới trùng với email cũ',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidprofiledataexception if new email format is missing @': {
      acRef: 'BR2: Định dạng email mới phải hợp lệ',
      expected: 'Ném ngoại lệ InvalidProfileDataException khi email mới sai định dạng',
      category: 'EXCEPTION_HANDLING',
    },
    'throw emailalreadyinuseexception if email belongs to another user': {
      acRef: 'BR2: Email mới không được trùng với người dùng khác',
      expected: 'Ném ngoại lệ EmailAlreadyInUseException khi email mới đã bị người khác sử dụng',
      category: 'EXCEPTION_HANDLING',
    },
    'store otp and send verification email on valid request': {
      acRef: 'AC1: Yêu cầu đổi email thành công - lưu OTP và gửi email xác nhận',
      expected: 'Lưu mã OTP và gửi thư xác minh tới địa chỉ email mới',
      category: 'NORMAL_FLOW',
    },
    'throw invalidorexpiredotpexception if otp verification fails': {
      acRef: 'AC3: Báo lỗi khi mã OTP không hợp lệ hoặc đã hết hạn',
      expected: 'Ném ngoại lệ InvalidOrExpiredOtpException khi mã OTP nhập sai hoặc quá hạn',
      category: 'EXCEPTION_HANDLING',
    },
    'successfully update email when otp is valid': {
      acRef: 'AC2: Xác thực OTP thành công và cập nhật email mới',
      expected: 'Cập nhật email mới thành công sau khi xác thực OTP hợp lệ',
      category: 'NORMAL_FLOW',
    },
  },

  S11_PaymentService: {
    'return existing transaction immediately if it already succeeded': {
      acRef: 'AC3: Xử lý giao dịch trùng lặp lũy đẳng (Idempotent Transaction)',
      expected: 'Trả về ngay giao dịch cũ và không gọi cổng thanh toán lần 2',
      category: 'NORMAL_FLOW',
    },
    'throw concurrenttransactionerror if previous transaction is still processing': {
      acRef: 'BR2: Chặn giao dịch đồng thời khi đơn đang ở trạng thái PROCESSING',
      expected: 'Ném ngoại lệ ConcurrentTransactionError khi phát hiện xung đột giao dịch song song',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidorderstateerror when order is not found': {
      acRef: 'BR3: Đơn hàng không tồn tại hoặc trạng thái không hợp lệ',
      expected: 'Ném ngoại lệ InvalidOrderStateError khi không tìm thấy đơn hàng cần thanh toán',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidorderstateerror when order is already paid': {
      acRef: 'BR3: Đơn hàng đã ở trạng thái PAID',
      expected: 'Ném ngoại lệ InvalidOrderStateError khi đơn hàng đã được hoàn tất thanh toán trước đó',
      category: 'EXCEPTION_HANDLING',
    },
    'throw amountmismatcherror when payment amount does not match order total': {
      acRef: 'BR3: Số tiền thanh toán không khớp với tổng tiền đơn hàng',
      expected: 'Ném ngoại lệ AmountMismatchError khi số tiền chuyển vào sai lệch',
      category: 'EXCEPTION_HANDLING',
    },
    'handle successful payment: update order to paid and write audit log': {
      acRef: 'AC1: Thanh toán thành công qua cổng thanh toán',
      expected: 'Cập nhật trạng thái đơn hàng sang PAID và ghi nhật ký kiểm toán giao dịch',
      category: 'NORMAL_FLOW',
    },
    'throw paymentdeclinederror and update status to failed when card is declined': {
      acRef: 'AC2: Thẻ thanh toán bị từ chối',
      expected: 'Cập nhật trạng thái giao dịch sang FAILED và ném ngoại lệ PaymentDeclinedError',
      category: 'EXCEPTION_HANDLING',
    },
    'trigger voidtransaction and throw paymentgatewayunavailableerror on network error': {
      acRef: 'AC4: Lỗi mạng kích hoạt quy trình hủy giao dịch voidTransaction',
      expected: 'Kích hoạt hủy giao dịch bù trừ voidTransaction khi xảy ra lỗi kết nối mạng',
      category: 'EXCEPTION_HANDLING',
    },
  },

  S12_OrderFulfillmentService: {
    'throw ordernotfoundexception if order does not exist': {
      acRef: 'BR1: Kiểm tra sự tồn tại của đơn hàng',
      expected: 'Ném ngoại lệ OrderNotFoundException khi mã đơn hàng không tồn tại',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidorderstatetransitionexception if status is not pending': {
      acRef: 'BR1: Ràng buộc chuyển trạng thái đơn hàng từ PENDING',
      expected: 'Ném ngoại lệ InvalidOrderStateTransitionException khi chuyển trạng thái sai chu trình',
      category: 'EXCEPTION_HANDLING',
    },
    'cancel order and throw outofstockfulfillmentexception if inventory is insufficient': {
      acRef: 'BR2: Hủy đơn hàng khi hàng tồn kho không đủ đáp ứng',
      expected: 'Chuyển trạng thái đơn sang CANCELLED và ném ngoại lệ OutOfStockFulfillmentException',
      category: 'EXCEPTION_HANDLING',
    },
    'confirm order when stock is reserved successfully': {
      acRef: 'AC1: Xác nhận đơn hàng khi giữ chỗ tồn kho thành công',
      expected: 'Chuyển trạng thái đơn sang CONFIRMED khi giữ kho thành công',
      category: 'NORMAL_FLOW',
    },
    'throw invalidorderstatetransitionexception if not confirmed': {
      acRef: 'BR1: Đơn hàng phải ở trạng thái CONFIRMED trước khi PROCESSING',
      expected: 'Từ chối chuyển sang PROCESSING nếu đơn chưa được xác nhận CONFIRMED',
      category: 'EXCEPTION_HANDLING',
    },
    'transition to processing when currently confirmed': {
      acRef: 'AC2: Chuyển trạng thái đơn hàng sang PROCESSING',
      expected: 'Chuyển đơn hàng từ CONFIRMED sang PROCESSING thành công',
      category: 'NORMAL_FLOW',
    },
    'throw invalidorderstatetransitionexception if not processing': {
      acRef: 'BR1: Đơn hàng phải ở trạng thái PROCESSING trước khi SHIPPED',
      expected: 'Từ chối xuất kho nếu đơn hàng chưa ở trạng thái PROCESSING',
      category: 'EXCEPTION_HANDLING',
    },
    'transition to shipped and store tracking code': {
      acRef: 'AC2: Chuyển trạng thái sang SHIPPED và lưu mã vận đơn',
      expected: 'Chuyển trạng thái sang SHIPPED và lưu mã trackingCode chính xác',
      category: 'NORMAL_FLOW',
    },
    'throw invalidorderstatetransitionexception if not shipped': {
      acRef: 'BR1: Đơn hàng phải ở trạng thái SHIPPED trước khi DELIVERED',
      expected: 'Từ chối chuyển sang DELIVERED nếu đơn hàng chưa được xuất kho vận chuyển',
      category: 'EXCEPTION_HANDLING',
    },
    'transition to delivered when currently shipped': {
      acRef: 'AC3: Giao hàng thành công chuyển sang DELIVERED',
      expected: 'Cập nhật trạng thái hoàn tất giao hàng DELIVERED thành công',
      category: 'NORMAL_FLOW',
    },
    'reject cancellation for shipped or delivered orders': {
      acRef: 'BR3: Từ chối hủy đơn hàng khi đã xuất kho hoặc đã giao hàng',
      expected: 'Ném ngoại lệ InvalidOrderStateTransitionException khi cố hủy đơn đã SHIPPED/DELIVERED',
      category: 'EXCEPTION_HANDLING',
    },
    'cancel pending order without releasing stock': {
      acRef: 'BR3: Hủy đơn hàng PENDING không cần hoàn trả tồn kho',
      expected: 'Hủy đơn PENDING mà không cần gọi release stock vì chưa giữ hàng',
      category: 'NORMAL_FLOW',
    },
    'cancel confirmed order and release reserved stock': {
      acRef: 'AC4: Hủy đơn hàng CONFIRMED và hoàn trả tồn kho đã giữ',
      expected: 'Hủy đơn và gọi hàm hoàn trả số lượng hàng đã giữ trước đó',
      category: 'NORMAL_FLOW',
    },
    'cancel processing order and release reserved stock': {
      acRef: 'AC4: Hủy đơn hàng PROCESSING và hoàn trả tồn kho đã giữ',
      expected: 'Hủy đơn đang xử lý và hoàn trả tồn kho đầy đủ',
      category: 'NORMAL_FLOW',
    },
  },

  S13_BookingConcurrencyService: {
    'throw invalidbookingtimeexception if starttime >= endtime': {
      acRef: 'BR1: Thời gian bắt đầu phải trước thời gian kết thúc',
      expected: 'Ném ngoại lệ InvalidBookingTimeException khi khoảng thời gian đặt phòng vô lý',
      category: 'EXCEPTION_HANDLING',
    },
    'throw invalidbookingtimeexception if starttime is in the past': {
      acRef: 'BR1: Không được đặt chỗ cho thời gian trong quá khứ',
      expected: 'Ném ngoại lệ InvalidBookingTimeException khi thời gian bắt đầu ở quá khứ',
      category: 'EXCEPTION_HANDLING',
    },
    'throw lockacquisitionexception if distributed lock cannot be acquired': {
      acRef: 'BR2: Cơ chế khóa phân tán Distributed Lock',
      expected: 'Ném ngoại lệ LockAcquisitionException khi không chiếm được khóa đồng thời',
      category: 'EXCEPTION_HANDLING',
    },
    'throw resourcealreadybookedexception when overlapping confirmed booking exists': {
      acRef: 'AC2: Từ chối khi trùng lịch với đơn đặt phòng đã CONFIRMED',
      expected: 'Ném ngoại lệ ResourceAlreadyBookedException khi xung đột với lịch đã chốt',
      category: 'EXCEPTION_HANDLING',
    },
    'throw resourcealreadybookedexception when overlapping active held booking exists': {
      acRef: 'BR3: Từ chối khi trùng lịch với đơn đang giữ chỗ HELD còn hiệu lực',
      expected: 'Ném ngoại lệ ResourceAlreadyBookedException khi khung giờ đang bị giữ chỗ',
      category: 'EXCEPTION_HANDLING',
    },
    'successfully hold slot when overlapping held booking is already expired': {
      acRef: 'AC1: Giữ chỗ thành công khi đơn giữ chỗ trùng lịch đã hết hạn',
      expected: 'Tạo phiên giữ chỗ HELD thành công nếu đơn trùng lịch trước đó đã quá hạn',
      category: 'NORMAL_FLOW',
    },
    'throw bookingnotfoundexception if booking not found': {
      acRef: 'BR5: Đơn đặt phòng không tồn tại',
      expected: 'Ném ngoại lệ BookingNotFoundException khi mã đơn đặt chỗ không tồn tại',
      category: 'EXCEPTION_HANDLING',
    },
    'throw unauthorizedbookingaccessexception if userid does not match': {
      acRef: 'BR5: Chỉ người tạo phiên giữ chỗ mới có quyền xác nhận',
      expected: 'Ném ngoại lệ UnauthorizedBookingAccessException khi sai danh tính người đặt',
      category: 'EXCEPTION_HANDLING',
    },
    'be idempotent and return booking if already confirmed': {
      acRef: 'BR5: Tính lũy đẳng khi xác nhận đơn đã CONFIRMED',
      expected: 'Trả về đơn hiện tại mà không thực hiện lại giao dịch nếu đã xác nhận',
      category: 'NORMAL_FLOW',
    },
    'mark expired and throw bookingexpiredexception if helduntil has passed': {
      acRef: 'AC4: Đơn đặt phòng hết hạn giữ chỗ chuyển sang EXPIRED',
      expected: 'Cập nhật trạng thái EXPIRED và ném ngoại lệ BookingExpiredException',
      category: 'BOUNDARY_VALUE',
    },
    'confirm booking successfully within hold period': {
      acRef: 'AC3: Xác nhận đặt phòng thành công trong thời hạn giữ chỗ',
      expected: 'Xác nhận đơn thành công và chuyển sang trạng thái CONFIRMED',
      category: 'NORMAL_FLOW',
    },
  },

  S14_SubscriptionRenewalService: {
    'throw subscriptionnotfoundexception when subscription does not exist': {
      acRef: 'BR1: Kiểm tra gói thuê bao tồn tại trong hệ thống',
      expected: 'Ném ngoại lệ SubscriptionNotFoundException khi không tìm thấy thông tin thuê bao',
      category: 'EXCEPTION_HANDLING',
    },
    'not charge or change free plan subscriptions': {
      acRef: 'AC2: Không trừ tiền hoặc thay đổi gói thuê bao FREE',
      expected: 'Bỏ qua việc tính cước đối với các gói thuê bao miễn phí FREE',
      category: 'NORMAL_FLOW',
    },
    'not charge or change cancelled subscriptions': {
      acRef: 'AC2: Không trừ tiền hoặc thay đổi gói thuê bao đã CANCELLED',
      expected: 'Bỏ qua việc gia hạn đối với các hợp đồng thuê bao đã hủy',
      category: 'NORMAL_FLOW',
    },
    'successfully charge premium plan and extend period by 30 days': {
      acRef: 'AC1: Gia hạn thành công gói PREMIUM thêm 30 ngày',
      expected: 'Thanh toán thành công gói PREMIUM và gia hạn thời hạn sử dụng thêm đúng 30 ngày',
      category: 'NORMAL_FLOW',
    },
    'increment retrycount and set past_due when payment fails': {
      acRef: 'AC3: Thanh toán thất bại tăng số lần thử lại và chuyển PAST_DUE',
      expected: 'Tăng retryCount lên 1 và chuyển trạng thái thuê bao sang PAST_DUE khi trừ tiền thất bại',
      category: 'NORMAL_FLOW',
    },
    'suspend and downgrade to free when retrycount >= 3 and grace period has elapsed': {
      acRef: 'AC4: Hết thời gian ân hạn và lượt thử lại hạ cấp về FREE',
      expected: 'Hạ cấp gói thuê bao về FREE và chuyển trạng thái SUSPENDED khi hết hạn ân hạn',
      category: 'BOUNDARY_VALUE',
    },
  },

  S15_LoyaltyPointService: {
    'throw invalidpointsamountexception if points < 100': {
      acRef: 'BR1: Số điểm quy đổi tối thiểu là 100 điểm',
      expected: 'Ném ngoại lệ InvalidPointsAmountException khi điểm yêu cầu dưới 100',
      category: 'BOUNDARY_VALUE',
    },
    'throw invalidpointsamountexception if points not multiple of 10': {
      acRef: 'BR1: Số điểm quy đổi phải là bội số của 10',
      expected: 'Ném ngoại lệ InvalidPointsAmountException khi điểm không phải là bội số của 10',
      category: 'BOUNDARY_VALUE',
    },
    'throw loyaltyaccountnotfoundexception when account does not exist': {
      acRef: 'BR2: Tài khoản tích điểm không tồn tại',
      expected: 'Ném ngoại lệ LoyaltyAccountNotFoundException khi không tìm thấy tài khoản',
      category: 'EXCEPTION_HANDLING',
    },
    'throw loyaltyaccountlockedexception when account is locked': {
      acRef: 'BR2: Từ chối giao dịch khi tài khoản đang bị khóa',
      expected: 'Ném ngoại lệ LoyaltyAccountLockedException khi tài khoản đang bị khóa',
      category: 'EXCEPTION_HANDLING',
    },
    'throw insufficientpointsexception when balance is smaller than requested points': {
      acRef: 'AC4: Báo lỗi khi số dư điểm không đủ để quy đổi',
      expected: 'Ném ngoại lệ InsufficientPointsException khi số dư điểm nhỏ hơn yêu cầu',
      category: 'BOUNDARY_VALUE',
    },
    'lock account, record flagged transaction, and throw frauddetectedexception when risk score >= 80': {
      acRef: 'AC3: Phát hiện rủi ro gian lận (riskScore >= 80) khóa tài khoản',
      expected: 'Khóa tài khoản và ném ngoại lệ FraudDetectedException khi điểm rủi ro >= 80',
      category: 'BOUNDARY_VALUE',
    },
    'redeem points for voucher, issue code, and deduct balance': {
      acRef: 'AC1: Quy đổi điểm thưởng sang Voucher và phát hành mã',
      expected: 'Quy đổi điểm thành công, gọi IVoucherIssuer cấp mã và trừ điểm số dư',
      category: 'NORMAL_FLOW',
    },
    'redeem points for cash without calling voucherissuer': {
      acRef: 'AC2: Quy đổi điểm thưởng sang Tiền mặt không gọi phát hành Voucher',
      expected: 'Quy đổi điểm thưởng sang tiền mặt thành công mà không gọi voucherIssuer',
      category: 'NORMAL_FLOW',
    },
  },
};

function resolveTraceability(
  svc: ManifestService,
  testDesc: string,
  reqContext?: any
): { acRef: string; expected: string; category: string } {
  const cleanDesc = testDesc.replace(/^should\s+/i, '').trim();
  const lowerDesc = cleanDesc.toLowerCase();

  // 1. Kiểm tra trực tiếp từ Bảng ánh xạ đã xác thực (Verified Traceability Registry)
  const serviceRegistry = VERIFIED_TRACEABILITY_REGISTRY[svc.id];
  if (serviceRegistry) {
    if (serviceRegistry[lowerDesc]) {
      return serviceRegistry[lowerDesc];
    }
    // Thử so khớp lỏng hơn với cleanDesc
    for (const [key, val] of Object.entries(serviceRegistry)) {
      if (lowerDesc.includes(key) || key.includes(lowerDesc)) {
        return val;
      }
    }
  }

  // 2. Tuyệt đối KHÔNG suy đoán mờ (fuzzy-matching) hoặc tự gán nhãn chung (AC-STD, AC-BND, AC-ERR).
  // Yêu cầu fail-closed: Mọi scenario benchmark bắt buộc phải có liên kết xác thực trong VERIFIED_TRACEABILITY_REGISTRY!
  throw new Error(
    `[Traceability Error] Scenario "${testDesc}" trong service ${svc.id} chưa có liên kết AC/BR xác thực trong requirement.md! Vui lòng cập nhật VERIFIED_TRACEABILITY_REGISTRY.`
  );
}

export function exportFineTuningDataset(): {
  trainCount: number;
  valCount: number;
  testCount: number;
  paths: Record<string, string>;
} {
  console.log('================================================================');
  console.log('📦 XUẤT DATASET FINE-TUNING ĐỊNH DẠNG CHAT/INSTRUCTION JSONL');
  console.log('================================================================\n');

  const datasetDir = path.resolve(__dirname);
  const manifestPath = path.join(datasetDir, 'dataset_manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Dataset manifest not found: ${manifestPath}`);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const extractor = new ContextExtractor();
  const postProcessor = new TestPostProcessor();

  const splitData: Record<'train' | 'validation' | 'test', string[]> = {
    train: [],
    validation: [],
    test: [],
  };

  const systemPrompt = `You are an elite QA Engineer and Automated Test Specialist.
Your task is to generate complete, high-mutation-score Jest unit test suites by strictly cross-referencing:
1. BUSINESS REQUIREMENTS: Acceptance Criteria and edge cases defined in BA specifications.
2. SOURCE CODE IMPLEMENTATION: Method signatures, branches, exceptions, and business logic.
3. AST STRUCTURE: Type contracts, parameters, visibility, and dependencies.

Output your response in valid JSON matching the following schema:
{
  "testScenarios": [
    {
      "id": "TC-001",
      "acceptanceCriteriaRef": "Acceptance Criterion or Rule reference",
      "category": "HAPPY_PATH | BOUNDARY | EXCEPTION",
      "description": "Clear explanation of what is tested",
      "expectedBehavior": "Expected outcome or assertion"
    }
  ],
  "testCode": "COMPLETE_RUNNABLE_TYPESCRIPT_JEST_CODE"
}`;

  for (const svc of manifest.services) {
    const svcFolder = path.join(datasetDir, svc.folder);
    const servicePath = path.join(svcFolder, svc.serviceFile);
    const reqPath = path.join(svcFolder, svc.requirementFile);
    const testPath = path.join(svcFolder, svc.testFile);

    const contextPayload = extractor.extract({
      serviceFilePath: servicePath,
      requirementFilePath: reqPath,
      targetClassName: svc.targetClass,
    });

    const groundTruthCode = fs.readFileSync(testPath, 'utf-8');
    const processedGT = postProcessor.process(groundTruthCode, 'CODE_BLOCK');

    const userPrompt = `### 1. BUSINESS REQUIREMENT SPECIFICATION:
${contextPayload.promptContext.requirementDoc || 'Rely on source code contracts.'}

---

### 2. SOURCE CODE (Target Service):
\`\`\`typescript
${contextPayload.promptContext.serviceCode}
\`\`\`

---

### 3. AST STRUCTURE ANALYSIS:
${contextPayload.promptContext.astSummary || 'No AST summary available.'}

---

### INSTRUCTIONS:
Generate a complete, production-ready Jest unit test file covering happy paths, boundaries, and exceptions. Output in structured JSON.`;

    const assistantResponse = JSON.stringify(
      {
        testScenarios: processedGT.testScenarios.map((s, idx) => {
          const trace = resolveTraceability(svc, s.description, contextPayload.requirement);
          return {
            id: s.id || `TC-${String(idx + 1).padStart(3, '0')}`,
            acceptanceCriteriaRef: trace.acRef,
            category: trace.category,
            description: s.description,
            expectedBehavior: trace.expected,
          };
        }),
        testCode: groundTruthCode.trim(),
      },
      null,
      2
    );

    const jsonlRecord = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: assistantResponse },
      ],
      metadata: {
        serviceId: svc.id,
        name: svc.name,
        tier: svc.tier,
        split: svc.split,
        domain: svc.domain,
        targetClass: svc.targetClass,
      },
    };

    splitData[svc.split].push(JSON.stringify(jsonlRecord));
  }

  const outPaths: Record<string, string> = {
    train: path.join(datasetDir, 'fine_tuning_train.jsonl'),
    validation: path.join(datasetDir, 'fine_tuning_val.jsonl'),
    test: path.join(datasetDir, 'fine_tuning_test.jsonl'),
  };

  fs.writeFileSync(outPaths.train, splitData.train.join('\n') + '\n', 'utf-8');
  fs.writeFileSync(outPaths.validation, splitData.validation.join('\n') + '\n', 'utf-8');
  fs.writeFileSync(outPaths.test, splitData.test.join('\n') + '\n', 'utf-8');

  console.log(`✅ Xuất thành công tập TRAIN (${splitData.train.length} samples) tại: ${outPaths.train}`);
  console.log(`✅ Xuất thành công tập VALIDATION (${splitData.validation.length} samples) tại: ${outPaths.validation}`);
  console.log(`✅ Xuất thành công tập TEST HOLDOUT (${splitData.test.length} samples) tại: ${outPaths.test}\n`);

  return {
    trainCount: splitData.train.length,
    valCount: splitData.validation.length,
    testCount: splitData.test.length,
    paths: outPaths,
  };
}

if (require.main === module) {
  try {
    exportFineTuningDataset();
  } catch (err) {
    console.error('Lỗi khi xuất dataset:', err);
    process.exit(1);
  }
}
