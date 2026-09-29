import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getUserFromSession(token) : null;
}

export async function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  const rows = getDb().prepare("SELECT id, customer_id AS customerId, rating, comment, created_at AS createdAt FROM reviews WHERE business_id = ? ORDER BY created_at DESC").all(businessId);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in before reviewing." }, { status: 401 });

  try {
    const { businessId, rating, comment = "" } = await request.json();
    const numericRating = Number(rating);
    if (!businessId || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) return NextResponse.json({ error: "businessId and a rating from 1 to 5 are required." }, { status: 400 });

    const db = getDb();
    const business = db.prepare("SELECT id FROM businesses WHERE id = ?").get(businessId);
    if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

    const duplicate = db.prepare("SELECT id FROM reviews WHERE business_id = ? AND customer_id = ?").get(businessId, user.id);
    if (duplicate) return NextResponse.json({ error: "You have already reviewed this business." }, { status: 409 });

    const id = `review-${crypto.randomUUID()}`;
    db.prepare("INSERT INTO reviews (id, business_id, customer_id, rating, comment) VALUES (?, ?, ?, ?, ?)").run(id, businessId, user.id, numericRating, String(comment).trim());

    const aggregate = db.prepare("SELECT AVG(rating) AS rating, COUNT(*) AS reviews FROM reviews WHERE business_id = ?").get(businessId) as { rating: number; reviews: number };
    db.prepare("UPDATE businesses SET rating = ?, reviews = ? WHERE id = ?").run(Number(aggregate.rating.toFixed(1)), aggregate.reviews, businessId);

    return NextResponse.json({ id, businessId, customerId: user.id, rating: numericRating, comment: String(comment).trim() }, { status: 201 });
  } catch (error) {
    console.error("Review creation failed", error);
    return NextResponse.json({ error: "Unable to create review." }, { status: 500 });
  }
}
