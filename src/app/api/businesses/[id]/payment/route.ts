import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { BusinessNotFoundError, NotBusinessOwnerError, submitBusinessPaymentReference } from "@/lib/store";
import { clientRateLimit, userRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, paymentReferenceBodySchema } from "@/lib/request-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ipLimit = await clientRateLimit(request, "business-payment-reference", 10, 60 * 60 * 1000);
    if (ipLimit) return ipLimit;
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const user = token ? await getUserFromSession(token) : null;
    if (!user || user.role !== "business_owner") {
      return NextResponse.json({ error: "Business owner authentication is required." }, { status: 401 });
    }
    const userLimit = await userRateLimit(user.id, "business-payment-reference", 10, 60 * 60 * 1000);
    if (userLimit) return userLimit;

    const parsed = await parseJsonBody(request, paymentReferenceBodySchema);
    if (parsed.response) return parsed.response;

    const { id } = await params;
    const status = await submitBusinessPaymentReference({
      businessId: id,
      ownerId: user.id,
      reference: parsed.data.reference,
    });
    return NextResponse.json({ status });
  } catch (error) {
    if (error instanceof BusinessNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof NotBusinessOwnerError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (
      error instanceof Error &&
      (error.message.includes("payment") ||
        error.message.includes("transaction reference") ||
        error.message.includes("visibility subscription"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Subscription payment reference submission failed", error);
    return NextResponse.json({ error: "Unable to submit the payment reference." }, { status: 500 });
  }
}
