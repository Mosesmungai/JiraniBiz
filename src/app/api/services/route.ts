import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import {
  BusinessNotFoundError,
  createService,
  getBusinessById,
  getBusinessBySlug,
  getServicesForBusiness,
  NotBusinessOwnerError,
} from "@/lib/store";

async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getUserFromSession(token) : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const businessSlug = searchParams.get("businessSlug");
  if (!businessId && !businessSlug) {
    return NextResponse.json({ error: "businessId or businessSlug is required." }, { status: 400 });
  }

  const business = businessId
    ? await getBusinessById(businessId)
    : await getBusinessBySlug(businessSlug ?? "");
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  return NextResponse.json(await getServicesForBusiness(business.id));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || (user.role !== "business_owner" && user.role !== "admin")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { businessId, name, description = "", price = 0 } = body;
    if (typeof businessId !== "string" || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "businessId and name are required." }, { status: 400 });
    }

    const service = await createService({
      businessId,
      name: name.trim(),
      description: String(description).trim(),
      price: Number(price) || 0,
      user,
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof BusinessNotFoundError) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    if (error instanceof NotBusinessOwnerError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Service creation failed", error);
    return NextResponse.json({ error: "Unable to create service." }, { status: 500 });
  }
}
