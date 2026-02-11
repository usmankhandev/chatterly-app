import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SSID,
  process.env.WILIO_AUTH_TOKEN,
);

export class SmsService {
  static generateSmsOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  static async sendMfaCode(phoneNumber: string, code: string): Promise<void> {
    try {
      await client.messages.create({
        body: `Your Chatterly MFA code is: ${code}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw new Error('Failed to send SMS');
    }
  }

  static async sendSms(to: string, body: string): Promise<void> {
    try {
      await client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw new Error('Failed to send SMS');
    }
  }

  static async sendVerificationSms(
    phoneNumber: string,
    code: string,
  ): Promise<void> {
    const message = `Your Chatterly verification code: ${code}`;
    await this.sendSms(phoneNumber, message);
  }

  static async sendResetPasswordSms(
    phoneNumber: string,
    code: string,
  ): Promise<void> {
    const message = `Your Chatterly password reset code is: ${code}`;
    await this.sendSms(phoneNumber, message);
  }
}
