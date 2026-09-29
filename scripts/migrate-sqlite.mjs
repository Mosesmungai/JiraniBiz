import path from "node:path";
import Database from "better-sqlite3";
import { migrateSqliteDatabase } from "./sqlite-migrations.mjs";

const databasePath = path.resolve(process.env.JIRANIBIZ_SQLITE_PATH ?? "src/data/jiranibiz.db");
const db = new Database(databasePath);

try {
  const result = migrateSqliteDatabase(db);
  console.log(JSON.stringify({ databasePath, ...result }, null, 2));
} finally {
  db.close();
}
