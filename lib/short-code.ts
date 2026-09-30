export const CODE_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const CODE_LENGTH = 4;

const CODE_PATTERN = /^[A-Za-z0-9]{4}$/;

// Maior múltiplo de 62 que cabe em um byte (62 * 4 = 248).
// Bytes >= 248 são descartados para não enviesar a distribuição.
const UNBIASED_BYTE_LIMIT =
  Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;

export function generateShortCode(): string {
  let code = "";
  const bytes = new Uint8Array(CODE_LENGTH * 2);

  while (code.length < CODE_LENGTH) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= UNBIASED_BYTE_LIMIT) continue;
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }

  return code;
}

export function isValidShortCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}
