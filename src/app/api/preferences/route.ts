import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import {
  emptyDiscoveryPreferences,
  parseDiscoveryPreferences,
} from "@/lib/discovery-preferences";
import { userPreferencesCollection } from "@/lib/firestore";
import { clientRateLimit, userRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, preferencesBodySchema } from "@/lib/request-schemas";

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function authenticatedUser() {
  const cookieStore = await cookies();
  return getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function GET(request: Request) {
  const ipLimit = await clientRateLimit(request, "preferences-read");
  if (ipLimit) return ipLimit;
  const user = await authenticatedUser();
  if (!user) {
    return privateJson({ authenticated: false, preferences: emptyDiscoveryPreferences() });
  }
  const userLimit = await userRateLimit(user.id, "preferences-read");
  if (userLimit) return userLimit;

  const snapshot = await userPreferencesCollection(user.id)
    .doc("discovery")
    .get();

  if (!snapshot.exists) {
    return privateJson({ authenticated: true, preferences: emptyDiscoveryPreferences() });
  }

  const preferences = parseDiscoveryPreferences(snapshot.data());
  if (!preferences) {
    return privateJson({ error: "Stored discovery preferences are invalid." }, 500);
  }
  return privateJson({ authenticated: true, preferences });
}

export async function PUT(request: Request) {
  const ipLimit = await clientRateLimit(request, "preferences-write", 30, 60 * 60 * 1000);
  if (ipLimit) return ipLimit;
  const user = await authenticatedUser();
  if (!user) return privateJson({ error: "Authentication required." }, 401);
  const userLimit = await userRateLimit(user.id, "preferences-write", 30, 60 * 60 * 1000);
  if (userLimit) return userLimit;

  const parsed = await parseJsonBody(request, preferencesBodySchema);
  if (parsed.response) return privateJson(await parsed.response.json(), parsed.response.status);
  const preferences = parseDiscoveryPreferences(parsed.data.preferences);
  if (!preferences) {
    return privateJson({ error: "Preferences have an invalid shape or exceed allowed limits." }, 400);
  }

  await userPreferencesCollection(user.id)
    .doc("discovery")
    .set(preferences);

  return privateJson({ preferences });
}
