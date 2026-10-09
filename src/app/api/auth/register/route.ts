import { NextResponse } from "next/server";
import { createSession, createUser, DuplicateEmailError, SESSION_COOKIE } from "@/lib/auth";
import { clientAddress, clientRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, registerBodySchema } from "@/lib/request-schemas";

export async function POST(request: Request) {
  const generalLimit = await clientRateLimit(request, "auth-register");
  if (generalLimit) return generalLimit;

  const parsed = await parseJsonBody(request, registerBodySchema);
  if (parsed.response) return parsed.response;
  const ip = clientAddress(request);
  const attemptLimit = await enforceRateLimit("auth-register-attempt", [
    { key: `ip:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 },
    { key: `email:${parsed.data.email.toLowerCase()}`, limit: 3, windowMs: 24 * 60 * 60 * 1000 },
  ]);
  if (attemptLimit) return attemptLimit;

  try {
    const user = await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
      role: parsed.data.role,
    });

    const session = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expiresAt),
    });
    return response;
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && (error.message === "Name and email are required" || error.message === "Password must be at least 8 characters")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
