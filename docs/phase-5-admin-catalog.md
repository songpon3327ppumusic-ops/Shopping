# Phase 5 — Admin catalog and inventory API

## Added
- Admin-only product listing endpoint: `GET /api/admin/products`.
- Admin-only product creation endpoint: `POST /api/admin/products`.
- Admin-only product update endpoint: `PATCH /api/admin/products/:id` for name, description, publication status, featured flag, and images.
- Admin-only category listing endpoint: `GET /api/admin/categories`.
- Admin-only inventory adjustment endpoint: `POST /api/admin/inventory`.
- Server-side session verification on every admin endpoint.
- Same-origin validation for browser-based mutations, strict Zod schemas, bounded string/array sizes, integer prices in satang, duplicate SKU checks, safe generic server errors, and no-store responses.
- Product + variant creation, initial stock ledger entries, and audit event are written in one database transaction.
- Inventory adjustments use a compare-and-set update and refuse to reduce stock below reserved inventory; each successful adjustment creates a movement ledger entry and audit event.
- Duplicate product slugs/SKUs return a conflict rather than leaking database details.

## Security notes
- This does not replace a durable edge rate limiter on login or a production WAF/body-size limit.
- The initial administrator is environment-configured; the audit record records actor email in metadata because no database-backed admin identity is linked yet.
- The API uses remote image URLs only; upload/storage policy and image allowlists still need a separate implementation.
- Do not expose these endpoints publicly until database migrations, secret configuration, rate limiting, tests, and deployment checks are complete.
- Product removal is intentionally not implemented. Prefer archiving products and recording stock adjustments over destructive deletion.
- Concurrency conflicts during stock adjustment return a retryable conflict response.
