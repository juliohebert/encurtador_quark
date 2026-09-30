# Encurtador Quark

Encurtador público de URLs (Next.js + TypeScript + Neon/PostgreSQL).

## Configuração

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha:
   - `DATABASE_URL`: connection string do Neon.
   - `APP_BASE_URL`: URL pública do encurtador (ex.: `http://localhost:3000` ou o domínio próprio).
3. Crie/atualize as tabelas: `npm run db:migrate` (aplica `db/schema.sql`, idempotente).
4. `npm run dev`

## Scripts

- `npm run dev` / `npm run build` / `npm start`
- `npm run lint`
- `npm run typecheck`
- `npm test` (testes unitários, não exigem banco)
- `npm run test:db` (integração do rate limit com o Neon; usa `.env.local`)
- `npm run db:migrate`

## API

`POST /api/links` com `{ "url": "https://exemplo.com" }` → `201 { "code": "a7X2", "shortUrl": "<APP_BASE_URL>/a7X2" }`.

Limite: 10 tentativas por minuto por origem (IP via `X-Forwarded-For`), persistido no PostgreSQL. Excedido → `429` com `Retry-After`.

São recusados destinos locais/privados (localhost, loopback, IPs privados, link-local), URLs com usuário/senha e links para o próprio host de `APP_BASE_URL`.

`GET /{code}` redireciona (307) para a URL original ou exibe "Link não encontrado" (404).
