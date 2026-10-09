import { NextResponse } from "next/server";
import { completePasswordReset } from "@/lib/auth";
import { clientAddress, clientRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, passwordResetConfirmSchema } from "@/lib/request-schemas";

export async function POST(request: Request) {
  const generalLimit = await clientRateLimit(request, "auth-password-reset-confirm");
  if (generalLimit) return generalLimit;

  const parsed = await parseJsonBody(request, passwordResetConfirmSchema);
  if (parsed.response) return parsed.response;
  const attemptLimit = await enforceRateLimit("auth-password-reset-confirm", [
    { key: `ip:${clientAddress(request)}`, limit: 20, windowMs: 15 * 60 * 1000 },
    { key: `token:${parsed.data.token}`, limit: 5, windowMs: 15 * 60 * 1000 },
  ]);
  if (attemptLimit) return attemptLimit;

  try {
    const completed = await completePasswordReset(parsed.data.token, parsed.data.password);
    if (!completed) {
      return NextResponse.json({ error: "This password reset link is invalid or expired." }, { status: 400 });
    }
    return NextResponse.json({ message: "Password reset successfully. Sign in with your new password." });
  } catch (error) {
    console.error("Password reset confirmation failed", error);
    return NextResponse.json({ error: "Unable to reset the password." }, { status: 500 });
  }
}
