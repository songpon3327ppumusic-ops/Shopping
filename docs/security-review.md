# Security review — LUMIÈRE STUDIO

## Current risk summary
This repository remains a development prototype and is **not production-ready**. Do not collect real customer data or accept payments until all release gates below are met.

| Area | Current state | Risk / required control |
| --- | --- | --- |
| Admin authentication | Login endpoint, bcrypt password comparison, signed 8-hour JWT session, HttpOnly/SameSite cookie | No shared durable rate limit or account recovery yet; configure Cloudflare edge rate limiting before exposure. Rotate session secret if exposed. |
| Authorization | Server-side admin checks on implemented admin APIs | Review every route and page; ensure no unguarded admin actions. No staff permission matrix yet. |
| CSRF/origin | Same-origin checks on browser mutation routes and admin login; SameSite=Strict cookie | Validate reverse-proxy host/proto behavior in staging. Do not rely on Origin checks as the only CSRF defense. |
| Database | Prisma schema and API code exist | No verified production migration or live staging database in this repository workflow. Use managed PostgreSQL, least-privilege credentials, backups, and restore tests. |
| Catalog/inventory | Admin category/product APIs and stock adjustment ledger | Checkout reservation, concurrency tests, and reconciliation are not implemented. |
| Design service | Public brief intake and admin project management APIs | Public intake needs durable rate limiting, spam controls, privacy notice/retention workflow, and automated tests before launch. |
| Checkout/order totals | No complete server-side checkout | Recalculate prices, promotions, shipping and totals on the server. Never trust browser totals. |
| Payments | No real provider connected | Verify signed webhooks, idempotency, amount/currency/order matching, and replay protection. Never mark an order paid from a browser redirect alone. |
| Uploads/logo assets | Secure upload flow not implemented | Use private object storage, allowlisted MIME/types, size limits, randomized object keys, malware scanning where appropriate, and signed URLs. |
| HTTP headers | Baseline defensive headers configured | Validate on deployed HTTPS host. A strict CSP should be designed with nonce support before enforcement. |
| Secrets | Environment template only | Keep actual credentials out of Git, logs, client bundles, screenshots, and support messages. Rotate any credential that was exposed. |
| Dependencies/CI | CI, Dependabot, and CodeQL configuration added | Latest workflow status must be checked on current HEAD; no passing result is asserted by this document. Use a committed lockfile and clean reproducible installs before release. |
| Privacy/legal | Not implemented | Publish accurate privacy notice, terms, returns/refund and shipping policies, and relevant cookie/analytics disclosures for Thai operations. |
| Operations | Not configured | Add monitoring, alerting, backup/restore drills, incident response, and access reviews. |

## Implemented baseline
- Standard defensive HTTP headers (frame denial, MIME sniffing protection, referrer policy and restrictive browser feature permissions).
- Dependabot checks for npm and GitHub Actions dependencies.
- CodeQL workflow for JavaScript/TypeScript static analysis.
- CI configured for Prisma schema validation, dependency audit, type checking, linting, and build.
- Server-side admin auth/session helper and admin authorization guards.
- Same-origin checks on implemented admin mutation endpoints and login.
- Zod validation and transactional audit events in implemented admin write routes.
- Product and category management, inventory adjustment, and logo-service project APIs.

## Important limitations
- A source-code review is not a penetration test and cannot establish that a system is "fully secure".
- The login and public design-intake endpoints are not protected by a shared durable rate limiter in application code. Configure Cloudflare WAF/rate limiting (or an equivalent shared service) before public exposure.
- The login route uses the `__Host-` cookie prefix. Production must use HTTPS so the browser accepts the Secure cookie. Confirm production behavior on the actual host.
- Do not enable CSP by guessing a policy: Next.js runtime scripts and external assets require a tested nonce/allowlist design.
- Do not deploy a database migration until it has been generated/reviewed and tested against a staging database with a backup/restore plan.

## Minimum release gates
1. CI passes on the exact release commit from a clean install, with no unresolved critical/high dependency findings.
2. Commit a lockfile and use reproducible dependency installation.
3. Prisma schema validates and a reviewed migration applies to staging; backup restore is rehearsed.
4. Automated tests cover authentication, unauthorized access, origin rejection, input validation, audit logs, and rate-limit behavior.
5. Checkout tests prove server-side totals and atomic inventory reservation under concurrent requests.
6. Payment webhook signature, idempotency, amount/currency matching, and replay tests pass in provider test mode.
7. CodeQL, secret scanning, dependency scanning, and a manual security review have been reviewed with no unresolved critical/high findings.
8. Backups restore successfully; monitoring and incident response are ready.
9. Privacy/terms/refund/shipping information is published and accurate.
10. Cloudflare edge rate limiting and request-size controls are enabled for public endpoints.

## Incident response
If a secret is committed or exposed, revoke/rotate it immediately, inspect access logs, remove the secret from active configuration, and follow GitHub's secret-removal guidance. Do not paste production credentials into issues or chat.
