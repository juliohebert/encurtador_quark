import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GENERIC_ERROR,
  handleCreateLink,
  RATE_LIMIT_ERROR,
  type CreateLinkDeps,
} from "@/lib/create-link-handler";

function fakeDeps(overrides: Partial<CreateLinkDeps> = {}) {
  const created: string[] = [];
  const deps: CreateLinkDeps = {
    getAppBaseUrl: () => "https://qk.link",
    getRateLimitKey: () => "chave",
    consumeRateLimit: async () => ({ allowed: true, hits: 1, retryAfterSeconds: 60 }),
    createLink: async (url) => {
      created.push(url);
      return "a7X2";
    },
    ...overrides,
  };
  return { deps, created };
}

function post(body: unknown) {
  return new Request("http://teste/api/links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("201 com código e shortUrl baseada em APP_BASE_URL", async () => {
  const { deps, created } = fakeDeps();
  const response = await handleCreateLink(post({ url: "https://exemplo.com/x" }), deps);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { code: "a7X2", shortUrl: "https://qk.link/a7X2" });
  assert.deepEqual(created, ["https://exemplo.com/x"]);
});

test("429 com Retry-After quando o limite é excedido, sem criar link", async () => {
  const { deps, created } = fakeDeps({
    consumeRateLimit: async () => ({ allowed: false, hits: 11, retryAfterSeconds: 42 }),
  });
  const response = await handleCreateLink(post({ url: "https://exemplo.com" }), deps);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "42");
  assert.deepEqual(await response.json(), { error: RATE_LIMIT_ERROR });
  assert.equal(created.length, 0);
});

test("simula 11 criações seguidas: 10 aceitas e a 11ª recebe 429", async () => {
  let hits = 0;
  const { deps } = fakeDeps({
    consumeRateLimit: async () => {
      hits++;
      return { allowed: hits <= 10, hits, retryAfterSeconds: 30 };
    },
  });
  const statuses = [];
  for (let i = 0; i < 11; i++) {
    statuses.push((await handleCreateLink(post({ url: "https://exemplo.com" }), deps)).status);
  }
  assert.deepEqual(statuses, [...Array(10).fill(201), 429]);
});

test("400 para destino local e para o próprio encurtador", async () => {
  const { deps, created } = fakeDeps();
  for (const url of ["http://localhost:3000", "http://192.168.1.10", "https://qk.link/abcd"]) {
    const response = await handleCreateLink(post({ url }), deps);
    assert.equal(response.status, 400, url);
  }
  assert.equal(created.length, 0);
});

test("500 genérico sem vazar detalhes internos", async () => {
  const secret = "postgresql://usuario:segredo@host/db relation links does not exist";
  const scenarios: Partial<CreateLinkDeps>[] = [
    { createLink: async () => { throw new Error(secret); } },
    { consumeRateLimit: async () => { throw new Error(secret); } },
  ];
  const originalError = console.error;
  console.error = () => {};
  try {
    for (const overrides of scenarios) {
      const response = await handleCreateLink(post({ url: "https://exemplo.com" }), fakeDeps(overrides).deps);
      const text = await response.text();
      assert.equal(response.status, 500);
      assert.deepEqual(JSON.parse(text), { error: GENERIC_ERROR });
      assert.ok(!text.includes("segredo"));
    }
  } finally {
    console.error = originalError;
  }
});
