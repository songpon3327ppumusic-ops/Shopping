# Phase 4 — Initial admin session foundation

## Implemented
- Login input validation with Zod and strict object shape.
- Password hash comparison using bcryptjs; no plaintext password is stored in source.
- Signed JWT session using jose with fixed algorithm allowlist, issuer/audience checks, expiry, and random token ID.
- HttpOnly, SameSite=Strict cookie with the __Host- prefix and path=/; Secure is enabled in production.
- Logout and current-session endpoints.
- Generic authentication failures and no-store response headers.

## Required environment secrets
Set these in the hosting provider's secret manager, never in Git:
- ADMIN_EMAIL: dedicated administrator email.
- ADMIN_PASSWORD_HASH: bcrypt hash generated securely offline for a long, unique password.
- ADMIN_SESSION_SECRET: random secret with at least 32 characters; use a cryptographically secure generator.

No default credentials are provided. If the variables are absent, login intentionally returns 503.

## Mandatory production hardening before exposure
1. Add a shared durable rate limiter (Cloudflare WAF/rate limiting or a server-side distributed limiter) to `POST /api/admin/login`. In-memory limits are not reliable in serverless/multi-instance deployments.
2. Add CSRF/origin protections for all state-changing admin endpoints before implementing them. SameSite=Strict is defense-in-depth, not the only control.
3. Add MFA for administrator accounts and secure recovery procedures.
4. Add audit logging for sign-in success/failure without logging passwords, tokens, or secrets.
5. Keep all admin routes server-side authorized; the presence of a UI control or cookie alone must not authorize database mutations.
6. Add tests for expired/tampered tokens, missing environment secrets, malformed JSON, oversized bodies, wrong credentials, and cookie flags.
7. Configure a reverse proxy/WAF body-size limit and rate limits before public deployment.

## Current limitation
These routes establish a starting point for one configured administrator only. They do not yet create customer accounts, implement password reset, MFA, persistent user sessions, or authorize any admin data mutations. Do not treat the site as production-ready yet.
