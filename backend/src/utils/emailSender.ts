import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const appName = process.env.APP_NAME || 'Your App';

export async function sendOtpEmail(to: string, otp: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 500px; margin: auto; background: white; border-radius: 8px; padding: 30px;">
        <h2 style="color: #4e73df;">🔐 OTP Verification - ${appName}</h2>
        <p>Hello,</p>
        <p>Please use the following OTP to complete your login to <strong>${appName}</strong>:</p>
        <div style="font-size: 24px; font-weight: bold; background: #f1f1f1; padding: 10px 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP is valid for 20 minutes. Do not share it with anyone.</p>
        <p>Thank you,<br/>The ${appName} Team</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${appName} Support" <${process.env.SMTP_USER}>`,
    to,
    subject: `${appName} Login OTP`,
    html: htmlTemplate,
  });
}

export async function sendPasswordResetOtpEmail(to: string, otp: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 500px; margin: auto; background: white; border-radius: 8px; padding: 30px;">
        <h2 style="color: #4e73df;">Password Reset - ${appName}</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password for <strong>${appName}</strong>.</p>
        <p>Use the following 6-digit OTP to continue:</p>
        <div style="font-size: 24px; font-weight: bold; background: #f1f1f1; padding: 10px 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP expires in 20 minutes. If you did not request this, please ignore this email.</p>
        <p>Thank you,<br/>The ${appName} Team</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${appName} Support" <${process.env.SMTP_USER}>`,
    to,
    subject: `${appName} Password Reset OTP`,
    html: htmlTemplate,
  });
}
