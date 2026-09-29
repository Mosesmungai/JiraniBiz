import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { bookingsCollection, businessesCollection, servicesCollection } from "@/lib/firestore";

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

    const business = await businessesCollection().doc(businessId).get();
    if (!business.exists) return NextResponse.json({ error: "Business not found." }, { status: 404 });

    if (serviceId) {
      const service = await servicesCollection().doc(serviceId).get();
      if (!service.exists || service.data()?.businessId !== businessId) return NextResponse.json({ error: "Selected service does not belong to this business." }, { status: 400 });
    }

    const id = `booking-${crypto.randomUUID()}`;
    const booking = { id, businessId, customerId: user.id, serviceId: serviceId ?? null, scheduledAt, status: "Requested", notes: String(notes).trim(), createdAt: new Date().toISOString() };
    await bookingsCollection().doc(id).set(booking);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Booking creation failed", error);
    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let snapshot;
  if (user.role === "business_owner") {
    const businesses = await businessesCollection().where("ownerId", "==", user.id).get();
    const ids = businesses.docs.map((doc) => doc.id);
    const results = await Promise.all(ids.map((id) => bookingsCollection().where("businessId", "==", id).get()));
    const rows = results.flatMap((result) => result.docs.map((doc) => doc.data()));
    rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return NextResponse.json(rows);
  }

  snapshot = await bookingsCollection().where("customerId", "==", user.id).get();
  const rows = snapshot.docs.map((doc) => doc.data()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return NextResponse.json(rows);
}
