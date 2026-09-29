import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";

export type UserRole = "customer" | "business_owner" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
};

const SESSION_DAYS = 30;
const SESSION_COOKIE = "jiranibiz_session";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export function createUser(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: UserRole;
}) {
  const id = `user-${randomBytes(12).toString("hex")}`;
  const email = normalizeEmail(input.email);
  const role = input.role ?? "customer";

  if (!email || !input.name.trim()) throw new Error("Name and email are required");

  getDb().prepare(`
    INSERT INTO users (id, name, email, phone, role, password_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, input.name.trim(), email, input.phone?.trim() || null, role, hashPassword(input.password));

  return { id, name: input.name.trim(), email, phone: input.phone?.trim() || null, role } as AuthUser;
}

export function authenticateUser(emailInput: string, password: string): AuthUser | null {
  const email = normalizeEmail(emailInput);
  const user = getDb().prepare(`
    SELECT id, name, email, phone, role, password_hash
    FROM users WHERE email = ?
  `).get(email) as (AuthUser & { password_hash: string | null }) | undefined;

  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

function hashToken(token: string) {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "jiranibiz-development-secret").update(token).digest("hex");
}

export function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const id = `session-${randomBytes(12).toString("hex")}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  getDb().prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, userId, hashToken(token), expiresAt);

  return { token, expiresAt };
}

export function getUserFromSession(token: string | undefined): AuthUser | null {
  if (!token) return null;

  const row = getDb().prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).get(hashToken(token)) as (AuthUser & { expires_at: string }) | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return null;
  }

  return { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
}

export function destroySession(token: string | undefined) {
  if (!token) return;
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export { SESSION_COOKIE };
