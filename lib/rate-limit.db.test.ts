// Integração com o Neon real. Executar com: npm run test:db
// Sem DATABASE_URL (ex.: `npm test`) os testes são ignorados.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { getSql } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

const skip = !process.env.DATABASE_URL && "DATABASE_URL não definida";
const keys: string[] = [];
const newKey = () => {
  const key = `teste-${randomUUID()}`;
  keys.push(key);
  return key;
};

after(async () => {
  if (!skip && keys.length) {
    await getSql()`DELETE FROM rate_limits WHERE bucket = ANY(${keys})`;
  }
});

test("dentro do limite e excedido (sequencial)", { skip }, async () => {
  const key = newKey();
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await consumeRateLimit(key, 3, 60));
  assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false]);
  assert.deepEqual(results.map((r) => r.hits), [1, 2, 3, 4]);
  for (const r of results) assert.ok(r.retryAfterSeconds >= 1 && r.retryAfterSeconds <= 60);
});

test("concorrência: 25 requisições simultâneas, exatamente 10 aceitas", { skip }, async () => {
  const key = newKey();
  const results = await Promise.all(
    Array.from({ length: 25 }, () => consumeRateLimit(key, 10, 60)),
  );
  assert.equal(results.filter((r) => r.allowed).length, 10);
  assert.deepEqual(
    results.map((r) => r.hits).sort((a, b) => a - b),
    Array.from({ length: 25 }, (_, i) => i + 1),
  );
});

test("origens diferentes têm contadores independentes", { skip }, async () => {
  const a = newKey();
  const b = newKey();
  for (let i = 0; i < 3; i++) await consumeRateLimit(a, 3, 60);
  assert.equal((await consumeRateLimit(a, 3, 60)).allowed, false);
  assert.equal((await consumeRateLimit(b, 3, 60)).allowed, true);
});
