import { NextResponse } from "next/server";
import { authenticateUser, createSession, SESSION_COOKIE } from "@/lib/auth";
import { clientAddress, clientRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import { loginBodySchema, parseJsonBody } from "@/lib/request-schemas";

export async function POST(request: Request) {
  const generalLimit = await clientRateLimit(request, "auth-login");
  if (generalLimit) return generalLimit;

  const parsed = await parseJsonBody(request, loginBodySchema);
  if (parsed.response) return parsed.response;
  const ip = clientAddress(request);
  const attemptLimit = await enforceRateLimit("auth-login-attempt", [
    { key: `ip:${ip}`, limit: 20, windowMs: 15 * 60 * 1000 },
    { key: `email-ip:${parsed.data.email.toLowerCase()}:${ip}`, limit: 5, windowMs: 15 * 60 * 1000 },
  ]);
  if (attemptLimit) return attemptLimit;

  try {
    const user = await authenticateUser(parsed.data.email, parsed.data.password);

    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const session = await createSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expiresAt),
    });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    console.error("Login failed", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
