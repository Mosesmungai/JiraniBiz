import { defaultBusinesses, type Business } from "@/lib/data";
import { businessesCollection, leadsCollection } from "@/lib/firestore";
import { geocodeBusinessLocation } from "@/lib/location";

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

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80";
const EMPTY_SOCIALS = { instagram: "", facebook: "", x: "", whatsapp: "", website: "" };

function mapBusiness(data: Record<string, any>): Business {
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    category: data.category,
    city: data.city,
    area: data.area,
    country: data.country,
    rating: data.rating ?? 0,
    reviews: data.reviews ?? 0,
    image: data.image ?? DEFAULT_IMAGE,
    description: data.description ?? "",
    services: data.services ?? [],
    priceFrom: data.priceFrom ?? 0,
    verified: Boolean(data.verified),
    badge: data.badge ?? "New",
    phone: data.phone ?? "",
    email: data.email ?? "",
    location: data.location ?? undefined,
    socials: data.socials ?? EMPTY_SOCIALS,
    verification: data.verification ?? {
      status: data.verified ? "verified" : "pending",
      required: !data.verified,
      photoUploads: [],
    },
  };
}

export async function getBusinesses(): Promise<Business[]> {
  const snapshot = await businessesCollection().get();
  return snapshot.docs
    .map((doc) => mapBusiness(doc.data()))
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const snapshot = await businessesCollection().where("slug", "==", slug).limit(1).get();
  return snapshot.empty ? null : mapBusiness(snapshot.docs[0].data());
}

export async function getLeads(): Promise<Lead[]> {
  const snapshot = await leadsCollection().get();
  return snapshot.docs
    .map((doc) => doc.data() as Lead)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function createLead(input: {
  businessSlug: string;
  name: string;
  phone: string;
  message: string;
  customerId?: string;
}) {
  const businessSnapshot = await businessesCollection().where("slug", "==", input.businessSlug).limit(1).get();
  if (businessSnapshot.empty) throw new Error("Business not found");

  const business = businessSnapshot.docs[0].data();
  const nextLead: Lead = {
    id: `lead-${crypto.randomUUID()}`,
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

  await leadsCollection().doc(nextLead.id).set(nextLead);
  return nextLead;
}

export async function createBusiness(input: {
  ownerId?: string;
  name: string;
  category: string;
  city: string;
  area: string;
  description: string;
  phone: string;
  email: string;
  country?: "Kenya" | "Uganda" | "Tanzania";
  socials?: Partial<Business["socials"]>;
}) {
  const createdAt = Date.now();
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + `-${createdAt}`;
  const country = input.country ?? "Kenya";
  const location = await geocodeBusinessLocation(input.city, input.area, country);
  const id = `biz-${createdAt}`;
  const socials = {
    instagram: input.socials?.instagram ?? "",
    facebook: input.socials?.facebook ?? "",
    x: input.socials?.x ?? "",
    whatsapp: input.socials?.whatsapp ?? "",
    website: input.socials?.website ?? "",
  };
  const verification = { status: "pending", required: true, gpsProof: location, photoUploads: [] };

  const newBusiness: Business = {
    id,
    slug,
    name: input.name,
    category: input.category,
    city: input.city,
    area: input.area,
    country,
    rating: 0,
    reviews: 0,
    image: DEFAULT_IMAGE,
    description: input.description,
    services: [input.category],
    priceFrom: 0,
    verified: false,
    badge: "New",
    phone: input.phone,
    email: input.email,
    location,
    socials,
    verification,
  };

  await businessesCollection().doc(id).set({
    ...newBusiness,
    ownerId: input.ownerId ?? null,
    createdAt: new Date().toISOString(),
  });

  return newBusiness;
}

export async function getDashboardData(ownerId?: string) {
  const businesses = await getBusinesses();
  const leads = await getLeads();
  const ownedBusinesses = ownerId
    ? businesses.filter((business) => business && false)
    : businesses;

  let dashboardBusinesses = ownedBusinesses;
  if (ownerId) {
    const snapshot = await businessesCollection().where("ownerId", "==", ownerId).get();
    const ownedIds = new Set(snapshot.docs.map((doc) => doc.id));
    dashboardBusinesses = businesses.filter((business) => ownedIds.has(business.id));
  }

  const businessIds = new Set(dashboardBusinesses.map((business) => business.id));
  const ownedLeads = ownerId ? leads.filter((lead) => businessIds.has(lead.businessId)) : leads;

  return {
    businessCount: dashboardBusinesses.length,
    leadCount: ownedLeads.length,
    totalRevenue: dashboardBusinesses.reduce((sum, business) => sum + business.priceFrom, 0),
    businesses: dashboardBusinesses.slice(0, 5),
    leads: ownedLeads.slice(0, 4),
  };
}

export const seededBusinesses = defaultBusinesses;
