import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

import { defaultBusinesses } from "@/lib/data";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DB_PATH = path.join(DATA_DIR, "jiranibiz.db");

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );
`);

function seedBusinesses() {
  const count = (db.prepare("SELECT COUNT(*) AS count FROM businesses").get() as { count: number } | null)?.count ?? 0;

  if (count > 0) {
    return;
  }

  const insert = db.prepare("INSERT INTO businesses (id, slug, payload) VALUES (@id, @slug, @payload)");
  for (const business of defaultBusinesses) {
    insert.run({
      id: business.id,
      slug: business.slug,
      payload: JSON.stringify(business),
    });
  }
}

seedBusinesses();

export function getDb() {
  return db;
}

export function parsePayload<T>(value: string): T {
  return JSON.parse(value) as T;
}
