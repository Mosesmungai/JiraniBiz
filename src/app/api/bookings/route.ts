import { cookies } from "next/headers";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { createBookingCollectionHandlers } from "@/lib/bookings-api";
import { clientRateLimit, userRateLimit } from "@/lib/rate-limit";
import { createBooking, getBookingsForUser } from "@/lib/store";

async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getUserFromSession(token) : null;
}

const handlers = createBookingCollectionHandlers({
  currentUser,
  createBooking,
  getBookingsForUser,
  clientLimit: clientRateLimit,
  userLimit: userRateLimit,
});

export const POST = handlers.POST;
export const GET = handlers.GET;
