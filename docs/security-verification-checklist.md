# Phase 10 — Security verification checklist

This checklist is for a staging environment only. Never run destructive tests against production or use real customer data.

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
- [ ] Concurrent inventory adjustment and future checkout reservation tests prove no lost updates or overselling.

## HTTP, privacy, and abuse
- [ ] API errors do not include stack traces, SQL, environment values, credentials, or customer records.
- [ ] Admin responses and customer submission responses include `Cache-Control: no-store`.
- [ ] Cloudflare enforces request-body limits; application Content-Length checks are not treated as sufficient on their own.
- [ ] Public intake has durable shared rate limiting, bot/spam controls, and alerting.
- [ ] Reference URLs are never fetched server-side; user-provided strings are escaped on display.
- [ ] Privacy notice, purpose limitation, retention/deletion process, access controls, and breach response are ready before real customer data is collected.

## Database, dependencies, and release
- [ ] A reviewed Prisma migration applies to a disposable/staging PostgreSQL database from a clean state.
- [ ] Backup restore is successfully rehearsed.
- [ ] Commit a lockfile and switch CI to `npm ci`; install and build are reproducible.
- [ ] Current HEAD CI passes Prisma validation, audit, typecheck, lint, and build.
- [ ] Current HEAD CodeQL and secret scanning have no unresolved critical/high findings.
- [ ] Route-level automated tests run in CI; manual source review alone is not accepted as proof.
- [ ] CSP is introduced only after a tested nonce/allowlist implementation; do not deploy a guessed policy.
- [ ] Payment tests (once integrated) cover signature verification, idempotency, amount/currency/order matching, replay, and duplicate/out-of-order events.

## Current known blockers
- No live database or reviewed migration has been verified here.
- No reproducible package lockfile has been verified in the repository.
- CI and CodeQL are currently running on a previous observed HEAD; re-check the exact latest commit before release.
- Durable Cloudflare rate limits, public intake abuse controls, automated tests, and payment integration remain unverified.
- This checklist is not a penetration test or a guarantee of complete security.
