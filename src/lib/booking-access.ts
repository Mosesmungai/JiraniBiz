import type { AuthUser } from "@/lib/auth";
import type { Booking } from "@/lib/store";

export type BookingAccessRole = "customer" | "business_owner" | "admin";

export function getBookingAccessRole(
  booking: Pick<Booking, "customerId">,
  user: AuthUser,
  businessOwnerId?: string,
): BookingAccessRole | null {
  if (user.role === "admin") return "admin";
  if (booking.customerId === user.id) return "customer";
  if (user.role === "business_owner" && businessOwnerId === user.id) return "business_owner";
  return null;
}
