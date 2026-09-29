import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { businessesCollection, reviewsCollection } from "@/lib/firestore";

async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getUserFromSession(token) : null;
}

export async function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  const snapshot = await reviewsCollection().where("businessId", "==", businessId).get();
  const rows = snapshot.docs.map((doc) => doc.data()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in before reviewing." }, { status: 401 });

  try {
    const { businessId, rating, comment = "" } = await request.json();
    const numericRating = Number(rating);
    if (!businessId || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) return NextResponse.json({ error: "businessId and a rating from 1 to 5 are required." }, { status: 400 });

    const businessRef = businessesCollection().doc(businessId);
    const business = await businessRef.get();
    if (!business.exists) return NextResponse.json({ error: "Business not found." }, { status: 404 });

    const duplicate = await reviewsCollection().where("businessId", "==", businessId).where("customerId", "==", user.id).limit(1).get();
    if (!duplicate.empty) return NextResponse.json({ error: "You have already reviewed this business." }, { status: 409 });

    const id = `review-${crypto.randomUUID()}`;
    const review = { id, businessId, customerId: user.id, rating: numericRating, comment: String(comment).trim(), createdAt: new Date().toISOString() };
    await reviewsCollection().doc(id).set(review);

    const allReviews = await reviewsCollection().where("businessId", "==", businessId).get();
    const ratings = allReviews.docs.map((doc) => Number(doc.data().rating) || 0);
    const average = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
    await businessRef.update({ rating: Number(average.toFixed(1)), reviews: ratings.length });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Review creation failed", error);
    return NextResponse.json({ error: "Unable to create review." }, { status: 500 });
  }
}
