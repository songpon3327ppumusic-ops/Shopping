# Security review — LUMIÈRE STUDIO

## Current risk summary
This repository remains a development prototype and is **not production-ready**. Do not collect real customer data or accept payments until all release gates below are met.

| Area | Current state | Risk / required control |
| --- | --- | --- |
| Admin authentication | Login endpoint, bcrypt password comparison, signed 8-hour JWT session, HttpOnly/SameSite cookie | Shared atomic login rate limiter uses Upstash Redis REST and fails closed until credentials and a trusted Cloudflare client IP are configured. Account recovery is not implemented. |
| Authorization | Server-side admin checks on implemented admin APIs | Review every route and page; ensure no unguarded admin actions. No staff permission matrix yet. |
| CSRF/origin | Same-origin checks on browser mutation routes and admin login; SameSite=Strict cookie | Validate reverse-proxy host/proto behavior in staging. Do not rely on Origin checks as the only CSRF defense. |
| Database | Prisma schema and API code exist | No verified production migration or live staging database. Use managed PostgreSQL, least-privilege credentials, backups, and restore tests. |
| Catalog/inventory | Admin catalog APIs, stock adjustment ledger, conditional SQL stock reservations | Concurrent checkout tests, reservation reconciliation, and staging verification remain outstanding. Expired reservations require a configured trusted scheduler. |
| Design service | Public brief intake and admin project management APIs | Public intake uses shared Upstash Redis rate limiting but fails closed until configured. Spam controls, privacy notice/retention workflow, and staging verification remain required. |
| Checkout/order totals | Server-side checkout endpoint recalculates item prices from PostgreSQL, creates idempotent unpaid orders, and atomically reserves stock for 15 minutes | Shipping is zero and promotions are not applied. Route-level/concurrency tests and reviewed migrations are outstanding. Payment is not connected; orders are not paid. |
| Payments | No real provider connected | Implement signed webhooks, idempotency, amount/currency/order matching, and replay protection. Never mark orders paid from a browser redirect alone. |
| Uploads/logo assets | Secure upload flow not implemented | Use private object storage, allowlisted MIME/types, size limits, randomized object keys, malware scanning where appropriate, and signed URLs. |
| HTTP headers | Baseline defensive headers configured | Validate on deployed HTTPS host. A strict CSP should be designed with nonce support before enforcement. |
| Secrets | Environment template only | Keep credentials out of Git, logs, client bundles, screenshots, and support messages. Rotate exposed credentials. |
| Dependencies/CI | CI and CodeQL passed on commit `7aaad35d3c0f69bc6c0262eb571df15d7c3fa7d5` | The passing checks include Prisma validation, npm audit (high threshold), unit tests, typecheck, lint, build, and CodeQL. There is no verified lockfile/reproducible install yet. |
| Privacy/legal | Not implemented | Publish accurate privacy notice, terms, returns/refund and shipping policies, and relevant cookie/analytics disclosures for Thai operations. |
| Operations | Not configured | Add monitoring, alerting, backup/restore drills, incident response, and access reviews. |

## Implemented baseline
- Standard defensive HTTP headers.
- Dependabot and CodeQL workflows.
- CI for Prisma validation, dependency audit, unit tests, type checking, lint, and production build.
- Server-side admin auth/session helper and admin authorization guards.
- Same-origin checks on implemented admin mutation endpoints and login.
- Zod validation and transactional audit events in implemented admin write routes.
- Product/category management, inventory adjustment, and logo-service project APIs.
- Checkout API with server-side price calculation, atomic stock reservation, idempotency key, and 15-minute unpaid reservation.
- Protected endpoint to release expired unpaid checkout reservations.

## Important limitations
- A source-code review is not a penetration test and cannot establish that a system is "fully secure".
- The admin login and public design-intake routes require configured Upstash Redis and trusted Cloudflare client-IP handling; they fail closed when unavailable.
- Checkout creates unpaid orders only; payment is not connected. The protected expiry endpoint must be scheduled in hosting before reservations are relied on in production.
- Production must use HTTPS for the Secure `__Host-` cookie.
- No database migration has been generated/reviewed/applied against staging here. Do not deploy a schema change without a migration and backup/restore plan.
- No reproducible package lockfile has been verified.
- No production deployment, scheduler, Cloudflare rules, database, payment credentials, or storage credentials have been configured or verified through this repository review.

## Minimum release gates
1. CI passes on the exact release commit from a clean reproducible install with no unresolved critical/high findings.
2. Commit a lockfile and use reproducible dependency installation.
3. A reviewed Prisma migration applies to staging; backup restore is rehearsed.
4. Automated tests cover auth, authorization, origin rejection, input validation, audit logs, and rate limiting.
5. Checkout integration/concurrency tests prove totals, idempotency, expiry release, and atomic inventory reservation.
6. Payment webhook signature, idempotency, amount/currency matching, and replay tests pass in provider test mode.
7. CodeQL, secret scanning, dependency scanning, and manual security review have no unresolved critical/high findings.
8. Monitoring and incident response are ready; backups restore successfully.
9. Privacy, terms, refund, and shipping information is published and accurate.
10. Cloudflare edge rate limiting, WAF, HTTPS, request-size controls, and origin protection are enabled and tested.

## Incident response
If a secret is committed or exposed, revoke/rotate it immediately, inspect access logs, remove it from active configuration, and follow GitHub's secret-removal guidance. Do not paste production credentials into issues or chat.

## Cloudflare edge deployment guide
See [`cloudflare-security-controls.md`](./cloudflare-security-controls.md). Committing the guide does not enable dashboard controls; configure and verify them for the actual hostname.
