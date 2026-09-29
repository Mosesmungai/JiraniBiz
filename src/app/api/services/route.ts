import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { businessesCollection, servicesCollection } from "@/lib/firestore";

async function requireOwner() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = token ? await getUserFromSession(token) : null;
  if (!user || !["business_owner", "admin"].includes(user.role)) return null;
  return user;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const businessSlug = searchParams.get("businessSlug");
  if (!businessId && !businessSlug) return NextResponse.json({ error: "businessId or businessSlug is required." }, { status: 400 });

  const businessSnapshot = businessId
    ? await businessesCollection().doc(businessId).get()
    : await businessesCollection().where("slug", "==", businessSlug).limit(1).get();
  const businessDoc = "docs" in businessSnapshot ? businessSnapshot.docs[0] : businessSnapshot;
  if (!businessDoc?.exists) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const services = await servicesCollection().where("businessId", "==", businessDoc.id).get();
  return NextResponse.json(services.docs.map((doc) => doc.data()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
}

export async function POST(request: Request) {
  const user = await requireOwner();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body = await request.json();
    const { businessId, name, description = "", price = 0 } = body;
    if (!businessId || !name) return NextResponse.json({ error: "businessId and name are required." }, { status: 400 });

    const businessDoc = await businessesCollection().doc(businessId).get();
    if (!businessDoc.exists) return NextResponse.json({ error: "Business not found." }, { status: 404 });
    const business = businessDoc.data()!;
    if (user.role === "business_owner" && business.ownerId !== user.id) return NextResponse.json({ error: "You do not own this business." }, { status: 403 });

    const id = `service-${crypto.randomUUID()}`;
    const service = { id, businessId, name: String(name).trim(), description: String(description).trim(), price: Number(price) || 0, createdAt: new Date().toISOString() };
    await servicesCollection().doc(id).set(service);
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("Service creation failed", error);
    return NextResponse.json({ error: "Unable to create service." }, { status: 500 });
  }
}
