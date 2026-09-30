import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_URL_LENGTH, validateOriginalUrl } from "./url";

test("aceita http e https", () => {
  assert.deepEqual(validateOriginalUrl("https://exemplo.com/pagina"), {
    ok: true,
    url: "https://exemplo.com/pagina",
  });
  assert.equal(validateOriginalUrl("  http://exemplo.com  ").ok, true);
});

test("rejeita outros protocolos", () => {
  for (const url of ["ftp://exemplo.com", "javascript:alert(1)", "data:text/html,oi", "mailto:a@b.com"]) {
    assert.equal(validateOriginalUrl(url).ok, false, url);
  }
});

test("rejeita valores vazios, não-string e inválidos", () => {
  for (const value of [undefined, null, 123, "", "   ", "exemplo.com", "https://"]) {
    assert.equal(validateOriginalUrl(value).ok, false, String(value));
  }
});

test("rejeita URL maior que o limite", () => {
  const url = "https://exemplo.com/" + "a".repeat(MAX_URL_LENGTH);
  assert.equal(validateOriginalUrl(url).ok, false);
});

test("aceita URL externa pública válida", () => {
  for (const url of [
    "https://www.google.com/search?q=quark",
    "http://exemplo.com.br/pagina#secao",
    "https://8.8.8.8/",
    "https://[2001:4860:4860::8888]/",
    "https://172.32.0.1/",
    "https://sub.dominio.exemplo.org:8443/a/b",
  ]) {
    assert.equal(validateOriginalUrl(url).ok, true, url);
  }
});

test("rejeita localhost e nomes locais", () => {
  for (const url of [
    "http://localhost:3000",
    "http://LOCALHOST",
    "http://localhost./",
    "http://app.localhost",
    "http://impressora.local",
    "http://servidor.internal",
    "http://nas.home.arpa",
    "http://intranet/",
  ]) {
    assert.equal(validateOriginalUrl(url).ok, false, url);
  }
});

test("rejeita loopback IPv4, inclusive em formatos alternativos", () => {
  for (const url of [
    "http://127.0.0.1",
    "http://127.1.2.3:8080",
    "http://2130706433/", // 127.0.0.1 em decimal
    "http://0x7f.0.0.1/", // 127.0.0.1 em hexa
    "http://0.0.0.0/",
  ]) {
    assert.equal(validateOriginalUrl(url).ok, false, url);
  }
});

test("rejeita loopback e endereços locais IPv6", () => {
  for (const url of [
    "http://[::1]",
    "http://[0:0:0:0:0:0:0:1]/",
    "http://[::]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:192.168.0.1]/",
    "http://[fc00::1]/",
    "http://[fd12:3456::1]/",
    "http://[fe80::1]/",
    "http://[ff02::1]/",
  ]) {
    assert.equal(validateOriginalUrl(url).ok, false, url);
  }
});

test("rejeita IPs privados", () => {
  for (const url of [
    "http://10.0.0.1",
    "http://172.16.0.1",
    "http://172.31.255.255",
    "http://192.168.1.10",
    "http://100.64.0.1",
  ]) {
    assert.equal(validateOriginalUrl(url).ok, false, url);
  }
});

test("rejeita link-local", () => {
  assert.equal(validateOriginalUrl("http://169.254.1.1").ok, false);
  assert.equal(validateOriginalUrl("http://169.254.169.254/latest/meta-data").ok, false);
});

test("rejeita URL com usuário e/ou senha", () => {
  for (const url of [
    "https://usuario:senha@exemplo.com",
    "https://usuario@exemplo.com",
    "https://:senha@exemplo.com",
  ]) {
    const result = validateOriginalUrl(url);
    assert.equal(result.ok, false, url);
    assert.match(!result.ok ? result.error : "", /usuário ou senha/);
  }
});

test("rejeita URLs do próprio encurtador usando APP_BASE_URL", () => {
  const options = { appBaseUrl: "https://qk.link" };
  for (const url of [
    "https://qk.link/a7X2",
    "http://qk.link/",
    "https://QK.LINK/abcd",
    "https://qk.link:8443/abcd",
    "https://www.qk.link/abcd",
    "https://qk.link./abcd",
  ]) {
    const result = validateOriginalUrl(url, options);
    assert.equal(result.ok, false, url);
    assert.match(!result.ok ? result.error : "", /próprio encurtador/);
  }
});

test("não confunde outros domínios com o host do encurtador", () => {
  const options = { appBaseUrl: "https://qk.link/" };
  for (const url of ["https://qk.link.exemplo.com/", "https://meuqk.link/", "https://exemplo.com/?u=qk.link"]) {
    assert.equal(validateOriginalUrl(url, options).ok, true, url);
  }
});

test("acompanha a mudança de APP_BASE_URL (sem hostname fixo)", () => {
  const url = "https://novo-dominio.com.br/abcd";
  assert.equal(validateOriginalUrl(url, { appBaseUrl: "https://qk.link" }).ok, true);
  assert.equal(validateOriginalUrl(url, { appBaseUrl: "https://novo-dominio.com.br" }).ok, false);
});
