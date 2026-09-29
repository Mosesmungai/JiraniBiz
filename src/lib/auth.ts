import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { DocumentData } from "firebase-admin/firestore";
import { getFirestoreDb } from "@/lib/firebase-admin";
import { sessionsCollection, userEmailsCollection, usersCollection } from "@/lib/firestore";

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

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "DuplicateEmailError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function emailDocumentId(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

function isUserRole(value: unknown): value is UserRole {
  return value === "customer" || value === "business_owner" || value === "admin";
}

function userFromDocument(data: DocumentData | undefined, id: string): AuthUser | null {
  if (
    !data ||
    typeof data.name !== "string" ||
    typeof data.email !== "string" ||
    !isUserRole(data.role)
  ) {
    return null;
  }

  return {
    id,
    name: data.name,
    email: data.email,
    phone: typeof data.phone === "string" ? data.phone : null,
    role: data.role,
  };
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

  const phone = input.phone?.trim() || null;
  const passwordHash = hashPassword(input.password);
  const userRef = usersCollection().doc(id);
  const emailRef = userEmailsCollection().doc(emailDocumentId(email));
  const db = getFirestoreDb();

  await db.runTransaction(async (transaction) => {
    const emailIndex = await transaction.get(emailRef);
    const existingUsers = await transaction.get(usersCollection().where("email", "==", email).limit(1));
    if (emailIndex.exists || !existingUsers.empty) throw new DuplicateEmailError();

    transaction.create(userRef, {
      id,
      name,
      email,
      phone,
      role,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
    transaction.create(emailRef, { userId: id, email });
  });

  return { id, name, email, phone, role };
}

export async function authenticateUser(emailInput: string, password: string): Promise<AuthUser | null> {
  const email = normalizeEmail(emailInput);
  const emailIndex = await userEmailsCollection().doc(emailDocumentId(email)).get();
  const indexedUserId = emailIndex.data()?.userId;
  const userId = typeof indexedUserId === "string" ? indexedUserId : undefined;
  const userSnapshot = userId
    ? await usersCollection().doc(userId).get()
    : (await usersCollection().where("email", "==", email).limit(1).get()).docs[0];
  const data = userSnapshot?.data();
  const user = userFromDocument(data, userSnapshot?.id ?? "");
  const passwordHash = data?.passwordHash ?? data?.password_hash;

  if (!user || typeof passwordHash !== "string" || !verifyPassword(password, passwordHash)) return null;
  return user;
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
  const tokenHash = hashToken(token);
  await sessionsCollection().doc(tokenHash).create({
    id,
    userId,
    tokenHash,
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  return { token, expiresAt };
}

export async function getUserFromSession(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;

  const sessionRef = sessionsCollection().doc(hashToken(token));
  const sessionSnapshot = await sessionRef.get();
  if (!sessionSnapshot.exists) return null;
  const session = sessionSnapshot.data();
  if (!session || typeof session.userId !== "string" || typeof session.expiresAt !== "string") {
    throw new Error(`Session document ${sessionSnapshot.id} is malformed.`);
  }
  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt)) {
    throw new Error(`Session document ${sessionSnapshot.id} has an invalid expiration date.`);
  }
  if (expiresAt <= Date.now()) {
    await sessionRef.delete();
    return null;
  }

  const userSnapshot = await usersCollection().doc(session.userId).get();
  return userFromDocument(userSnapshot.data(), userSnapshot.id);
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await sessionsCollection().doc(hashToken(token)).delete();
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getUserFromSession(token);
}
