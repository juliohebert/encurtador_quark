import assert from "node:assert/strict";
import { test } from "node:test";
import { getClientIp, normalizeClientIp, rateLimitKey } from "@/lib/rate-limit";

test("usa o primeiro IP de X-Forwarded-For", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
  assert.equal(getClientIp(headers), "203.0.113.7");
});

test("usa X-Real-IP quando não há X-Forwarded-For", () => {
  assert.equal(getClientIp(new Headers({ "x-real-ip": "203.0.113.8" })), "203.0.113.8");
  assert.equal(getClientIp(new Headers()), null);
});

test("normaliza IPv4, IPv4 mapeado e IPv6 por /64", () => {
  assert.equal(normalizeClientIp("203.0.113.7"), "ipv4:203.0.113.7");
  assert.equal(normalizeClientIp("::ffff:203.0.113.7"), "ipv4:203.0.113.7");
  assert.equal(normalizeClientIp("2001:db8:1:2:aaaa::1"), "ipv6:2001:db8:1:2::/64");
  assert.equal(
    normalizeClientIp("2001:db8:1:2:ffff:ffff:ffff:ffff"),
    normalizeClientIp("[2001:db8:1:2::9]"),
  );
  assert.equal(normalizeClientIp(null), "unknown");
  assert.equal(normalizeClientIp("lixo"), "unknown");
});

test("chave é hash (não contém o IP bruto) e é estável por origem", () => {
  const key = rateLimitKey("create-link", "203.0.113.7");
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.ok(!key.includes("203.0.113.7"));
  assert.equal(key, rateLimitKey("create-link", "203.0.113.7"));
  assert.notEqual(key, rateLimitKey("create-link", "203.0.113.8"));
});
