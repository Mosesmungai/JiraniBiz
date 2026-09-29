import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { BusinessNotFoundError, createLead } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessSlug, businessName, name, phone, message } = body;
    if (!businessSlug || !businessName || !name || !phone || !message) {
      return NextResponse.json({ error: "Missing required lead details." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
    const lead = await createLead({
      businessSlug,
      name,
      phone,
      message,
      customerId: user?.id,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    if (error instanceof BusinessNotFoundError) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    console.error("Lead creation failed", error);
    return NextResponse.json({ error: "Unable to submit request." }, { status: 500 });
  }
}
