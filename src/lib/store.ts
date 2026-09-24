import { defaultBusinesses, type Business } from "@/lib/data";
import { getDb, parsePayload } from "@/lib/db";

export type Lead = {
  id: string;
  businessSlug: string;
  businessName: string;
  name: string;
  phone: string;
  message: string;
  status: "New" | "Contacted" | "Booked";
  createdAt: string;
};

export async function getBusinesses(): Promise<Business[]> {
  const rows = getDb().prepare("SELECT payload FROM businesses ORDER BY rowid DESC").all() as { payload: string }[];
  return rows.map((row) => parsePayload<Business>(row.payload));
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const business = getDb()
    .prepare("SELECT payload FROM businesses WHERE slug = ?")
    .get(slug) as { payload: string } | undefined;

  return business ? parsePayload<Business>(business.payload) : null;
}

export async function getLeads(): Promise<Lead[]> {
  const rows = getDb().prepare("SELECT payload FROM leads ORDER BY rowid DESC").all() as { payload: string }[];
  return rows.map((row) => parsePayload<Lead>(row.payload));
}

export async function createLead(input: {
  businessSlug: string;
  businessName: string;
  name: string;
  phone: string;
  message: string;
}) {
  const nextLead: Lead = {
    id: `lead-${Date.now()}`,
    businessSlug: input.businessSlug,
    businessName: input.businessName,
    name: input.name,
    phone: input.phone,
    message: input.message,
    status: "New",
    createdAt: new Date().toISOString(),
  };

  getDb().prepare("INSERT INTO leads (id, payload) VALUES (?, ?)").run(nextLead.id, JSON.stringify(nextLead));

  return nextLead;
}

export async function createBusiness(input: {
  name: string;
  category: string;
  city: string;
  area: string;
  description: string;
  phone: string;
  email: string;
  socials?: Partial<Business["socials"]>;
}) {
  const createdAt = Date.now();
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") + `-${createdAt}`;

  const newBusiness: Business = {
    id: `biz-${createdAt}`,
    slug,
    name: input.name,
    category: input.category,
    city: input.city,
    area: input.area,
    rating: 4.8,
    reviews: 0,
    image:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
    description: input.description,
    services: [input.category],
    priceFrom: 2500,
    verified: false,
    badge: "New",
    phone: input.phone,
    email: input.email,
    location: {
      label: `${input.area}, ${input.city}`,
      latitude: 0,
      longitude: 0,
    },
    socials: {
      instagram: input.socials?.instagram ?? "https://instagram.com",
      facebook: input.socials?.facebook ?? "https://facebook.com",
      x: input.socials?.x ?? "https://x.com",
      whatsapp: input.socials?.whatsapp ?? "https://wa.me/254700000000",
      website: input.socials?.website ?? "https://example.com",
    },
    verification: {
      status: "pending",
      required: true,
      gpsProof: {
        label: `${input.area}, ${input.city}`,
        latitude: 0,
        longitude: 0,
      },
      photoUploads: [],
    },
  };

  getDb().prepare("INSERT INTO businesses (id, slug, payload) VALUES (?, ?, ?)").run(newBusiness.id, newBusiness.slug, JSON.stringify(newBusiness));

  return newBusiness;
}

export async function getDashboardData() {
  const businesses = await getBusinesses();
  const leads = await getLeads();
  const totalRevenue = businesses.reduce((sum, business) => sum + business.priceFrom, 0);

  return {
    businessCount: businesses.length,
    leadCount: leads.length,
    totalRevenue,
    businesses: businesses.slice(0, 5),
    leads: leads.slice(0, 4),
  };
}

export const seededBusinesses = defaultBusinesses;
