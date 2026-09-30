import assert from "node:assert/strict";
import { test } from "node:test";
import { CODE_LENGTH, generateShortCode, isValidShortCode } from "./short-code";

test("gera códigos com exatamente 4 caracteres alfanuméricos", () => {
  for (let i = 0; i < 5000; i++) {
    const code = generateShortCode();
    assert.equal(code.length, CODE_LENGTH);
    assert.match(code, /^[A-Za-z0-9]{4}$/);
  }
});

test("gera códigos variados (não sequenciais)", () => {
  const codes = new Set(Array.from({ length: 1000 }, generateShortCode));
  assert.ok(codes.size > 990);
});

test("usa minúsculas, maiúsculas e dígitos", () => {
  const all = Array.from({ length: 2000 }, generateShortCode).join("");
  assert.match(all, /[a-z]/);
  assert.match(all, /[A-Z]/);
  assert.match(all, /[0-9]/);
});

test("isValidShortCode aceita apenas 4 caracteres a-z, A-Z, 0-9", () => {
  assert.ok(isValidShortCode("a7X2"));
  assert.ok(!isValidShortCode("abc"));
  assert.ok(!isValidShortCode("abcde"));
  assert.ok(!isValidShortCode("ab-c"));
  assert.ok(!isValidShortCode("abçd"));
  assert.ok(!isValidShortCode(""));
});
