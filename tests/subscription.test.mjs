import test from "node:test";
import assert from "node:assert/strict";
import {
  createPendingSubscription,
  createTrialSubscription,
  addSubscriptionMonth,
  getTopHundredPromotions,
  isSubscriptionEntitled,
  isSubscriptionPlanId,
  MAX_PROMOTED_LISTINGS_PER_SCOPE,
  promotionScopeKey,
  SUBSCRIPTION_PLANS,
  TRIAL_DAYS,
} from "../src/lib/subscription.ts";

test("visibility plans use the configured monthly KES prices", () => {
  assert.deepEqual(
    Object.values(SUBSCRIPTION_PLANS).map(({ id, monthlyPriceKsh }) => [id, monthlyPriceKsh]),
    [["area", 500], ["region", 1000], ["country", 2000]],
  );
});

test("a selected plan trial lasts seven days and is initially entitled", () => {
  const now = new Date("2026-09-30T00:00:00.000Z");
  const subscription = createTrialSubscription("region", "Coast", now);
  assert.equal(TRIAL_DAYS, 7);
  assert.equal(Date.parse(subscription.expiresAt) - Date.parse(subscription.startedAt), 7 * 24 * 60 * 60 * 1000);
  assert.equal(subscription.status, "trialing");
  assert.equal(subscription.region, "Coast");
  assert.equal(isSubscriptionEntitled(subscription, now), true);
});

test("pending payment never grants paid visibility", () => {
  const now = new Date("2026-09-30T00:00:00.000Z");
  const subscription = createPendingSubscription("country", undefined, now);
  assert.equal(subscription.monthlyPriceKsh, 2000);
  assert.equal(isSubscriptionEntitled(subscription, now), false);
});

test("subscription expiry and terminal statuses remove visibility", () => {
  const now = new Date("2026-09-30T00:00:00.000Z");
  const trial = createTrialSubscription("area", undefined, now);
  assert.equal(isSubscriptionEntitled(trial, new Date("2026-10-07T00:00:00.000Z")), false);
  assert.equal(isSubscriptionEntitled({ ...trial, status: "expired" }, now), false);
});

test("renewal review keeps the existing entitlement only until expiry", () => {
  const now = new Date("2026-09-30T00:00:00.000Z");
  const renewal = {
    ...createTrialSubscription("area", undefined, now),
    status: "renewal_review",
  };
  assert.equal(isSubscriptionEntitled(renewal, now), true);
  assert.equal(isSubscriptionEntitled(renewal, new Date(renewal.expiresAt)), false);
});

test("renewal months extend from the current expiry and clamp at month end", () => {
  assert.equal(
    addSubscriptionMonth(new Date("2024-01-31T00:00:00.000Z")).toISOString(),
    "2024-02-29T00:00:00.000Z",
  );
});

test("promotion scopes are isolated by geography", () => {
  const area = {
    country: "Kenya",
    city: "Mombasa",
    area: "Nyali",
    subscription: createTrialSubscription("area", undefined),
  };
  const region = {
    ...area,
    subscription: createTrialSubscription("region", "Coast"),
  };
  const country = {
    ...area,
    subscription: createTrialSubscription("country", undefined),
  };
  assert.equal(promotionScopeKey({ ...area, city: " Mombasa  ", area: " NYALI " }), "area:Kenya:mombasa:nyali");
  assert.equal(promotionScopeKey(region), "region:Kenya:Coast");
  assert.equal(promotionScopeKey(country), "country:Kenya");
  assert.equal(isSubscriptionPlanId("area"), true);
  assert.equal(isSubscriptionPlanId("free"), false);
});

test("promotion eligibility is capped at 100 per geographic scope", () => {
  const businesses = Array.from({ length: 101 }, (_, index) => ({
    id: `business-${String(index).padStart(3, "0")}`,
    country: "Kenya",
    city: "Mombasa",
    area: "Nyali",
    rating: index,
    reviews: index,
    subscription: createTrialSubscription("area", undefined),
  }));

  const eligible = getTopHundredPromotions(businesses);

  assert.equal(MAX_PROMOTED_LISTINGS_PER_SCOPE, 100);
  assert.equal(eligible.size, 100);
  assert.equal(eligible.has("business-000"), false);
  assert.equal(eligible.has("business-100"), true);
});
