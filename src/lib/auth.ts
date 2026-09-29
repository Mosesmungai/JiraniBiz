import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sessionsCollection, usersCollection } from "@/lib/firestore";

export type UserRole = "customer" | "business_owner" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
};

const SESSION_DAYS = 30;
export const SESSION_COOKIE = "jiranibiz_session";

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

export async function createUser(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: UserRole;
}) {
  const id = `user-${randomBytes(12).toString("hex")}`;
  const email = normalizeEmail(input.email);
  const role = input.role ?? "customer";
  const name = input.name.trim();

  if (!email || !name) throw new Error("Name and email are required");

  const existing = await usersCollection().where("email", "==", email).limit(1).get();
  if (!existing.empty) throw new Error("An account with this email already exists");

  const user: AuthUser = { id, name, email, phone: input.phone?.trim() || null, role };
  await usersCollection().doc(id).set({ ...user, passwordHash: hashPassword(input.password), createdAt: new Date().toISOString() });
  return user;
}

export async function authenticateUser(emailInput: string, password: string): Promise<AuthUser | null> {
  const email = normalizeEmail(emailInput);
  const snapshot = await usersCollection().where("email", "==", email).limit(1).get();
  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data() as { id: string; name: string; email: string; phone?: string | null; role: UserRole; passwordHash?: string };
  if (!data.passwordHash || !verifyPassword(password, data.passwordHash)) return null;

  return { id: data.id, name: data.name, email: data.email, phone: data.phone ?? null, role: data.role };
}

function hashToken(token: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return createHmac("sha256", secret).update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const id = `session-${randomBytes(12).toString("hex")}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await sessionsCollection().doc(id).set({ id, userId, tokenHash: hashToken(token), expiresAt, createdAt: new Date().toISOString() });
  return { token, expiresAt };
}

export async function getUserFromSession(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;

  const snapshot = await sessionsCollection().where("tokenHash", "==", hashToken(token)).limit(1).get();
  if (snapshot.empty) return null;

  const sessionDoc = snapshot.docs[0];
  const session = sessionDoc.data() as { userId: string; expiresAt: string };
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await sessionDoc.ref.delete();
    return null;
  }

  const userDoc = await usersCollection().doc(session.userId).get();
  if (!userDoc.exists) return null;
  const user = userDoc.data() as AuthUser;
  return { id: user.id, name: user.name, email: user.email, phone: user.phone ?? null, role: user.role };
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  const snapshot = await sessionsCollection().where("tokenHash", "==", hashToken(token)).limit(1).get();
  if (!snapshot.empty) await snapshot.docs[0].ref.delete();
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getUserFromSession(token);
}
