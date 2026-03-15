import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';

export interface AppointmentReminderData {
  shopName: string;
  serviceName: string;
  scheduledAt: Date;
  barberName?: string | null;
  address?: string | null;
  /** Frontend base URL (e.g. CORS_ORIGIN). No trailing slash. */
  frontendBaseUrl: string;
  /** Shop slug for building paths. */
  shopSlug: string;
  /** Frontend path for this shop (e.g. /mineiro). If not set, uses /{shopSlug}. */
  shopPath?: string;
  ticketId: number;
  /** True when appointment was booked with a logged-in customer account (has clientId). */
  hasClientAccount: boolean;
}

let nodemailerTransporter: Transporter | null = null;
let gmailClient: gmail_v1.Gmail | null = null;
let noTransportLogged = false;

function logIfNoTransport(): void {
  if (noTransportLogged) return;
  noTransportLogged = true;
  console.error(
    '[EmailService] No transport configured. Set GMAIL_USER + GMAIL_APP_PASSWORD or GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GMAIL_REFRESH_TOKEN (run apps/api/scripts/get-gmail-refresh-token.ts after changing OAuth credentials).'
  );
}

/** Clear cached Gmail client so next send uses fresh env (e.g. after updating GMAIL_REFRESH_TOKEN). */
function clearGmailClient(): void {
  gmailClient = null;
}

function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const o = err as Record<string, unknown>;
  const code = typeof o.code === 'number' ? o.code : undefined;
  const status = typeof o.status === 'number' ? o.status : undefined;
  const responseStatus = o.response && typeof o.response === 'object' && typeof (o.response as { status?: number }).status === 'number'
    ? (o.response as { status: number }).status
    : undefined;
  const n = code ?? status ?? responseStatus ?? 0;
  return n === 401 || n === 403;
}

function getNodemailerTransporter(): Transporter | null {
  if (nodemailerTransporter) return nodemailerTransporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  nodemailerTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });
  return nodemailerTransporter;
}

function getGmailClient(): gmail_v1.Gmail | null {
  if (gmailClient) return gmailClient;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
  return gmailClient;
}

function buildMessage(toEmail: string, subject: string, textBody: string, fromEmail: string): string {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
  const lines = [
    `From: ${fromEmail}`,
    `To: ${toEmail}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    textBody,
  ];
  return lines.join('\r\n');
}

function toBase64Url(message: string): string {
  return Buffer.from(message, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export type SendAppointmentReminderResult = { sent: true } | { sent: false; error: string };

export async function sendAppointmentReminder(toEmail: string, data: AppointmentReminderData): Promise<SendAppointmentReminderResult> {
  const fromEmail = process.env.GMAIL_USER ?? 'eutonafila@gmail.com';
  const dateStr = data.scheduledAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const lines: string[] = [
    `Olá,`,
    ``,
    `Lembrete do seu agendamento em ${data.shopName}.`,
    ``,
    `Serviço: ${data.serviceName}`,
    `Data e hora: ${dateStr}`,
  ];
  if (data.barberName) lines.push(`Barbeiro: ${data.barberName}`);
  if (data.address) {
    lines.push(``, `Endereço: ${data.address.replace(/\n/g, ', ')}`);
  }
  const basePath = (data.shopPath ?? `/${data.shopSlug}`).replace(/\/+$/, '');
  if (data.hasClientAccount) {
    const manageUrl = `${data.frontendBaseUrl}${basePath}/account`;
    lines.push(``, `Gerencie seus agendamentos e faça check-in quando chegar:`, `${manageUrl}`, ``);
  } else {
    const statusUrl = `${data.frontendBaseUrl}${basePath}/status/${data.ticketId}`;
    lines.push(``, `Acesse o status do seu agendamento e faça check-in quando chegar:`, `${statusUrl}`, ``);
  }
  lines.push(`Até lá.`);

  const textBody = lines.join('\n');
  const subject = `Lembrete: agendamento em ${data.shopName} - ${dateStr}`;

  const gmail = getGmailClient();
  if (gmail) {
    try {
      const raw = toBase64Url(buildMessage(toEmail, subject, textBody, fromEmail));
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });
      return { sent: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EmailService] sendAppointmentReminder (Gmail) failed:', msg);
      if (err instanceof Error && err.stack) console.error(err.stack);
      if (isAuthError(err)) clearGmailClient();
      return { sent: false, error: msg };
    }
  }

  const trans = getNodemailerTransporter();
  if (!trans) {
    return {
      sent: false,
      error: 'Email not configured. Set GMAIL_USER + GMAIL_APP_PASSWORD or GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GMAIL_REFRESH_TOKEN.',
    };
  }

  try {
    await trans.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text: textBody,
    });
    return { sent: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] sendAppointmentReminder (Nodemailer) failed:', msg);
    return { sent: false, error: msg };
  }
}

export interface PasswordResetEmailData {
  shopName: string;
  resetLink: string;
}

export async function sendPasswordResetEmail(toEmail: string, data: PasswordResetEmailData): Promise<boolean> {
  const fromEmail = process.env.GMAIL_USER ?? 'eutonafila@gmail.com';
  const subject = `Redefinir senha - ${data.shopName}`;
  const textBody = [
    'Você solicitou a redefinição de senha.',
    '',
    `Clique no link abaixo para definir uma nova senha (válido por 1 hora):`,
    '',
    data.resetLink,
    '',
    'Se você não solicitou isso, ignore este e-mail.',
  ].join('\n');

  const gmail = getGmailClient();
  if (gmail) {
    try {
      const raw = toBase64Url(buildMessage(toEmail, subject, textBody, fromEmail));
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EmailService] sendPasswordResetEmail (Gmail) failed:', msg);
      if (err instanceof Error && err.stack) console.error(err.stack);
      if (isAuthError(err)) clearGmailClient();
      return false;
    }
  }

  const trans = getNodemailerTransporter();
  if (!trans) {
    logIfNoTransport();
    return false;
  }

  try {
    await trans.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text: textBody,
    });
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] sendPasswordResetEmail (Nodemailer) failed:', msg);
    if (err instanceof Error && err.stack) console.error(err.stack);
    return false;
  }
}

/** Optional reminder to company admin when a new Propagandas ad is submitted (paid + image uploaded). */
export async function sendAdOrderReminderToAdmin(
  toEmail: string,
  data: { advertiserName: string; orderId: number; adsManagementUrl: string }
): Promise<boolean> {
  const fromEmail = process.env.GMAIL_USER ?? 'eutonafila@gmail.com';
  const subject = `Propagandas: nova propaganda aguardando aprovação #${data.orderId}`;
  const textBody = [
    'Uma nova propaganda foi enviada e está aguardando sua aprovação.',
    '',
    `Anunciante: ${data.advertiserName}`,
    `Pedido: #${data.orderId}`,
    '',
    `Aprove ou rejeite no painel: ${data.adsManagementUrl}`,
  ].join('\n');

  const gmail = getGmailClient();
  if (gmail) {
    try {
      const raw = toBase64Url(buildMessage(toEmail, subject, textBody, fromEmail));
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EmailService] sendAdOrderReminderToAdmin (Gmail) failed:', msg);
      if (err instanceof Error && err.stack) console.error(err.stack);
      if (isAuthError(err)) clearGmailClient();
      return false;
    }
  }

  const trans = getNodemailerTransporter();
  if (!trans) {
    logIfNoTransport();
    return false;
  }

  try {
    await trans.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text: textBody,
    });
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] sendAdOrderReminderToAdmin (Nodemailer) failed:', msg);
    if (err instanceof Error && err.stack) console.error(err.stack);
    return false;
  }
}

/** Returns true if at least one email transport (Gmail API or Nodemailer) is configured. */
export function isEmailConfigured(): boolean {
  return getGmailClient() !== null || getNodemailerTransporter() !== null;
}

/** Which transport would be used, based on env (no side effects). */
export function getEmailTransportKind(): 'gmail' | 'nodemailer' | null {
  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  ) {
    return 'gmail';
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return 'nodemailer';
  }
  return null;
}

/**
 * Send a minimal test email. Use for isolating email failures.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function sendTestEmail(to: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const fromEmail = process.env.GMAIL_USER ?? 'eutonafila@gmail.com';
  const subject = 'Email test – Eu to na Fila';
  const textBody = `This is a test email sent at ${new Date().toISOString()}. If you received it, email is working.`;

  const gmail = getGmailClient();
  if (gmail) {
    try {
      const raw = toBase64Url(buildMessage(to, subject, textBody, fromEmail));
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isAuthError(err)) clearGmailClient();
      return { ok: false, error: msg };
    }
  }

  const trans = getNodemailerTransporter();
  if (!trans) {
    return {
      ok: false,
      error: 'No transport. Set GMAIL_USER+GMAIL_APP_PASSWORD or GOOGLE_CLIENT_ID+GOOGLE_CLIENT_SECRET+GMAIL_REFRESH_TOKEN.',
    };
  }

  try {
    await trans.sendMail({ from: fromEmail, to, subject, text: textBody });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
