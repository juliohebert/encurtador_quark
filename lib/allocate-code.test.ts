import assert from "node:assert/strict";
import { test } from "node:test";
import { allocateCode, CodeAllocationError } from "./allocate-code";

test("retorna o primeiro código inserido com sucesso", async () => {
  const code = await allocateCode(async () => true, () => "abcd");
  assert.equal(code, "abcd");
});

test("gera novo código quando há colisão", async () => {
  const taken = new Set(["aaaa", "bbbb"]);
  const candidates = ["aaaa", "bbbb", "cccc"];
  const tried: string[] = [];

  const code = await allocateCode(
    async (candidate) => {
      tried.push(candidate);
      return !taken.has(candidate);
    },
    () => candidates.shift()!,
  );

  assert.equal(code, "cccc");
  assert.deepEqual(tried, ["aaaa", "bbbb", "cccc"]);
});

test("falha de forma controlada após o limite de tentativas", async () => {
  let attempts = 0;
  await assert.rejects(
    allocateCode(
      async () => {
        attempts++;
        return false;
      },
      () => "aaaa",
      3,
    ),
    CodeAllocationError,
  );
  assert.equal(attempts, 3);
});
