import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { BusinessNotFoundError, reviewBusiness } from "@/lib/store";
import { clientRateLimit, userRateLimit } from "@/lib/rate-limit";
import { adminReviewBodySchema, parseJsonBody } from "@/lib/request-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ipLimit = await clientRateLimit(request, "admin-business-review", 30, 60 * 60 * 1000);
    if (ipLimit) return ipLimit;
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const user = token ? await getUserFromSession(token) : null;
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    }
    const userLimit = await userRateLimit(user.id, "admin-business-review", 30, 60 * 60 * 1000);
    if (userLimit) return userLimit;

    const parsed = await parseJsonBody(request, adminReviewBodySchema);
    if (parsed.response) return parsed.response;

    const { id } = await params;
    await reviewBusiness({
      businessId: id,
      adminId: user.id,
      action: parsed.data.action,
    });
    return NextResponse.json({ status: "updated" });
  } catch (error) {
    if (error instanceof BusinessNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof Error &&
      (error.message.includes("awaiting review") ||
        error.message.includes("awaiting payment") ||
        error.message.includes("payment record") ||
        error.message.includes("already reviewed") ||
        error.message.includes("does not require subscription") ||
        error.message.includes("active subscription"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Business review action failed", error);
    return NextResponse.json({ error: "Unable to complete the review action." }, { status: 500 });
  }
}
