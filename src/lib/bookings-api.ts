import { NextResponse } from "next/server";
import type { AuthUser } from "@/lib/auth";
import { parseJsonBody, bookingCreateBodySchema } from "@/lib/request-schemas";
import type { Booking } from "@/lib/store";
import { BusinessNotFoundError, ServiceNotFoundError } from "@/lib/store-errors";

type ClientRateLimit = (request: Request, route: string, limit?: number, windowMs?: number) => Promise<NextResponse | null>;
type UserRateLimit = (userId: string, route: string, limit?: number, windowMs?: number) => Promise<NextResponse | null>;

type BookingApiDependencies = {
  currentUser: () => Promise<AuthUser | null>;
  createBooking: (input: {
    businessId: string;
    customerId: string;
    serviceId?: string;
    scheduledAt: string;
    notes: string;
  }) => Promise<Booking>;
  getBookingsForUser: (user: AuthUser) => Promise<Booking[]>;
  clientLimit: ClientRateLimit;
  userLimit: UserRateLimit;
};

export function createBookingCollectionHandlers(dependencies: BookingApiDependencies) {
  return {
    async POST(request: Request) {
      const ipLimit = await dependencies.clientLimit(request, "bookings-create", 20, 60 * 60 * 1000);
      if (ipLimit) return ipLimit;
      const user = await dependencies.currentUser();
      if (!user) return NextResponse.json({ error: "Please sign in before booking." }, { status: 401 });
      const perUserLimit = await dependencies.userLimit(user.id, "bookings-create", 20, 60 * 60 * 1000);
      if (perUserLimit) return perUserLimit;

      const parsed = await parseJsonBody(request, bookingCreateBodySchema);
      if (parsed.response) return parsed.response;
      try {
        const booking = await dependencies.createBooking({
          businessId: parsed.data.businessId,
          customerId: user.id,
          serviceId: parsed.data.serviceId,
          scheduledAt: parsed.data.scheduledAt,
          notes: parsed.data.notes,
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
    },

    async GET(request: Request) {
      const ipLimit = await dependencies.clientLimit(request, "bookings-list");
      if (ipLimit) return ipLimit;
      const user = await dependencies.currentUser();
      if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      const perUserLimit = await dependencies.userLimit(user.id, "bookings-list");
      if (perUserLimit) return perUserLimit;
      return NextResponse.json(await dependencies.getBookingsForUser(user));
    },
  };
}
