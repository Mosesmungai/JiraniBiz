import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyDiscoveryPreferences,
  mergeDiscoveryPreferences,
  parseDiscoveryPreferences,
  recordBusinessView,
  recordCategoryPreference,
  recordLocationPreference,
  recordSearch,
} from "../src/lib/discovery-preferences.ts";
import { distanceKm } from "../src/lib/distance.ts";

const date = (day) => new Date(`2026-01-${String(day).padStart(2, "0")}T00:00:00.000Z`);

test("distanceKm computes a haversine distance in kilometres", () => {
  assert.ok(Math.abs(distanceKm(
    { latitude: -1.2864, longitude: 36.8172 },
    { latitude: -1.2926, longitude: 36.7876 },
  ) - 3.37) < 0.1);
  assert.equal(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }), 0);
});

test("recent searches, business views, and preferences remain bounded and deduplicated", () => {
  let preferences = emptyDiscoveryPreferences();
  for (let day = 1; day <= 12; day += 1) {
    preferences = recordSearch(preferences, {
      query: `search ${day}`,
      category: "All",
      location: null,
    }, date(day));
  }
  for (let day = 1; day <= 22; day += 1) {
    preferences = recordBusinessView(preferences, {
      id: `business-${day}`,
      slug: `business-${day}`,
      name: `Business ${day}`,
      category: `Category ${day % 8}`,
      city: "Nairobi",
      area: "Westlands",
    }, date(day));
  }
  for (let day = 1; day <= 12; day += 1) {
    preferences = recordCategoryPreference(preferences, `Category ${day}`, date(day));
    preferences = recordLocationPreference(preferences, {
      country: day % 2 ? "Kenya" : "Uganda",
      city: `City ${day}`,
      area: "",
    }, date(day));
  }

  assert.equal(preferences.recentSearches.length, 10);
  assert.equal(preferences.recentSearches[0].query, "search 12");
  assert.equal(preferences.recentlyViewedBusinesses.length, 20);
  assert.equal(preferences.recentlyViewedBusinesses[0].id, "business-22");
  assert.equal(preferences.preferredCategories.length, 6);
  assert.equal(preferences.preferredLocations.length, 10);
  assert.equal(preferences.preferredLocations[0].city, "City 12");
  assert.equal(preferences.recentSearches.some(({ query }) => query === "search 1"), false);
});

test("preference validation rejects oversized or malformed data and strips unknown fields", () => {
  const value = {
    ...emptyDiscoveryPreferences(),
    recentlyViewedBusinesses: [{
      id: "biz",
      slug: "biz",
      name: "Business",
      category: "Plumbing",
      city: "Nairobi",
      area: "CBD",
      viewedAt: date(1).toISOString(),
      latitude: -1.2,
      longitude: 36.8,
    }],
  };

  const parsed = parseDiscoveryPreferences(value);
  assert.ok(parsed);
  assert.equal("latitude" in parsed.recentlyViewedBusinesses[0], false);
  assert.equal(parseDiscoveryPreferences({
    ...emptyDiscoveryPreferences(),
    recentSearches: Array(11).fill({
      query: "search",
      category: "All",
      location: null,
      createdAt: date(1).toISOString(),
    }),
  }), null);
  assert.equal(parseDiscoveryPreferences({
    ...emptyDiscoveryPreferences(),
    preferredLocations: [{ country: "Kenya", city: "", area: "", updatedAt: date(1).toISOString() }],
  }), null);
  assert.equal(parseDiscoveryPreferences({
    ...emptyDiscoveryPreferences(),
    preferredLocations: [{ country: "Nairobi", city: "CBD", area: "", updatedAt: date(1).toISOString() }],
  }), null);
});

test("local and remote preferences merge newest records within their bounds", () => {
  const local = recordSearch(emptyDiscoveryPreferences(), {
    query: "plumbers",
    category: "Plumbing",
    location: { country: "Kenya", city: "Garissa", area: "" },
  }, date(1));
  const remote = recordSearch(emptyDiscoveryPreferences(), {
    query: "barbers",
    category: "Beauty",
    location: null,
  }, date(2));

  const merged = mergeDiscoveryPreferences(local, remote);
  assert.deepEqual(merged.recentSearches.map(({ query }) => query), ["barbers", "plumbers"]);
});

test("manual locations keep identical city names distinct across countries", () => {
  let preferences = emptyDiscoveryPreferences();
  preferences = recordLocationPreference(preferences, {
    country: "Kenya",
    city: "Nairobi",
    area: "",
  }, date(1));
  preferences = recordLocationPreference(preferences, {
    country: "Tanzania",
    city: "Nairobi",
    area: "",
  }, date(2));

  assert.equal(preferences.preferredLocations.length, 2);
  assert.equal(parseDiscoveryPreferences(preferences)?.preferredLocations.length, 2);
});
