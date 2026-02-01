import nodemailer, { Transporter } from "nodemailer";
import { logger } from "./logger";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email Service
 * Uses Ethereal (fake SMTP) in development for testing with preview URLs
 * Uses real SMTP in production
 */
class EmailServiceClass {
  private transporter: Transporter | null = null;
  private initialized = false;
  private initializing: Promise<void> | null = null;

  private async initializeTransporter(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) {
      await this.initializing;
      return;
    }

    this.initializing = this._init();
    await this.initializing;
  }

  private async _init(): Promise<void> {
    try {
      const isProduction = process.env.NODE_ENV === "production";
      const hasSmtpConfig = process.env.SMTP_USER && process.env.SMTP_PASSWORD;

      if (isProduction && hasSmtpConfig) {
        // Production SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });
        logger.info("Email service initialized with production SMTP");
      } else {
        // Development: Use Ethereal (test account)
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        logger.info("Email service initialized with Ethereal test account", {
          user: testAccount.user,
        });
        console.log("\n========================================");
        console.log("ETHEREAL TEST EMAIL ACCOUNT:");
        console.log(`User: ${testAccount.user}`);
        console.log(`Pass: ${testAccount.pass}`);
        console.log("View sent emails at: https://ethereal.email/messages");
        console.log("========================================\n");
      }
      this.initialized = true;
    } catch (error) {
      logger.error("Failed to initialize email service", { error });
      throw error;
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<string | null> {
    await this.initializeTransporter();

    if (!this.transporter) {
      logger.error("Email transporter not initialized");
      return null;
    }

    try {
      const appName = process.env.APP_NAME || "Workseed";
      const fromEmail = process.env.SMTP_FROM || `noreply@${appName.toLowerCase().replace(/\s+/g, "")}.com`;

      const info = await this.transporter.sendMail({
        from: `"${appName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info("Email sent successfully", { messageId: info.messageId, to: options.to });

      // Get preview URL for development (Ethereal)
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info("Email preview URL", { previewUrl });
        console.log("\n========================================");
        console.log("EMAIL SENT! Preview URL:");
        console.log(previewUrl);
        console.log("========================================\n");
      }

      return previewUrl || null;
    } catch (error) {
      logger.error("Email sending failed", { error, to: options.to });
      throw new Error("Failed to send email");
    }
  }

  /**
   * Send password reset email with link
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetLink: string
  ): Promise<string | null> {
    const appName = process.env.APP_NAME || "Workseed";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #4F46E5; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background: #4338CA; }
          .warning { background: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0; font-size: 14px; }
          .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .link-text { word-break: break-all; font-size: 12px; color: #6b7280; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>We received a request to reset your password for your ${appName} account. Click the button below to create a new password:</p>

            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>

            <p class="link-text">Or copy and paste this link: ${resetLink}</p>

            <p>This link will expire in <strong>1 hour</strong>.</p>

            <div class="warning">
              <strong>Didn't request this?</strong><br>
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </div>

            <p>Best regards,<br>The ${appName} Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hello ${firstName},

We received a request to reset your password for your ${appName} account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.

Best regards,
The ${appName} Team
    `;

    return this.sendEmail({
      to: email,
      subject: `Password Reset Request - ${appName}`,
      html,
      text,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<string | null> {
    const appName = process.env.APP_NAME || "Workseed";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${appName}!</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Welcome to ${appName}! We're excited to have you on board.</p>
            <p>You can now access all features of the platform to manage your HR needs efficiently.</p>
            <p>If you have any questions, feel free to reach out to your administrator or our support team.</p>
            <p>Best regards,<br>The ${appName} Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Welcome to ${appName}!`,
      html,
    });
  }
}

// Export singleton instance
export const EmailService = new EmailServiceClass();
