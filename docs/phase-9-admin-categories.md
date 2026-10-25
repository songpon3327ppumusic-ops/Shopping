# Phase 9 — Admin category management

## Added
- Admin-only category creation and update APIs.
- Strict input validation for category names, URL-safe slugs, descriptions, ordering, and active state.
- Same-origin checks for browser mutations, session authorization, no-store responses, and transactional audit events.
- Duplicate category slugs return HTTP 409.

## Routes
- `GET /api/admin/categories` — list categories.
- `POST /api/admin/categories` — create a category.
- `PATCH /api/admin/categories/:id` — update category fields.

## Notes
- Category deletion is intentionally not provided, avoiding accidental removal of categories referenced by products.
- Database migration, admin UI, and automated route tests remain outstanding.
