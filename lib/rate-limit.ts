import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";
import { parseIpv6 } from "@/lib/url";

export const CREATE_LINK_LIMIT = 10;
export const CREATE_LINK_WINDOW_SECONDS = 60;
// Registros sem atividade há mais tempo que isso são apagados.
const RETENTION_MINUTES = 10;

export type RateLimitResult = {
  allowed: boolean;
  hits: number;
  retryAfterSeconds: number;
};

/**
 * Origem da requisição a partir do primeiro valor de `X-Forwarded-For`
 * (ou `X-Real-IP`). Só é confiável atrás de um proxy que sobrescreve esse
 * cabeçalho com o IP real do cliente.
 */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get("x-real-ip")?.trim() || null;
}

/**
 * Normaliza a origem: IPv4 como está; IPv6 agrupado pelo prefixo /64
 * (um único cliente costuma controlar o /64 inteiro).
 */
export function normalizeClientIp(ip: string | null): string {
  if (!ip) return "unknown";
  const value = ip.replace(/^\[|\]$/g, "");

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return `ipv4:${value}`;
  }

  const groups = parseIpv6(value);
  if (!groups) return "unknown";

  const isIpv4Mapped = groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
  if (isIpv4Mapped) {
    return `ipv4:${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`;
  }
  return `ipv6:${groups.slice(0, 4).map((g) => g.toString(16)).join(":")}::/64`;
}

/** Chave persistida: hash da origem normalizada, nunca o IP bruto. */
export function rateLimitKey(scope: string, ip: string | null): string {
  return createHash("sha256")
    .update(`${scope}|${normalizeClientIp(ip)}`)
    .digest("hex");
}

/**
 * Registra uma tentativa e informa se ela está dentro do limite.
 * O incremento é atômico no PostgreSQL (INSERT ... ON CONFLICT DO UPDATE),
 * portanto seguro entre requisições e instâncias concorrentes.
 */
export async function consumeRateLimit(
  key: string,
  limit = CREATE_LINK_LIMIT,
  windowSeconds = CREATE_LINK_WINDOW_SECONDS,
): Promise<RateLimitResult> {
  const sql = getSql();
  const [upserted] = await sql.transaction([
    sql`
      INSERT INTO rate_limits (bucket, window_start, hits)
      VALUES (
        ${key},
        to_timestamp(floor(extract(epoch FROM now()) / ${windowSeconds}::int) * ${windowSeconds}::int),
        1
      )
      ON CONFLICT (bucket) DO UPDATE SET
        hits = CASE
          WHEN EXCLUDED.window_start > rate_limits.window_start THEN 1
          ELSE rate_limits.hits + 1
        END,
        window_start = GREATEST(rate_limits.window_start, EXCLUDED.window_start)
      RETURNING
        hits,
        GREATEST(
          1,
          CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => ${windowSeconds}::int) - now())))
        )::int AS retry_after
    `,
    sql`
      DELETE FROM rate_limits
      WHERE window_start < now() - make_interval(mins => ${RETENTION_MINUTES}::int)
    `,
  ]);

  const row = upserted[0] as { hits: number; retry_after: number };
  return {
    allowed: row.hits <= limit,
    hits: row.hits,
    retryAfterSeconds: row.retry_after,
  };
}
