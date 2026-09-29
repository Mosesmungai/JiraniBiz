import { NextResponse } from "next/server";
import { createSession, createUser, DuplicateEmailError, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await createUser({
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      phone: body.phone ? String(body.phone) : undefined,
      password: String(body.password ?? ""),
      role: body.role === "business_owner" ? "business_owner" : "customer",
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
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
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
