export interface NotificationProvider {
  sendPush(input: { userId: string; title: string; body: string }): Promise<void>;
  sendEmail(input: { to: string; subject: string; html: string }): Promise<void>;
  sendSms(input: { to: string; message: string }): Promise<void>;
}
