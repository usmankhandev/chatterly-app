import nodemailer from 'nodemailer';

export class EmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  constructor() {
    console.log('Transporter config:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.APP_URL}/api/v1/auth/verify-email?token=${token}`;
    await this.transporter.sendMail({
      to: email,
      subject: 'Verify your Chatterly Account.',
      html: `Click <a href="${verificationUrl}">here</a> to verify your email.`,
    });
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL}/api/v1/auth/reset-password?token=${token}`;
    await this.transporter.sendMail({
      to: email,
      subject: 'Reset your Chatterly Password',
      html: `Click <a href="${resetUrl}">here</a> to reset your password.`,
    });
  }

  generateEmailOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const from =
      process.env.EMAIL_FROM || '"Chatterly Support" <support@chatterly.com>';

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Email sending failed');
    }
  }

  async sendEmailMfaCode(email: string, code: string): Promise<void> {
    const subject = 'Your MFA Login Code';
    const html = `

      <p> Hello</p>
      <p> Your login verification code is: <strong>${code}</strong></p>
      <p> This code will expire in 10 minutes.</p>

    `;

    await this.sendEmail(email, subject, html);
  }
}
