import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DB_PATH = path.join(DATA_DIR, "jiranibiz.db");

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'business_owner', 'admin')) DEFAULT 'customer',
    password_hash TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    area TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 0,
    reviews INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    price_from REAL NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0,
    badge TEXT NOT NULL DEFAULT 'New',
    phone TEXT,
    email TEXT,
    location TEXT,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    customer_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('New', 'Contacted', 'Booked', 'Closed')) DEFAULT 'New',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    customer_id TEXT,
    service_id TEXT,
    scheduled_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Requested', 'Confirmed', 'Completed', 'Cancelled')) DEFAULT 'Requested',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    customer_id TEXT,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);
  CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
  CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
  CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);
  CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(business_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_business ON bookings(business_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
`);

export function getDb() {
  return db;
}

export function parsePayload<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  return JSON.parse(value) as T;
}
