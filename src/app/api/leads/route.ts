import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { BusinessNotFoundError, createLead } from "@/lib/store";
import { clientRateLimit } from "@/lib/rate-limit";
import { leadCreateBodySchema, parseJsonBody } from "@/lib/request-schemas";

export async function POST(request: Request) {
  const ipLimit = await clientRateLimit(request, "leads-create", 10, 60 * 60 * 1000);
  if (ipLimit) return ipLimit;

  const parsed = await parseJsonBody(request, leadCreateBodySchema);
  if (parsed.response) return parsed.response;
  try {
    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
    const lead = await createLead({
      businessSlug: parsed.data.businessSlug,
      name: parsed.data.name,
      phone: parsed.data.phone,
      message: parsed.data.message,
      customerId: user?.id,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    if (error instanceof BusinessNotFoundError) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    console.error("Lead creation failed", error);
    return NextResponse.json({ error: "Unable to submit request." }, { status: 500 });
  }
}
