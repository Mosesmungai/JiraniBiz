import "server-only";
import nodemailer from "nodemailer";
import { z } from "zod";

type MailConfiguration = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  baseUrl: URL;
};

function mailConfiguration(): MailConfiguration | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM?.trim();
  const rawBaseUrl = process.env.APP_BASE_URL?.trim();
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !from || !rawBaseUrl) {
    return null;
  }
  let baseUrl: URL;
  try {
    baseUrl = new URL(rawBaseUrl);
  } catch {
    return null;
  }
  if (
    !z.string().email().safeParse(from).success ||
    baseUrl.username ||
    baseUrl.password ||
    (baseUrl.protocol !== "https:" && process.env.NODE_ENV === "production")
  ) return null;
  return { host, port, user, password, from, baseUrl };
}

export function isPasswordResetEmailConfigured() {
  return mailConfiguration() !== null;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const config = mailConfiguration();
  if (!config) throw new Error("Password reset email is not configured.");

  const resetUrl = new URL("/reset-password", config.baseUrl);
  resetUrl.searchParams.set("token", token);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.password },
  });
  try {
    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: "Reset your JiraniBiz password",
      text: `Use this one-time link to reset your JiraniBiz password. It expires in 30 minutes:\n\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
    });
  } finally {
    transporter.close();
  }
}
