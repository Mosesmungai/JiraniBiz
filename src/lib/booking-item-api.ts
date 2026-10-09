import { NextResponse } from "next/server";
import type { AuthUser } from "@/lib/auth";
import {
  BookingNotFoundError,
  BookingPermissionError,
  BookingStateConflictError,
} from "@/lib/store-errors";
import { bookingUpdateBodySchema, parseJsonBody } from "@/lib/request-schemas";
import type { Booking } from "@/lib/store";

type ClientRateLimit = (request: Request, route: string, limit?: number, windowMs?: number) => Promise<NextResponse | null>;
type UserRateLimit = (userId: string, route: string, limit?: number, windowMs?: number) => Promise<NextResponse | null>;

type BookingItemDependencies = {
  currentUser: () => Promise<AuthUser | null>;
  getBooking: (id: string, user: AuthUser) => Promise<Booking>;
  updateBooking: (
    id: string,
    user: AuthUser,
    changes: { scheduledAt?: string; notes?: string; status?: Booking["status"] },
  ) => Promise<Booking>;
  deleteBooking: (id: string, user: AuthUser) => Promise<void>;
  clientLimit: ClientRateLimit;
  userLimit: UserRateLimit;
};

type BookingItemContext = { params: Promise<{ id: string }> };

function failureResponse(error: unknown) {
  if (error instanceof BookingNotFoundError) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (error instanceof BookingPermissionError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof BookingStateConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  console.error("Booking item action failed", error);
  return NextResponse.json({ error: "Unable to complete the booking action." }, { status: 500 });
}

export function createBookingItemHandlers(dependencies: BookingItemDependencies) {
  async function authorize(request: Request, operation: string): Promise<AuthUser | NextResponse> {
    const ipLimit = await dependencies.clientLimit(request, `booking-item-${operation}`, 30, 60 * 60 * 1000);
    if (ipLimit) return ipLimit;
    const user = await dependencies.currentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const perUserLimit = await dependencies.userLimit(user.id, `booking-item-${operation}`, 30, 60 * 60 * 1000);
    return perUserLimit ?? user;
  }

  return {
    async GET(request: Request, { params }: BookingItemContext) {
      const auth = await authorize(request, "read");
      if (auth instanceof Response) return auth;
      const { id } = await params;
      try {
        return NextResponse.json(await dependencies.getBooking(id, auth), {
          headers: { "Cache-Control": "private, no-store" },
        });
      } catch (error) {
        return failureResponse(error);
      }
    },

    async PATCH(request: Request, { params }: BookingItemContext) {
      const auth = await authorize(request, "update");
      if (auth instanceof Response) return auth;
      const parsed = await parseJsonBody(request, bookingUpdateBodySchema);
      if (parsed.response) return parsed.response;
      const { id } = await params;
      try {
        return NextResponse.json(await dependencies.updateBooking(id, auth, parsed.data), {
          headers: { "Cache-Control": "private, no-store" },
        });
      } catch (error) {
        return failureResponse(error);
      }
    },

    async DELETE(request: Request, { params }: BookingItemContext) {
      const auth = await authorize(request, "delete");
      if (auth instanceof Response) return auth;
      let body: string;
      try {
        body = await request.text();
      } catch {
        return NextResponse.json({ error: "Unable to read request body." }, { status: 400 });
      }
      if (body.trim()) return NextResponse.json({ error: "DELETE requests must not include a body." }, { status: 400 });
      const { id } = await params;
      try {
        await dependencies.deleteBooking(id, auth);
        return new Response(null, { status: 204 });
      } catch (error) {
        return failureResponse(error);
      }
    },
  };
}
