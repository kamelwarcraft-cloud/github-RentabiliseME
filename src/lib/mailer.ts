import nodemailer from "nodemailer";
import { inviteEmailTemplate } from "@/lib/emails/inviteEmail";


type Mail = { to: string; subject: string; text: string; html?: string };

function mailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(mail: Mail) {
  // Si SMTP non configuré: fallback console (utile en dev)
  if (!mailEnabled()) {
    console.log("[MAIL][DEV]", { to: mail.to, subject: mail.subject, text: mail.text });
    return { ok: true, mocked: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: (process.env.SMTP_SECURE ?? "0") === "1",
    ...(process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "0"
      ? { tls: { rejectUnauthorized: false } }
      : {}),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from = process.env.MAIL_FROM || process.env.SMTP_USER!;
  await transporter.sendMail({
    from,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    ...(mail.html ? { html: mail.html } : {}),
  });

  return { ok: true, mocked: false };
}

export function publicBaseUrl(req?: Request) {
  const env = process.env.PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  if (!req) return "";
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost";
  return `${proto}://${host}`;
}

export async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  invitedBy?: string;
  companyName?: string;
  role: "MANAGER" | "WORKER";
}) {
  const { subject, html, text } = inviteEmailTemplate({
    inviteUrl: params.inviteUrl,
    invitedBy: params.invitedBy,
    companyName: params.companyName,
    role: params.role,
  });

  return sendMail({
    to: params.to,
    subject,
    text,
    html,
  });
}
