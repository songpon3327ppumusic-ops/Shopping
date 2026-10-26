# LUMIÈRE STUDIO

A Thai-first storefront for curated clothing and Canva logo-design services, built with Next.js App Router, TypeScript, Prisma, and PostgreSQL.

## Implemented
- Responsive storefront, product search and category filters
- Admin APIs for products, categories, inventory adjustments, logo packages, and design-project management
- Server-side checkout API that validates customer/address/item input and recalculates totals from database prices
- Atomic PostgreSQL stock reservation with inventory ledger entries and a 15-minute unpaid reservation window
- Checkout idempotency key to avoid duplicate orders on retry
- Protected cleanup endpoint for releasing expired unpaid reservations
- GitHub Actions workflow to call the cleanup endpoint every 5 minutes (requires repository Actions secrets)
- Admin session hardening, same-origin checks, bounded JSON parsing, and shared rate-limit integration
- CI checks for Prisma schema validation, npm audit, unit tests, TypeScript, lint, and production build; CodeQL analysis

## Run locally
1. Use Node.js 22.
2. Install dependencies with `npm install` (the current CI uses legacy peer dependency resolution).
3. Copy `.env.example` to `.env.local` and configure local secrets and PostgreSQL.
4. Run `npx prisma validate`, review/generate a migration, then apply it to a local database.
5. Run `npm run dev`.

## Checkout API

`POST /api/checkout` expects JSON containing:
- `idempotencyKey`: unique client-generated key for this checkout attempt (16–100 alphanumeric, underscore, or hyphen characters)
- `customer`: name, email, phone
- `shippingAddress`: Thai recipient/address fields and a 5-digit postal code
- `items`: 1–20 distinct variant IDs with quantities from 1 to 10
- optional `customerNote`

Prices are loaded from the database; browser-supplied prices, discounts, and shipping costs are never accepted. The current implementation calculates no discount and sets shipping to zero until approved promotion/shipping rules are implemented. Successful requests create an unpaid `AWAITING_PAYMENT` order and reserve stock for 15 minutes. This endpoint does **not** collect payment or mean an order is paid.

## Expired reservation cleanup

`POST /api/internal/expire-checkouts` requires `Authorization: Bearer <CRON_SECRET>`.

A GitHub Actions workflow at `.github/workflows/expire-checkouts.yml` calls this endpoint every 5 minutes. Configure these repository **Actions secrets** before enabling it:
- `APP_BASE_URL`: full production/staging base URL using HTTPS, with no path suffix (for example `https://shop.example.com`)
- `CRON_SECRET`: strong random secret; the exact same value must be configured in the app hosting environment

GitHub's scheduled workflow can be delayed and has a minimum 5-minute interval; it is not a real-time scheduler. Verify the workflow manually with **Actions → Expire unpaid checkout reservations → Run workflow**, then inspect the job result. Do not commit the secret or expose it in client code. Until the app is deployed and both secrets are configured, cleanup will not run successfully.

## Verification
Run `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

## Production blockers
This is still not production-ready. Before accepting real orders:
- Create/review/commit Prisma migrations and test against a staging PostgreSQL database; the schema has changed and no migration is automatically applied by CI.
- Add checkout integration tests, including concurrent last-item checkout, idempotency retries, expiry cleanup, and database failure scenarios.
- Connect a payment provider and implement signed, replay-safe webhooks with amount/currency/order matching. Do not mark orders paid from browser redirects.
- Configure and manually verify the scheduled cleanup workflow and its secrets against a deployed HTTPS staging environment.
- Configure Redis rate limiting, secure object storage, Cloudflare edge controls, HTTPS, backups/restore, monitoring, and a verified production deployment.
- Publish accurate privacy, terms, shipping, and return/refund policies.
- Complete a manual security review. Passing CI/CodeQL is not a penetration test or a guarantee of complete security.

Never commit real credentials, customer data, or production database URLs.
