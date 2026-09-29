import { createHash } from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { classifyExistingDocuments } from "./firestore-import-core.mjs";
import { SQLITE_SCHEMA_VERSION } from "./sqlite-migrations.mjs";

const PROJECT_ID = "jiranibiz";
const databasePath = path.resolve(process.env.JIRANIBIZ_SQLITE_PATH ?? "src/data/jiranibiz.db");
const writeMode = process.argv.includes("--write");
const dryRunMode = process.argv.includes("--dry-run") || !writeMode;

function groupBy(items, keySelector) {
  const groups = new Map();
  for (const item of items) {
    const key = keySelector(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

function parseObject(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is missing.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} contains invalid JSON.`, { cause: error });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is missing.`);
  }
  return value;
}

function requiredNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} is invalid.`);
  return number;
}

function sourceItems(db) {
  const version = db.pragma("user_version", { simple: true });
  if (version !== SQLITE_SCHEMA_VERSION) {
    throw new Error(
      `SQLite schema version ${version} is not ready for import; run "npm run migrate:sqlite" first.`,
    );
  }

  const items = [];
  const sourceIds = new Set();
  const add = (collection, id, data, source = collection) => {
    const documentId = requiredString(id, `${source} document ID`);
    if (documentId.includes("/")) throw new Error(`${source} document ID cannot contain "/".`);
    const key = `${collection}/${documentId}`;
    if (sourceIds.has(key)) throw new Error(`Duplicate source document ID ${key}.`);
    sourceIds.add(key);
    items.push({ collection, id: documentId, data, source });
  };

  for (const row of db.prepare("SELECT * FROM businesses").all()) {
    const payload = parseObject(row.payload, `Business ${row.id} payload`);
    const location = row.location
      ? parseObject(row.location, `Business ${row.id} location`)
      : payload.location;
    const socials = payload.socials ?? {};
    const verification = payload.verification;
    if (
      !verification ||
      !verification.gpsProof ||
      !Array.isArray(verification.photoUploads) ||
      !Array.isArray(payload.services) ||
      payload.services.some((service) => typeof service !== "string") ||
      !location ||
      typeof location !== "object" ||
      Array.isArray(location) ||
      typeof socials !== "object" ||
      Array.isArray(socials)
    ) {
      throw new Error(`Business ${row.id} has incomplete verification data.`);
    }
    if (!["Kenya", "Uganda", "Tanzania"].includes(row.country)) {
      throw new Error(`Business ${row.id} has an unsupported country.`);
    }
    const data = {
      id: row.id,
      slug: requiredString(row.slug, `Business ${row.id} slug`),
      name: requiredString(row.name, `Business ${row.id} name`),
      category: requiredString(row.category, `Business ${row.id} category`),
      area: requiredString(row.area, `Business ${row.id} area`),
      city: requiredString(row.city, `Business ${row.id} city`),
      country: requiredString(row.country, `Business ${row.id} country`),
      rating: requiredNumber(row.rating, `Business ${row.id} rating`),
      reviews: requiredNumber(row.reviews, `Business ${row.id} reviews`),
      image: requiredString(payload.image, `Business ${row.id} image`),
      description: String(row.description ?? ""),
      services: Array.isArray(payload.services) ? payload.services : [],
      priceFrom: requiredNumber(row.price_from, `Business ${row.id} price`),
      verified: Boolean(row.verified),
      badge: requiredString(row.badge, `Business ${row.id} badge`),
      ...(typeof row.phone === "string" ? { phone: row.phone } : {}),
      ...(typeof row.email === "string" ? { email: row.email } : {}),
      location,
      socials,
      verification,
      ...(typeof row.owner_id === "string" ? { ownerId: row.owner_id } : {}),
      createdAt: String(row.created_at ?? new Date().toISOString()),
    };
    add("businesses", row.id, data);
    add("businessSlugs", row.slug, { businessId: row.id }, "business slug index");
  }

  for (const row of db.prepare("SELECT * FROM users").all()) {
    const email = requiredString(row.email, `User ${row.id} email`).trim().toLowerCase();
    const data = {
      id: row.id,
      name: requiredString(row.name, `User ${row.id} name`),
      email,
      phone: row.phone ?? null,
      role: requiredString(row.role, `User ${row.id} role`),
      passwordHash: row.password_hash ?? null,
      createdAt: String(row.created_at),
    };
    add("users", row.id, data);
    add("userEmails", createHash("sha256").update(email).digest("hex"), { userId: row.id, email }, "user email index");
  }

  for (const row of db.prepare("SELECT * FROM sessions").all()) {
    add("sessions", row.token_hash, {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    });
  }

  for (const row of db.prepare("SELECT * FROM services").all()) {
    add("services", row.id, {
      businessId: row.business_id,
      name: row.name,
      description: row.description ?? "",
      price: row.price ?? 0,
      createdAt: String(row.created_at),
    });
  }

  for (const row of db.prepare("SELECT * FROM leads").all()) {
    add("leads", row.id, {
      businessId: row.business_id,
      ...(typeof row.customer_id === "string" ? { customerId: row.customer_id } : {}),
      name: row.name,
      phone: row.phone,
      message: row.message,
      status: row.status,
      createdAt: String(row.created_at),
    });
  }

  for (const row of db.prepare("SELECT * FROM bookings").all()) {
    add("bookings", row.id, {
      businessId: row.business_id,
      customerId: row.customer_id ?? null,
      serviceId: row.service_id ?? null,
      scheduledAt: row.scheduled_at,
      status: row.status,
      notes: row.notes ?? "",
      createdAt: String(row.created_at),
    });
  }

  for (const row of db.prepare("SELECT * FROM reviews").all()) {
    add("reviews", row.id, {
      businessId: row.business_id,
      customerId: row.customer_id ?? null,
      rating: row.rating,
      comment: row.comment ?? "",
      createdAt: String(row.created_at),
    });
  }

  return items;
}

function firebaseDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin configuration is missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in a secure environment.",
    );
  }
  if (projectId !== PROJECT_ID) {
    throw new Error(`Refusing to import into project ${projectId}; expected ${PROJECT_ID}.`);
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
  return getFirestore(app);
}

async function preflight(db, items) {
  const existingDocuments = [];
  const grouped = groupBy(items, (item) => item.collection);
  for (const [collectionName, collectionItems] of grouped) {
    for (let offset = 0; offset < collectionItems.length; offset += 100) {
      const chunk = collectionItems.slice(offset, offset + 100);
      const snapshots = await db.getAll(...chunk.map((item) => db.collection(collectionName).doc(item.id)));
      for (const snapshot of snapshots) {
        if (snapshot.exists) {
          existingDocuments.push({
            collection: collectionName,
            id: snapshot.id,
            data: snapshot.data(),
          });
        }
      }
    }
  }
  return classifyExistingDocuments(items, existingDocuments);
}

async function writeItems(db, items) {
  let imported = 0;
  for (let offset = 0; offset < items.length; offset += 400) {
    const chunk = items.slice(offset, offset + 400);
    const batch = db.batch();
    for (const item of chunk) {
      batch.create(db.collection(item.collection).doc(item.id), item.data);
    }
    await batch.commit();
    imported += chunk.length;
    console.log(`Imported ${imported} of ${items.length} documents.`);
  }
  return imported;
}

async function main() {
  if (writeMode && process.argv.includes("--dry-run")) {
    throw new Error("Choose either --write or --dry-run, not both.");
  }
  const db = new Database(databasePath, { readonly: true, fileMustExist: true });
  let items;
  try {
    items = sourceItems(db);
  } finally {
    db.close();
  }

  const counts = Object.fromEntries(
    Array.from(groupBy(items, (item) => item.collection), ([collection, records]) => [collection, records.length]),
  );
  if (dryRunMode) {
    console.log(JSON.stringify({ mode: "dry-run", databasePath, documentCounts: counts }, null, 2));
    return;
  }

  const firestore = firebaseDb();
  try {
    const { existing, conflicts } = await preflight(firestore, items);
    if (conflicts.length) {
      console.error("Import stopped before writing; these Firestore document IDs already contain different data:");
      for (const conflict of conflicts) console.error(`- ${conflict}`);
      throw new Error(`${conflicts.length} Firestore document conflict(s) must be resolved before import.`);
    }

    const pending = items.filter((item) => !existing.has(`${item.collection}/${item.id}`));
    const imported = await writeItems(firestore, pending);
    console.log(JSON.stringify({
      mode: "write",
      projectId: PROJECT_ID,
      sourceDocuments: items.length,
      existingIdenticalDocuments: existing.size,
      importedDocuments: imported,
      documentCounts: counts,
    }, null, 2));
  } finally {
    await firestore.terminate();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "SQLite-to-Firestore import failed.");
  process.exitCode = 1;
});
