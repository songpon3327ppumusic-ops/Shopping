# Phase 8 — Admin design project management API

## Added
- `GET /api/admin/design-projects`: authenticated admin listing, newest first, capped at 200 projects; includes package metadata and recent revisions.
- `PATCH /api/admin/design-projects/:id`: authenticated, same-origin-only updates for workflow status, quote/final price, and due date.
- Explicit allowed status-transition map to prevent accidental jumps (for example, completed/cancelled projects cannot be reopened through this endpoint).
- Audit event written in the same database transaction as each update.
- Sensitive admin responses are marked no-store.

## Notes
- This API is not a replacement for a complete admin UI.
- Status `IN_PROGRESS` can be selected from `AWAITING_PAYMENT` by an administrator; this is a workflow override, not proof of payment. A future payment integration must enforce payment state separately and must not infer payment from project status.
- No customer-facing project lookup endpoint is provided, so project numbers alone do not expose project details.
- Rate limiting, automated tests, migrations, and a live staging database remain release gates.
