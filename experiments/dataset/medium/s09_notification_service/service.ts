export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export interface RecipientProfile {
  userId: string;
  email?: string;
  phoneNumber?: string;
  deviceToken?: string;
  preferredChannels?: NotificationChannel[];
}

export interface NotificationPayload {
  title: string;
  content: string;
}

export interface NotificationDeliveryResult {
  success: boolean;
  deliveredChannel?: NotificationChannel;
  attempts: Array<{
    channel: NotificationChannel;
    success: boolean;
    error?: string;
  }>;
}

export class AllNotificationChannelsFailedException extends Error {
  constructor(message = 'All notification channels failed to deliver') {
    super(message);
    this.name = 'AllNotificationChannelsFailedException';
  }
}

export interface IEmailSender {
  send(to: string, title: string, content: string): Promise<boolean>;
}

export interface ISmsSender {
  send(phone: string, message: string): Promise<boolean>;
}

export interface IPushSender {
  send(token: string, title: string, body: string): Promise<boolean>;
}

export class NotificationService {
  private static readonly DEFAULT_CHANNELS: NotificationChannel[] = [
    NotificationChannel.PUSH,
    NotificationChannel.EMAIL,
    NotificationChannel.SMS,
  ];

  constructor(
    private readonly pushSender: IPushSender,
    private readonly emailSender: IEmailSender,
    private readonly smsSender: ISmsSender
  ) {}

  public async notify(
    recipient: RecipientProfile,
    payload: NotificationPayload
  ): Promise<NotificationDeliveryResult> {
    const channels =
      recipient.preferredChannels && recipient.preferredChannels.length > 0
        ? recipient.preferredChannels
        : NotificationService.DEFAULT_CHANNELS;

    const attempts: NotificationDeliveryResult['attempts'] = [];

    for (const channel of channels) {
      if (!this.hasRecipientInfoForChannel(recipient, channel)) {
        continue; // Bỏ qua nếu thiếu thông tin địa chỉ kênh
      }

      try {
        const sent = await this.dispatchChannel(channel, recipient, payload);
        if (sent) {
          attempts.push({ channel, success: true });
          return {
            success: true,
            deliveredChannel: channel,
            attempts,
          };
        } else {
          attempts.push({ channel, success: false, error: 'Sender returned false' });
        }
      } catch (err: any) {
        attempts.push({ channel, success: false, error: err.message || 'Unknown channel error' });
      }
    }

    throw new AllNotificationChannelsFailedException();
  }

  private hasRecipientInfoForChannel(recipient: RecipientProfile, channel: NotificationChannel): boolean {
    switch (channel) {
      case NotificationChannel.PUSH:
        return Boolean(recipient.deviceToken && recipient.deviceToken.trim());
      case NotificationChannel.EMAIL:
        return Boolean(recipient.email && recipient.email.includes('@'));
      case NotificationChannel.SMS:
        return Boolean(recipient.phoneNumber && recipient.phoneNumber.trim());
    }
  }

  private async dispatchChannel(
    channel: NotificationChannel,
    recipient: RecipientProfile,
    payload: NotificationPayload
  ): Promise<boolean> {
    switch (channel) {
      case NotificationChannel.PUSH:
        return this.pushSender.send(recipient.deviceToken!, payload.title, payload.content);
      case NotificationChannel.EMAIL:
        return this.emailSender.send(recipient.email!, payload.title, payload.content);
      case NotificationChannel.SMS:
        return this.smsSender.send(recipient.phoneNumber!, `${payload.title}: ${payload.content}`);
    }
  }
}
