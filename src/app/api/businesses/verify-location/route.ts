import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";
import exifr from "exifr";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { businessesCollection } from "@/lib/firestore";
import { getFirestoreDb } from "@/lib/firebase-admin";
import { distanceKm } from "@/lib/geo";
import { isDeviceLocation } from "@/lib/location";
import { isSubscriptionEntitled } from "@/lib/subscription";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const user = token ? await getUserFromSession(token) : null;
    if (!user || !["business_owner", "admin"].includes(user.role)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const form = await request.formData();
    const businessId = String(form.get("businessId") || "");
    const photo = form.get("photo");
    const latitude = Number(form.get("latitude"));
    const longitude = Number(form.get("longitude"));
    const accuracy = Number(form.get("accuracy"));
    if (!businessId || !(photo instanceof File) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return NextResponse.json({ error: "Business, photo and live device coordinates are required." }, { status: 400 });
    if (!isDeviceLocation({ latitude, longitude, accuracy })) return NextResponse.json({ error: "Capture device location with reported accuracy of 100 metres or better." }, { status: 400 });
    if (photo.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Photo must be 10MB or smaller." }, { status: 400 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return NextResponse.json({ error: "Upload a JPEG, PNG, or WebP verification photo." }, { status: 400 });

    const businessDoc = await businessesCollection().doc(businessId).get();
    if (!businessDoc.exists) return NextResponse.json({ error: "Business not found." }, { status: 404 });
    const business = businessDoc.data();
    if (!business) return NextResponse.json({ error: "Business data is unavailable." }, { status: 404 });
    if (user.role === "business_owner" && business.ownerId !== user.id) return NextResponse.json({ error: "You do not own this business." }, { status: 403 });
    if (!business.subscription || !isSubscriptionEntitled(business.subscription)) return NextResponse.json({ error: "An active subscription or free trial is required before verification." }, { status: 402 });
    if (!isRecord(business.location)) return NextResponse.json({ error: "Business has no registered coordinates." }, { status: 409 });
    const registeredLatitude = business.location.latitude;
    const registeredLongitude = business.location.longitude;
    if (
      typeof registeredLatitude !== "number" ||
      !Number.isFinite(registeredLatitude) ||
      registeredLatitude < -90 ||
      registeredLatitude > 90 ||
      typeof registeredLongitude !== "number" ||
      !Number.isFinite(registeredLongitude) ||
      registeredLongitude < -180 ||
      registeredLongitude > 180
    ) {
      return NextResponse.json({ error: "Business has no valid registered coordinates." }, { status: 409 });
    }

    const buffer = Buffer.from(await photo.arrayBuffer());
    const exifGps = await exifr.gps(buffer).catch(() => undefined);
    const registered = { latitude: registeredLatitude, longitude: registeredLongitude };
    const live = { latitude, longitude, accuracy: Number.isFinite(accuracy) ? accuracy : undefined };
    const liveDistanceKm = distanceKm(live, registered);
    const exifDistanceKm = exifGps ? distanceKm(exifGps, registered) : null;

    getFirestoreDb();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return NextResponse.json({ error: "FIREBASE_STORAGE_BUCKET is not configured." }, { status: 500 });
    const bucket = getStorage().bucket(bucketName);
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `business-verification/${businessId}/${Date.now()}-${safeName}`;
    await bucket.file(objectPath).save(buffer, { metadata: { contentType: photo.type || "image/jpeg" } });

    const status = liveDistanceKm <= 0.5 && (exifDistanceKm === null || exifDistanceKm <= 1) ? "verified" : liveDistanceKm <= 2 ? "review" : "rejected";
    const id = `verification-${crypto.randomUUID()}`;
    const record = { id, businessId, submittedBy: user.id, status, registeredLocation: registered, liveLocation: live, liveDistanceKm, exifLocation: exifGps ?? null, exifDistanceKm, photoPath: objectPath, createdAt: new Date().toISOString() };
    await getFirestoreDb().collection("business_verifications").doc(id).set(record);
    await businessesCollection().doc(businessId).update({
      "verification.status": status,
      "verification.lastCheckAt": record.createdAt,
      "verification.lastStatus": status,
      "verification.photoUploads": FieldValue.arrayUnion(`storage://${objectPath}`),
      verified: status === "verified",
      ...(status === "verified"
        ? {
            badge: "Verified",
            publicationStatus: "published",
          }
        : status === "review"
          ? { publicationStatus: "pending_review" }
          : { publicationStatus: "rejected" }),
    });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Business location verification failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed." }, { status: 500 });
  }
}
