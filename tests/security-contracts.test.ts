import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookingCreateBodySchema,
  loginBodySchema,
  parseBoundedFormData,
  registerBodySchema,
} from "../src/lib/request-schemas";
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
