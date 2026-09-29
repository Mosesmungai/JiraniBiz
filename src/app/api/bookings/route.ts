import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getUserFromSession(token) : null;
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in before booking." }, { status: 401 });

  try {
    const body = await request.json();
    const { businessId, serviceId, scheduledAt, notes = "" } = body;
    if (!businessId || !scheduledAt) return NextResponse.json({ error: "businessId and scheduledAt are required." }, { status: 400 });

    const db = getDb();
    const business = db.prepare("SELECT id FROM businesses WHERE id = ?").get(businessId) as { id: string } | undefined;
    if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

    if (serviceId) {
      const service = db.prepare("SELECT id FROM services WHERE id = ? AND business_id = ?").get(serviceId, businessId);
      if (!service) return NextResponse.json({ error: "Selected service does not belong to this business." }, { status: 400 });
    }

    const id = `booking-${crypto.randomUUID()}`;
    db.prepare("INSERT INTO bookings (id, business_id, customer_id, service_id, scheduled_at, status, notes) VALUES (?, ?, ?, ?, ?, 'Requested', ?)").run(id, businessId, user.id, serviceId ?? null, scheduledAt, String(notes).trim());
    return NextResponse.json({ id, businessId, customerId: user.id, serviceId: serviceId ?? null, scheduledAt, status: "Requested", notes: String(notes).trim() }, { status: 201 });
  } catch (error) {
    console.error("Booking creation failed", error);
    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const db = getDb();
  const rows = user.role === "business_owner"
    ? db.prepare(`SELECT bk.id, bk.business_id AS businessId, bk.customer_id AS customerId, bk.service_id AS serviceId, bk.scheduled_at AS scheduledAt, bk.status, bk.notes, bk.created_at AS createdAt FROM bookings bk JOIN businesses b ON b.id = bk.business_id WHERE b.owner_id = ? ORDER BY bk.created_at DESC`).all(user.id)
    : db.prepare("SELECT id, business_id AS businessId, customer_id AS customerId, service_id AS serviceId, scheduled_at AS scheduledAt, status, notes, created_at AS createdAt FROM bookings WHERE customer_id = ? ORDER BY created_at DESC").all(user.id);

  return NextResponse.json(rows);
}
