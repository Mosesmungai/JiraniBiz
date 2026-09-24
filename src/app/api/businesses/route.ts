import { NextResponse } from "next/server";
import { createBusiness, getBusinesses } from "@/lib/store";

export async function GET() {
  const businesses = await getBusinesses();
  return NextResponse.json(businesses);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, city, area, country, description, phone, email } = body;

    if (!name || !category || !city || !area || !description || !phone || !email) {
      return NextResponse.json({ error: "Missing required business fields." }, { status: 400 });
    }

    const created = await createBusiness({
      name,
      category,
      city,
      area,
      country: country === "Uganda" || country === "Tanzania" ? country : "Kenya",
      description,
      phone,
      email,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Business creation failed", error);
    return NextResponse.json({ error: "Unable to create business." }, { status: 500 });
  }
}

