import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server";
import {
  businessContactUpdateSchema,
  bookingCreateBodySchema,
  loginBodySchema,
  parseBoundedFormData,
  registerBodySchema,
} from "../src/lib/request-schemas";
import { normalizeWhatsAppNumber, safeWhatsAppLink, whatsappLinkFromNumber } from "../src/lib/business-contact";
import { createBusinessViewHandler } from "../src/lib/business-view-api";
import { emptyDiscoveryPreferences, parseDiscoveryPreferences } from "../src/lib/discovery-preferences";
import { rateLimitExceededResponse } from "../src/lib/rate-limit-response";

test("strict request schemas reject mass-assignment fields", () => {
  assert.equal(loginBodySchema.safeParse({
    email: "user@example.test",
    password: "correct-horse",
    userId: "victim",
  }).success, false);
  assert.equal(registerBodySchema.safeParse({
    name: "User",
    email: "user@example.test",
    password: "correct-horse",
    role: "admin",
  }).success, false);
  assert.equal(bookingCreateBodySchema.safeParse({
    businessId: "business-1",
    scheduledAt: "2030-01-01T10:00:00Z",
    customerId: "victim",
  }).success, false);
});

test("discovery preference records reject unknown nested fields", () => {
  const preferences = emptyDiscoveryPreferences();
  assert.ok(parseDiscoveryPreferences(preferences));
  assert.equal(parseDiscoveryPreferences({
    ...preferences,
    userId: "victim",
  }), null);
});

test("rate limit response includes 429 and a matching Retry-After header", async () => {
  const response = rateLimitExceededResponse(37);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "37");
  assert.deepEqual(await response.json(), {
    error: "Too many requests. Please try again later.",
    retryAfterSeconds: 37,
  });
});

test("multipart parsing enforces the byte limit even without Content-Length", async () => {
  const form = new FormData();
  form.set("name", "Business");
  const request = new Request("http://localhost/api/businesses", {
    method: "POST",
    body: form,
  });

  const parsed = await parseBoundedFormData(request, 1024, "Listing upload");
  assert.ok(parsed.data);
  assert.equal(parsed.data.get("name"), "Business");

  const oversized = await parseBoundedFormData(
    new Request("http://localhost/api/businesses", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x" },
      body: "x".repeat(1025),
    }),
    1024,
    "Listing upload",
  );
  assert.equal(oversized.response?.status, 413);
});

test("business contact links accept international WhatsApp numbers and HTTPS profiles only", () => {
  assert.equal(normalizeWhatsAppNumber("+254 700 123 456"), "+254700123456");
  assert.equal(whatsappLinkFromNumber("+254 700 123 456"), "https://wa.me/254700123456");
  assert.equal(safeWhatsAppLink("https://wa.me/254700123456"), "https://wa.me/254700123456");
  assert.equal(safeWhatsAppLink("https://example.test/254700123456"), null);
  assert.equal(businessContactUpdateSchema.safeParse({
    whatsappNumber: "+254 700 123 456",
    instagram: "https://instagram.com/jiranibiz",
    facebook: "",
    x: "",
    website: "http://example.test",
  }).success, false);
  assert.equal(businessContactUpdateSchema.safeParse({
    whatsappNumber: "+254 700 123 456",
    instagram: "https://instagram.com/jiranibiz",
    facebook: "",
    x: "",
    website: "",
    ownerId: "attacker",
  }).success, false);
});

test("business profile view handler applies limits and records the authenticated viewer context", async () => {
  let allowed = true;
  let recorded: { businessId: string; userId?: string; clientAddress: string } | null = null;
  const handler = createBusinessViewHandler({
    currentUser: async () => ({
      id: "viewer-1",
      name: "Viewer",
      email: "viewer@example.test",
      phone: null,
      role: "customer",
    }),
    clientLimit: async () => allowed ? null : NextResponse.json({}, { status: 429 }),
    recordView: async (businessId, input) => {
      recorded = { businessId, userId: input.userId, clientAddress: input.clientAddress };
    },
  });
  const context = { params: Promise.resolve({ id: "business-1" }) };
  const request = new Request("http://localhost/api/businesses/business-1/views", {
    method: "POST",
    headers: { "x-real-ip": "192.0.2.12", "user-agent": "test-browser" },
  });

  assert.equal((await handler(request, context)).status, 204);
  assert.deepEqual(recorded, {
    businessId: "business-1",
    userId: "viewer-1",
    clientAddress: "192.0.2.12",
  });
  allowed = false;
  assert.equal((await handler(request, context)).status, 429);
});
