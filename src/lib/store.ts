import { createHash, randomUUID } from "node:crypto";
import { FieldValue, type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { AuthUser } from "@/lib/auth";
import { getFirestoreDb } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";
import {
  bookingsCollection,
  businessPaymentsCollection,
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

export class BusinessNotFoundError extends Error {
  constructor() {
    super("Business not found");
    this.name = "BusinessNotFoundError";
  }
}

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

export class ServiceNotFoundError extends Error {
  constructor() {
    super("Selected service does not belong to this business.");
    this.name = "ServiceNotFoundError";
  }
}

export class NotBusinessOwnerError extends Error {
  constructor() {
    super("You do not own this business.");
    this.name = "NotBusinessOwnerError";
  }
}

export class DuplicateReviewError extends Error {
  constructor() {
    super("You have already reviewed this business.");
    this.name = "DuplicateReviewError";
  }
}

export class BusinessSlugConflictError extends Error {
  constructor() {
    super("A business with this slug already exists.");
    this.name = "BusinessSlugConflictError";
  }
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

function bookingFromSnapshot(snapshot: QueryDocumentSnapshot): Booking {
  const data = snapshot.data();
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
  await leadsCollection().doc(lead.id).create({
    businessId: lead.businessId,
    ...(input.customerId ? { customerId: input.customerId } : {}),
    name: lead.name,
    phone: lead.phone,
    message: lead.message,
    status: lead.status,
    createdAt: lead.createdAt,
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

export async function getDashboardData(ownerId?: string) {
  const businesses = ownerId
    ? (await businessesCollection().where("ownerId", "==", ownerId).get()).docs.map(businessFromSnapshot)
    : await getBusinesses();
  const businessIds = new Set(businesses.map((business) => business.id));
  const leads = (await getLeads()).filter((lead) => businessIds.has(lead.businessId));

  return {
    businessCount: businesses.length,
    leadCount: leads.length,
    totalRevenue: businesses.reduce((sum, business) => sum + business.priceFrom, 0),
    businesses,
    leads: leads.slice(0, 4),
  };
}
