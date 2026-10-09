import assert from "node:assert/strict";
import { test } from "node:test";
import type { AuthUser } from "../src/lib/auth";
import { createBookingCollectionHandlers } from "../src/lib/bookings-api";
import { createBookingItemHandlers } from "../src/lib/booking-item-api";
import { getBookingAccessRole } from "../src/lib/booking-access";
import {
  BookingNotFoundError,
  BookingPermissionError,
  BookingStateConflictError,
} from "../src/lib/store-errors";
import type { Booking } from "../src/lib/store";

const userA: AuthUser = {
  id: "user-a",
  name: "User A",
  email: "a@example.test",
  phone: null,
  role: "customer",
};
const userB: AuthUser = {
  id: "user-b",
  name: "User B",
  email: "b@example.test",
  phone: null,
  role: "customer",
};

test("a booking created by user A is not readable, updateable, or deletable by user B", async () => {
  let activeUser: AuthUser = userA;
  const records = new Map<string, Booking>();
  let nextId = 0;
  const noClientLimit = async () => null;
  const noUserLimit = async () => null;
  const collectionHandlers = createBookingCollectionHandlers({
    currentUser: async () => activeUser,
    clientLimit: noClientLimit,
    userLimit: noUserLimit,
    createBooking: async (input) => {
      const booking: Booking = {
        id: `booking-${++nextId}`,
        businessId: input.businessId,
        customerId: input.customerId,
        serviceId: input.serviceId ?? null,
        scheduledAt: input.scheduledAt,
        status: "Requested",
        notes: input.notes,
        createdAt: new Date().toISOString(),
      };
      records.set(booking.id, booking);
      return booking;
    },
    getBookingsForUser: async (user) =>
      [...records.values()].filter((booking) => booking.customerId === user.id),
  });
  const createdResponse = await collectionHandlers.POST(new Request("http://localhost/api/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      businessId: "business-1",
      scheduledAt: "2030-01-01T10:00:00Z",
      notes: "Please call first",
    }),
  }));
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json() as Booking;
  assert.equal(created.customerId, userA.id);

  const itemHandlers = createBookingItemHandlers({
    currentUser: async () => activeUser,
    clientLimit: noClientLimit,
    userLimit: noUserLimit,
    getBooking: async (id, user) => {
      const booking = records.get(id);
      if (!booking || !getBookingAccessRole(booking, user)) throw new BookingNotFoundError();
      return booking;
    },
    updateBooking: async (id, user, changes) => {
      const booking = records.get(id);
      if (!booking || !getBookingAccessRole(booking, user)) throw new BookingNotFoundError();
      if (user.role !== "admin" && user.role !== "business_owner") {
        if (changes.status !== undefined) throw new BookingPermissionError();
        if (booking.status !== "Requested") throw new BookingStateConflictError("Only requested bookings can be rescheduled.");
      }
      const updated = { ...booking, ...changes };
      records.set(id, updated);
      return updated;
    },
    deleteBooking: async (id, user) => {
      const booking = records.get(id);
      if (!booking || !getBookingAccessRole(booking, user)) throw new BookingNotFoundError();
      if (booking.status !== "Requested") throw new BookingStateConflictError("Only requested bookings can be deleted.");
      records.delete(id);
    },
  });
  const context = { params: Promise.resolve({ id: created.id }) };
  activeUser = userB;

  const readResponse = await itemHandlers.GET(new Request(`http://localhost/api/bookings/${created.id}`), context);
  const updateResponse = await itemHandlers.PATCH(new Request(`http://localhost/api/bookings/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ notes: "Changed by another user" }),
  }), context);
  const deleteResponse = await itemHandlers.DELETE(new Request(`http://localhost/api/bookings/${created.id}`, {
    method: "DELETE",
  }), context);

  assert.equal(readResponse.status, 404);
  assert.equal(updateResponse.status, 404);
  assert.equal(deleteResponse.status, 404);
  assert.deepEqual(
    [readResponse.status, updateResponse.status, deleteResponse.status],
    [404, 404, 404],
  );
});
