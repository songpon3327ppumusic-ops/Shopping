# Security review — LUMIÈRE STUDIO

## Current risk summary
This repository is a storefront prototype. It is **not production-ready** and must not be used to collect real customer information or payments yet.

| Area | Current state | Risk / required control |
| --- | --- | --- |
| Authentication | Not implemented | Add secure session management, password hashing or a reputable identity provider, rate limits, and account recovery. |
| Authorization | Not implemented | Enforce roles on the server for every admin/staff action; never trust role values from the client. |
| Database | Prisma schema only | Configure managed PostgreSQL, least-privilege credentials, reviewed migrations, backups, and restore tests. |
| Checkout/order totals | Client-side demo only | Recalculate prices, promotions, shipping and totals on the server. Never trust browser totals. |
| Inventory | Schema only | Use transactions/conditional updates for stock reservations; test simultaneous checkouts and cancellation release. |
| Payments | No real provider connected | Verify signed webhooks, idempotency, amount/currency/order matching, and replay protection. Never mark an order paid from a browser redirect alone. |
| Admin console | Not implemented | Add server-side authorization, CSRF protections as applicable, audit logs, secure session cookies, and re-authentication for sensitive actions. |
| Uploads/logo assets | Not implemented | Use private object storage, allowlisted MIME/types, size limits, randomized object keys, malware scanning where appropriate, and signed URLs. |
| HTTP headers | Baseline headers configured | Validate headers on the deployed HTTPS host. A strict CSP should be designed with nonce support before enforcement. |
| Secrets | Environment template only | Keep actual credentials out of Git, logs, client bundles, screenshots, and support messages. Rotate any credential that was exposed. |
| Dependencies/CI | CI and Dependabot/CodeQL configuration added | Review workflow results, dependency alerts, and lockfile changes. CI passing is not proof of absence of vulnerabilities. |
| Privacy/legal | Not implemented | Add privacy notice, terms, returns/refund, shipping, cookie/analytics disclosures as applicable to Thai law and actual business practice. |
| Operations | Not configured | Add error monitoring, alerting, backup/restore drills, incident response, and access reviews. |

## Implemented baseline in this phase
- Standard defensive HTTP headers in Next.js (including frame denial, MIME sniffing protection, referrer policy and restrictive browser feature permissions).
- Dependabot weekly checks for npm and GitHub Actions dependencies.
- GitHub CodeQL workflow for JavaScript/TypeScript static analysis.
- CI schema validation, type checking, linting, and build checks.
- Environment-secret handling guidance.

## Important deployment note
The HSTS header should only be served from an HTTPS production deployment and only after confirming all affected subdomains support HTTPS. Do not enable CSP by guessing a policy: Next.js inline/runtime scripts and external fonts require a tested nonce/allowlist design. Revisit both before launch.

## Minimum release gates
1. CI passes from a clean install.
2. Prisma schema validates and reviewed migration applies to a staging database.
3. Authentication, role checks, CSRF/origin strategy, rate limits and validation tests pass.
4. Checkout tests prove server-side totals and atomic inventory reservation.
5. Payment webhook signature, idempotency and replay tests pass in provider test mode.
6. Dependency, CodeQL and secret scans are reviewed with no unresolved critical/high findings.
7. Backups are restored successfully in a rehearsal; monitoring and incident contacts are ready.
8. Privacy/terms/refund/shipping information is published and accurate.
