import {
  AuthService,
  IUserRepository,
  IHashService,
  ITokenService,
  User,
  UserStatus,
  LoginDto,
  AuthTokens,
  ValidationError,
  InvalidCredentialsError,
  AccountLockedError,
  AccountNotVerifiedError,
} from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepoMock: jest.Mocked<IUserRepository>;
  let hashServiceMock: jest.Mocked<IHashService>;
  let tokenServiceMock: jest.Mocked<ITokenService>;

  const defaultMockTokens: AuthTokens = {
    accessToken: 'valid-access-token',
    refreshToken: 'valid-refresh-token',
  };

  const createMockUser = (overrides?: Partial<User>): User => ({
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed_password_abc',
    status: UserStatus.ACTIVE,
    failedAttempts: 0,
    lastLoginAt: undefined,
    ...overrides,
  });

  const createLoginDto = (overrides?: Partial<LoginDto>): LoginDto => ({
    email: 'test@example.com',
    password: 'Password123!',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    userRepoMock = {
      findByEmail: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };

    hashServiceMock = {
      compare: jest.fn(),
    };

    tokenServiceMock = {
      generateTokens: jest.fn().mockResolvedValue(defaultMockTokens),
    };

    authService = new AuthService(userRepoMock, hashServiceMock, tokenServiceMock);
  });

  describe('Validation', () => {
    it.each([
      ['empty email', { email: '', password: 'password123' }],
      ['whitespace email', { email: '   ', password: 'password123' }],
      ['empty password', { email: 'user@example.com', password: '' }],
      ['undefined email', { email: undefined as unknown as string, password: 'password123' }],
      ['undefined password', { email: 'user@example.com', password: undefined as unknown as string }],
    ])('should throw ValidationError when %s is provided', async (_, dto) => {
      await expect(authService.login(dto)).rejects.toThrow(ValidationError);
      await expect(authService.login(dto)).rejects.toThrow('Email and password are required');
      expect(userRepoMock.findByEmail).not.toHaveBeenCalled();
    });

    it.each([
      ['plain text without at/domain', 'invalidemail'],
      ['missing domain', 'user@'],
      ['missing TLD', 'user@domain'],
      ['containing whitespace', 'user @domain.com'],
      ['missing username', '@domain.com'],
    ])('should throw ValidationError for invalid email format: %s', async (_, email) => {
      const dto = createLoginDto({ email });

      await expect(authService.login(dto)).rejects.toThrow(ValidationError);
      await expect(authService.login(dto)).rejects.toThrow('Invalid email format');
      expect(userRepoMock.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('User Lookup & Normalization', () => {
    it('should normalize email to lowercase and trimmed before querying user repository', async () => {
      const rawEmail = '  JOHN.Doe@Example.COM  ';
      const normalizedEmail = 'john.doe@example.com';
      const user = createMockUser({ email: normalizedEmail });

      userRepoMock.findByEmail.mockResolvedValue(user);
      hashServiceMock.compare.mockResolvedValue(true);

      await authService.login(createLoginDto({ email: rawEmail }));

      expect(userRepoMock.findByEmail).toHaveBeenCalledTimes(1);
      expect(userRepoMock.findByEmail).toHaveBeenCalledWith(normalizedEmail);
    });

    it('should throw InvalidCredentialsError if user is not found', async () => {
      userRepoMock.findByEmail.mockResolvedValue(null);

      await expect(authService.login(createLoginDto())).rejects.toThrow(InvalidCredentialsError);
      expect(hashServiceMock.compare).not.toHaveBeenCalled();
      expect(tokenServiceMock.generateTokens).not.toHaveBeenCalled();
    });
  });

  describe('Account Status Pre-checks', () => {
    it('should throw AccountLockedError if user status is LOCKED without verifying password', async () => {
      const lockedUser = createMockUser({ status: UserStatus.LOCKED });
      userRepoMock.findByEmail.mockResolvedValue(lockedUser);

      await expect(authService.login(createLoginDto())).rejects.toThrow(AccountLockedError);
      expect(hashServiceMock.compare).not.toHaveBeenCalled();
      expect(userRepoMock.update).not.toHaveBeenCalled();
    });

    it('should throw AccountNotVerifiedError if user status is PENDING_VERIFICATION', async () => {
      const unverifiedUser = createMockUser({ status: UserStatus.PENDING_VERIFICATION });
      userRepoMock.findByEmail.mockResolvedValue(unverifiedUser);

      await expect(authService.login(createLoginDto())).rejects.toThrow(AccountNotVerifiedError);
      expect(hashServiceMock.compare).not.toHaveBeenCalled();
      expect(userRepoMock.update).not.toHaveBeenCalled();
    });
  });

  describe('Password Mismatch & Account Locking (Boundary Values)', () => {
    it('should increment failedAttempts and throw InvalidCredentialsError when under maximum threshold', async () => {
      const user = createMockUser({ failedAttempts: 3 });
      userRepoMock.findByEmail.mockResolvedValue(user);
      hashServiceMock.compare.mockResolvedValue(false);

      await expect(authService.login(createLoginDto())).rejects.toThrow(InvalidCredentialsError);

      expect(userRepoMock.update).toHaveBeenCalledTimes(1);
      expect(userRepoMock.update).toHaveBeenCalledWith(user.id, {
        failedAttempts: 4,
      });
      expect(tokenServiceMock.generateTokens).not.toHaveBeenCalled();
    });

    it('should lock account and throw AccountLockedError when next failed attempt reaches threshold (5)', async () => {
      const user = createMockUser({ failedAttempts: 4 });
      userRepoMock.findByEmail.mockResolvedValue(user);
      hashServiceMock.compare.mockResolvedValue(false);

      await expect(authService.login(createLoginDto())).rejects.toThrow(AccountLockedError);

      expect(userRepoMock.update).toHaveBeenCalledTimes(1);
      expect(userRepoMock.update).toHaveBeenCalledWith(user.id, {
        failedAttempts: 5,
        status: UserStatus.LOCKED,
      });
      expect(tokenServiceMock.generateTokens).not.toHaveBeenCalled();
    });

    it('should lock account and throw AccountLockedError when failed attempts exceed threshold (> 5)', async () => {
      const user = createMockUser({ failedAttempts: 5 });
      userRepoMock.findByEmail.mockResolvedValue(user);
      hashServiceMock.compare.mockResolvedValue(false);

      await expect(authService.login(createLoginDto())).rejects.toThrow(AccountLockedError);

      expect(userRepoMock.update).toHaveBeenCalledTimes(1);
      expect(userRepoMock.update).toHaveBeenCalledWith(user.id, {
        failedAttempts: 6,
        status: UserStatus.LOCKED,
      });
    });
  });

  describe('Successful Authentication (Happy Paths)', () => {
    it('should authenticate active user, reset failed attempts, update lastLoginAt, and return tokens', async () => {
      const beforeLoginTime = new Date().getTime();
      const user = createMockUser({ failedAttempts: 2 });

      userRepoMock.findByEmail.mockResolvedValue(user);
      hashServiceMock.compare.mockResolvedValue(true);

      const result = await authService.login(createLoginDto());

      expect(hashServiceMock.compare).toHaveBeenCalledWith('Password123!', user.passwordHash);
      expect(userRepoMock.update).toHaveBeenCalledTimes(1);
      expect(userRepoMock.update).toHaveBeenCalledWith(user.id, {
        failedAttempts: 0,
        lastLoginAt: expect.any(Date),
      });

      const updatedDate = (userRepoMock.update.mock.calls[0][1] as Partial<User>).lastLoginAt;
      expect(updatedDate?.getTime()).toBeGreaterThanOrEqual(beforeLoginTime);

      expect(tokenServiceMock.generateTokens).toHaveBeenCalledTimes(1);
      expect(tokenServiceMock.generateTokens).toHaveBeenCalledWith(user);

      expect(result).toEqual({
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
        },
        tokens: defaultMockTokens,
      });
    });

    it('should authenticate user who already has 0 failed attempts without issue', async () => {
      const user = createMockUser({ failedAttempts: 0 });
      userRepoMock.findByEmail.mockResolvedValue(user);
      hashServiceMock.compare.mockResolvedValue(true);

      const result = await authService.login(createLoginDto());

      expect(userRepoMock.update).toHaveBeenCalledWith(user.id, {
        failedAttempts: 0,
        lastLoginAt: expect.any(Date),
      });
      expect(result.tokens).toEqual(defaultMockTokens);
    });
  });

  describe('Downstream Dependency Exception Propagation', () => {
    it('should rethrow if userRepo.findByEmail throws', async () => {
      const dbError = new Error('Database connection lost');
      userRepoMock.findByEmail.mockRejectedValue(dbError);

      await expect(authService.login(createLoginDto())).rejects.toThrow(dbError);
    });

    it('should rethrow if hashService.compare throws', async () => {
      userRepoMock.findByEmail.mockResolvedValue(createMockUser());
      const cryptoError = new Error('Bcrypt calculation failure');
      hashServiceMock.compare.mockRejectedValue(cryptoError);

      await expect(authService.login(createLoginDto())).rejects.toThrow(cryptoError);
    });

    it('should rethrow if userRepo.update throws during success update', async () => {
      userRepoMock.findByEmail.mockResolvedValue(createMockUser());
      hashServiceMock.compare.mockResolvedValue(true);
      const updateError = new Error('Write conflict on update');
      userRepoMock.update.mockRejectedValue(updateError);

      await expect(authService.login(createLoginDto())).rejects.toThrow(updateError);
      expect(tokenServiceMock.generateTokens).not.toHaveBeenCalled();
    });

    it('should rethrow if tokenService.generateTokens throws', async () => {
      userRepoMock.findByEmail.mockResolvedValue(createMockUser());
      hashServiceMock.compare.mockResolvedValue(true);
      const jwtError = new Error('Private key signature error');
      tokenServiceMock.generateTokens.mockRejectedValue(jwtError);

      await expect(authService.login(createLoginDto())).rejects.toThrow(jwtError);
    });
  });
});