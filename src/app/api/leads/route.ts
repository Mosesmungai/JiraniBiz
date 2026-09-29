import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { createLead } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessSlug, businessName, name, phone, message } = body;
    if (!businessSlug || !businessName || !name || !phone || !message) return NextResponse.json({ error: "Missing required lead details." }, { status: 400 });

    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const user = token ? await getUserFromSession(token) : null;
    const lead = await createLead({ businessSlug, name, phone, message, customerId: user?.id });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Lead creation failed", error);
    return NextResponse.json({ error: "Unable to submit request." }, { status: 500 });
  }
}
