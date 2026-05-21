import nodemailer from 'nodemailer';
import { logger } from '../configs/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: MailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'ChatApp <no-reply@chatapp.com>',
    ...options,
  });
  logger.info(`Email sent to ${options.to}: ${options.subject}`);
}

export async function sendPasswordResetEmail(
  email: string,
  fullName: string,
  resetUrl: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Reset your ChatApp password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1a1a">Password reset request</h2>
        <p style="color:#555">Hi ${fullName}, we received a request to reset your password.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:500">
          Reset my password
        </a>
        <p style="color:#888;font-size:13px">This link expires in 1 hour.<br>If you did not request a reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordChangedEmail(email: string, fullName: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Your ChatApp password was changed',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1a1a">Password changed</h2>
        <p style="color:#555">Hi ${fullName}, your password was successfully changed.</p>
        <p style="color:#555">If this wasn't you, please <a href="${process.env.FRONTEND_URL}/contact">contact support</a> immediately.</p>
      </div>
    `,
  });
}