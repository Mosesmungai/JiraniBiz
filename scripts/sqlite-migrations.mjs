export const SQLITE_SCHEMA_VERSION = 1;

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80";

const tableDefinitions = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'business_owner', 'admin')) DEFAULT 'customer',
    password_hash TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS businesses (
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
  )`,
  `CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
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
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
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
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    customer_id TEXT,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL
  )`,
];

const legacyColumns = {
  businesses: {
    owner_id: "TEXT",
    name: "TEXT NOT NULL DEFAULT ''",
    category: "TEXT NOT NULL DEFAULT ''",
    area: "TEXT NOT NULL DEFAULT ''",
    city: "TEXT NOT NULL DEFAULT ''",
    country: "TEXT NOT NULL DEFAULT 'Kenya'",
    rating: "REAL NOT NULL DEFAULT 0",
    reviews: "INTEGER NOT NULL DEFAULT 0",
    description: "TEXT NOT NULL DEFAULT ''",
    price_from: "REAL NOT NULL DEFAULT 0",
    verified: "INTEGER NOT NULL DEFAULT 0",
    badge: "TEXT NOT NULL DEFAULT 'New'",
    phone: "TEXT",
    email: "TEXT",
    location: "TEXT",
    payload: "TEXT",
    created_at: "TEXT",
  },
  leads: {
    payload: "TEXT",
    business_id: "TEXT",
    customer_id: "TEXT",
    name: "TEXT",
    phone: "TEXT",
    message: "TEXT",
    status: "TEXT",
    created_at: "TEXT",
  },
};

function columnsFor(db, table) {
  return new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((column) => column.name));
}

function addMissingColumns(db, table, definitions) {
  const columns = columnsFor(db, table);
  for (const [name, declaration] of Object.entries(definitions)) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${declaration}`);
    }
  }
}

function parsePayload(table, id, value) {
  if (value === null || value === undefined || value === "") return {};

  try {
    const payload = JSON.parse(value);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("payload must be a JSON object");
    }
    return payload;
  } catch (error) {
    throw new Error(`Cannot migrate ${table} record ${id}: invalid JSON payload.`, { cause: error });
  }
}

function valueFrom(payload, row, ...keys) {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null) return payload[key];
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
}

function requiredText(value, table, id, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Cannot migrate ${table} record ${id}: ${field} is missing.`);
  }
  return value.trim();
}

function migrateBusinesses(db) {
  addMissingColumns(db, "businesses", legacyColumns.businesses);
  const rows = db.prepare("SELECT * FROM businesses").all();
  const update = db.prepare(`
    UPDATE businesses SET
      owner_id = ?, name = ?, category = ?, area = ?, city = ?, country = ?,
      rating = ?, reviews = ?, description = ?, price_from = ?, verified = ?,
      badge = ?, phone = ?, email = ?, location = ?, created_at = ?
    WHERE id = ?
  `);

  for (const row of rows) {
    const payload = parsePayload("businesses", row.id, row.payload);
    const slug = requiredText(row.slug ?? payload.slug, "businesses", row.id, "slug");
    const payloadSlug = payload.slug;
    if (payloadSlug && payloadSlug !== slug) {
      throw new Error(`Cannot migrate businesses record ${row.id}: payload slug does not match its indexed slug.`);
    }

    const location = valueFrom(payload, row, "location");
    const locationObject = typeof location === "string"
      ? parsePayload("businesses", row.id, location)
      : location;
    if (!locationObject || typeof locationObject !== "object" || Array.isArray(locationObject)) {
      throw new Error(`Cannot migrate businesses record ${row.id}: location is missing or invalid.`);
    }
    const verified = Boolean(valueFrom(payload, row, "verified"));
    const services = valueFrom(payload, row, "services") ?? [];
    if (!Array.isArray(services) || services.some((service) => typeof service !== "string")) {
      throw new Error(`Cannot migrate businesses record ${row.id}: services are invalid.`);
    }
    const socials = valueFrom(payload, row, "socials") ?? {
      instagram: "",
      facebook: "",
      x: "",
      whatsapp: "",
      website: "",
    };
    if (!socials || typeof socials !== "object" || Array.isArray(socials)) {
      throw new Error(`Cannot migrate businesses record ${row.id}: socials are invalid.`);
    }
    const verification = valueFrom(payload, row, "verification") ?? {
      status: verified ? "verified" : "pending",
      required: !verified,
      gpsProof: locationObject,
      photoUploads: [],
    };
    if (
      !verification ||
      typeof verification !== "object" ||
      Array.isArray(verification) ||
      !verification.gpsProof ||
      !Array.isArray(verification.photoUploads)
    ) {
      throw new Error(`Cannot migrate businesses record ${row.id}: verification data is invalid.`);
    }
    const normalizedPayload = {
      ...payload,
      image: valueFrom(payload, row, "image") ?? DEFAULT_IMAGE,
      services,
      socials,
      verification,
    };
    const createdAt = valueFrom(payload, row, "createdAt", "created_at") ?? new Date().toISOString();
    update.run(
      valueFrom(payload, row, "ownerId", "owner_id") ?? null,
      requiredText(valueFrom(payload, row, "name"), "businesses", row.id, "name"),
      requiredText(valueFrom(payload, row, "category"), "businesses", row.id, "category"),
      requiredText(valueFrom(payload, row, "area"), "businesses", row.id, "area"),
      requiredText(valueFrom(payload, row, "city"), "businesses", row.id, "city"),
      valueFrom(payload, row, "country") ?? "Kenya",
      Number(valueFrom(payload, row, "rating") ?? 0),
      Number(valueFrom(payload, row, "reviews") ?? 0),
      String(valueFrom(payload, row, "description") ?? ""),
      Number(valueFrom(payload, row, "priceFrom", "price_from") ?? 0),
      verified ? 1 : 0,
      String(valueFrom(payload, row, "badge") ?? "New"),
      valueFrom(payload, row, "phone") ?? null,
      valueFrom(payload, row, "email") ?? null,
      JSON.stringify(locationObject),
      String(createdAt),
      row.id,
    );
    db.prepare("UPDATE businesses SET payload = ? WHERE id = ?").run(JSON.stringify(normalizedPayload), row.id);
  }

  return rows.length;
}

function migrateLeads(db) {
  addMissingColumns(db, "leads", legacyColumns.leads);
  const businessRows = db.prepare("SELECT id, slug FROM businesses").all();
  const businessIdsBySlug = new Map(businessRows.map((business) => [business.slug, business.id]));
  const businessIds = new Set(businessRows.map((business) => business.id));
  const rows = db.prepare("SELECT * FROM leads").all();
  const update = db.prepare(`
    UPDATE leads SET business_id = ?, customer_id = ?, name = ?, phone = ?,
      message = ?, status = ?, created_at = ?
    WHERE id = ?
  `);
  const statuses = new Set(["New", "Contacted", "Booked", "Closed"]);

  for (const row of rows) {
    const payload = parsePayload("leads", row.id, row.payload);
    const requestedBusinessId = valueFrom(payload, row, "businessId", "business_id");
    const businessId = businessIds.has(requestedBusinessId)
      ? requestedBusinessId
      : businessIdsBySlug.get(valueFrom(payload, row, "businessSlug", "business_slug"));
    if (!businessId) {
      throw new Error(`Cannot migrate leads record ${row.id}: its business reference cannot be resolved.`);
    }

    const status = valueFrom(payload, row, "status") ?? "New";
    if (!statuses.has(status)) {
      throw new Error(`Cannot migrate leads record ${row.id}: unsupported status.`);
    }

    update.run(
      businessId,
      valueFrom(payload, row, "customerId", "customer_id") ?? null,
      requiredText(valueFrom(payload, row, "name"), "leads", row.id, "name"),
      requiredText(valueFrom(payload, row, "phone"), "leads", row.id, "phone"),
      requiredText(valueFrom(payload, row, "message"), "leads", row.id, "message"),
      status,
      String(valueFrom(payload, row, "createdAt", "created_at") ?? new Date().toISOString()),
      row.id,
    );
  }

  return rows.length;
}

export function migrateSqliteDatabase(db) {
  const fromVersion = db.pragma("user_version", { simple: true });
  if (fromVersion > SQLITE_SCHEMA_VERSION) {
    throw new Error(`SQLite schema version ${fromVersion} is newer than supported version ${SQLITE_SCHEMA_VERSION}.`);
  }
  if (fromVersion === SQLITE_SCHEMA_VERSION) {
    return { fromVersion, toVersion: fromVersion, businessesMigrated: 0, leadsMigrated: 0 };
  }

  db.pragma("foreign_keys = ON");
  const migration = db.transaction(() => {
    for (const definition of tableDefinitions) db.exec(definition);
    const businessesMigrated = migrateBusinesses(db);
    const leadsMigrated = migrateLeads(db);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);
      CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
      CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
      CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);
      CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(business_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_business ON bookings(business_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
    `);
    db.pragma(`user_version = ${SQLITE_SCHEMA_VERSION}`);
    return { businessesMigrated, leadsMigrated };
  });
  const { businessesMigrated, leadsMigrated } = migration();

  return {
    fromVersion,
    toVersion: SQLITE_SCHEMA_VERSION,
    businessesMigrated,
    leadsMigrated,
  };
}
