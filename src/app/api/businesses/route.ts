import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { isDeviceLocation } from "@/lib/location";
import { createBusiness, getBusinesses } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await getBusinesses());
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);

    if (!user || (user.role !== "business_owner" && user.role !== "admin")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Business details must be an object." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const { name, category, city, area, country, description, phone, email, location } = input;
    if (
      typeof name !== "string" || !name.trim() ||
      typeof category !== "string" || !category.trim() ||
      typeof city !== "string" || !city.trim() ||
      typeof area !== "string" || !area.trim() ||
      typeof description !== "string" || !description.trim() ||
      typeof phone !== "string" || !phone.trim() ||
      typeof email !== "string" || !email.trim()
    ) {
      return NextResponse.json({ error: "Missing required business fields." }, { status: 400 });
    }
    if (country !== "Kenya" && country !== "Uganda" && country !== "Tanzania") {
      return NextResponse.json({ error: "Select a supported country." }, { status: 400 });
    }
    if (!isDeviceLocation(location)) {
      return NextResponse.json({
        error: "A precise device location with reported accuracy of 100 metres or better is required. Retry location capture.",
      }, { status: 400 });
    }

    const created = await createBusiness({
      ownerId: user.role === "business_owner" ? user.id : undefined,
      name, category, city, area,
      country,
      description, phone, email,
      deviceLocation: location,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Business creation failed", error);
    return NextResponse.json({ error: "Unable to create business." }, { status: 500 });
  }
}
