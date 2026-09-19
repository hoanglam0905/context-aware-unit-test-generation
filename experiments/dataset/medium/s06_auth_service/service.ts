export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  LOCKED = 'LOCKED',
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  failedAttempts: number;
  lastLoginAt?: Date;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
    status: UserStatus;
  };
  tokens: AuthTokens;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = 'Invalid email or password') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountLockedError extends Error {
  constructor(message = 'Account is locked due to too many failed attempts') {
    super(message);
    this.name = 'AccountLockedError';
  }
}

export class AccountNotVerifiedError extends Error {
  constructor(message = 'Account email has not been verified yet') {
    super(message);
    this.name = 'AccountNotVerifiedError';
  }
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  update(id: string, partial: Partial<User>): Promise<void>;
}

export interface IHashService {
  compare(plain: string, hashed: string): Promise<boolean>;
}

export interface ITokenService {
  generateTokens(user: User): Promise<AuthTokens>;
}

export class AuthService {
  private static readonly MAX_FAILED_ATTEMPTS = 5;

  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService
  ) {}

  public async login(dto: LoginDto): Promise<LoginResult> {
    if (!dto.email || !dto.email.trim() || !dto.password) {
      throw new ValidationError('Email and password are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email.trim())) {
      throw new ValidationError('Invalid email format');
    }

    const user = await this.userRepo.findByEmail(dto.email.toLowerCase().trim());
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (user.status === UserStatus.LOCKED) {
      throw new AccountLockedError();
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new AccountNotVerifiedError();
    }

    const isPasswordValid = await this.hashService.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      const nextFailedAttempts = user.failedAttempts + 1;
      if (nextFailedAttempts >= AuthService.MAX_FAILED_ATTEMPTS) {
        await this.userRepo.update(user.id, {
          failedAttempts: nextFailedAttempts,
          status: UserStatus.LOCKED,
        });
        throw new AccountLockedError();
      } else {
        await this.userRepo.update(user.id, {
          failedAttempts: nextFailedAttempts,
        });
        throw new InvalidCredentialsError();
      }
    }

    // Đăng nhập thành công
    await this.userRepo.update(user.id, {
      failedAttempts: 0,
      lastLoginAt: new Date(),
    });

    const tokens = await this.tokenService.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      tokens,
    };
  }
}
