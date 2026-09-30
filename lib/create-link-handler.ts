import type { RateLimitResult } from "@/lib/rate-limit";
import { buildShortUrl } from "@/lib/short-url";
import { validateOriginalUrl } from "@/lib/url";

export const RATE_LIMIT_ERROR =
  "Muitas tentativas. Aguarde um momento e tente novamente.";
export const GENERIC_ERROR = "Não foi possível encurtar a URL. Tente novamente.";

export type CreateLinkDeps = {
  getAppBaseUrl: () => string;
  getRateLimitKey: (request: Request) => string;
  consumeRateLimit: (key: string) => Promise<RateLimitResult>;
  createLink: (originalUrl: string) => Promise<string>;
};

export async function handleCreateLink(
  request: Request,
  deps: CreateLinkDeps,
): Promise<Response> {
  let appBaseUrl: string;
  let rateLimit: RateLimitResult;
  try {
    appBaseUrl = deps.getAppBaseUrl();
    rateLimit = await deps.consumeRateLimit(deps.getRateLimitKey(request));
  } catch (error) {
    console.error("Falha ao verificar limite de criação:", error);
    return Response.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  if (!rateLimit.allowed) {
    return Response.json(
      { error: RATE_LIMIT_ERROR },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const url = (body as { url?: unknown } | null)?.url;
  const validation = validateOriginalUrl(url, { appBaseUrl });
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    const code = await deps.createLink(validation.url);
    return Response.json(
      { code, shortUrl: buildShortUrl(appBaseUrl, code) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Falha ao criar link:", error);
    return Response.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
