import { createHash, randomBytes } from 'crypto';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../config/env';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export interface VerificationToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordResetToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

const requireEnvValue = (name: 'AWS_REGION' | 'AWS_ACCESS_KEY_ID' | 'AWS_SECRET_ACCESS_KEY' | 'SES_FROM_EMAIL') => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured to send verification emails`);
  return value;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]!));

export const hashEmailVerificationToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const createEmailVerificationToken = (): VerificationToken => {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  };
};

export const createPasswordResetToken = (): PasswordResetToken => {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  };
};

export const hashPasswordResetToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

class SesEmailService {
  private client?: SESClient;

  private getClient(): SESClient {
    if (!this.client) {
      this.client = new SESClient({
        region: requireEnvValue('AWS_REGION'),
        credentials: {
          accessKeyId: requireEnvValue('AWS_ACCESS_KEY_ID'),
          secretAccessKey: requireEnvValue('AWS_SECRET_ACCESS_KEY'),
        },
      });
    }
    return this.client;
  }

  async sendVerificationEmail({ to, name, verificationUrl }: {
    to: string;
    name: string;
    verificationUrl: string;
  }): Promise<void> {
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(verificationUrl);
    const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#1f2937;"><main style="max-width:600px;margin:32px auto;background:#fff;padding:40px;border-radius:12px;"><h1 style="margin:0 0 16px;color:#111827;">Welcome to JobFix</h1><p>Hi ${safeName},</p><p>Please verify your email address to finish setting up your JobFix account.</p><p style="margin:28px 0;"><a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Verify Email</a></p><p>This verification link expires in 24 hours.</p><p style="font-size:13px;color:#6b7280;word-break:break-all;">If the button does not work, copy and paste this URL into your browser:<br><a href="${safeUrl}">${safeUrl}</a></p></main></body></html>`;

    await this.getClient().send(new SendEmailCommand({
      Source: requireEnvValue('SES_FROM_EMAIL'),
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: 'Verify your JobFix email address', Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: `Welcome to JobFix, ${name}. Verify your email within 24 hours: ${verificationUrl}`, Charset: 'UTF-8' },
        },
      },
    }));
  }

  async sendPasswordResetEmail({ to, name, resetUrl }: {
    to: string;
    name: string;
    resetUrl: string;
  }): Promise<void> {
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(resetUrl);
    const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#1f2937;"><main style="max-width:600px;margin:32px auto;background:#fff;padding:40px;border-radius:12px;"><h1 style="margin:0 0 16px;color:#111827;">Reset your JobFix password</h1><p>Hi ${safeName},</p><p>We received a request to reset your JobFix password.</p><p style="margin:28px 0;"><a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a></p><p>This password-reset link expires in 30 minutes. If you did not request it, you can safely ignore this email.</p><p style="font-size:13px;color:#6b7280;word-break:break-all;">If the button does not work, copy and paste this URL into your browser:<br><a href="${safeUrl}">${safeUrl}</a></p></main></body></html>`;

    await this.getClient().send(new SendEmailCommand({
      Source: requireEnvValue('SES_FROM_EMAIL'),
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: 'Reset your JobFix password', Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: `Reset your JobFix password within 30 minutes: ${resetUrl}`, Charset: 'UTF-8' },
        },
      },
    }));
  }
}

export const emailService = new SesEmailService();
