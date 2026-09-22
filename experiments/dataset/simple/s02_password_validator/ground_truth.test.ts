import {
  PasswordValidatorService,
  PasswordStrength,
} from './service';

describe('PasswordValidatorService (Ground Truth)', () => {
  let service: PasswordValidatorService;

  beforeEach(() => {
    service = new PasswordValidatorService();
  });

  describe('Empty and Whitespace validations', () => {
    it('should reject empty password', () => {
      const result = service.validate({ password: '' });
      expect(result.isValid).toBe(false);
      expect(result.strength).toBe(PasswordStrength.WEAK);
      expect(result.errors).toContain('Password cannot be empty');
    });

    it('should reject password containing spaces', () => {
      const result = service.validate({ password: 'Valid1! Password' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not contain whitespace');
    });
  });

  describe('Length constraints', () => {
    it('should reject password with less than 8 characters', () => {
      const result = service.validate({ password: 'Ab1!xyz' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password longer than 32 characters', () => {
      const longPass = 'A1!b'.repeat(9); // 36 chars
      const result = service.validate({ password: longPass });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 32 characters');
    });
  });

  describe('Character composition rules', () => {
    it('should reject password missing uppercase letters', () => {
      const result = service.validate({ password: 'password123!' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password missing lowercase letters', () => {
      const result = service.validate({ password: 'PASSWORD123!' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password missing numbers', () => {
      const result = service.validate({ password: 'Password!@#' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password missing special characters', () => {
      const result = service.validate({ password: 'Password123' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('Business rules with Context (Username & CurrentPassword)', () => {
    it('should reject password containing username (case-insensitive)', () => {
      const result = service.validate({
        password: 'John_Doe@2026!',
        username: 'john_doe',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not contain username');
    });

    it('should reject password identical to current password', () => {
      const current = 'OldPass123!@#';
      const result = service.validate({
        password: current,
        currentPassword: current,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('New password must be different from current password');
    });
  });

  describe('Password Strength Evaluation', () => {
    it('should evaluate as MEDIUM when all rules pass but length < 12', () => {
      const result = service.validate({ password: 'Pass123!' }); // 8 chars, 1 special
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe(PasswordStrength.MEDIUM);
      expect(result.errors).toHaveLength(0);
    });

    it('should evaluate as STRONG when length >= 12 and >= 2 special characters', () => {
      const result = service.validate({
        password: 'Str0ng@P@ssw0rd!',
        username: 'alice',
      }); // 16 chars, 3 specials (@, @, !)
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe(PasswordStrength.STRONG);
      expect(result.errors).toHaveLength(0);
    });
  });
});
