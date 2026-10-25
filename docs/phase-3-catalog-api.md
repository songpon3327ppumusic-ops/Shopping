# Phase 3 — Database-backed public catalog API

## Included
- Prisma client singleton with development hot-reload protection.
- Read-only `GET /api/products` endpoint that returns active products and active variants from PostgreSQL.
- Excludes draft/archived products and inactive categories/variants.
- Calculates available stock as on-hand minus reserved and clamps it at zero.
- Sends `Cache-Control: no-store` and generic error responses so database internals are not exposed.
- Returns HTTP 503 when the database is not configured or the catalog cannot be read.

## Configure locally/deployment
1. Install dependencies with Node.js 20 or newer.
2. Copy `.env.example` to a local ignored environment file and set `DATABASE_URL` to a PostgreSQL database you control.
3. Run `npx prisma validate` and `npx prisma generate`.
4. Create and review the initial migration with `npx prisma migrate dev --name init` against a development database only.
5. Apply reviewed migrations in staging before production. Do not use `db push` against production.

## Security boundary
This endpoint is public and read-only. It must not expose private customer, order, payment, or admin data. The schema/API are not a substitute for authentication, authorization, transactional checkout, or payment webhook verification. Do not add write endpoints until server-side authorization and tests are in place.
