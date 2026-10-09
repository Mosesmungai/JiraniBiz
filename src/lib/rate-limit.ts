import "server-only";
import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { clientAddress } from "@/lib/client-address";
import { getFirestoreDb } from "@/lib/firebase-admin";
import { rateLimitsCollection } from "@/lib/firestore";
import { rateLimitExceededResponse } from "@/lib/rate-limit-response";

export { clientAddress };

const MINUTE = 60_000;

export type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

type Counter = {
  count: number;
  resetAt: number;
};

function privacySafeId(route: string, key: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for rate limiting.");
  return createHmac("sha256", secret).update(`${route}:${key}`).digest("hex");
}

export async function consumeRateLimits(
  route: string,
  rules: RateLimitRule[],
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  if (!rules.length) throw new Error("At least one rate limit rule is required.");
  for (const rule of rules) {
    if (!Number.isInteger(rule.limit) || rule.limit < 1 || !Number.isInteger(rule.windowMs) || rule.windowMs < 1) {
      throw new Error("Invalid rate limit configuration.");
    }
  }

  const db = getFirestoreDb();
  const refs = rules.map((rule) => rateLimitsCollection().doc(privacySafeId(route, rule.key)));
  const now = Date.now();
  return db.runTransaction(async (transaction) => {
    const snapshots = [];
    for (const ref of refs) snapshots.push(await transaction.get(ref));

    const counters: Counter[] = snapshots.map((snapshot, index) => {
      const data = snapshot.data();
      if (!snapshot.exists) {
        return { count: 0, resetAt: now + rules[index].windowMs };
      }
      if (
        !data ||
        typeof data.count !== "number" ||
        !Number.isSafeInteger(data.count) ||
        data.count < 0 ||
        typeof data.resetAt !== "number" ||
        !Number.isSafeInteger(data.resetAt)
      ) {
        throw new Error("Persisted rate limit counter is malformed.");
      }
      return data.resetAt > now
        ? { count: data.count, resetAt: data.resetAt }
        : { count: 0, resetAt: now + rules[index].windowMs };
    });

    const exceeded = counters.flatMap((counter, index) =>
      counter.count >= rules[index].limit ? [counter.resetAt] : [],
    );
    if (exceeded.length) {
      return {
        allowed: false as const,
        retryAfterSeconds: Math.max(1, Math.ceil((Math.max(...exceeded) - now) / 1000)),
      };
    }

    for (const [index, counter] of counters.entries()) {
      const expiresAt = new Date(counter.resetAt + 24 * 60 * MINUTE);
      transaction.set(refs[index], {
        count: counter.count + 1,
        resetAt: counter.resetAt,
        expiresAt,
      });
    }
    return { allowed: true as const };
  });
}

export async function enforceRateLimit(
  route: string,
  rules: RateLimitRule[],
): Promise<NextResponse | null> {
  const result = await consumeRateLimits(route, rules);
  if (result.allowed) return null;

  return rateLimitExceededResponse(result.retryAfterSeconds);
}

export function clientRateLimit(request: Request, route: string, limit = 60, windowMs = MINUTE) {
  return enforceRateLimit(route, [
    { key: `ip:${clientAddress(request)}`, limit, windowMs },
  ]);
}

export function userRateLimit(userId: string, route: string, limit = 60, windowMs = MINUTE) {
  return enforceRateLimit(route, [
    { key: `user:${userId}`, limit, windowMs },
  ]);
}
