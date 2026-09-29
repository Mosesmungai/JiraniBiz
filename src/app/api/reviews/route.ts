import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import {
  BusinessNotFoundError,
  createReview,
  DuplicateReviewError,
  getReviews,
} from "@/lib/store";

async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getUserFromSession(token) : null;
}

export async function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  return NextResponse.json(await getReviews(businessId));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in before reviewing." }, { status: 401 });

  try {
    const { businessId, rating, comment = "" } = await request.json();
    const numericRating = Number(rating);
    if (
      typeof businessId !== "string" ||
      !businessId ||
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return NextResponse.json({ error: "businessId and a rating from 1 to 5 are required." }, { status: 400 });
    }

    const review = await createReview({
      businessId,
      customerId: user.id,
      rating: numericRating,
      comment: String(comment).trim(),
    });
    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof BusinessNotFoundError) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    if (error instanceof DuplicateReviewError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Review creation failed", error);
    return NextResponse.json({ error: "Unable to create review." }, { status: 500 });
  }
}
