import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function requireOwner() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = token ? getUserFromSession(token) : null;
  if (!user || !["business_owner", "admin"].includes(user.role)) return null;
  return user;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const businessSlug = searchParams.get("businessSlug");

  if (!businessId && !businessSlug) {
    return NextResponse.json({ error: "businessId or businessSlug is required." }, { status: 400 });
  }

  const db = getDb();
  const business = businessId
    ? db.prepare("SELECT id, owner_id FROM businesses WHERE id = ?").get(businessId) as { id: string; owner_id: string | null } | undefined
    : db.prepare("SELECT id, owner_id FROM businesses WHERE slug = ?").get(businessSlug) as { id: string; owner_id: string | null } | undefined;

  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const services = db.prepare("SELECT id, business_id AS businessId, name, description, price, created_at AS createdAt FROM services WHERE business_id = ? ORDER BY rowid DESC").all(business.id);
  return NextResponse.json(services);
}

export async function POST(request: Request) {
  const user = await requireOwner();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body = await request.json();
    const { businessId, name, description = "", price = 0 } = body;
    if (!businessId || !name) return NextResponse.json({ error: "businessId and name are required." }, { status: 400 });

    const db = getDb();
    const business = db.prepare("SELECT id, owner_id FROM businesses WHERE id = ?").get(businessId) as { id: string; owner_id: string | null } | undefined;
    if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
    if (user.role === "business_owner" && business.owner_id !== user.id) return NextResponse.json({ error: "You do not own this business." }, { status: 403 });

    const id = `service-${crypto.randomUUID()}`;
    db.prepare("INSERT INTO services (id, business_id, name, description, price) VALUES (?, ?, ?, ?, ?)").run(id, businessId, String(name).trim(), String(description).trim(), Number(price) || 0);
    return NextResponse.json({ id, businessId, name: String(name).trim(), description: String(description).trim(), price: Number(price) || 0 }, { status: 201 });
  } catch (error) {
    console.error("Service creation failed", error);
    return NextResponse.json({ error: "Unable to create service." }, { status: 500 });
  }
}
