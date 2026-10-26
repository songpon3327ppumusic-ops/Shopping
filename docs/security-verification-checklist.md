# Phase 10 — Security verification checklist

Use this checklist for staging only. Never run destructive tests against production or use real customer data.

## Verified in repository CI (commit 7aaad35d3c0f69bc6c0262eb571df15d7c3fa7d5)
- [x] Prisma schema validation passed.
- [x] Production dependency audit passed at the configured high-severity threshold.
- [x] Existing unit tests passed.
- [x] TypeScript typecheck passed.
- [x] ESLint passed.
- [x] Production build passed.
- [x] CodeQL workflow passed.

These results confirm the repository checks at that commit only. They do not prove live database behavior, deployed configuration, or complete security.

## Authentication and authorization
- [ ] Unauthenticated requests to every `/api/admin/*` route return 401/403 and reveal no protected data.
- [ ] Invalid, expired, tampered, and wrong-audience/issuer sessions are rejected.
- [ ] Login rejects non-JSON payloads, malformed JSON, oversized bodies, invalid email, and oversized passwords.
- [ ] Same-origin checks reject foreign Origin values on every browser mutation route.
- [ ] Cloudflare edge rate limiting is enabled and verified from separate client IPs before exposing login or public intake.
- [ ] Session secret is at least 32 random bytes, stored only in deployment secrets, and rotation invalidates old sessions.
- [ ] Production HTTPS verifies the Secure `__Host-` cookie; cookies are HttpOnly, SameSite=Strict, Path=/, with no Domain attribute.

## Validation and data integrity
- [ ] Unknown fields are rejected by strict Zod schemas.
- [ ] Duplicate SKU, product slug, and category slug return safe conflict errors.
- [ ] Public logo intake cannot set project status, package price, user ID, or project number.
- [ ] A deactivated package cannot accept new requests.
- [ ] Admin design-project status transitions follow the allowlist; unpaid work cannot be started by a manual status update.
- [ ] Every admin write and its audit record commit or roll back together.
- [ ] Inventory adjustments reject zero delta, invalid values, and stock below reserved quantity.
- [ ] Checkout integration tests cover server-side totals, duplicate idempotency keys, concurrent last-item checkout, reservation expiry, and database failures.
- [ ] Reservation reconciliation compares `stockReserved` against active order reservations and alerts on mismatch.

## HTTP, privacy, and abuse
- [ ] API errors do not include stack traces, SQL, environment values, credentials, or customer records.
- [ ] Admin responses and customer submission responses include `Cache-Control: no-store`.
- [ ] Cloudflare enforces request-body limits; application-level byte caps are only defense in depth.
- [ ] Public intake has durable shared rate limiting, bot/spam controls, and alerting.
- [ ] Reference URLs are never fetched server-side; user-provided strings are escaped on display.
- [ ] Privacy notice, purpose limitation, retention/deletion process, access controls, and breach response are ready before real customer data is collected.

## Database, dependencies, and release
- [ ] Generate and review Prisma migrations; apply to a disposable/staging PostgreSQL database from a clean state.
- [ ] Commit a lockfile and switch CI to `npm ci`; prove clean reproducible install and build.
- [ ] Backups and restore are rehearsed.
- [ ] Secret scanning and dependency scanning have no unresolved critical/high findings.
- [ ] CSP is introduced only after a tested nonce/allowlist implementation; do not deploy a guessed policy.
- [ ] Payment tests (once integrated) cover signature verification, idempotency, amount/currency/order matching, replay, and duplicate/out-of-order events.
- [ ] Deploy to staging and manually verify checkout, stock reservation, cancellation, admin access, and logs before launch.

## Current known blockers — do not launch until resolved
- No live/staging PostgreSQL connection or reviewed migration has been verified here; there is no migration history committed.
- No package lockfile has been verified in the repository.
- Checkout route-level/concurrency integration tests are not yet present; current tests are unit-level.
- Payment provider and signed webhook are not implemented. Checkout only creates unpaid orders.
- Expired reservations require a configured trusted scheduler to call `POST /api/internal/expire-checkouts` every minute.
- Upstash Redis credentials and trusted Cloudflare client-IP/origin configuration must be set and verified in hosting.
- Cloudflare WAF/rate-limit/body-size rules, HTTPS/origin protection, monitoring, backups, legal policies, and a production deployment have not been verified here.

This checklist is not a penetration test or a guarantee of complete security.
