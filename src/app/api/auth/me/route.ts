import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { clientRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ipLimit = await clientRateLimit(request, "auth-me");
  if (ipLimit) return ipLimit;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = await getUserFromSession(token);

  if (!user) return NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  return NextResponse.json({ user }, { headers: { "Cache-Control": "private, no-store" } });
}
