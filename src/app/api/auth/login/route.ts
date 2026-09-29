import { NextResponse } from "next/server";
import { authenticateUser, createSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await authenticateUser(String(body.email ?? ""), String(body.password ?? ""));

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
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 400 });
  }
}
