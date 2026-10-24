import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

async function sendConsole(message: MailMessage) {
  const dir = path.join(process.cwd(), ".data", "mail");
  await mkdir(dir, { recursive: true });
  const entry = [
    `--- ${new Date().toISOString()} ---`,
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    "",
    message.text,
    "",
  ].join("\n");
  await appendFile(path.join(dir, "outbox.log"), entry);
  if (!env.isProd) {
    console.info(`[mail] to=${message.to} subject="${message.subject}" (see .data/mail/outbox.log)`);
  }
}

async function sendSmtp(message: MailMessage) {
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
  });
  await transport.sendMail({
    from: env.emailFrom,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

export async function sendMail(message: MailMessage) {
  if (env.emailDriver === "smtp") {
    await sendSmtp(message);
    return;
  }
  await sendConsole(message);
}

export function inviteEmail(params: { name?: string | null; role: string; url: string }) {
  return {
    subject: "You are invited to The Varsity Pilot editorial workspace",
    text: [
      `Hello${params.name ? ` ${params.name}` : ""},`,
      "",
      "You have been invited to The Varsity Pilot editorial workspace for the Department of Communication and Media Studies.",
      `Role: ${params.role}`,
      "",
      `Accept the invitation and set your password: ${params.url}`,
      "",
      "This link expires in 7 days. If you were not expecting this message, you can ignore it.",
    ].join("\n"),
  };
}

export function resetPasswordEmail(params: { name?: string | null; url: string }) {
  return {
    subject: "Reset your Varsity Pilot workspace password",
    text: [
      `Hello${params.name ? ` ${params.name}` : ""},`,
      "",
      "A password reset was requested for your account.",
      `Reset it here: ${params.url}`,
      "",
      "The link expires in one hour. If you did not request a reset, no action is needed.",
    ].join("\n"),
  };
}

export function verifyEmail(params: { name?: string | null; url: string }) {
  return {
    subject: "Verify your Varsity Pilot workspace email",
    text: [
      `Hello${params.name ? ` ${params.name}` : ""},`,
      "",
      "Please verify the email address on your editorial workspace account.",
      `Verify: ${params.url}`,
      "",
      "The link expires in 24 hours.",
    ].join("\n"),
  };
}
