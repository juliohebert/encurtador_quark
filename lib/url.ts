export const MAX_URL_LENGTH = 2048;

export type UrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type UrlValidationOptions = {
  /** URL pública do encurtador; links para o mesmo host são recusados. */
  appBaseUrl?: string;
};

const LOCAL_DESTINATION_ERROR =
  "Não é permitido encurtar endereços locais ou de rede privada.";

// Sufixos reservados para uso local/interno (RFC 6761, RFC 6762, RFC 8375).
const LOCAL_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".localdomain",
  ".internal",
  ".home.arpa",
];

export function validateOriginalUrl(
  input: unknown,
  options: UrlValidationOptions = {},
): UrlValidationResult {
  if (typeof input !== "string" || input.trim() === "") {
    return { ok: false, error: "Informe uma URL." };
  }

  const value = input.trim();
  if (value.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      error: `A URL deve ter no máximo ${MAX_URL_LENGTH} caracteres.`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "URL inválida." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Apenas URLs http:// ou https:// são aceitas." };
  }

  if (!parsed.hostname) {
    return { ok: false, error: "URL inválida." };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      error: "URLs com usuário ou senha embutidos não são permitidas.",
    };
  }

  if (isLocalHostname(parsed.hostname)) {
    return { ok: false, error: LOCAL_DESTINATION_ERROR };
  }

  if (options.appBaseUrl && isSameHost(parsed.hostname, options.appBaseUrl)) {
    return {
      ok: false,
      error: "Não é possível encurtar um link do próprio encurtador.",
    };
  }

  return { ok: true, url: parsed.href };
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.+$/, "");
}

function isSameHost(hostname: string, appBaseUrl: string): boolean {
  let appHost: string;
  try {
    appHost = normalizeHostname(new URL(appBaseUrl).hostname);
  } catch {
    return false;
  }
  const host = normalizeHostname(hostname);
  const withoutWww = (h: string) => h.replace(/^www\./, "");
  return withoutWww(host) === withoutWww(appHost);
}

/**
 * Recebe o hostname já normalizado pelo parser WHATWG (`URL`), que converte
 * formas alternativas de IPv4 (decimal, hexa, octal) para a notação padrão
 * e envolve IPv6 em colchetes.
 */
export function isLocalHostname(rawHostname: string): boolean {
  const hostname = normalizeHostname(rawHostname);

  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return isBlockedIpv6(hostname.slice(1, -1));
  }

  const ipv4 = parseIpv4(hostname);
  if (ipv4) {
    return isBlockedIpv4(ipv4);
  }

  if (hostname === "localhost") return true;
  if (LOCAL_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return true;
  }

  // Nome sem ponto (ex.: "intranet") só resolve em rede local.
  return !hostname.includes(".");
}

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) {
    return null;
  }
  const octets = parts.map(Number);
  return octets.every((o) => o <= 255) ? octets : null;
}

function isBlockedIpv4([a, b]: number[]): boolean {
  return (
    a === 0 || // 0.0.0.0/8 "esta rede"
    a === 10 || // 10.0.0.0/8 privado
    a === 127 || // 127.0.0.0/8 loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 privado
    (a === 192 && b === 168) || // 192.168.0.0/16 privado
    a >= 224 // multicast, reservado e broadcast
  );
}

/** Retorna os 8 grupos de 16 bits de um IPv6, ou null se inválido. */
export function parseIpv6(address: string): number[] | null {
  let value = address.toLowerCase();

  // IPv4 embutido no final (ex.: ::ffff:127.0.0.1).
  const embeddedV4 = value.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (embeddedV4) {
    const octets = parseIpv4(embeddedV4[1]);
    if (!octets) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    value = value.slice(0, -embeddedV4[1].length) + `${high}:${low}`;
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;

  const zeros = Array<string>(halves.length === 2 ? missing : 0).fill("0");
  const groups = [...head, ...zeros, ...tail];
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

function isBlockedIpv6(address: string): boolean {
  const groups = parseIpv6(address);
  if (!groups) return true; // o parser aceitou, mas não reconhecemos: recusar

  const allZeroUntil = (n: number) => groups.slice(0, n).every((g) => g === 0);

  if (allZeroUntil(7) && (groups[7] === 0 || groups[7] === 1)) {
    return true; // :: (não especificado) e ::1 (loopback)
  }

  // IPv4 mapeado (::ffff:a.b.c.d) herda as regras de IPv4.
  if (allZeroUntil(5) && groups[5] === 0xffff) {
    return isBlockedIpv4([groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff]);
  }

  const first = groups[0];
  return (
    (first & 0xfe00) === 0xfc00 || // fc00::/7 unique local (privado)
    (first & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (first & 0xff00) === 0xff00 // ff00::/8 multicast
  );
}
