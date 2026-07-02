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
        <p>This OTP is valid for 3 minutes. Do not share it with anyone.</p>
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

export async function sendCompanyVerificationEmail(to: string, otp: string, companyName: string, ownerName: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlTemplate = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
      <div style="max-width: 550px; margin: auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #ea580c; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-top: 0;">🏢 Company Email Verification</h2>
        <p>Hello <strong>${ownerName}</strong>,</p>
        <p>Thank you for registering your company on <strong>${appName}</strong>.</p>
        <p>Please verify that the email address associated with your company registration profile is correct.</p>
        
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Company Profile Details</h4>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Company Name:</strong> ${companyName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Owner Name:</strong> ${ownerName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Registered Email:</strong> ${to}</p>
        </div>

        <p>Enter the following 6-digit OTP verification code in the administration panel:</p>
        <div style="font-size: 28px; font-weight: bold; background: #fef2f2; color: #991b1b; border: 1px dashed #fca5a5; padding: 12px 24px; border-radius: 8px; text-align: center; margin: 24px auto; max-width: 200px; letter-spacing: 0.1em;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #64748b;">This OTP code is valid for 15 minutes. If you did not register this company profile, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Best regards,<br/>The ${appName} Team</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${appName} Security" <${process.env.SMTP_USER}>`,
    to,
    subject: `Verify Email for ${companyName} - ${appName}`,
    html: htmlTemplate,
  });
}

export async function sendPasswordResetOtpEmail(to: string, otp: string, userName?: string, companyName?: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const greeting = userName ? `Hello <strong>${userName}</strong>,` : `Hello,`;
  const mainText = userName && companyName
    ? `We received a request to reset the password for your user account associated with <strong>${companyName}</strong> on the <strong>${appName}</strong> platform.`
    : `We received a request to reset your password for <strong>${appName}</strong>.`;

  const detailsBlock = userName && companyName ? `
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Reset Request Details</h4>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Company Name:</strong> ${companyName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>User Name:</strong> ${userName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>User Email:</strong> ${to}</p>
        </div>
  ` : '';

  const htmlTemplate = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
      <div style="max-width: 550px; margin: auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #4e73df; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-top: 0;">🔑 Password Reset Request</h2>
        <p>${greeting}</p>
        <p>${mainText}</p>
        <p>Please use the following 6-digit OTP code to authorize your password reset request.</p>
        ${detailsBlock}

        <p>Enter the OTP verification code in the password reset screen:</p>
        <div style="font-size: 28px; font-weight: bold; background: #eff6ff; color: #1d4ed8; border: 1px dashed #bfdbfe; padding: 12px 24px; border-radius: 8px; text-align: center; margin: 24px auto; max-width: 200px; letter-spacing: 0.1em;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #64748b;">This OTP code is valid for 15 minutes. If you did not request a password reset, please ignore this email; your password will remain unchanged.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Best regards,<br/>The ${appName} Team</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${appName} Support" <${process.env.SMTP_USER}>`,
    to,
    subject: companyName ? `Reset Your Password for ${companyName} - ${appName}` : `${appName} Password Reset OTP`,
    html: htmlTemplate,
  });
}

export async function sendUserVerificationEmail(to: string, otp: string, userName: string, companyName: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlTemplate = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
      <div style="max-width: 550px; margin: auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #4e73df; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-top: 0;">🔐 User Account Verification</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>An administrator has requested verification for your user account associated with <strong>${companyName}</strong> on the <strong>${appName}</strong> platform.</p>
        <p>Please use the following 6-digit OTP code to verify your email address and activate your account access.</p>
        
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Verification Context</h4>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Company Name:</strong> ${companyName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>User Name:</strong> ${userName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>User Email:</strong> ${to}</p>
        </div>

        <p>Enter the OTP verification code in the verification screen:</p>
        <div style="font-size: 28px; font-weight: bold; background: #eff6ff; color: #1d4ed8; border: 1px dashed #bfdbfe; padding: 12px 24px; border-radius: 8px; text-align: center; margin: 24px auto; max-width: 200px; letter-spacing: 0.1em;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #64748b;">This OTP code is valid for 15 minutes. If you did not request this, please contact your administrator or ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Best regards,<br/>The ${appName} Team</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${appName} Support" <${process.env.SMTP_USER}>`,
    to,
    subject: `Verify Your Account for ${companyName} - ${appName}`,
    html: htmlTemplate,
  });
}
