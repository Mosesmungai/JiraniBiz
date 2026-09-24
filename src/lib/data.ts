export type CategoryName = "Cleaning" | "Plumbing" | "Beauty" | "Repair" | "Events" | "Tutors";

export type Category = {
  name: CategoryName;
  subtitle: string;
  icon: CategoryName;
};

export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  x?: string;
  whatsapp?: string;
  website?: string;
};

export type BusinessVerification = {
  status: "pending" | "verified" | "rejected";
  required: boolean;
  gpsProof: {
    label: string;
    latitude: number;
    longitude: number;
  };
  photoUploads: string[];
};

export type Business = {
  id: string;
  slug: string;
  name: string;
  category: string;
  area: string;
  city: string;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  services: string[];
  priceFrom: number;
  verified: boolean;
  badge: string;
  phone?: string;
  email?: string;
  location: {
    label: string;
    latitude: number;
    longitude: number;
  };
  socials: SocialLinks;
  verification: BusinessVerification;
};

export const categories: Category[] = [
  { name: "Cleaning", subtitle: "Home and office care", icon: "Cleaning" },
  { name: "Plumbing", subtitle: "Repair and installation", icon: "Plumbing" },
  { name: "Beauty", subtitle: "Salons and grooming", icon: "Beauty" },
  { name: "Repair", subtitle: "Electrical and mechanics", icon: "Repair" },
  { name: "Events", subtitle: "Planning and coordination", icon: "Events" },
  { name: "Tutors", subtitle: "Learning and coaching", icon: "Tutors" },
];

export const stats = [
  { value: "12k+", label: "local leads tracked" },
  { value: "4.9/5", label: "average business rating" },
  { value: "1,200", label: "verified businesses" },
  { value: "24/7", label: "booking visibility" },
];

export const defaultBusinesses: Business[] = [
  {
    id: "1",
    slug: "westgate-cleaning-co",
    name: "Westgate Cleaning Co.",
    category: "Cleaning",
    area: "Westlands",
    city: "Nairobi",
    rating: 4.9,
    reviews: 126,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
    description: "Trusted home and office cleaning team for weekly, deep and move-in services.",
    services: ["Deep cleaning", "Office cleaning", "Move in/out"],
    priceFrom: 2200,
    verified: true,
    badge: "Verified",
    phone: "+254 700 123 456",
    email: "hello@westgatecleaning.co.ke",
    location: {
      label: "Westlands, Nairobi",
      latitude: -1.2648,
      longitude: 36.8073,
    },
    socials: {
      instagram: "https://instagram.com/westgatecleaning",
      facebook: "https://facebook.com/westgatecleaning",
      whatsapp: "https://wa.me/254700123456",
      website: "https://westgatecleaning.co.ke",
    },
    verification: {
      status: "verified",
      required: true,
      gpsProof: { label: "Westlands storefront", latitude: -1.2648, longitude: 36.8073 },
      photoUploads: ["front-door.jpg", "equipment-check.jpg"],
    },
  },
  {
    id: "2",
    slug: "nairobi-flow-plumbing",
    name: "Nairobi Flow Plumbing",
    category: "Plumbing",
    area: "Kilimani",
    city: "Nairobi",
    rating: 4.8,
    reviews: 94,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
    description: "Fast response plumbing support for homes and commercial properties across Nairobi.",
    services: ["Leak repair", "Pipe fitting", "Water heater service"],
    priceFrom: 2800,
    verified: true,
    badge: "Top rated",
    phone: "+254 722 998 112",
    email: "support@nairoflowplumbing.co.ke",
    location: {
      label: "Kilimani, Nairobi",
      latitude: -1.2926,
      longitude: 36.7876,
    },
    socials: {
      instagram: "https://instagram.com/nairoflowplumbing",
      facebook: "https://facebook.com/nairoflowplumbing",
      whatsapp: "https://wa.me/254722998112",
      website: "https://nairoflowplumbing.co.ke",
    },
    verification: {
      status: "verified",
      required: true,
      gpsProof: { label: "Kilimani workshop", latitude: -1.2926, longitude: 36.7876 },
      photoUploads: ["workshop.jpg", "service-truck.jpg"],
    },
  },
  {
    id: "3",
    slug: "harbor-looks-salon",
    name: "Harbor Looks Salon",
    category: "Beauty",
    area: "Mombasa",
    city: "Mombasa",
    rating: 4.9,
    reviews: 201,
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
    description: "Modern styling, grooming and beauty care with same-day appointments available.",
    services: ["Hair styling", "Bridal glam", "Nail care"],
    priceFrom: 1800,
    verified: true,
    badge: "Popular",
    phone: "+254 712 440 890",
    email: "bookings@harborlooks.co.ke",
    location: {
      label: "Mombasa CBD, Mombasa",
      latitude: -4.0435,
      longitude: 39.6682,
    },
    socials: {
      instagram: "https://instagram.com/harborlooks",
      facebook: "https://facebook.com/harborlooks",
      whatsapp: "https://wa.me/254712440890",
      website: "https://harborlooks.co.ke",
    },
    verification: {
      status: "verified",
      required: true,
      gpsProof: { label: "Mombasa CBD salon", latitude: -4.0435, longitude: 39.6682 },
      photoUploads: ["salon-entry.jpg", "beauty-suite.jpg"],
    },
  },
  {
    id: "4",
    slug: "copperline-electrics",
    name: "Copperline Electrics",
    category: "Repair",
    area: "Roysambu",
    city: "Nairobi",
    rating: 4.7,
    reviews: 58,
    image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80",
    description: "Electrical repairs, appliance checks and commercial wiring for businesses and homes.",
    services: ["Wiring", "Lighting", "Appliance repair"],
    priceFrom: 3000,
    verified: false,
    badge: "New",
    phone: "+254 734 991 005",
    email: "team@copperlineelectrics.co.ke",
    location: {
      label: "Roysambu, Nairobi",
      latitude: -1.2271,
      longitude: 36.8998,
    },
    socials: {
      instagram: "https://instagram.com/copperlineelectrics",
      facebook: "https://facebook.com/copperlineelectrics",
      whatsapp: "https://wa.me/254734991005",
      website: "https://copperlineelectrics.co.ke",
    },
    verification: {
      status: "pending",
      required: true,
      gpsProof: { label: "Roysambu office", latitude: -1.2271, longitude: 36.8998 },
      photoUploads: ["site-visit-1.jpg"],
    },
  },
  {
    id: "5",
    slug: "pearl-events-ke",
    name: "Pearl Events KE",
    category: "Events",
    area: "CBD",
    city: "Nairobi",
    rating: 4.9,
    reviews: 164,
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    description: "Corporate and private event planning for celebrations, launches and team gatherings.",
    services: ["Wedding setup", "Corporate events", "Venue styling"],
    priceFrom: 9000,
    verified: true,
    badge: "Best in city",
    phone: "+254 715 204 776",
    email: "events@pearlevents.co.ke",
    location: {
      label: "CBD, Nairobi",
      latitude: -1.2864,
      longitude: 36.8172,
    },
    socials: {
      instagram: "https://instagram.com/pearleventske",
      facebook: "https://facebook.com/pearleventske",
      whatsapp: "https://wa.me/254715204776",
      website: "https://pearlevents.co.ke",
    },
    verification: {
      status: "verified",
      required: true,
      gpsProof: { label: "Nairobi CBD office", latitude: -1.2864, longitude: 36.8172 },
      photoUploads: ["studio.jpg", "event-setup.jpg"],
    },
  },
  {
    id: "6",
    slug: "next-step-academy",
    name: "Next Step Academy",
    category: "Tutors",
    area: "Kisumu",
    city: "Kisumu",
    rating: 4.8,
    reviews: 73,
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    description: "Focused academic coaching for exam prep, literacy support and subject reinforcement.",
    services: ["KCSE revision", "Primary coaching", "Study plans"],
    priceFrom: 1500,
    verified: true,
    badge: "Trusted",
    phone: "+254 734 701 245",
    email: "contact@nextstepacademy.co.ke",
    location: {
      label: "Kisumu Central, Kisumu",
      latitude: -0.1022,
      longitude: 34.7617,
    },
    socials: {
      instagram: "https://instagram.com/nextstepacademy",
      facebook: "https://facebook.com/nextstepacademy",
      whatsapp: "https://wa.me/254734701245",
      website: "https://nextstepacademy.co.ke",
    },
    verification: {
      status: "verified",
      required: true,
      gpsProof: { label: "Kisumu learning hub", latitude: -0.1022, longitude: 34.7617 },
      photoUploads: ["classroom.jpg", "facade.jpg"],
    },
  },
];

export const allBusinesses = defaultBusinesses;
export const featuredBusinesses = defaultBusinesses.slice(0, 3);
