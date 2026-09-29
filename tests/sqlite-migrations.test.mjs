import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { migrateSqliteDatabase, SQLITE_SCHEMA_VERSION } from "../scripts/sqlite-migrations.mjs";

function createLegacyDatabase() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE businesses (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE leads (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    INSERT INTO businesses (id, slug, payload) VALUES (
      'biz-1',
      'sample-business',
      '{"id":"biz-1","slug":"sample-business","name":"Sample Business","category":"Cleaning","area":"Westlands","city":"Nairobi","country":"Kenya","rating":4.5,"reviews":2,"image":"image.jpg","description":"Description","services":["Deep clean"],"priceFrom":2000,"verified":true,"badge":"Verified","phone":"+254700000000","email":"hello@example.test","location":{"label":"Nairobi","latitude":-1.2,"longitude":36.8},"socials":{"website":"https://example.test"},"verification":{"status":"verified","required":false,"gpsProof":{"label":"Nairobi","latitude":-1.2,"longitude":36.8},"photoUploads":[]}}'
    );
    INSERT INTO leads (id, payload) VALUES (
      'lead-1',
      '{"businessId":"biz-1","businessSlug":"sample-business","name":"A Customer","phone":"+254711111111","message":"Please call","status":"New","createdAt":"2025-01-01T00:00:00.000Z"}'
    );
  `);
  return db;
}

test("normalizes legacy business and lead payloads and can rerun safely", () => {
  const db = createLegacyDatabase();
  try {
    const result = migrateSqliteDatabase(db);
    assert.deepEqual(result, {
      fromVersion: 0,
      toVersion: SQLITE_SCHEMA_VERSION,
      businessesMigrated: 1,
      leadsMigrated: 1,
    });

    const business = db.prepare("SELECT id, slug, name, price_from, verified, location FROM businesses").get();
    assert.equal(business.id, "biz-1");
    assert.equal(business.slug, "sample-business");
    assert.equal(business.name, "Sample Business");
    assert.equal(business.price_from, 2000);
    assert.equal(business.verified, 1);
    assert.deepEqual(JSON.parse(business.location), {
      label: "Nairobi",
      latitude: -1.2,
      longitude: 36.8,
    });

    const lead = db.prepare("SELECT id, business_id, name, status, created_at FROM leads").get();
    assert.equal(lead.business_id, "biz-1");
    assert.equal(lead.name, "A Customer");
    assert.equal(lead.status, "New");
    assert.equal(lead.created_at, "2025-01-01T00:00:00.000Z");
    assert.equal(migrateSqliteDatabase(db).businessesMigrated, 0);
  } finally {
    db.close();
  }
});

test("rolls back a malformed payload without advancing the schema version", () => {
  const db = createLegacyDatabase();
  db.prepare("UPDATE businesses SET payload = ? WHERE id = ?").run("{broken", "biz-1");
  try {
    assert.throws(() => migrateSqliteDatabase(db), /invalid JSON payload/);
    assert.equal(db.pragma("user_version", { simple: true }), 0);
    assert.deepEqual(
      db.prepare("PRAGMA table_info(businesses)").all().map((column) => column.name),
      ["id", "slug", "payload"],
    );
  } finally {
    db.close();
  }
});

test("upgrades normalized records from an unversioned database without payload metadata", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE businesses (
      id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      category TEXT NOT NULL, area TEXT NOT NULL, city TEXT NOT NULL,
      country TEXT NOT NULL, rating REAL NOT NULL, reviews INTEGER NOT NULL,
      description TEXT NOT NULL, price_from REAL NOT NULL, verified INTEGER NOT NULL,
      badge TEXT NOT NULL, phone TEXT, email TEXT, location TEXT, payload TEXT
    );
    CREATE TABLE leads (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, customer_id TEXT,
      name TEXT NOT NULL, phone TEXT NOT NULL, message TEXT NOT NULL,
      status TEXT NOT NULL, created_at TEXT NOT NULL
    );
    INSERT INTO businesses VALUES (
      'biz-2', 'normalized-business', 'Normalized Business', 'Repair',
      'CBD', 'Nairobi', 'Kenya', 0, 0, '', 0, 0, 'New', NULL, NULL,
      '{"label":"Nairobi","latitude":-1.2,"longitude":36.8}', NULL
    );
    INSERT INTO leads VALUES (
      'lead-2', 'biz-2', NULL, 'Customer', '+254700000000',
      'Need a quote', 'New', '2025-01-01T00:00:00.000Z'
    );
  `);

  try {
    migrateSqliteDatabase(db);
    const business = db.prepare("SELECT payload FROM businesses WHERE id = ?").get("biz-2");
    const payload = JSON.parse(business.payload);
    assert.equal(typeof payload.image, "string");
    assert.deepEqual(payload.services, []);
    assert.deepEqual(payload.socials, {
      instagram: "",
      facebook: "",
      x: "",
      whatsapp: "",
      website: "",
    });
    assert.equal(payload.verification.gpsProof.label, "Nairobi");

    const lead = db.prepare("SELECT business_id, message FROM leads WHERE id = ?").get("lead-2");
    assert.equal(lead.business_id, "biz-2");
    assert.equal(lead.message, "Need a quote");
  } finally {
    db.close();
  }
});
