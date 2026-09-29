import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
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

    const body = await request.json();
    const { name, category, city, area, country, description, phone, email } = body;
    if (!name || !category || !city || !area || !description || !phone || !email) return NextResponse.json({ error: "Missing required business fields." }, { status: 400 });

    const created = await createBusiness({
      ownerId: user.role === "business_owner" ? user.id : undefined,
      name, category, city, area,
      country: country === "Uganda" || country === "Tanzania" ? country : "Kenya",
      description, phone, email,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Business creation failed", error);
    return NextResponse.json({ error: "Unable to create business." }, { status: 500 });
  }
}
