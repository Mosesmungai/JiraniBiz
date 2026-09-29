import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { isDeviceLocation } from "@/lib/location";
import { createBusiness, getBusinesses, getBusinessesForOwner } from "@/lib/store";
import { getFirestoreDb } from "@/lib/firebase-admin";
import { removeBusinessPhotos, uploadBusinessPhotos, validateBusinessPhotos } from "@/lib/business-media";
import {
  createPendingSubscription,
  createTrialSubscription,
  isRegionForCountry,
  isSubscriptionPlanId,
} from "@/lib/subscription";

export async function GET() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (user?.role === "business_owner") {
    return NextResponse.json(await getBusinessesForOwner(user.id));
  }
  return NextResponse.json(await getBusinesses());
}

export async function POST(request: Request) {
  let uploadedPaths: string[] = [];
  try {
    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);

    if (!user || (user.role !== "business_owner" && user.role !== "admin")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const form = await request.formData();
    const name = String(form.get("name") ?? "");
    const category = String(form.get("category") ?? "");
    const city = String(form.get("city") ?? "");
    const area = String(form.get("area") ?? "");
    const country = form.get("country");
    const region = String(form.get("region") ?? "");
    const description = String(form.get("description") ?? "");
    const phone = String(form.get("phone") ?? "");
    const email = String(form.get("email") ?? "");
    const planId = form.get("planId");
    const trial = form.get("trial") === "true";
    let location: unknown;
    try {
      location = JSON.parse(String(form.get("location") ?? ""));
    } catch {
      return NextResponse.json({ error: "A valid device location is required." }, { status: 400 });
    }
    if (
      !name.trim() ||
      !category.trim() ||
      !city.trim() ||
      !area.trim() ||
      !description.trim() ||
      !phone.trim() ||
      !email.trim()
    ) {
      return NextResponse.json({ error: "Missing required business fields." }, { status: 400 });
    }
    if (country !== "Kenya" && country !== "Uganda" && country !== "Tanzania") {
      return NextResponse.json({ error: "Select a supported country." }, { status: 400 });
    }
    if (!isSubscriptionPlanId(planId)) {
      return NextResponse.json({ error: "Choose one of the available visibility plans." }, { status: 400 });
    }
    if (planId === "region" && !isRegionForCountry(country, region)) {
      return NextResponse.json({ error: "Select a valid region for this country." }, { status: 400 });
    }
    if (!isDeviceLocation(location)) {
      return NextResponse.json({
        error: "A precise device location with reported accuracy of 100 metres or better is required. Retry location capture.",
      }, { status: 400 });
    }

    const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
    const photoError = validateBusinessPhotos(photos);
    if (photoError) return NextResponse.json({ error: photoError }, { status: 400 });

    const id = `biz-${randomUUID()}`;
    getFirestoreDb();
    const uploaded = await uploadBusinessPhotos(id, photos);
    uploadedPaths = uploaded.paths;
    const created = await createBusiness({
      id,
      ownerId: user.role === "business_owner" ? user.id : undefined,
      name, category, city, area,
      country,
      ...(region ? { region } : {}),
      description, phone, email,
      photos: uploaded.paths.map((path) => `storage://${path}`),
      subscription: trial
        ? createTrialSubscription(planId, region || undefined)
        : createPendingSubscription(planId, region || undefined),
      deviceLocation: location,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (uploadedPaths.length) await removeBusinessPhotos(uploadedPaths);
    console.error("Business creation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create business." }, { status: 500 });
  }
}
