"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type Result = { code: string; shortUrl: string; originalUrl: string };

export function ShortenForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldFocusInput = useRef(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!result && shouldFocusInput.current) {
      shouldFocusInput.current = false;
      inputRef.current?.focus();
    }
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const value = url.trim();
    if (!value) {
      setError("Cole o link que você quer encurtar.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Não foi possível encurtar o link. Tente novamente.");
        return;
      }
      setResult({ ...(data as Omit<Result, "originalUrl">), originalUrl: value });
      setCopied(false);
    } catch {
      setError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setError(null);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o link e copie manualmente.");
    }
  }

  function handleReset() {
    shouldFocusInput.current = true;
    setResult(null);
    setUrl("");
    setError(null);
    setCopied(false);
  }

  if (result) {
    return (
      <section className="result" aria-labelledby="result-title">
        <p id="result-title" className="result-title">
          <span className="check" aria-hidden="true">✓</span>
          Seu link curto está pronto
        </p>

        <div className="short-link-row">
          <a
            className="short-link"
            href={result.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {result.shortUrl}
          </a>
          <button
            type="button"
            className={`button button-primary copy-button${copied ? " is-copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? "Link copiado para a área de transferência." : ""}
        </p>

        <p className="destination">
          <span>Destino:</span> <span className="destination-url">{result.originalUrl}</span>
        </p>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <button type="button" className="button button-secondary" onClick={handleReset}>
          Encurtar outro link
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form" noValidate>
      <label htmlFor="url" className="label">
        Link original
      </label>
      <div className="form-row">
        <input
          ref={inputRef}
          id="url"
          name="url"
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://exemplo.com/um-link-bem-longo"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={loading}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "url-hint url-error" : "url-hint"}
          className="input"
        />
        <button type="submit" className="button button-primary" disabled={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? "Encurtando…" : "Encurtar link"}
        </button>
      </div>
      <p id="url-hint" className="hint">
        Cole um endereço completo, começando com http:// ou https://.
      </p>

      {error && (
        <p id="url-error" className="alert" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
