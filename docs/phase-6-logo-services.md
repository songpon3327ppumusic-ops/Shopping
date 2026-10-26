# Phase 6 — Logo design service package API

## Added
- Public `GET /api/logo-packages` returns active packages only.
- Admin-only `GET /api/admin/logo-packages` lists active and inactive packages.
- Admin-only `POST /api/admin/logo-packages` creates a package with bounded fields and strict schema validation.
- Package creation and audit logging run in one transaction.
- Price is represented as integer satang; package slugs are unique; public responses omit internal timestamps and are not cached.

## Not yet included
- Customer design-project intake and file upload.
- Customer identity/account linking and order/payment linkage.
- Admin update/archive actions for packages.
- Durable request rate limiting, security tests, and database migration/deployment verification.

No real payment is enabled. Do not publish packages from the API until the database is migrated and the deployment's rate limiting and secrets are configured.
