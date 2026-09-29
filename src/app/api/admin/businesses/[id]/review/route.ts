import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { BusinessNotFoundError, reviewBusiness } from "@/lib/store";

type ReviewAction = "confirm_payment" | "reject_payment" | "approve_verification" | "reject_verification";

function isReviewAction(value: unknown): value is ReviewAction {
  return value === "confirm_payment" ||
    value === "reject_payment" ||
    value === "approve_verification" ||
    value === "reject_verification";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const user = token ? await getUserFromSession(token) : null;
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    }

    const body: unknown = await request.json();
    const action = typeof body === "object" && body !== null && !Array.isArray(body) && "action" in body
      ? body.action
      : null;
    if (!isReviewAction(action)) {
      return NextResponse.json({ error: "Select a valid review action." }, { status: 400 });
    }

    const { id } = await params;
    await reviewBusiness({
      businessId: id,
      adminId: user.id,
      action,
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
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    console.error("Business review action failed", error);
    return NextResponse.json({ error: "Unable to complete the review action." }, { status: 500 });
  }
}
