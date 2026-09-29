import { NextResponse } from "next/server";
import { createSession, createUser, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = createUser({
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      phone: body.phone ? String(body.phone) : undefined,
      password: String(body.password ?? ""),
      role: body.role === "business_owner" ? "business_owner" : "customer",
    });

    const session = createSession(user.id);
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
    const message = error instanceof Error ? error.message : "Registration failed";
    const status = message.includes("UNIQUE") ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? "An account with this email already exists" : message }, { status });
  }
}
