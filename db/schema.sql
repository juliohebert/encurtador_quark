-- Armazena apenas o código curto e a URL original.
-- A URL pública do encurtador é montada em tempo de execução com APP_BASE_URL.
CREATE TABLE IF NOT EXISTS links (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code         VARCHAR(4)  NOT NULL,
  original_url TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT links_code_unique UNIQUE (code),
  CONSTRAINT links_code_format CHECK (code ~ '^[A-Za-z0-9]{4}$')
);

-- Rate limit da criação de links: uma linha por origem.
-- bucket = SHA-256 da origem normalizada (o IP bruto não é gravado).
-- Linhas sem atividade recente são apagadas pela própria aplicação.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket       TEXT        PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  hits         INTEGER     NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx
  ON rate_limits (window_start);
