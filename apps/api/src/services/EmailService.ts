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
  /** Shop slug for building paths like /projects/{slug}/... */
  shopSlug: string;
  ticketId: number;
  /** True when appointment was booked with a logged-in customer account (has clientId). */
  hasClientAccount: boolean;
}

let nodemailerTransporter: Transporter | null = null;
let gmailClient: gmail_v1.Gmail | null = null;

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

export async function sendAppointmentReminder(toEmail: string, data: AppointmentReminderData): Promise<boolean> {
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
  const basePath = `/projects/${data.shopSlug}`;
  if (data.hasClientAccount) {
    const manageUrl = `${data.frontendBaseUrl}${basePath}/checkin/confirm`;
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
      return true;
    } catch {
      return false;
    }
  }

  const trans = getNodemailerTransporter();
  if (!trans) return false;

  try {
    await trans.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text: textBody,
    });
    return true;
  } catch {
    return false;
  }
}
