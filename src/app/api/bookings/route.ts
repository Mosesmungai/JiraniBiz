import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import {
  BusinessNotFoundError,
  createBooking,
  getBookingsForUser,
  ServiceNotFoundError,
} from "@/lib/store";

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
    if (typeof businessId !== "string" || !businessId || typeof scheduledAt !== "string" || !scheduledAt) {
      return NextResponse.json({ error: "businessId and scheduledAt are required." }, { status: 400 });
    }

    const booking = await createBooking({
      businessId,
      customerId: user.id,
      serviceId: typeof serviceId === "string" && serviceId ? serviceId : undefined,
      scheduledAt,
      notes: String(notes).trim(),
    });
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof BusinessNotFoundError) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    if (error instanceof ServiceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Booking creation failed", error);
    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json(await getBookingsForUser(user));
}
