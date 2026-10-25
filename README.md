# LUMIÈRE STUDIO

A Thai-first, premium-light storefront for curated clothing and logo design services, built with Next.js App Router, TypeScript, and responsive CSS.

## Current implementation
- Responsive Thai storefront with ivory, cream, beige, and champagne accents
- Product collection with category filters and search
- Interactive client-side cart and quantity controls
- Logo-design service introduction and contact CTA
- Starter environment-variable template and ESLint configuration

## Run locally
1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` when integrations are configured.
4. Run `npm run dev` and open the local URL printed by Next.js.

## Verification
Run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Production work still required
This is a frontend starter, not yet a production commerce system. The cart is client-side only. Before taking real orders or payments, implement and test persistent database models, authentication/authorization, inventory reservation, order state transitions, a real payment provider and signed webhook verification, shipping integration, secure file storage, admin audit logs, privacy/terms/returns policies, monitoring, backups, and deployment configuration. Never place real credentials in the repository.
