import { cookies } from "next/headers";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { createBusinessViewHandler } from "@/lib/business-view-api";
import { clientRateLimit } from "@/lib/rate-limit";
import { recordBusinessProfileView } from "@/lib/store";

const handler = createBusinessViewHandler({
  currentUser: async () => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    return token ? getUserFromSession(token) : null;
  },
  clientLimit: (request) => clientRateLimit(request, "business-profile-view", 240, 60 * 60 * 1000),
  recordView: recordBusinessProfileView,
});

export const POST = handler;
