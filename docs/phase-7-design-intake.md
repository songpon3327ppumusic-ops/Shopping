# Phase 7 — Customer logo design brief intake

## Added
- Public `POST /api/design-projects` validates a customer design request and creates a project only for an active package.
- The API snapshots the package price into `quotedPriceSatang` at submission time, rather than trusting a client-supplied price.
- Strict Zod validation bounds text, arrays, URLs, and request content length.
- Customer contact email is normalized; project numbers include random bytes; responses avoid returning submitted brief/contact details.
- Explicit privacy consent is required and a timestamp is recorded in the brief.

## Important launch requirements
- Configure a durable edge rate limiter and anti-abuse controls (e.g. Cloudflare rate limiting / WAF) before public launch. A request content-length check is only an additional guard, not a substitute for an edge body-size limit.
- Add a privacy notice, retention/deletion process, and lawful basis/consent wording appropriate for Thailand's PDPA before collecting real customer data.
- Reference URLs are stored as text only; the server does not fetch them. Do not render arbitrary HTML from customer input.
- File upload, customer accounts, customer project tracking, email notifications, revisions, payment, and refunds are not implemented here.
- The endpoint does not charge the customer or mark a project as paid. Do not represent a submitted inquiry as a confirmed paid order.
- Add automated tests for malformed payloads, unavailable package, oversized request, and database failures before launch.
