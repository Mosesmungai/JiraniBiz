import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { clientRateLimit, userRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, businessContactUpdateSchema } from "@/lib/request-schemas";
import { BusinessNotFoundError, NotBusinessOwnerError, updateBusinessContact } from "@/lib/store";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ipLimit = await clientRateLimit(request, "business-contact-update", 20, 60 * 60 * 1000);
  if (ipLimit) return ipLimit;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = token ? await getUserFromSession(token) : null;
  if (!user || user.role !== "business_owner") {
    return NextResponse.json({ error: "Business owner authentication required." }, { status: 401 });
  }
  const userLimit = await userRateLimit(user.id, "business-contact-update", 20, 60 * 60 * 1000);
  if (userLimit) return userLimit;

  const parsed = await parseJsonBody(request, businessContactUpdateSchema);
  if (parsed.response) return parsed.response;
  const { id } = await context.params;
  try {
    await updateBusinessContact({
      businessId: id,
      ownerId: user.id,
      ...parsed.data,
    });
    return NextResponse.json({ message: "Business contact links updated." });
  } catch (error) {
    if (error instanceof BusinessNotFoundError) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    if (error instanceof NotBusinessOwnerError) {
      return NextResponse.json({ error: "You do not own this business." }, { status: 403 });
    }
    console.error("Business contact update failed", error);
    return NextResponse.json({ error: "Unable to update business contact links." }, { status: 500 });
  }
}
