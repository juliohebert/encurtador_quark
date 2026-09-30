export function buildShortUrl(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${code}`;
}

export function getAppBaseUrl(): string {
  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    throw new Error("APP_BASE_URL não configurada.");
  }
  return baseUrl;
}
