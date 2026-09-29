import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { BusinessNotFoundError, NotBusinessOwnerError, submitBusinessPaymentReference } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const user = token ? await getUserFromSession(token) : null;
    if (!user || user.role !== "business_owner") {
      return NextResponse.json({ error: "Business owner authentication is required." }, { status: 401 });
    }

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "A payment reference is required." }, { status: 400 });
    }
    const reference = "reference" in body && typeof body.reference === "string"
      ? body.reference.trim().toUpperCase()
      : "";
    if (!/^[A-Z0-9]{6,32}$/.test(reference)) {
      return NextResponse.json({ error: "Enter a valid mobile-money transaction reference." }, { status: 400 });
    }

    const { id } = await params;
    const status = await submitBusinessPaymentReference({ businessId: id, ownerId: user.id, reference });
    return NextResponse.json({ status });
  } catch (error) {
    if (error instanceof BusinessNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof NotBusinessOwnerError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
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
