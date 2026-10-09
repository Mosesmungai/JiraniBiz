import { NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";
import { clientRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ipLimit = await clientRateLimit(request, "auth-logout");
  if (ipLimit) return ipLimit;
  if ((await request.text()).trim()) {
    return NextResponse.json({ error: "Logout requests must not include a body." }, { status: 400 });
  }
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.split("=").slice(1).join("=");

  await destroySession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
