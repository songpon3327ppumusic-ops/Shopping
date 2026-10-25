# Phase 5 — Admin catalog API

## Added
- Admin-only product listing endpoint: `GET /api/admin/products`.
- Admin-only product creation endpoint: `POST /api/admin/products`.
- Admin-only category listing endpoint: `GET /api/admin/categories`.
- Server-side session verification on each admin endpoint.
- Same-origin validation for product creation, strict Zod schemas, bounded string/array sizes, integer prices in satang, duplicate SKU checks, safe generic server errors, and no-store responses.
- Product + variant creation, initial stock ledger entries, and audit event are written in one database transaction.
- Duplicate product slugs/SKUs return a conflict rather than leaking database details.

## Security notes
- This does not replace a durable edge rate limiter on login or a production WAF/body-size limit.
- The initial administrator is environment-configured; the audit record records actor email in metadata because no database-backed admin identity is linked yet.
- The API uses remote image URLs only; upload/storage policy and image allowlists still need a separate implementation.
- Do not expose these endpoints publicly until database migrations, secret configuration, rate limiting, tests, and deployment checks are complete.
- There is no product update/delete endpoint yet. Prefer archive/status changes and stock adjustments with ledger entries over destructive deletion.
