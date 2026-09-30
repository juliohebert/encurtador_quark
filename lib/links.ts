import { allocateCode } from "@/lib/allocate-code";
import { getSql } from "@/lib/db";
import { generateShortCode } from "@/lib/short-code";

export async function createLink(originalUrl: string): Promise<string> {
  const sql = getSql();

  return allocateCode(async (code) => {
    const rows = await sql`
      INSERT INTO links (code, original_url)
      VALUES (${code}, ${originalUrl})
      ON CONFLICT (code) DO NOTHING
      RETURNING code
    `;
    return rows.length > 0;
  }, generateShortCode);
}

export async function findOriginalUrl(code: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT original_url FROM links WHERE code = ${code} LIMIT 1
  `;
  return rows.length > 0 ? (rows[0].original_url as string) : null;
}
