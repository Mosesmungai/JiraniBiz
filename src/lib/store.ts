import { createHash, createHmac, randomUUID } from "node:crypto";
import { FieldValue, type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import type { AuthUser } from "@/lib/auth";
import { getBookingAccessRole } from "@/lib/booking-access";
import {
  BookingNotFoundError,
  BookingPermissionError,
  BookingStateConflictError,
  BusinessNotFoundError,
  BusinessSlugConflictError,
  DuplicateReviewError,
  NotBusinessOwnerError,
  ServiceNotFoundError,
} from "@/lib/store-errors";
export {
  BookingNotFoundError,
  BookingPermissionError,
  BookingStateConflictError,
  BusinessNotFoundError,
  BusinessSlugConflictError,
  DuplicateReviewError,
  NotBusinessOwnerError,
  ServiceNotFoundError,
} from "@/lib/store-errors";
import { getFirestoreDb } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";
import {
  bookingsCollection,
  businessPaymentsCollection,
  businessMetricVisitorsCollection,
  businessMetricsCollection,
  businessReviewsCollection,
  businessSlugsCollection,
  businessesCollection,
  leadsCollection,
  reviewsCollection,
  servicesCollection,
} from "@/lib/firestore";
import { geocodeBusinessLocation, type DeviceLocation } from "@/lib/location";
import type { Business, BusinessVerification, SocialLinks } from "@/lib/data";
import {
  addSubscriptionMonth,
  getTopHundredPromotions,
  isSubscriptionEntitled,
  isSubscriptionPlanId,
  type BusinessSubscription,
  type PublicationStatus,
} from "@/lib/subscription";

type Country = Business["country"];

export type Lead = {
  id: string;
  businessId: string;
  businessSlug: string;
  businessName: string;
  customerId?: string;
  name: string;
  phone: string;
  message: string;
  status: "New" | "Contacted" | "Booked" | "Closed";
  createdAt: string;
};

export type Service = {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  createdAt: string;
};

export type Booking = {
  id: string;
  businessId: string;
  customerId: string | null;
  serviceId: string | null;
  scheduledAt: string;
  status: "Requested" | "Confirmed" | "Completed" | "Cancelled";
  notes: string;
  createdAt: string;
};

export type Review = {
  id: string;
  businessId: string;
  customerId: string | null;
  rating: number;
  comment: string;
  createdAt: string;
};

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid business document: ${field} is not a boolean.`);
  }
  return value;
}

function requiredStringAllowEmpty(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid business document: ${field} is not a string.`);
  }
  return value;
}

function record(value: unknown, label: string): DocumentData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label} data in Firestore.`);
  }
  return value as DocumentData;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid business document: ${field} is missing.`);
  }
  return value;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid business document: ${field} is not a number.`);
  }
  return value;
}

function locationFrom(value: unknown, label: string) {
  const location = record(value, label);
  if (
    location.accuracy !== undefined &&
    (typeof location.accuracy !== "number" ||
      !Number.isFinite(location.accuracy) ||
      location.accuracy < 0)
  ) {
    throw new Error(`Invalid business document: ${label}.accuracy is invalid.`);
  }
  return {
    label: requiredString(location.label, `${label}.label`),
    latitude: requiredNumber(location.latitude, `${label}.latitude`),
    longitude: requiredNumber(location.longitude, `${label}.longitude`),
    ...(typeof location.accuracy === "number" ? { accuracy: location.accuracy } : {}),
  };
}

function verificationFrom(value: unknown): BusinessVerification {
  const verification = record(value, "business verification");
  if (
    verification.status !== "pending" &&
    verification.status !== "verified" &&
    verification.status !== "review" &&
    verification.status !== "rejected"
  ) {
    throw new Error("Invalid business document: verification status is invalid.");
  }
  if (typeof verification.required !== "boolean" || !Array.isArray(verification.photoUploads)) {
    throw new Error("Invalid business document: verification details are invalid.");
  }

  return {
    status: verification.status,
    required: verification.required,
    gpsProof: locationFrom(verification.gpsProof, "verification GPS proof"),
    photoUploads: verification.photoUploads.map((photo: unknown) => requiredString(photo, "verification photo")),
  };
}

function subscriptionFrom(value: unknown): BusinessSubscription {
  const subscription = record(value, "business subscription");
  const status = subscription.status;
  if (
    !isSubscriptionPlanId(subscription.planId) ||
    (status !== "trialing" &&
      status !== "awaiting_payment" &&
      status !== "payment_review" &&
      status !== "renewal_review" &&
      status !== "active" &&
      status !== "expired")
  ) {
    throw new Error("Invalid business document: subscription plan or status is invalid.");
  }
  const region = subscription.region;
  if (region !== undefined && typeof region !== "string") {
    throw new Error("Invalid business document: subscription region is invalid.");
  }
  const paymentPreviousStatus = subscription.paymentPreviousStatus;
  if (
    paymentPreviousStatus !== undefined &&
    paymentPreviousStatus !== "trialing" &&
    paymentPreviousStatus !== "active" &&
    paymentPreviousStatus !== "expired"
  ) {
    throw new Error("Invalid business document: previous payment status is invalid.");
  }
  if (subscription.paymentRecordId !== undefined && typeof subscription.paymentRecordId !== "string") {
    throw new Error("Invalid business document: payment record ID is invalid.");
  }
  return {
    planId: subscription.planId,
    monthlyPriceKsh: requiredNumber(subscription.monthlyPriceKsh, "subscription monthly price"),
    status,
    startedAt: requiredString(subscription.startedAt, "subscription startedAt"),
    expiresAt: requiredStringAllowEmpty(subscription.expiresAt, "subscription expiresAt"),
    ...(typeof region === "string" ? { region } : {}),
    ...(typeof subscription.paymentReference === "string" ? { paymentReference: subscription.paymentReference } : {}),
    ...(typeof subscription.paymentSubmittedAt === "string" ? { paymentSubmittedAt: subscription.paymentSubmittedAt } : {}),
    ...(typeof subscription.paymentConfirmedAt === "string" ? { paymentConfirmedAt: subscription.paymentConfirmedAt } : {}),
    ...(typeof subscription.paymentRecordId === "string" ? { paymentRecordId: subscription.paymentRecordId } : {}),
    ...(paymentPreviousStatus ? { paymentPreviousStatus } : {}),
  };
}

function socialsFrom(value: unknown): SocialLinks {
  const socials = record(value, "business social links");
  const entries = ["instagram", "facebook", "x", "whatsapp", "website"] as const;
  return Object.fromEntries(
    entries.flatMap((key) => {
      const link = socials[key];
      if (link === undefined || link === null || link === "") return [];
      if (typeof link !== "string") throw new Error(`Invalid business document: social link ${key} is invalid.`);
      return [[key, link]];
    }),
  );
}

function businessFromSnapshot(snapshot: DocumentSnapshot): Business {
  const data = snapshot.data();
  if (!snapshot.exists || !data) {
    throw new Error(`Business document ${snapshot.id} does not exist.`);
  }
  if (data.country !== "Kenya" && data.country !== "Uganda" && data.country !== "Tanzania") {
    throw new Error(`Invalid business document ${snapshot.id}: country is invalid.`);
  }
  if (!Array.isArray(data.services) || data.services.some((service: unknown) => typeof service !== "string")) {
    throw new Error(`Invalid business document ${snapshot.id}: services are invalid.`);
  }
  if (data.photos !== undefined && (!Array.isArray(data.photos) || data.photos.some((photo: unknown) => typeof photo !== "string"))) {
    throw new Error(`Invalid business document ${snapshot.id}: photos are invalid.`);
  }
  if (data.region !== undefined && typeof data.region !== "string") {
    throw new Error(`Invalid business document ${snapshot.id}: region is invalid.`);
  }
  const publicationStatus = data.publicationStatus;
  const publicationStatuses: PublicationStatus[] = [
    "pending_payment",
    "pending_verification",
    "pending_review",
    "published",
    "rejected",
    "suspended",
    "expired",
  ];
  if (publicationStatus !== undefined && (typeof publicationStatus !== "string" || !publicationStatuses.includes(publicationStatus as PublicationStatus))) {
    throw new Error(`Invalid business document ${snapshot.id}: publication status is invalid.`);
  }

  return {
    id: snapshot.id,
    slug: requiredString(data.slug, "slug"),
    name: requiredString(data.name, "name"),
    category: requiredString(data.category, "category"),
    area: requiredString(data.area, "area"),
    city: requiredString(data.city, "city"),
    country: data.country,
    ...(typeof data.region === "string" ? { region: data.region } : {}),
    rating: requiredNumber(data.rating, "rating"),
    reviews: requiredNumber(data.reviews, "reviews"),
    image: requiredString(data.image, "image"),
    ...(Array.isArray(data.photos) ? { photos: data.photos } : {}),
    description: requiredStringAllowEmpty(data.description, "description"),
    services: data.services,
    priceFrom: requiredNumber(data.priceFrom, "priceFrom"),
    verified: requiredBoolean(data.verified, "verified"),
    badge: requiredString(data.badge, "badge"),
    phone: typeof data.phone === "string" ? data.phone : undefined,
    email: typeof data.email === "string" ? data.email : undefined,
    location: locationFrom(data.location, "business location"),
    socials: socialsFrom(data.socials),
    verification: verificationFrom(data.verification),
    ...(data.subscription !== undefined ? { subscription: subscriptionFrom(data.subscription) } : {}),
    ...(typeof publicationStatus === "string" ? { publicationStatus: publicationStatus as PublicationStatus } : {}),
  };
}

function leadFromSnapshot(snapshot: QueryDocumentSnapshot, business: Business): Lead {
  const data = snapshot.data();
  const status = data.status;
  if (status !== "New" && status !== "Contacted" && status !== "Booked" && status !== "Closed") {
    throw new Error(`Invalid lead document ${snapshot.id}: status is invalid.`);
  }
  return {
    id: snapshot.id,
    businessId: business.id,
    businessSlug: business.slug,
    businessName: business.name,
    customerId: typeof data.customerId === "string" ? data.customerId : undefined,
    name: requiredString(data.name, "lead name"),
    phone: requiredString(data.phone, "lead phone"),
    message: requiredString(data.message, "lead message"),
    status,
    createdAt: requiredString(data.createdAt, "lead createdAt"),
  };
}

function serviceFromSnapshot(snapshot: QueryDocumentSnapshot): Service {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    businessId: requiredString(data.businessId, "service businessId"),
    name: requiredString(data.name, "service name"),
    description: typeof data.description === "string" ? data.description : "",
    price: requiredNumber(data.price, "service price"),
    createdAt: requiredString(data.createdAt, "service createdAt"),
  };
}

function bookingFromSnapshot(snapshot: DocumentSnapshot): Booking {
  if (!snapshot.exists) throw new BookingNotFoundError();
  const data = snapshot.data();
  if (!data) throw new Error(`Booking document ${snapshot.id} has no data.`);
  const status = data.status;
  if (
    status !== "Requested" &&
    status !== "Confirmed" &&
    status !== "Completed" &&
    status !== "Cancelled"
  ) {
    throw new Error(`Invalid booking document ${snapshot.id}: status is invalid.`);
  }
  return {
    id: snapshot.id,
    businessId: requiredString(data.businessId, "booking businessId"),
    customerId: typeof data.customerId === "string" ? data.customerId : null,
    serviceId: typeof data.serviceId === "string" ? data.serviceId : null,
    scheduledAt: requiredString(data.scheduledAt, "booking scheduledAt"),
    status,
    notes: typeof data.notes === "string" ? data.notes : "",
    createdAt: requiredString(data.createdAt, "booking createdAt"),
  };
}

function reviewFromSnapshot(snapshot: QueryDocumentSnapshot): Review {
  const data = snapshot.data();
  const rating = requiredNumber(data.rating, "review rating");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error(`Invalid review document ${snapshot.id}: rating is invalid.`);
  }
  return {
    id: snapshot.id,
    businessId: requiredString(data.businessId, "review businessId"),
    customerId: typeof data.customerId === "string" ? data.customerId : null,
    rating,
    comment: requiredStringAllowEmpty(data.comment, "review comment"),
    createdAt: requiredString(data.createdAt, "review createdAt"),
  };
}

export async function getBusinesses(): Promise<Business[]> {
  const snapshot = await businessesCollection().get();
  const visible = snapshot.docs
    .map(businessFromSnapshot)
    .filter((business) => isPubliclyVisibleBusiness(business))
    .sort((left, right) => left.name.localeCompare(right.name));
  const promotionEligible = getTopHundredPromotions(visible);
  return Promise.all(visible.map((business) => signBusinessPhotos({
    ...business,
    promotionEligible: promotionEligible.has(business.id),
  })));
}

async function signBusinessPhotos(business: Business): Promise<Business> {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) return business;
  const bucket = getStorage().bucket(bucketName);
  const sign = async (value: string) => {
    if (!value.startsWith("storage://")) return value;
    const path = value.slice("storage://".length);
    const [url] = await bucket.file(path).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });
    return url;
  };
  const [image, photos] = await Promise.all([
    sign(business.image),
    Promise.all((business.photos ?? []).map(sign)),
  ]);
  const verificationPhotos = await Promise.all(business.verification.photoUploads.map(sign));
  return {
    ...business,
    image,
    photos,
    verification: { ...business.verification, photoUploads: verificationPhotos },
  };
}

export function isPubliclyVisibleBusiness(business: Business, now = new Date()): boolean {
  if (business.publicationStatus === undefined) return true;
  if (business.publicationStatus !== "published") return false;
  return business.subscription
    ? isSubscriptionEntitled(business.subscription, now)
    : false;
}

export async function getBusinessesForOwner(ownerId: string): Promise<Business[]> {
  const snapshot = await businessesCollection().where("ownerId", "==", ownerId).get();
  const businesses = snapshot.docs
    .map(businessFromSnapshot)
    .sort((left, right) => right.name.localeCompare(left.name));
  return Promise.all(businesses.map(signBusinessPhotos));
}

export async function getBusinessReviewQueue(): Promise<Business[]> {
  const snapshot = await businessesCollection().get();
  const businesses = snapshot.docs
    .map(businessFromSnapshot)
    .filter((business) =>
      business.subscription?.status === "payment_review" ||
      business.subscription?.status === "renewal_review" ||
      business.verification.status === "review",
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  return Promise.all(businesses.map(signBusinessPhotos));
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const snapshot = await businessesCollection().doc(id).get();
  return snapshot.exists ? businessFromSnapshot(snapshot) : null;
}

async function updateBusinessDailyMetrics(
  transaction: Transaction,
  businessId: string,
  day: string,
  changes: { views?: number; uniqueVisitors?: number; bookingRequests?: number; leadEnquiries?: number; serviceId?: string },
) {
  const metricRef = businessMetricsCollection(businessId).doc(day);
  const snapshot = await transaction.get(metricRef);
  const data = snapshot.data();
  const count = (field: string) => {
    const value = data?.[field];
    if (value === undefined) return 0;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Persisted business analytics counter ${field} is malformed.`);
    }
    return value;
  };
  const existingServices = data?.serviceRequests === undefined
    ? {}
    : record(data.serviceRequests, "business service metrics");
  const serviceRequests: Record<string, number> = {};
  for (const [serviceId, value] of Object.entries(existingServices)) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Persisted business analytics counter serviceRequests.${serviceId} is malformed.`);
    }
    serviceRequests[serviceId] = value;
  }
  if (changes.bookingRequests || changes.leadEnquiries) {
    const serviceId = changes.serviceId ?? "direct_enquiry";
    serviceRequests[serviceId] = (serviceRequests[serviceId] ?? 0) + 1;
  }

  transaction.set(metricRef, {
    day,
    views: count("views") + (changes.views ?? 0),
    uniqueVisitors: count("uniqueVisitors") + (changes.uniqueVisitors ?? 0),
    bookingRequests: count("bookingRequests") + (changes.bookingRequests ?? 0),
    leadEnquiries: count("leadEnquiries") + (changes.leadEnquiries ?? 0),
    serviceRequests,
    updatedAt: new Date().toISOString(),
  });
}

export async function recordBusinessProfileView(
  businessId: string,
  input: { userId?: string; clientAddress: string; userAgent: string },
): Promise<void> {
  const businessRef = businessesCollection().doc(businessId);
  const snapshot = await businessRef.get();
  if (!snapshot.exists) throw new BusinessNotFoundError();
  const business = businessFromSnapshot(snapshot);
  if (!isPubliclyVisibleBusiness(business) || snapshot.data()?.ownerId === input.userId) return;

  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for business analytics.");
  const day = new Date().toISOString().slice(0, 10);
  const visitorId = createHmac("sha256", secret)
    .update(`${businessId}:${day}:${input.clientAddress}:${input.userAgent}`)
    .digest("hex");
  const visitorRef = businessMetricVisitorsCollection().doc(visitorId);
  const now = Date.now();

  await getFirestoreDb().runTransaction(async (transaction) => {
    const visitor = await transaction.get(visitorRef);
    await updateBusinessDailyMetrics(transaction, businessId, day, {
      views: 1,
      uniqueVisitors: visitor.exists ? 0 : 1,
    });
    if (!visitor.exists) {
      transaction.create(visitorRef, {
        businessId,
        day,
        expiresAt: new Date(now + 90 * 24 * 60 * 60 * 1000),
      });
    }
  });
}

export async function updateBusinessContact(input: {
  businessId: string;
  ownerId: string;
  whatsappNumber: string;
  instagram: string;
  facebook: string;
  x: string;
  website: string;
}) {
  const businessRef = businessesCollection().doc(input.businessId);
  await getFirestoreDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(businessRef);
    if (!snapshot.exists) throw new BusinessNotFoundError();
    if (snapshot.data()?.ownerId !== input.ownerId) throw new NotBusinessOwnerError();

    transaction.update(businessRef, {
      "socials.whatsapp": input.whatsappNumber
        ? `https://wa.me/${input.whatsappNumber.replace(/^\+/, "")}`
        : "",
      "socials.instagram": input.instagram,
      "socials.facebook": input.facebook,
      "socials.x": input.x,
      "socials.website": input.website,
    });
  });
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const slugSnapshot = await businessSlugsCollection().doc(slug).get();
  const businessId = slugSnapshot.data()?.businessId;
  const snapshot = typeof businessId === "string"
    ? await businessesCollection().doc(businessId).get()
    : (await businessesCollection().where("slug", "==", slug).limit(1).get()).docs[0];
  if (!snapshot?.exists) return null;
  const business = businessFromSnapshot(snapshot);
  if (!isPubliclyVisibleBusiness(business)) return null;
  return signBusinessPhotos(business);
}

export async function getLeads(): Promise<Lead[]> {
  const [leadSnapshot, businesses] = await Promise.all([
    leadsCollection().get(),
    businessesCollection().get(),
  ]);
  const businessesById = new Map(businesses.docs.map((snapshot) => [snapshot.id, businessFromSnapshot(snapshot)]));
  return leadSnapshot.docs
    .flatMap((snapshot) => {
      const business = businessesById.get(snapshot.data().businessId);
      return business ? [leadFromSnapshot(snapshot, business)] : [];
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createLead(input: {
  businessSlug: string;
  name: string;
  phone: string;
  message: string;
  customerId?: string;
}) {
  const business = await getBusinessBySlug(input.businessSlug);
  if (!business) throw new BusinessNotFoundError();

  const lead: Lead = {
    id: `lead-${randomUUID()}`,
    businessId: business.id,
    businessSlug: business.slug,
    businessName: business.name,
    customerId: input.customerId,
    name: input.name,
    phone: input.phone,
    message: input.message,
    status: "New",
    createdAt: new Date().toISOString(),
  };
  await getFirestoreDb().runTransaction(async (transaction) => {
    await updateBusinessDailyMetrics(
      transaction,
      lead.businessId,
      lead.createdAt.slice(0, 10),
      { leadEnquiries: 1 },
    );
    transaction.create(leadsCollection().doc(lead.id), {
      businessId: lead.businessId,
      ...(input.customerId ? { customerId: input.customerId } : {}),
      name: lead.name,
      phone: lead.phone,
      message: lead.message,
      status: lead.status,
      createdAt: lead.createdAt,
    });
  });
  return lead;
}

export async function createBusiness(input: {
  id: string;
  ownerId?: string;
  name: string;
  category: string;
  city: string;
  area: string;
  description: string;
  phone: string;
  email: string;
  country?: Country;
  region?: string;
  photos: string[];
  subscription: BusinessSubscription;
  socials?: Partial<SocialLinks>;
  deviceLocation?: DeviceLocation;
}) {
  const createdAt = new Date().toISOString();
  const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Date.now()}`;
  const country = input.country ?? "Kenya";
  const location = input.deviceLocation
    ? {
        label: [input.area, input.city, country].filter(Boolean).join(", "),
        ...input.deviceLocation,
      }
    : await geocodeBusinessLocation(input.city, input.area, country);
  const id = input.id;
  const business: Business = {
    id,
    slug,
    name: input.name,
    category: input.category,
    city: input.city,
    area: input.area,
    country,
    ...(input.region ? { region: input.region } : {}),
    rating: 0,
    reviews: 0,
    image: input.photos[0],
    photos: input.photos,
    description: input.description,
    services: [input.category],
    priceFrom: 0,
    verified: false,
    badge: "New",
    phone: input.phone,
    email: input.email,
    location,
    socials: {
      instagram: input.socials?.instagram ?? "",
      facebook: input.socials?.facebook ?? "",
      x: input.socials?.x ?? "",
      whatsapp: input.socials?.whatsapp ?? "",
      website: input.socials?.website ?? "",
    },
    verification: {
      status: "pending",
      required: true,
      gpsProof: location,
      photoUploads: [],
    },
    subscription: input.subscription,
    publicationStatus: input.subscription.status === "trialing" ? "pending_verification" : "pending_payment",
  };

  const db = getFirestoreDb();
  const slugRef = businessSlugsCollection().doc(slug);
  const businessRef = businessesCollection().doc(id);
  await db.runTransaction(async (transaction) => {
    const existingSlug = await transaction.get(slugRef);
    if (existingSlug.exists) throw new BusinessSlugConflictError();
    transaction.create(businessRef, {
      ...business,
      ...(input.ownerId ? { ownerId: input.ownerId } : {}),
      createdAt,
    });
    transaction.create(slugRef, { businessId: id });
  });
  return business;
}

export async function submitBusinessPaymentReference(input: {
  businessId: string;
  ownerId: string;
  reference: string;
}) {
  const businessRef = businessesCollection().doc(input.businessId);
  const submittedAt = new Date().toISOString();
  return getFirestoreDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(businessRef);
    if (!snapshot.exists) throw new BusinessNotFoundError();
    const business = businessFromSnapshot(snapshot);
    if (snapshot.data()?.ownerId !== input.ownerId) throw new NotBusinessOwnerError();
    const subscription = business.subscription;
    if (!subscription) throw new Error("This business does not have a visibility subscription.");
    const initialPayment = subscription.status === "awaiting_payment";
    const renewalPayment =
      subscription.status === "trialing" ||
      subscription.status === "active" ||
      subscription.status === "expired";
    if (!initialPayment && !renewalPayment) {
      throw new Error("This subscription already has a payment awaiting review.");
    }
    const duplicateReference = await transaction.get(
      businessPaymentsCollection().where("reference", "==", input.reference).limit(1),
    );
    if (!duplicateReference.empty) throw new Error("This transaction reference has already been submitted.");
    const paymentRecordId = `payment-${business.id}-${randomUUID()}`;
    const paymentRef = businessPaymentsCollection().doc(paymentRecordId);
    const paymentPreviousStatus = renewalPayment
      ? isSubscriptionEntitled(subscription)
        ? subscription.status as "trialing" | "active"
        : "expired"
      : undefined;
    const reviewStatus = initialPayment ? "payment_review" : "renewal_review";
    transaction.update(businessRef, {
      "subscription.status": reviewStatus,
      "subscription.paymentReference": input.reference,
      "subscription.paymentSubmittedAt": submittedAt,
      "subscription.paymentRecordId": paymentRecordId,
      ...(paymentPreviousStatus ? { "subscription.paymentPreviousStatus": paymentPreviousStatus } : {}),
    });
    transaction.create(paymentRef, {
      businessId: business.id,
      ownerId: input.ownerId,
      reference: input.reference,
      amountKsh: subscription.monthlyPriceKsh,
      planId: subscription.planId,
      status: "submitted",
      submittedAt,
    });
    return reviewStatus;
  });
}

export async function reviewBusiness(input: {
  businessId: string;
  adminId: string;
  action: "confirm_payment" | "reject_payment" | "approve_verification" | "reject_verification";
}) {
  const businessRef = businessesCollection().doc(input.businessId);
  const reviewRef = businessReviewsCollection().doc(`review-${randomUUID()}`);
  const reviewedAt = new Date().toISOString();
  await getFirestoreDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(businessRef);
    if (!snapshot.exists) throw new BusinessNotFoundError();
    const business = businessFromSnapshot(snapshot);
    if (!business.subscription || business.publicationStatus === undefined) {
      throw new Error("This legacy listing does not require subscription review.");
    }

    if (input.action === "confirm_payment") {
      if (
        business.subscription.status !== "payment_review" &&
        business.subscription.status !== "renewal_review"
      ) {
        throw new Error("This business has no payment awaiting review.");
      }
      const paymentRef = businessPaymentsCollection().doc(
        business.subscription.paymentRecordId ?? `payment-${business.id}`,
      );
      const paymentSnapshot = await transaction.get(paymentRef);
      if (!paymentSnapshot.exists || paymentSnapshot.data()?.status !== "submitted") {
        throw new Error("The submitted payment record is missing or already reviewed.");
      }
      const isRenewal = business.subscription.status === "renewal_review";
      const previousExpiry = Date.parse(business.subscription.expiresAt);
      const expirationBase = isRenewal && previousExpiry > Date.parse(reviewedAt)
        ? new Date(previousExpiry)
        : new Date(reviewedAt);
      const expiresAt = addSubscriptionMonth(expirationBase);
      transaction.update(businessRef, {
        "subscription.status": "active",
        ...(!isRenewal ? { "subscription.startedAt": reviewedAt } : {}),
        "subscription.expiresAt": expiresAt.toISOString(),
        "subscription.paymentConfirmedAt": reviewedAt,
        publicationStatus: business.verification.status === "verified"
          ? "published"
          : isRenewal
            ? business.publicationStatus
            : "pending_verification",
      });
      transaction.update(paymentRef, { status: "confirmed", reviewedAt, reviewedBy: input.adminId });
    } else if (input.action === "reject_payment") {
      if (
        business.subscription.status !== "payment_review" &&
        business.subscription.status !== "renewal_review"
      ) {
        throw new Error("This business has no payment awaiting review.");
      }
      const paymentRef = businessPaymentsCollection().doc(
        business.subscription.paymentRecordId ?? `payment-${business.id}`,
      );
      const paymentSnapshot = await transaction.get(paymentRef);
      if (!paymentSnapshot.exists || paymentSnapshot.data()?.status !== "submitted") {
        throw new Error("The submitted payment record is missing or already reviewed.");
      }
      const isRenewal = business.subscription.status === "renewal_review";
      const previousStatus = business.subscription.paymentPreviousStatus;
      const expiryIsFuture = Date.parse(business.subscription.expiresAt) > Date.parse(reviewedAt);
      const restoredStatus = isRenewal && expiryIsFuture
        ? previousStatus === "trialing" ? "trialing" : "active"
        : isRenewal
          ? "expired"
          : "awaiting_payment";
      transaction.update(businessRef, {
        "subscription.status": restoredStatus,
        "subscription.paymentReference": FieldValue.delete(),
        "subscription.paymentSubmittedAt": FieldValue.delete(),
        "subscription.paymentRecordId": FieldValue.delete(),
        "subscription.paymentPreviousStatus": FieldValue.delete(),
        ...(!isRenewal
          ? { publicationStatus: "pending_payment" }
          : restoredStatus === "expired"
            ? { publicationStatus: "expired" }
            : {}),
      });
      transaction.update(paymentRef, { status: "rejected", reviewedAt, reviewedBy: input.adminId });
    } else if (input.action === "approve_verification") {
      if (business.verification.status !== "review" && business.verification.status !== "pending") {
        throw new Error("This business has no verification awaiting review.");
      }
      if (!isSubscriptionEntitled(business.subscription)) {
        throw new Error("An active subscription or trial is required before publishing this listing.");
      }
      transaction.update(businessRef, {
        verified: true,
        badge: "Verified",
        "verification.status": "verified",
        publicationStatus: "published",
      });
    } else {
      if (business.verification.status !== "review" && business.verification.status !== "pending") {
        throw new Error("This business has no verification awaiting review.");
      }
      transaction.update(businessRef, {
        verified: false,
        "verification.status": "rejected",
        publicationStatus: "rejected",
      });
    }
    transaction.create(reviewRef, {
      businessId: business.id,
      adminId: input.adminId,
      action: input.action,
      reviewedAt,
    });
  });
}

export async function getServicesForBusiness(businessId: string): Promise<Service[]> {
  const snapshot = await servicesCollection().where("businessId", "==", businessId).get();
  return snapshot.docs
    .map(serviceFromSnapshot)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createService(input: {
  businessId: string;
  name: string;
  description: string;
  price: number;
  user: AuthUser;
}) {
  const businessSnapshot = await businessesCollection().doc(input.businessId).get();
  if (!businessSnapshot.exists) throw new BusinessNotFoundError();
  const ownerId = businessSnapshot.data()?.ownerId;
  if (input.user.role === "business_owner" && ownerId !== input.user.id) {
    throw new NotBusinessOwnerError();
  }

  const service: Service = {
    id: `service-${randomUUID()}`,
    businessId: input.businessId,
    name: input.name,
    description: input.description,
    price: input.price,
    createdAt: new Date().toISOString(),
  };
  const { id, ...document } = service;
  await servicesCollection().doc(id).create(document);
  return service;
}

export async function createBooking(input: {
  businessId: string;
  customerId: string;
  serviceId?: string;
  scheduledAt: string;
  notes: string;
}): Promise<Booking> {
  const booking: Booking = {
    id: `booking-${randomUUID()}`,
    businessId: input.businessId,
    customerId: input.customerId,
    serviceId: input.serviceId ?? null,
    scheduledAt: input.scheduledAt,
    status: "Requested",
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  const businessRef = businessesCollection().doc(input.businessId);
  const serviceRef = input.serviceId ? servicesCollection().doc(input.serviceId) : undefined;
  const bookingRef = bookingsCollection().doc(booking.id);

  await getFirestoreDb().runTransaction(async (transaction) => {
    const business = await transaction.get(businessRef);
    if (!business.exists) throw new BusinessNotFoundError();
    if (serviceRef) {
      const service = await transaction.get(serviceRef);
      if (!service.exists || service.data()?.businessId !== input.businessId) {
        throw new ServiceNotFoundError();
      }
    }
    await updateBusinessDailyMetrics(
      transaction,
      booking.businessId,
      booking.createdAt.slice(0, 10),
      { bookingRequests: 1, serviceId: booking.serviceId ?? undefined },
    );
    transaction.create(bookingRef, {
      businessId: booking.businessId,
      customerId: booking.customerId,
      serviceId: booking.serviceId,
      scheduledAt: booking.scheduledAt,
      status: booking.status,
      notes: booking.notes,
      createdAt: booking.createdAt,
    });
  });

  return booking;
}

export async function getBookingsForUser(user: AuthUser): Promise<Booking[]> {
  const snapshot = user.role === "business_owner"
    ? await businessesCollection().where("ownerId", "==", user.id).get()
    : undefined;
  const businessIds = snapshot?.docs.map((business) => business.id);
  const bookings = user.role === "business_owner"
    ? businessIds?.length
      ? (await Promise.all(
          Array.from({ length: Math.ceil(businessIds.length / 30) }, (_, index) =>
            bookingsCollection()
              .where("businessId", "in", businessIds.slice(index * 30, (index + 1) * 30))
              .get(),
          ),
        )).flatMap((result) => result.docs)
      : []
    : (await bookingsCollection().where("customerId", "==", user.id).get()).docs;

  return bookings
    .map(bookingFromSnapshot)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function bookingAccessRole(
  booking: Booking,
  user: AuthUser,
  businessOwnerId?: string,
): Promise<"customer" | "business_owner" | "admin"> {
  const role = getBookingAccessRole(booking, user, businessOwnerId);
  if (role) return role;
  throw new BookingNotFoundError();
}

export async function getBookingForUser(bookingId: string, user: AuthUser): Promise<Booking> {
  const snapshot = await bookingsCollection().doc(bookingId).get();
  if (!snapshot.exists) throw new BookingNotFoundError();
  const booking = bookingFromSnapshot(snapshot);
  const business = user.role === "business_owner"
    ? await businessesCollection().doc(booking.businessId).get()
    : undefined;
  await bookingAccessRole(booking, user, business?.data()?.ownerId);
  return booking;
}

export async function updateBookingForUser(
  bookingId: string,
  user: AuthUser,
  changes: { scheduledAt?: string; notes?: string; status?: Booking["status"] },
): Promise<Booking> {
  const bookingRef = bookingsCollection().doc(bookingId);
  return getFirestoreDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(bookingRef);
    if (!snapshot.exists) throw new BookingNotFoundError();
    const booking = bookingFromSnapshot(snapshot);
    const business = user.role === "business_owner"
      ? await transaction.get(businessesCollection().doc(booking.businessId))
      : undefined;
    const accessRole = await bookingAccessRole(booking, user, business?.data()?.ownerId);

    if (accessRole === "customer") {
      if (changes.status !== undefined) throw new BookingPermissionError();
      if (booking.status !== "Requested") {
        throw new BookingStateConflictError("Only requested bookings can be rescheduled.");
      }
    } else if (accessRole === "business_owner") {
      if (changes.status === undefined || changes.scheduledAt !== undefined || changes.notes !== undefined) {
        throw new BookingPermissionError();
      }
      const allowedTransitions: Record<Booking["status"], Booking["status"][]> = {
        Requested: ["Confirmed", "Cancelled"],
        Confirmed: ["Completed", "Cancelled"],
        Completed: [],
        Cancelled: [],
      };
      if (!allowedTransitions[booking.status].includes(changes.status)) {
        throw new BookingStateConflictError("This booking status transition is not allowed.");
      }
    }

    const patch = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    transaction.update(bookingRef, patch);
    return { ...booking, ...changes };
  });
}

export async function deleteBookingForUser(bookingId: string, user: AuthUser): Promise<void> {
  const bookingRef = bookingsCollection().doc(bookingId);
  await getFirestoreDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(bookingRef);
    if (!snapshot.exists) throw new BookingNotFoundError();
    const booking = bookingFromSnapshot(snapshot);
    const business = user.role === "business_owner"
      ? await transaction.get(businessesCollection().doc(booking.businessId))
      : undefined;
    const accessRole = await bookingAccessRole(booking, user, business?.data()?.ownerId);
    if (accessRole === "business_owner") throw new BookingPermissionError();
    if (accessRole === "customer" && booking.status !== "Requested") {
      throw new BookingStateConflictError("Only requested bookings can be deleted.");
    }
    transaction.delete(bookingRef);
  });
}

export async function getReviews(businessId: string): Promise<Review[]> {
  const snapshot = await reviewsCollection().where("businessId", "==", businessId).get();
  return snapshot.docs
    .map(reviewFromSnapshot)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createReview(input: {
  businessId: string;
  customerId: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const reviewId = `review-${createHash("sha256").update(`${input.businessId}:${input.customerId}`).digest("hex")}`;
  const review: Review = {
    id: reviewId,
    businessId: input.businessId,
    customerId: input.customerId,
    rating: input.rating,
    comment: input.comment,
    createdAt: new Date().toISOString(),
  };
  const businessRef = businessesCollection().doc(input.businessId);
  const reviewRef = reviewsCollection().doc(reviewId);

  await getFirestoreDb().runTransaction(async (transaction) => {
    const business = await transaction.get(businessRef);
    if (!business.exists) throw new BusinessNotFoundError();
    const existingReview = await transaction.get(reviewRef);
    if (existingReview.exists) throw new DuplicateReviewError();
    const businessReviews = await transaction.get(reviewsCollection().where("businessId", "==", input.businessId));
    if (businessReviews.docs.some((snapshot) => snapshot.data().customerId === input.customerId)) {
      throw new DuplicateReviewError();
    }

    const count = businessReviews.size;
    const total = businessReviews.docs.reduce((sum, snapshot) => sum + requiredNumber(snapshot.data().rating, "review rating"), 0);
    transaction.create(reviewRef, {
      businessId: review.businessId,
      customerId: review.customerId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    });
    transaction.update(businessRef, {
      rating: Number(((total + review.rating) / (count + 1)).toFixed(1)),
      reviews: count + 1,
    });
  });

  return review;
}

export type BusinessAnalytics = {
  businessId: string;
  businessName: string;
  views: number;
  uniqueVisitors: number;
  bookingRequests: number;
  leadEnquiries: number;
  daily: Array<{ day: string; views: number; bookingRequests: number }>;
  requestedServices: Array<{ name: string; requests: number }>;
};

async function getBusinessAnalytics(business: Business): Promise<BusinessAnalytics> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 29);
  const startDay = start.toISOString().slice(0, 10);
  const [metricsSnapshot, services] = await Promise.all([
    businessMetricsCollection(business.id).where("day", ">=", startDay).get(),
    servicesCollection().where("businessId", "==", business.id).get(),
  ]);
  const serviceNames = new Map(services.docs.map((snapshot) => [
    snapshot.id,
    requiredString(snapshot.data().name, "service name"),
  ]));
  const dailyByDay = new Map<string, { views: number; uniqueVisitors: number; bookingRequests: number; leadEnquiries: number; serviceRequests: Record<string, number> }>();

  for (const snapshot of metricsSnapshot.docs) {
    const data = snapshot.data();
    const day = requiredString(data.day, "business metrics day");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`Invalid business metrics document ${snapshot.id}: day is invalid.`);
    const count = (value: unknown, field: string) => {
      if (value === undefined) return 0;
      if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
        throw new Error(`Invalid business metrics document ${snapshot.id}: ${field} is invalid.`);
      }
      return value;
    };
    const requests = data.serviceRequests === undefined ? {} : record(data.serviceRequests, "business service metrics");
    const serviceRequests: Record<string, number> = {};
    for (const [serviceId, value] of Object.entries(requests)) {
      serviceRequests[serviceId] = count(value, `serviceRequests.${serviceId}`);
    }
    dailyByDay.set(day, {
      views: count(data.views, "views"),
      uniqueVisitors: count(data.uniqueVisitors, "uniqueVisitors"),
      bookingRequests: count(data.bookingRequests, "bookingRequests"),
      leadEnquiries: count(data.leadEnquiries, "leadEnquiries"),
      serviceRequests,
    });
  }

  const days: BusinessAnalytics["daily"] = [];
  const serviceTotals = new Map<string, number>();
  let views = 0;
  let uniqueVisitors = 0;
  let bookingRequests = 0;
  let leadEnquiries = 0;
  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const day = date.toISOString().slice(0, 10);
    const metric = dailyByDay.get(day);
    const dayViews = metric?.views ?? 0;
    const dayBookings = metric?.bookingRequests ?? 0;
    views += dayViews;
    uniqueVisitors += metric?.uniqueVisitors ?? 0;
    bookingRequests += dayBookings;
    leadEnquiries += metric?.leadEnquiries ?? 0;
    days.push({ day, views: dayViews, bookingRequests: dayBookings });
    for (const [serviceId, requests] of Object.entries(metric?.serviceRequests ?? {})) {
      serviceTotals.set(serviceId, (serviceTotals.get(serviceId) ?? 0) + requests);
    }
  }

  const requestedServices = [...serviceTotals.entries()]
    .map(([serviceId, requests]) => ({
      name: serviceId === "direct_enquiry" ? "Direct enquiries" : serviceNames.get(serviceId) ?? "Removed service",
      requests,
    }))
    .sort((left, right) => right.requests - left.requests || left.name.localeCompare(right.name))
    .slice(0, 5);

  return {
    businessId: business.id,
    businessName: business.name,
    views,
    uniqueVisitors,
    bookingRequests,
    leadEnquiries,
    daily: days.slice(-14),
    requestedServices,
  };
}

export async function getDashboardData(ownerId?: string) {
  const businesses = ownerId
    ? (await businessesCollection().where("ownerId", "==", ownerId).get()).docs.map(businessFromSnapshot)
    : await getBusinesses();
  const businessIds = new Set(businesses.map((business) => business.id));
  const leads = (await getLeads()).filter((lead) => businessIds.has(lead.businessId));
  const businessAnalytics = ownerId
    ? await Promise.all(businesses.map(getBusinessAnalytics))
    : [];

  return {
    businessCount: businesses.length,
    leadCount: leads.length,
    businesses,
    leads: leads.slice(0, 4),
    businessAnalytics,
  };
}
