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
}
