import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import {
  BusinessNotFoundError,
  createReview,
  DuplicateReviewError,
  getReviews,
} from "@/lib/store";
import { clientRateLimit, userRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, reviewCreateBodySchema } from "@/lib/request-schemas";

async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getUserFromSession(token) : null;
}

export async function GET(request: Request) {
  const ipLimit = await clientRateLimit(request, "reviews-list");
  if (ipLimit) return ipLimit;
  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  return NextResponse.json(await getReviews(businessId));
}

export async function POST(request: Request) {
  const ipLimit = await clientRateLimit(request, "reviews-create", 20, 60 * 60 * 1000);
  if (ipLimit) return ipLimit;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in before reviewing." }, { status: 401 });
  const userLimit = await userRateLimit(user.id, "reviews-create", 20, 60 * 60 * 1000);
  if (userLimit) return userLimit;

  const parsed = await parseJsonBody(request, reviewCreateBodySchema);
  if (parsed.response) return parsed.response;

  try {
    const review = await createReview({
      businessId: parsed.data.businessId,
      customerId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
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
