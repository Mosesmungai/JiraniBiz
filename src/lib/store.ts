import { defaultBusinesses, type Business } from "@/lib/data";
import { getDb } from "@/lib/db";
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

function mapBusiness(row: any): Business {
  const payload = row.payload ? JSON.parse(row.payload) : {};
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    city: row.city,
    area: row.area,
    country: row.country,
    rating: row.rating ?? 0,
    reviews: row.reviews ?? 0,
    image: payload.image ?? "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
    description: row.description ?? "",
    services: payload.services ?? [],
    priceFrom: row.price_from ?? 0,
    verified: Boolean(row.verified),
    badge: row.badge ?? "New",
    phone: row.phone ?? "",
    email: row.email ?? "",
    location: row.location ? JSON.parse(row.location) : undefined,
    socials: payload.socials ?? { instagram: "", facebook: "", x: "", whatsapp: "", website: "" },
    verification: payload.verification ?? {
      status: row.verified ? "verified" : "pending",
      required: !row.verified,
      photoUploads: [],
    },
  };
}

export async function getBusinesses(): Promise<Business[]> {
  const rows = getDb().prepare("SELECT * FROM businesses ORDER BY rowid DESC").all() as any[];
  return rows.map(mapBusiness);
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const row = getDb().prepare("SELECT * FROM businesses WHERE slug = ?").get(slug) as any;
  return row ? mapBusiness(row) : null;
}

export async function getLeads(): Promise<Lead[]> {
  const rows = getDb().prepare(`
    SELECT l.*, b.slug AS business_slug, b.name AS business_name
    FROM leads l
    JOIN businesses b ON b.id = l.business_id
    ORDER BY l.rowid DESC
  `).all() as any[];

  return rows.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    businessSlug: row.business_slug,
    businessName: row.business_name,
    customerId: row.customer_id ?? undefined,
    name: row.name,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function createLead(input: {
  businessSlug: string;
  name: string;
  phone: string;
  message: string;
  customerId?: string;
}) {
  const business = getDb()
    .prepare("SELECT id, slug, name FROM businesses WHERE slug = ?")
    .get(input.businessSlug) as { id: string; slug: string; name: string } | undefined;

  if (!business) throw new Error("Business not found");

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

  getDb().prepare(`
    INSERT INTO leads (id, business_id, customer_id, name, phone, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nextLead.id,
    nextLead.businessId,
    nextLead.customerId ?? null,
    nextLead.name,
    nextLead.phone,
    nextLead.message,
    nextLead.status,
    nextLead.createdAt,
  );

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
    image: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
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
  };

  getDb().prepare(`
    INSERT INTO businesses (
      id, owner_id, slug, name, category, area, city, country,
      rating, reviews, description, price_from, verified, badge,
      phone, email, location, payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.ownerId ?? null,
    slug,
    input.name,
    input.category,
    input.area,
    input.city,
    country,
    0,
    0,
    input.description,
    0,
    0,
    "New",
    input.phone,
    input.email,
    location ? JSON.stringify(location) : null,
    JSON.stringify({ image: newBusiness.image, services: newBusiness.services, socials: newBusiness.socials, verification: newBusiness.verification }),
  );

  return newBusiness;
}

export async function getDashboardData(ownerId?: string) {
  const businesses = await getBusinesses();
  const leads = await getLeads();
  const ownedBusinesses = ownerId
    ? businesses.filter((business) => {
        const row = getDb().prepare("SELECT owner_id FROM businesses WHERE id = ?").get(business.id) as { owner_id?: string } | undefined;
        return row?.owner_id === ownerId;
      })
    : businesses;
  const businessIds = new Set(ownedBusinesses.map((business) => business.id));
  const ownedLeads = ownerId ? leads.filter((lead) => businessIds.has(lead.businessId)) : leads;

  return {
    businessCount: ownedBusinesses.length,
    leadCount: ownedLeads.length,
    totalRevenue: ownedBusinesses.reduce((sum, business) => sum + business.priceFrom, 0),
    businesses: ownedBusinesses.slice(0, 5),
    leads: ownedLeads.slice(0, 4),
  };
}

export const seededBusinesses = defaultBusinesses;
