# Phase 2 — Persistent database foundation

## Decision
Use PostgreSQL with Prisma ORM. Monetary values are stored as integer satang (1 THB = 100 satang), never floating point. All real credentials stay in environment variables and must never be committed.

## Included data model
- Users, roles/status, and Thai shipping addresses
- Categories, products, product variants/SKUs, price and stock counters
- Append-only inventory movement ledger
- Orders and immutable order-item snapshots
- Payment records with idempotency and webhook-event uniqueness
- Promotions, logo-design packages, design projects, revisions, and admin audit events

## Required next implementation steps
1. Add Prisma CLI and client to package.json and regenerate the lockfile in a Node 20+ environment.
2. Set a managed PostgreSQL DATABASE_URL in the deployment secret store; do not put a real URL in Git.
3. Run prisma validate, generate the client, create the initial migration, and review it before applying to a shared database.
4. Add a singleton Prisma client module and server-only data-access layer.
5. Add authenticated API handlers and role checks; never trust a role supplied by the browser.
6. Implement order creation in a database transaction: re-read current prices, verify active variants, atomically reserve stock, write order snapshots and an inventory movement. Do not accept client-submitted totals.
7. Implement provider-specific payment creation and signed webhook verification only after a provider is selected. Webhooks must be idempotent.
8. Add tests for concurrent stock reservation, order cancellation/release, payment replay, permissions, and promotion limits.
9. Seed only clearly labelled development/demo data; never create fake paid orders in production.

## Safety and readiness
The existing storefront cart remains client-side and is not a checkout system. No payment is collected and no real inventory is reserved until the server routes, database, authentication, and integration tests exist. Do not enable production ordering until these gates pass.
