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

describe('AuthService', () => {
  let authService: AuthService;
  let userRepo: jest.Mocked<IUserRepository>;
  let hashService: jest.Mocked<IHashService>;
  let tokenService: jest.Mocked<ITokenService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    status: UserStatus.ACTIVE,
    failedAttempts: 0,
  };

  const mockTokens = {
    accessToken: 'access_token_xyz',
    refreshToken: 'refresh_token_xyz',
  };

  beforeEach(() => {
    userRepo = {
      findByEmail: jest.fn(),
      update: jest.fn(),
    };

    hashService = {
      compare: jest.fn(),
    };

    tokenService = {
      generateTokens: jest.fn(),
    };

    authService = new AuthService(userRepo, hashService, tokenService);
  });

  describe('Validation', () => {
    it('should throw ValidationError if email is empty', async () => {
      const dto: LoginDto = { email: '', password: 'password123' };

      await expect(authService.login(dto)).rejects.toThrow(
        new ValidationError('Email and password are required')
      );
    });

    it('should throw ValidationError if email is whitespace only', async () => {
      const dto: LoginDto = { email: '   ', password: 'password123' };

      await expect(authService.login(dto)).rejects.toThrow(
        new ValidationError('Email and password are required')
      );
    });

    it('should throw ValidationError if password is empty', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: '' };

      await expect(authService.login(dto)).rejects.toThrow(
        new ValidationError('Email and password are required')
      );
    });

    it('should throw ValidationError if email format is invalid', async () => {
      const dto: LoginDto = { email: 'invalid-email', password: 'password123' };

      await expect(authService.login(dto)).rejects.toThrow(
        new ValidationError('Invalid email format')
      );
    });
  });

  describe('User Status and Authentication', () => {
    it('should throw InvalidCredentialsError if user is not found', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      const dto: LoginDto = { email: 'nonexistent@example.com', password: 'password123' };

      await expect(authService.login(dto)).rejects.toThrow(InvalidCredentialsError);
      expect(userRepo.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });

    it('should normalize email to lowercase and trim when querying repository', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      const dto: LoginDto = { email: '  TEST@Example.com  ', password: 'password123' };

      await expect(authService.login(dto)).rejects.toThrow(InvalidCredentialsError);
      expect(userRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw AccountLockedError if user status is LOCKED', async () => {
      userRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        status: UserStatus.LOCKED,
      });

      const dto: LoginDto = { email: 'test@example.com', password: 'password123' };

      await expect(authService.login(dto)).rejects.toThrow(AccountLockedError);
      expect(hashService.compare).not.toHaveBeenCalled();
    });

    it('should throw AccountNotVerifiedError if user status is PENDING_VERIFICATION', async () => {
      userRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING_VERIFICATION,
      });

      const dto: LoginDto = { email: 'test@example.com', password: 'password123' };

      await expect(authService.login(dto)).rejects.toThrow(AccountNotVerifiedError);
      expect(hashService.compare).not.toHaveBeenCalled();
    });

    it('should increment failed attempts and throw InvalidCredentialsError on invalid password', async () => {
      userRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        failedAttempts: 2,
      });
      hashService.compare.mockResolvedValue(false);

      const dto: LoginDto = { email: 'test@example.com', password: 'wrong_password' };

      await expect(authService.login(dto)).rejects.toThrow(InvalidCredentialsError);
      expect(userRepo.update).toHaveBeenCalledWith('user-123', {
        failedAttempts: 3,
      });
    });

    it('should lock the account when failed attempts reach the maximum threshold', async () => {
      userRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        failedAttempts: 4,
      });
      hashService.compare.mockResolvedValue(false);

      const dto: LoginDto = { email: 'test@example.com', password: 'wrong_password' };

      await expect(authService.login(dto)).rejects.toThrow(AccountLockedError);
      expect(userRepo.update).toHaveBeenCalledWith('user-123', {
        failedAttempts: 5,
        status: UserStatus.LOCKED,
      });
    });

    it('should successfully log in, reset failed attempts, update lastLoginAt, and return tokens', async () => {
      userRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        failedAttempts: 3,
      });
      hashService.compare.mockResolvedValue(true);
      tokenService.generateTokens.mockResolvedValue(mockTokens);

      const dto: LoginDto = { email: 'test@example.com', password: 'correct_password' };

      const result = await authService.login(dto);

      expect(userRepo.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          failedAttempts: 0,
          lastLoginAt: expect.any(Date),
        })
      );
      expect(tokenService.generateTokens).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-123' })
      );
      expect(result).toEqual({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          status: UserStatus.ACTIVE,
        },
        tokens: mockTokens,
      });
    });
  });
});