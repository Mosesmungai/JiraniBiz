import { NextResponse } from "next/server";

import { BusinessNotFoundError, createLead } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessSlug, businessName, name, phone, message } = body;

    if (!businessSlug || !businessName || !name || !phone || !message) {
      return NextResponse.json({ error: "Missing required lead details." }, { status: 400 });
    }

    const lead = await createLead({
      businessSlug,
      name,
      phone,
      message,
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
