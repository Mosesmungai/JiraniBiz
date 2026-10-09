import { NextResponse } from "next/server";
import type { AuthUser } from "@/lib/auth";
import { clientAddress } from "@/lib/client-address";
import { BusinessNotFoundError } from "@/lib/store-errors";

type BusinessViewApiDependencies = {
  currentUser: () => Promise<AuthUser | null>;
  clientLimit: (request: Request) => Promise<NextResponse | null>;
  recordView: (businessId: string, input: {
    userId?: string;
    clientAddress: string;
    userAgent: string;
  }) => Promise<void>;
};

export function createBusinessViewHandler(dependencies: BusinessViewApiDependencies) {
  return async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
  ) {
    const limit = await dependencies.clientLimit(request);
    if (limit) return limit;
    const { id } = await context.params;
    try {
      const user = await dependencies.currentUser();
      await dependencies.recordView(id, {
        ...(user ? { userId: user.id } : {}),
        clientAddress: clientAddress(request),
        userAgent: request.headers.get("user-agent") ?? "",
      });
      return new Response(null, { status: 204 });
    } catch (error) {
      if (error instanceof BusinessNotFoundError) {
        return NextResponse.json({ error: "Business not found." }, { status: 404 });
      }
      console.error("Business profile view could not be recorded", error);
      return NextResponse.json({ error: "Unable to record this business profile view." }, { status: 500 });
    }
  };
}
