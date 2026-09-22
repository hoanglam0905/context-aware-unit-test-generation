export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  updatedAt: Date;
}

export interface UpdateProfileDto {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

export class UserNotFoundException extends Error {
  constructor(message = 'User profile not found') {
    super(message);
    this.name = 'UserNotFoundException';
  }
}

export class InvalidProfileDataException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProfileDataException';
  }
}

export class EmailAlreadyInUseException extends Error {
  constructor(message = 'Email is already in use by another account') {
    super(message);
    this.name = 'EmailAlreadyInUseException';
  }
}

export class InvalidOrExpiredOtpException extends Error {
  constructor(message = 'Invalid or expired OTP code') {
    super(message);
    this.name = 'InvalidOrExpiredOtpException';
  }
}

export interface IUserProfileRepository {
  findById(userId: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  update(userId: string, partial: Partial<UserProfile>): Promise<UserProfile>;
}

export interface IOtpTokenStore {
  saveOtp(key: string, code: string, ttlSeconds: number): Promise<void>;
  verifyAndConsumeOtp(key: string, code: string): Promise<boolean>;
}

export interface IEmailVerificationService {
  sendOtpEmail(toEmail: string, otpCode: string): Promise<void>;
}

export class UserProfileService {
  constructor(
    private readonly profileRepo: IUserProfileRepository,
    private readonly otpStore: IOtpTokenStore,
    private readonly emailService: IEmailVerificationService
  ) {}

  public async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.profileRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }

    if (dto.fullName !== undefined) {
      const trimmedName = dto.fullName.trim();
      if (trimmedName.length < 2 || trimmedName.length > 50) {
        throw new InvalidProfileDataException('Full name must be between 2 and 50 characters');
      }
    }

    if (dto.phoneNumber !== undefined && dto.phoneNumber.trim()) {
      const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
      if (!phoneRegex.test(dto.phoneNumber.trim())) {
        throw new InvalidProfileDataException('Invalid Vietnamese phone number format');
      }
    }

    return this.profileRepo.update(userId, {
      ...dto,
      updatedAt: new Date(),
    });
  }

  public async requestEmailChange(userId: string, newEmail: string): Promise<{ message: string }> {
    const user = await this.profileRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }

    const cleanEmail = newEmail.toLowerCase().trim();
    if (!cleanEmail.includes('@') || cleanEmail === user.email.toLowerCase()) {
      throw new InvalidProfileDataException('New email must be valid and different from current email');
    }

    const existingEmailUser = await this.profileRepo.findByEmail(cleanEmail);
    if (existingEmailUser && existingEmailUser.id !== userId) {
      throw new EmailAlreadyInUseException();
    }

    // Sinh OTP ngẫu nhiên 6 chữ số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const cacheKey = `email_change:${userId}:${cleanEmail}`;

    await this.otpStore.saveOtp(cacheKey, otpCode, 900); // 15 phút
    await this.emailService.sendOtpEmail(cleanEmail, otpCode);

    return { message: 'OTP has been sent to new email' };
  }

  public async confirmEmailChange(
    userId: string,
    newEmail: string,
    otpCode: string
  ): Promise<UserProfile> {
    const cleanEmail = newEmail.toLowerCase().trim();
    const cacheKey = `email_change:${userId}:${cleanEmail}`;

    const isValidOtp = await this.otpStore.verifyAndConsumeOtp(cacheKey, otpCode);
    if (!isValidOtp) {
      throw new InvalidOrExpiredOtpException();
    }

    return this.profileRepo.update(userId, {
      email: cleanEmail,
      updatedAt: new Date(),
    });
  }
}
