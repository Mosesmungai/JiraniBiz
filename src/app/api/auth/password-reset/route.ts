import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth";
import { clientAddress, clientRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from "@/lib/password-reset-email";
import { parseJsonBody, passwordResetRequestSchema } from "@/lib/request-schemas";

export async function POST(request: Request) {
  const generalLimit = await clientRateLimit(request, "auth-password-reset");
  if (generalLimit) return generalLimit;

  const parsed = await parseJsonBody(request, passwordResetRequestSchema);
  if (parsed.response) return parsed.response;
  const ip = clientAddress(request);
  const attemptLimit = await enforceRateLimit("auth-password-reset-request", [
    { key: `ip:${ip}`, limit: 10, windowMs: 60 * 60 * 1000 },
    { key: `email:${parsed.data.email.toLowerCase()}`, limit: 3, windowMs: 60 * 60 * 1000 },
  ]);
  if (attemptLimit) return attemptLimit;
  if (!isPasswordResetEmailConfigured()) {
    return NextResponse.json({ error: "Password reset email is not configured on this server." }, { status: 503 });
  }

  let token: string | null;
  try {
    token = await createPasswordResetToken(parsed.data.email);
  } catch (error) {
    console.error("Password reset token creation failed", error);
    return NextResponse.json({ error: "Unable to process the password reset request." }, { status: 500 });
  }

  if (token) {
    try {
      await sendPasswordResetEmail(parsed.data.email, token);
    } catch (error) {
      console.error("Password reset email delivery failed", error);
      return NextResponse.json({ error: "Unable to send a password reset email right now." }, { status: 503 });
    }
  }
  return NextResponse.json({
    message: "If an account exists for that email, a password reset link will be sent.",
  }, { status: 202 });
}
