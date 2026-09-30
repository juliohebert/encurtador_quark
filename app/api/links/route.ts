import { handleCreateLink } from "@/lib/create-link-handler";
import { createLink } from "@/lib/links";
import { consumeRateLimit, getClientIp, rateLimitKey } from "@/lib/rate-limit";
import { getAppBaseUrl } from "@/lib/short-url";

export async function POST(request: Request) {
  return handleCreateLink(request, {
    getAppBaseUrl,
    getRateLimitKey: (req) => rateLimitKey("create-link", getClientIp(req.headers)),
    consumeRateLimit: (key) => consumeRateLimit(key),
    createLink,
  });
}
