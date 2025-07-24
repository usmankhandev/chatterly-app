import nodemailer from 'nodemailer';

export class EmailService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
    await this.transporter.sendMail({
      to: email,
      subject: 'Verify your Chatterly Account.',
      html: `Click <a href="${verificationUrl}>"here</a> to verify your email.`,
    });
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL}/reset-password?toke=${token}`;
    await this.transporter.sendMail({
      to: email,
      subject: 'Reset your Chatterly Password',
      html: `Click <a href="${resetUrl}">here</a> to reset your password.`,
    });
  }
}
