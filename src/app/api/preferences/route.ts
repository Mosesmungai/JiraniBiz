import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import {
  emptyDiscoveryPreferences,
  parseDiscoveryPreferences,
} from "@/lib/discovery-preferences";
import { userPreferencesCollection } from "@/lib/firestore";

const MAX_REQUEST_BYTES = 32 * 1024;

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

export async function GET() {
  const user = await authenticatedUser();
  if (!user) {
    return privateJson({ authenticated: false, preferences: emptyDiscoveryPreferences() });
  }

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
  const user = await authenticatedUser();
  if (!user) return privateJson({ error: "Authentication required." }, 401);

  let text: string;
  let body: unknown;
  try {
    text = await request.text();
  } catch {
    return privateJson({ error: "Unable to read request body." }, 400);
  }
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
    return privateJson({ error: "Preferences payload is too large." }, 413);
  }
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    return privateJson({ error: "Request body must be valid JSON." }, 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("preferences" in body)
  ) {
    return privateJson({ error: "A preferences object is required." }, 400);
  }
  const preferences = parseDiscoveryPreferences(body.preferences);
  if (!preferences) {
    return privateJson({ error: "Preferences have an invalid shape or exceed allowed limits." }, 400);
  }

  await userPreferencesCollection(user.id)
    .doc("discovery")
    .set(preferences);

  return privateJson({ preferences });
}
