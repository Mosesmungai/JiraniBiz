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
import { clientRateLimit, userRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, serviceCreateBodySchema } from "@/lib/request-schemas";

async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getUserFromSession(token) : null;
}

export async function GET(request: Request) {
  const ipLimit = await clientRateLimit(request, "services-list");
  if (ipLimit) return ipLimit;
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
  const ipLimit = await clientRateLimit(request, "services-create", 20, 60 * 60 * 1000);
  if (ipLimit) return ipLimit;
  const user = await currentUser();
  if (!user || (user.role !== "business_owner" && user.role !== "admin")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const userLimit = await userRateLimit(user.id, "services-create", 20, 60 * 60 * 1000);
  if (userLimit) return userLimit;

  const parsed = await parseJsonBody(request, serviceCreateBodySchema);
  if (parsed.response) return parsed.response;
  try {
    const service = await createService({
      businessId: parsed.data.businessId,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
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
