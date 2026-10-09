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
} from "@/lib/subscription";
import { clientRateLimit, userRateLimit } from "@/lib/rate-limit";
import {
  businessCreateFormSchema,
  parseBoundedFormData,
  parseStrictFormData,
} from "@/lib/request-schemas";

const MAX_LISTING_UPLOAD_BYTES = 55 * 1024 * 1024;

export async function GET(request: Request) {
  const ipLimit = await clientRateLimit(request, "businesses-list");
  if (ipLimit) return ipLimit;
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (user?.role === "business_owner") {
    const userLimit = await userRateLimit(user.id, "businesses-list");
    if (userLimit) return userLimit;
    return NextResponse.json(await getBusinessesForOwner(user.id));
  }
  return NextResponse.json(await getBusinesses());
}

export async function POST(request: Request) {
  const ipLimit = await clientRateLimit(request, "businesses-create", 3, 60 * 60 * 1000);
  if (ipLimit) return ipLimit;

  let uploadedPaths: string[] = [];
  try {
    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);

    if (!user || (user.role !== "business_owner" && user.role !== "admin")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const userLimit = await userRateLimit(user.id, "businesses-create", 3, 60 * 60 * 1000);
    if (userLimit) return userLimit;

    const parsedForm = await parseBoundedFormData(request, MAX_LISTING_UPLOAD_BYTES, "Listing upload");
    if (parsedForm.response) return parsedForm.response;
    const form = parsedForm.data;
    const formError = parseStrictFormData(
      form,
      ["name", "category", "city", "area", "country", "region", "description", "phone", "email", "planId", "trial", "location", "photos"],
      ["photos"],
    );
    if (formError) return formError;

    let location: unknown;
    try {
      const rawLocation = form.get("location");
      if (typeof rawLocation !== "string") throw new Error("Invalid location.");
      location = JSON.parse(rawLocation) as unknown;
    } catch {
      return NextResponse.json({ error: "A valid device location is required." }, { status: 400 });
    }
    const trialInput = form.get("trial");
    const parsed = businessCreateFormSchema.safeParse({
      name: form.get("name"),
      category: form.get("category"),
      city: form.get("city"),
      area: form.get("area"),
      country: form.get("country"),
      region: form.get("region"),
      description: form.get("description"),
      phone: form.get("phone"),
      email: form.get("email"),
      planId: form.get("planId"),
      trial: trialInput === "true" ? true : trialInput === "false" ? false : undefined,
      location,
    });
    if (!parsed.success) {
      return NextResponse.json({
        error: "Invalid business details.",
        details: parsed.error.issues.map(({ path, message }) => ({ path, message })),
      }, { status: 400 });
    }
    const input = parsed.data;
    if (input.planId === "region" && !isRegionForCountry(input.country, input.region)) {
      return NextResponse.json({ error: "Select a valid region for this country." }, { status: 400 });
    }
    if (!isDeviceLocation(input.location)) {
      return NextResponse.json({
        error: "A precise device location with reported accuracy of 100 metres or better is required. Retry location capture.",
      }, { status: 400 });
    }

    const photoValues = form.getAll("photos");
    if (photoValues.some((value) => !(value instanceof File))) {
      return NextResponse.json({ error: "Each photos field must contain an uploaded file." }, { status: 400 });
    }
    const photos = photoValues.filter((value): value is File => value instanceof File);
    const photoError = validateBusinessPhotos(photos);
    if (photoError) return NextResponse.json({ error: photoError }, { status: 400 });

    const id = `biz-${randomUUID()}`;
    getFirestoreDb();
    const uploaded = await uploadBusinessPhotos(id, photos);
    uploadedPaths = uploaded.paths;
    const created = await createBusiness({
      id,
      ownerId: user.role === "business_owner" ? user.id : undefined,
      name: input.name,
      category: input.category,
      city: input.city,
      area: input.area,
      country: input.country,
      ...(input.region ? { region: input.region } : {}),
      description: input.description,
      phone: input.phone,
      email: input.email,
      photos: uploaded.paths.map((path) => `storage://${path}`),
      subscription: input.trial
        ? createTrialSubscription(input.planId, input.region || undefined)
        : createPendingSubscription(input.planId, input.region || undefined),
      deviceLocation: input.location,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (uploadedPaths.length) await removeBusinessPhotos(uploadedPaths);
    console.error("Business creation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create business." }, { status: 500 });
  }
}
