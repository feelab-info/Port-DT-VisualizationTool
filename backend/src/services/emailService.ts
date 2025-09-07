import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isEmailConfigured: boolean;

  constructor() {
    // Check if email is configured with valid, non-empty credentials (not placeholders)
    const smtpUser = process.env.SMTP_USER?.trim() || '';
    const smtpPass = process.env.SMTP_PASS?.trim() || '';
    
    // Common placeholder values that should be treated as unconfigured
    const placeholderValues = [
      'your-email@gmail.com',
      'your-app-password',
      'username@gmail.com',
      'your-password',
      'password',
      'email@example.com'
    ];
    
    this.isEmailConfigured = !!(
      smtpUser && 
      smtpPass && 
      smtpUser !== '' && 
      smtpPass !== '' &&
      !placeholderValues.includes(smtpUser.toLowerCase()) &&
      !placeholderValues.includes(smtpPass.toLowerCase())
    );
    
    // Only initialize transporter if email is configured
    if (this.isEmailConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  /**
   * Send verification email with a code
   * @param email Recipient email address
   * @param verificationCode 6-digit verification code
   * @param name User's name
   */
  async sendVerificationEmail(email: string, verificationCode: string, name: string): Promise<boolean> {
    // Development mode - just log the code
    if (!this.isEmailConfigured) {
      console.log('='.repeat(60));
      console.log(`[DEV MODE] 📧 VERIFICATION EMAIL`);
      console.log(`To: ${email}`);
      console.log(`Name: ${name}`);
      console.log(`Verification Code: ${verificationCode}`);
      console.log('='.repeat(60));
      return true; // Always succeed in dev mode
    }

    // Production mode - send actual email
    try {
      const mailOptions = {
        from: `"Port Digital Twin" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Email Verification - Port Digital Twin',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
              <h1>Port Digital Twin</h1>
              <h2>Email Verification</h2>
            </div>
            
            <div style="padding: 20px; background-color: #f8fafc;">
              <p>Hello ${name},</p>
              
              <p>Thank you for registering with the Port Digital Twin system. To complete your registration and verify your email address, please use the verification code below:</p>
              
              <div style="background-color: #1e40af; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${verificationCode}
              </div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code will expire in 15 minutes</li>
                <li>Do not share this code with anyone</li>
                <li>If you did not request this verification, please ignore this email</li>
              </ul>
              
              <p>Once verified, you'll be able to access the Port of Funchal digital twin system.</p>
              
              <p>Best regards,<br>
              Port Digital Twin Team</p>
            </div>
            
            <div style="background-color: #e5e7eb; padding: 10px; text-align: center; font-size: 12px; color: #6b7280;">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 Port of Funchal - Digital Twin System</p>
            </div>
          </div>
        `,
        text: `
          Port Digital Twin - Email Verification
          
          Hello ${name},
          
          Thank you for registering with the Port Digital Twin system.
          
          Your verification code is: ${verificationCode}
          
          This code will expire in 15 minutes.
          
          Best regards,
          Port Digital Twin Team
        `
      };

      const info = await this.transporter!.sendMail(mailOptions);
      console.log('Verification email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(): Promise<boolean> {
    if (!this.isEmailConfigured) {
      console.log('[DEV MODE] Email not configured - will log verification codes to console');
      return true;
    }
    
    try {
      await this.transporter!.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration error:', error);
      return false;
    }
  }
}

// Create singleton instance
const emailService = new EmailService();
export default emailService; 