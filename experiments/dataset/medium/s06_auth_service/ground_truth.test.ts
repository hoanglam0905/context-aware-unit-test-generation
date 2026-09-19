import {
  AuthService,
  UserStatus,
  User,
  LoginDto,
  IUserRepository,
  IHashService,
  ITokenService,
  ValidationError,
  InvalidCredentialsError,
  AccountLockedError,
  AccountNotVerifiedError,
} from './service';

describe('AuthService (Ground Truth)', () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockHashService: jest.Mocked<IHashService>;
  let mockTokenService: jest.Mocked<ITokenService>;

  const sampleUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed_pw_secret',
    status: UserStatus.ACTIVE,
    failedAttempts: 0,
  };

  const validDto: LoginDto = {
    email: 'test@example.com',
    password: 'Password123!',
  };

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockHashService = {
      compare: jest.fn(),
    };
    mockTokenService = {
      generateTokens: jest.fn().mockResolvedValue({
        accessToken: 'access_jwt_token',
        refreshToken: 'refresh_jwt_token',
      }),
    };

    authService = new AuthService(mockUserRepo, mockHashService, mockTokenService);
  });

  describe('Input Validation', () => {
    it('should throw ValidationError when email is empty', async () => {
      await expect(authService.login({ email: '', password: '123' }))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when password is empty', async () => {
      await expect(authService.login({ email: 'valid@example.com', password: '' }))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when email format is invalid', async () => {
      await expect(authService.login({ email: 'not-an-email', password: 'password' }))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('User Status Verification', () => {
    it('should throw InvalidCredentialsError when user does not exist in DB', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(authService.login(validDto))
        .rejects.toThrow(InvalidCredentialsError);
      expect(mockHashService.compare).not.toHaveBeenCalled();
    });

    it('should throw AccountLockedError immediately if user is already LOCKED', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        ...sampleUser,
        status: UserStatus.LOCKED,
      });

      await expect(authService.login(validDto))
        .rejects.toThrow(AccountLockedError);
      expect(mockHashService.compare).not.toHaveBeenCalled();
    });

    it('should throw AccountNotVerifiedError if user is PENDING_VERIFICATION', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        ...sampleUser,
        status: UserStatus.PENDING_VERIFICATION,
      });

      await expect(authService.login(validDto))
        .rejects.toThrow(AccountNotVerifiedError);
      expect(mockHashService.compare).not.toHaveBeenCalled();
    });
  });

  describe('Password Verification & Account Locking Mechanism', () => {
    it('should increment failedAttempts and throw InvalidCredentialsError on wrong password (< 5 times)', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        ...sampleUser,
        failedAttempts: 2,
      });
      mockHashService.compare.mockResolvedValue(false);

      await expect(authService.login(validDto)).rejects.toThrow(InvalidCredentialsError);

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-123', {
        failedAttempts: 3,
      });
    });

    it('should lock account and throw AccountLockedError when reaching 5 failed attempts', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        ...sampleUser,
        failedAttempts: 4,
      });
      mockHashService.compare.mockResolvedValue(false);

      await expect(authService.login(validDto)).rejects.toThrow(AccountLockedError);

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-123', {
        failedAttempts: 5,
        status: UserStatus.LOCKED,
      });
    });
  });

  describe('Successful Login Flow', () => {
    it('should reset failedAttempts to 0, update lastLoginAt, and return tokens on success', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        ...sampleUser,
        failedAttempts: 3,
      });
      mockHashService.compare.mockResolvedValue(true);

      const result = await authService.login(validDto);

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          failedAttempts: 0,
          lastLoginAt: expect.any(Date),
        })
      );
      expect(mockTokenService.generateTokens).toHaveBeenCalled();
      expect(result.tokens.accessToken).toBe('access_jwt_token');
      expect(result.user.email).toBe('test@example.com');
    });
  });
});
