import { NextResponse } from "next/server";

import { createLead } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessSlug, businessName, name, phone, message } = body;

    if (!businessSlug || !businessName || !name || !phone || !message) {
      return NextResponse.json({ error: "Missing required lead details." }, { status: 400 });
    }

    const lead = await createLead({
      businessSlug,
      businessName,
      name,
      phone,
      message,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Lead creation failed", error);
    return NextResponse.json({ error: "Unable to submit request." }, { status: 500 });
  }
}
