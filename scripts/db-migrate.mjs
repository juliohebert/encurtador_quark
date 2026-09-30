import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL não configurada. Defina em .env.local ou no ambiente.");
  process.exit(1);
}

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const sql = neon(databaseUrl);

// O driver HTTP executa uma instrução por consulta.
const statements = schema
  .split(/;\s*$/m)
  .map((statement) => statement.trim())
  .filter((statement) => statement.replace(/^--.*$/gm, "").trim() !== "");

for (const statement of statements) {
  await sql.query(statement);
}
console.log(`Schema aplicado com sucesso (${statements.length} instruções).`);
