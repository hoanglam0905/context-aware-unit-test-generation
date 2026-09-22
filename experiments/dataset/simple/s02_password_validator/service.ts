export enum PasswordStrength {
  WEAK = 'WEAK',
  MEDIUM = 'MEDIUM',
  STRONG = 'STRONG',
}

export interface PasswordValidationContext {
  password: string;
  username?: string;
  currentPassword?: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  errors: string[];
}

export class PasswordValidatorService {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 32;
  private static readonly SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/g;

  /**
   * Xác thực và đánh giá độ mạnh của mật khẩu
   */
  public validate(context: PasswordValidationContext): PasswordValidationResult {
    const { password, username, currentPassword } = context;
    const errors: string[] = [];

    if (!password) {
      return {
        isValid: false,
        strength: PasswordStrength.WEAK,
        errors: ['Password cannot be empty'],
      };
    }

    // 1. Kiểm tra khoảng trắng
    if (/\s/.test(password)) {
      errors.push('Password must not contain whitespace');
    }

    // 2. Kiểm tra độ dài
    if (password.length < PasswordValidatorService.MIN_LENGTH) {
      errors.push(`Password must be at least ${PasswordValidatorService.MIN_LENGTH} characters long`);
    } else if (password.length > PasswordValidatorService.MAX_LENGTH) {
      errors.push(`Password must not exceed ${PasswordValidatorService.MAX_LENGTH} characters`);
    }

    // 3. Kiểm tra các nhóm ký tự
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    const specialMatches = password.match(PasswordValidatorService.SPECIAL_CHAR_REGEX);
    const specialCount = specialMatches ? specialMatches.length : 0;
    if (specialCount === 0) {
      errors.push('Password must contain at least one special character');
    }

    // 4. Kiểm tra chứa username
    if (username && username.trim().length >= 3) {
      const cleanUsername = username.trim().toLowerCase();
      if (password.toLowerCase().includes(cleanUsername)) {
        errors.push('Password must not contain username');
      }
    }

    // 5. Kiểm tra trùng mật khẩu hiện tại
    if (currentPassword && password === currentPassword) {
      errors.push('New password must be different from current password');
    }

    const isValid = errors.length === 0;
    let strength = PasswordStrength.WEAK;

    if (isValid) {
      if (password.length >= 12 && specialCount >= 2) {
        strength = PasswordStrength.STRONG;
      } else {
        strength = PasswordStrength.MEDIUM;
      }
    }

    return {
      isValid,
      strength,
      errors,
    };
  }
}
