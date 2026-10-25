# Cloudflare edge security controls — LUMIÈRE STUDIO

This is a deployment checklist, not a claim that these controls are already enabled. Configure and test them in the Cloudflare dashboard for the actual production hostname before making the site public.

## 1. Protect sensitive endpoints

Create rate-limit rules for the actual deployed hostname. Use the platform's current rate-limiting UI and validate rule behavior in staging first.

| Scope | Suggested starting threshold | Action |
| --- | --- | --- |
| `POST /api/admin/login` | 5 requests per source IP per 1 minute | Block for 10 minutes |
| `POST /api/design-projects` | 5 requests per source IP per 10 minutes | Managed Challenge or block for 10 minutes |
| `POST /api/admin/*` | 60 requests per source IP per 1 minute | Block briefly and alert |

These are conservative starting values, not universal limits. Tune them for real traffic and ensure legitimate shared networks are not unfairly blocked. Do not trust client-supplied forwarding headers to identify an IP; use Cloudflare's authenticated edge client-IP field in its rule configuration.

## 2. WAF and request controls

- Enable Cloudflare managed WAF rules appropriate to the account/plan.
- Enable DDoS protections and bot protections available to the zone.
- Apply a request body-size limit appropriate to the storefront. Keep the application-level byte caps as a second layer.
- Do not cache `/api/admin/*`, `/api/admin/login`, or customer submission responses. Preserve `Cache-Control: no-store` from the application.
- Do not bypass WAF for API paths just to make integrations work. Add narrowly scoped exceptions only after reviewing evidence.
- Enforce HTTPS and redirect HTTP to HTTPS at the edge. Verify the origin is not directly reachable around Cloudflare.

## 3. Origin and proxy correctness

The application compares Origin with the request host/protocol. Before production:
- Confirm the actual platform reliably sets `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto`.
- Ensure forwarded headers are overwritten by the trusted proxy and cannot be supplied untrusted by direct clients.
- Test valid production requests and hostile/mismatched Origin requests on staging.
- If the platform's proxy model differs, adjust origin validation to use a trusted configured canonical origin; do not simply disable the check.

## 4. Secrets and access

- Store `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, and `DATABASE_URL` only in the deployment's encrypted environment/secrets manager.
- Generate the session secret from a cryptographically secure random generator; use at least 32 random bytes.
- Restrict dashboard access with MFA and least privilege.
- Rotate credentials immediately if they appear in a commit, log, screenshot, or client-side bundle.
- Never commit API tokens or production secrets to this repository.

## 5. Verification evidence required before launch

- [ ] Rate limits are enabled on the production hostname and tested from multiple client IPs.
- [ ] WAF managed rules and DDoS protection are enabled.
- [ ] Direct origin access is blocked or equivalently protected.
- [ ] HTTPS redirect and HSTS behavior are checked on the actual deployed host.
- [ ] Admin and customer responses are not cached.
- [ ] Valid and cross-origin mutation requests are tested in staging.
- [ ] Alerting is configured for repeated login failures and sustained request spikes.

**Important:** This document does not enable Cloudflare controls by itself. Dashboard rules, hostname-specific verification, and evidence from staging are still required. Do not collect real customer information or accept payments until the release gates in `security-review.md` are met.
