import {
  UserProfileService,
  IUserProfileRepository,
  IOtpTokenStore,
  IEmailVerificationService,
  UserProfile,
  UserNotFoundException,
  InvalidProfileDataException,
  EmailAlreadyInUseException,
  InvalidOrExpiredOtpException,
} from './service';

describe('UserProfileService (Ground Truth)', () => {
  let profileRepo: jest.Mocked<IUserProfileRepository>;
  let otpStore: jest.Mocked<IOtpTokenStore>;
  let emailService: jest.Mocked<IEmailVerificationService>;
  let service: UserProfileService;

  const mockUser: UserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Nguyen Van A',
    phoneNumber: '0912345678',
    updatedAt: new Date(),
  };

  beforeEach(() => {
    profileRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
    };
    otpStore = {
      saveOtp: jest.fn(),
      verifyAndConsumeOtp: jest.fn(),
    };
    emailService = {
      sendOtpEmail: jest.fn(),
    };
    service = new UserProfileService(profileRepo, otpStore, emailService);
  });

  describe('updateProfile', () => {
    it('should throw UserNotFoundException when user is not found', async () => {
      profileRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateProfile('unknown-id', { fullName: 'Tran B' })
      ).rejects.toThrow(UserNotFoundException);
    });

    it('should throw InvalidProfileDataException if fullName is shorter than 2 chars', async () => {
      profileRepo.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateProfile('user-123', { fullName: 'A' })
      ).rejects.toThrow(InvalidProfileDataException);
    });

    it('should throw InvalidProfileDataException if fullName exceeds 50 chars', async () => {
      profileRepo.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateProfile('user-123', { fullName: 'A'.repeat(51) })
      ).rejects.toThrow(InvalidProfileDataException);
    });

    it('should throw InvalidProfileDataException on invalid VN phone format', async () => {
      profileRepo.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateProfile('user-123', { phoneNumber: '123456' })
      ).rejects.toThrow(InvalidProfileDataException);
    });

    it('should successfully update profile with valid details', async () => {
      profileRepo.findById.mockResolvedValue(mockUser);
      profileRepo.update.mockImplementation(async (id, data) => ({
        ...mockUser,
        ...data,
      }));

      const updated = await service.updateProfile('user-123', {
        fullName: 'Nguyen Van B',
        phoneNumber: '+84987654321',
        avatarUrl: 'https://cdn.example.com/avatar.png',
      });

      expect(updated.fullName).toBe('Nguyen Van B');
      expect(profileRepo.update).toHaveBeenCalledWith('user-123', expect.objectContaining({
        fullName: 'Nguyen Van B',
        phoneNumber: '+84987654321',
        avatarUrl: 'https://cdn.example.com/avatar.png',
      }));
    });
  });

  describe('requestEmailChange', () => {
    it('should throw UserNotFoundException if user does not exist', async () => {
      profileRepo.findById.mockResolvedValue(null);

      await expect(
        service.requestEmailChange('unknown', 'new@example.com')
      ).rejects.toThrow(UserNotFoundException);
    });

    it('should throw InvalidProfileDataException if new email is identical to current email', async () => {
      profileRepo.findById.mockResolvedValue(mockUser);

      await expect(
        service.requestEmailChange('user-123', 'test@example.com')
      ).rejects.toThrow(InvalidProfileDataException);
    });

    it('should throw InvalidProfileDataException if new email format is missing @', async () => {
      profileRepo.findById.mockResolvedValue(mockUser);

      await expect(
        service.requestEmailChange('user-123', 'invalid-email')
      ).rejects.toThrow(InvalidProfileDataException);
    });

    it('should throw EmailAlreadyInUseException if email belongs to another user', async () => {
      profileRepo.findById.mockResolvedValue(mockUser);
      profileRepo.findByEmail.mockResolvedValue({
        id: 'other-user',
        email: 'other@example.com',
        fullName: 'Other User',
        updatedAt: new Date(),
      });

      await expect(
        service.requestEmailChange('user-123', 'other@example.com')
      ).rejects.toThrow(EmailAlreadyInUseException);
    });

    it('should store OTP and send verification email on valid request', async () => {
      profileRepo.findById.mockResolvedValue(mockUser);
      profileRepo.findByEmail.mockResolvedValue(null);

      const res = await service.requestEmailChange('user-123', 'newemail@example.com');

      expect(res.message).toContain('OTP');
      expect(otpStore.saveOtp).toHaveBeenCalledWith(
        'email_change:user-123:newemail@example.com',
        expect.stringMatching(/^[0-9]{6}$/),
        900
      );
      expect(emailService.sendOtpEmail).toHaveBeenCalledWith(
        'newemail@example.com',
        expect.stringMatching(/^[0-9]{6}$/)
      );
    });
  });

  describe('confirmEmailChange', () => {
    it('should throw InvalidOrExpiredOtpException if OTP verification fails', async () => {
      otpStore.verifyAndConsumeOtp.mockResolvedValue(false);

      await expect(
        service.confirmEmailChange('user-123', 'new@example.com', '123456')
      ).rejects.toThrow(InvalidOrExpiredOtpException);
    });

    it('should successfully update email when OTP is valid', async () => {
      otpStore.verifyAndConsumeOtp.mockResolvedValue(true);
      profileRepo.update.mockImplementation(async (id, data) => ({
        ...mockUser,
        ...data,
      }));

      const res = await service.confirmEmailChange('user-123', 'new@example.com', '654321');

      expect(res.email).toBe('new@example.com');
      expect(profileRepo.update).toHaveBeenCalledWith('user-123', expect.objectContaining({
        email: 'new@example.com',
      }));
    });
  });
});
