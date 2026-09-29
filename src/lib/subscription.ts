export const TRIAL_DAYS = 7;
export const MAX_PROMOTED_LISTINGS_PER_SCOPE = 100;

export const SUBSCRIPTION_PLANS = {
  area: { id: "area", label: "Area reach", monthlyPriceKsh: 500, rank: 1 },
  region: { id: "region", label: "Regional reach", monthlyPriceKsh: 1000, rank: 2 },
  country: { id: "country", label: "Country-wide reach", monthlyPriceKsh: 2000, rank: 3 },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
export type SubscriptionStatus =
  | "trialing"
  | "awaiting_payment"
  | "payment_review"
  | "renewal_review"
  | "active"
  | "expired";
export type PublicationStatus =
  | "pending_payment"
  | "pending_verification"
  | "pending_review"
  | "published"
  | "rejected"
  | "suspended"
  | "expired";

export type BusinessSubscription = {
  planId: SubscriptionPlanId;
  monthlyPriceKsh: number;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  region?: string;
  paymentReference?: string;
  paymentSubmittedAt?: string;
  paymentConfirmedAt?: string;
  paymentRecordId?: string;
  paymentPreviousStatus?: "trialing" | "active" | "expired";
};

export const REGIONS_BY_COUNTRY = {
  Kenya: ["Coast", "Central", "Eastern", "Nairobi", "North Eastern", "Nyanza", "Rift Valley", "Western"],
  Uganda: ["Central", "Eastern", "Northern", "Western"],
  Tanzania: ["Central", "Coastal", "Lake", "Northern", "Southern", "Southern Highlands", "Western"],
} as const;

export function isRegionForCountry(
  country: keyof typeof REGIONS_BY_COUNTRY,
  region: string,
): boolean {
  const regions: readonly string[] = REGIONS_BY_COUNTRY[country];
  return regions.includes(region);
}

export function isSubscriptionPlanId(value: unknown): value is SubscriptionPlanId {
  return typeof value === "string" && Object.hasOwn(SUBSCRIPTION_PLANS, value);
}

export function createTrialSubscription(
  planId: SubscriptionPlanId,
  region: string | undefined,
  now = new Date(),
): BusinessSubscription {
  const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return {
    planId,
    monthlyPriceKsh: SUBSCRIPTION_PLANS[planId].monthlyPriceKsh,
    status: "trialing",
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ...(planId === "region" && region ? { region } : {}),
  };
}

export function createPendingSubscription(
  planId: SubscriptionPlanId,
  region: string | undefined,
  now = new Date(),
): BusinessSubscription {
  return {
    planId,
    monthlyPriceKsh: SUBSCRIPTION_PLANS[planId].monthlyPriceKsh,
    status: "awaiting_payment",
    startedAt: now.toISOString(),
    expiresAt: "",
    ...(planId === "region" && region ? { region } : {}),
  };
}

export function isSubscriptionEntitled(subscription: BusinessSubscription, now = new Date()): boolean {
  if (
    subscription.status !== "trialing" &&
    subscription.status !== "active" &&
    subscription.status !== "renewal_review"
  ) return false;
  const expiry = Date.parse(subscription.expiresAt);
  return Number.isFinite(expiry) && expiry > now.getTime();
}

export function addSubscriptionMonth(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function promotionScopeKey(business: {
  country: string;
  city: string;
  area: string;
  region?: string;
  subscription?: BusinessSubscription;
}): string | null {
  const plan = business.subscription;
  if (!plan) return null;
  if (plan.planId === "country") return `country:${business.country}`;
  if (plan.planId === "region" && plan.region) return `region:${business.country}:${plan.region}`;
  if (plan.planId === "area") {
    const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
    return `area:${business.country}:${normalize(business.city)}:${normalize(business.area)}`;
  }
  return null;
}

export function getTopHundredPromotions<T extends {
  id: string;
  country: string;
  city: string;
  area: string;
  region?: string;
  rating: number;
  reviews: number;
  subscription?: BusinessSubscription;
}>(businesses: T[], now = new Date()): Set<string> {
  const grouped = new Map<string, T[]>();
  for (const business of businesses) {
    if (!business.subscription || !isSubscriptionEntitled(business.subscription, now)) continue;
    const scope = promotionScopeKey(business);
    if (!scope) continue;
    const group = grouped.get(scope) ?? [];
    group.push(business);
    grouped.set(scope, group);
  }

  const eligible = new Set<string>();
  for (const group of grouped.values()) {
    group
      .sort((left, right) =>
        right.rating - left.rating ||
        right.reviews - left.reviews ||
        left.id.localeCompare(right.id),
      )
      .slice(0, MAX_PROMOTED_LISTINGS_PER_SCOPE)
      .forEach((business) => eligible.add(business.id));
  }
  return eligible;
}
