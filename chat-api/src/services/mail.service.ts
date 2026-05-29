import nodemailer from 'nodemailer';
import { logger } from '../configs/logger';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 465,
  secure: process.env.MAIL_PORT === '465',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: MailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'Bulakustongo <noreply@khabaland.com>',
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
    subject: 'Redifinir minha senha do Bulakustongo',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1a1a">Solicitação de redefinição de senha</h2>
        <p style="color:#555">Hi ${fullName},Recebeu uma solicitacao para redefinir sua senha.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:500">
         Redifinir minha senha
        </a>
        <p style="color:#888;font-size:13px">Esse Link expira em 1 hora.<br>Se nao foi voce, pode ignorar este email.</p>
      </div>
    `,
  });
}

export async function sendPasswordChangedEmail(email: string, fullName: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Sua senha do ChatApp foi alterada',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1a1a">Senha alterada</h2>
        <p style="color:#555">Hi ${fullName}, sua senha foi alterada com sucesso.</p>
        <p style="color:#555">Se isso não foi você, por favor <a href="${process.env.FRONTEND_URL}">entre em contato com o suporte</a> imediatamente.</p>
      </div>
    `,
  });
}