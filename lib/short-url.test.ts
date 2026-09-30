import assert from "node:assert/strict";
import { test } from "node:test";
import { buildShortUrl } from "./short-url";

test("monta a URL curta a partir da base configurada", () => {
  assert.equal(buildShortUrl("http://localhost:3000", "a7X2"), "http://localhost:3000/a7X2");
  assert.equal(buildShortUrl("https://qrk.example/", "a7X2"), "https://qrk.example/a7X2");
});
