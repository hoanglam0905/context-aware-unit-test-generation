import {
  NotificationService,
  NotificationChannel,
  IPushSender,
  IEmailSender,
  ISmsSender,
  RecipientProfile,
  AllNotificationChannelsFailedException,
} from './service';

describe('NotificationService (Ground Truth)', () => {
  let service: NotificationService;
  let mockPushSender: jest.Mocked<IPushSender>;
  let mockEmailSender: jest.Mocked<IEmailSender>;
  let mockSmsSender: jest.Mocked<ISmsSender>;

  const sampleRecipient: RecipientProfile = {
    userId: 'user-123',
    email: 'user@example.com',
    phoneNumber: '+84987654321',
    deviceToken: 'fcm_device_token_xyz',
  };

  const samplePayload = {
    title: 'Order Status',
    content: 'Your order has been shipped successfully',
  };

  beforeEach(() => {
    mockPushSender = {
      send: jest.fn(),
    };
    mockEmailSender = {
      send: jest.fn(),
    };
    mockSmsSender = {
      send: jest.fn(),
    };

    service = new NotificationService(mockPushSender, mockEmailSender, mockSmsSender);
  });

  describe('Default Priority Dispatching', () => {
    it('should deliver via PUSH when it is successful and not call EMAIL or SMS', async () => {
      mockPushSender.send.mockResolvedValue(true);

      const result = await service.notify(sampleRecipient, samplePayload);

      expect(result.success).toBe(true);
      expect(result.deliveredChannel).toBe(NotificationChannel.PUSH);
      expect(mockPushSender.send).toHaveBeenCalledTimes(1);
      expect(mockEmailSender.send).not.toHaveBeenCalled();
      expect(mockSmsSender.send).not.toHaveBeenCalled();
    });

    it('should fallback to EMAIL when PUSH fails (returns false)', async () => {
      mockPushSender.send.mockResolvedValue(false);
      mockEmailSender.send.mockResolvedValue(true);

      const result = await service.notify(sampleRecipient, samplePayload);

      expect(result.success).toBe(true);
      expect(result.deliveredChannel).toBe(NotificationChannel.EMAIL);
      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0].channel).toBe(NotificationChannel.PUSH);
      expect(result.attempts[1].channel).toBe(NotificationChannel.EMAIL);
      expect(mockSmsSender.send).not.toHaveBeenCalled();
    });

    it('should fallback to SMS when both PUSH and EMAIL throw exceptions', async () => {
      mockPushSender.send.mockRejectedValue(new Error('APNS Timeout'));
      mockEmailSender.send.mockRejectedValue(new Error('SMTP Down'));
      mockSmsSender.send.mockResolvedValue(true);

      const result = await service.notify(sampleRecipient, samplePayload);

      expect(result.success).toBe(true);
      expect(result.deliveredChannel).toBe(NotificationChannel.SMS);
      expect(mockSmsSender.send).toHaveBeenCalledWith(
        sampleRecipient.phoneNumber,
        expect.stringContaining(samplePayload.title)
      );
    });

    it('should throw AllNotificationChannelsFailedException when all channels fail', async () => {
      mockPushSender.send.mockResolvedValue(false);
      mockEmailSender.send.mockResolvedValue(false);
      mockSmsSender.send.mockResolvedValue(false);

      await expect(service.notify(sampleRecipient, samplePayload)).rejects.toThrow(
        AllNotificationChannelsFailedException
      );
    });
  });

  describe('Recipient Info Validation & Skipping', () => {
    it('should skip channels if corresponding contact info is missing', async () => {
      const recipientWithoutPushAndEmail: RecipientProfile = {
        userId: 'user-sms-only',
        phoneNumber: '+84912345678',
      };
      mockSmsSender.send.mockResolvedValue(true);

      const result = await service.notify(recipientWithoutPushAndEmail, samplePayload);

      expect(result.deliveredChannel).toBe(NotificationChannel.SMS);
      expect(mockPushSender.send).not.toHaveBeenCalled();
      expect(mockEmailSender.send).not.toHaveBeenCalled();
    });
  });
});
