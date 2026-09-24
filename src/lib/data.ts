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
  country: "Kenya" | "Uganda" | "Tanzania";
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
  { value: "3", label: "countries served" },
  { value: "4.8/5", label: "average business rating" },
  { value: "8", label: "business profiles" },
  { value: "900+", label: "customer reviews" },
];

export const defaultBusinesses: Business[] = [
  {
    id: "1",
    slug: "westgate-cleaning-co",
    name: "Westgate Cleaning Co.",
    category: "Cleaning",
    area: "Westlands",
    city: "Nairobi",
    country: "Kenya",
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
      label: "Westlands, Nairobi, Kenya",
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
    country: "Kenya",
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
      label: "Kilimani, Nairobi, Kenya",
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
    country: "Kenya",
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
      label: "Mombasa CBD, Mombasa, Kenya",
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
    slug: "kampala-homecare-hub",
    name: "Kampala HomeCare Hub",
    category: "Cleaning",
    area: "Makindye",
    city: "Kampala",
    country: "Uganda",
    rating: 4.8,
    reviews: 142,
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80",
    description: "Residential and office cleaning support for families, landlords and growing businesses in Kampala.",
    services: ["Deep cleaning", "Office upkeep", "Laundry support"],
    priceFrom: 2400,
    verified: true,
    badge: "Verified",
    phone: "+256 772 889 401",
    email: "hello@kampalahomecare.ug",
    location: {
      label: "Makindye, Kampala, Uganda",
      latitude: 0.29258,
      longitude: 32.6136,
    },
    socials: {
      instagram: "https://instagram.com/kampalahomecare",
      facebook: "https://facebook.com/kampalahomecare",
      whatsapp: "https://wa.me/256772889401",
      website: "https://kampalahomecare.ug",
    },
    verification: {
      status: "verified",
      required: true,
      gpsProof: { label: "Makindye service hub", latitude: 0.29258, longitude: 32.6136 },
      photoUploads: ["service-hub.jpg", "team-photo.jpg"],
    },
  },
  {
    id: "5",
    slug: "dar-peak-events",
    name: "Dar Peak Events",
    category: "Events",
    area: "Mikocheni",
    city: "Dar es Salaam",
    country: "Tanzania",
    rating: 4.9,
    reviews: 188,
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    description: "Private and corporate event planning with venue styling, logistics and guest coordination.",
    services: ["Wedding planning", "Launch events", "Venue styling"],
    priceFrom: 9800,
    verified: true,
    badge: "Top rated",
    phone: "+255 712 331 445",
    email: "bookings@darpeakevents.tz",
    location: {
      label: "Mikocheni, Dar es Salaam, Tanzania",
      latitude: -6.7397,
      longitude: 39.2201,
    },
    socials: {
      instagram: "https://instagram.com/darpeakevents",
      facebook: "https://facebook.com/darpeakevents",
      whatsapp: "https://wa.me/255712331445",
      website: "https://darpeakevents.tz",
    },
    verification: {
      status: "verified",
      required: true,
      gpsProof: { label: "Mikocheni event studio", latitude: -6.7397, longitude: 39.2201 },
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
    country: "Kenya",
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
      label: "Kisumu Central, Kisumu, Kenya",
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
  {
    id: "7",
    slug: "arusha-electric-works",
    name: "Arusha Electric Works",
    category: "Repair",
    area: "Sombetini",
    city: "Arusha",
    country: "Tanzania",
    rating: 4.7,
    reviews: 66,
    image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80",
    description: "Electrical repairs, wiring and upgrades for homes, retail shops and small offices.",
    services: ["Wiring", "Lighting", "Appliance repair"],
    priceFrom: 3200,
    verified: true,
    badge: "Service award",
    phone: "+255 753 202 110",
    email: "support@arushaelectricworks.tz",
    location: {
      label: "Sombetini, Arusha, Tanzania",
      latitude: -3.3869,
      longitude: 36.682,
    },
    socials: {
      instagram: "https://instagram.com/arushaelectricworks",
      facebook: "https://facebook.com/arushaelectricworks",
      whatsapp: "https://wa.me/255753202110",
      website: "https://arushaelectricworks.tz",
    },
    verification: {
      status: "verified",
      required: true,
      gpsProof: { label: "Sombetini workshop", latitude: -3.3869, longitude: 36.682 },
      photoUploads: ["workshop.jpg", "field-service.jpg"],
    },
  },
  {
    id: "8",
    slug: "entebbe-legal-support",
    name: "Entebbe Legal Support",
    category: "Tutors",
    area: "Entebbe",
    city: "Entebbe",
    country: "Uganda",
    rating: 4.9,
    reviews: 98,
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    description: "Academic and professional coaching for exam preparation, CV support and interview readiness.",
    services: ["Exam prep", "CV writing", "Interview coaching"],
    priceFrom: 1700,
    verified: true,
    badge: "Recommended",
    phone: "+256 704 441 881",
    email: "coaching@entebbelsupport.ug",
    location: {
      label: "Entebbe, Uganda",
      latitude: 0.0515,
      longitude: 32.4605,
    },
    socials: {
      instagram: "https://instagram.com/entebbelsupport",
      facebook: "https://facebook.com/entebbelsupport",
      whatsapp: "https://wa.me/256704441881",
      website: "https://entebbelsupport.ug",
    },
    verification: {
      status: "verified",
      required: true,
      gpsProof: { label: "Entebbe learning center", latitude: 0.0515, longitude: 32.4605 },
      photoUploads: ["center.jpg", "meeting-room.jpg"],
    },
  },
];

export const allBusinesses = defaultBusinesses;
export const featuredBusinesses = defaultBusinesses.slice(0, 3);
