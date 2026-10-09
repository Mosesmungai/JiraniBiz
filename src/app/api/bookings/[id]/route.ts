import { cookies } from "next/headers";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { createBookingItemHandlers } from "@/lib/booking-item-api";
import { clientRateLimit, userRateLimit } from "@/lib/rate-limit";
import { deleteBookingForUser, getBookingForUser, updateBookingForUser } from "@/lib/store";

async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getUserFromSession(token) : null;
}

const handlers = createBookingItemHandlers({
  currentUser,
  getBooking: getBookingForUser,
  updateBooking: updateBookingForUser,
  deleteBooking: deleteBookingForUser,
  clientLimit: clientRateLimit,
  userLimit: userRateLimit,
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
