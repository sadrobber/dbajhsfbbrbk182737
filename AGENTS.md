<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project map

- Homepage sections: `src/components/home/`; pages and placeholder routes: `src/app/[locale]/`.
- Every UI text lives in `messages/{fr,en,it}.json` (same keys in all three; `npm test` checks it).
- Admin text lives in `messages/admin/{fr,en}.json` (French by default; the sidebar switch sets the `novacell_admin_locale` cookie). Server: `getAdminI18n()` in `src/server/admin/i18n.ts`; client: `useAdminI18n()`. Server errors are codes (`AdminDataError`, schema messages) translated under `Errors.*` / `Validation.*`.
- Data access: UI and advisor only call `src/lib/data/queries.ts`. Swap the source in `src/lib/data/index.ts`.
- Brand name and fixed settings: `src/config/site.config.ts`. Products, Great Deals, packages, Gauge: edited in `/admin`, stored in `data/*.json` (one file per future DB table; schemas in `src/lib/data/schema.ts` + `records.ts` + `pricing.ts`, FK check in `integrity.ts`).
- Catalogue model: `data/models.json` is the phone spec database (252 models, imported from the spec file: never retype spec values; `data_quality` says what's checked). `data/products.json` rows are variants (a stock unit: model + storage + colour + condition/grade + battery, own price, stock, SKU). Grades and battery options: `data/grades.json`, `data/battery-options.json`. Promo codes and the trade-in grid: `data/promo-codes.json`, `data/tradein-prices.json`, `data/tradein-config.json` (rules in `src/lib/data/pricing.ts`). `CatalogItem` = variant + resolved model/brand/colour names.
- Admin: `src/app/admin/` (own root layout). Screens call only `src/lib/data/admin-repository.ts`; every page and server action calls `requireAdmin()` (the proxy is only the first gate). Login in `src/server/admin/session.ts` is temporary, not production auth.
- Supabase: server-only client in `src/lib/supabase/server.ts` (`@supabase/server`, secret key, bypasses RLS). Env: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWKS_URL`. Not wired into the data layer yet.
- Orders: cart cookie + pricing in `src/lib/orders/`; checkout, payment sync and staff decisions in `src/server/orders/`; data in `src/lib/data/order-repository.ts`. A product's `supplierAvailability` (used at stock 0) gives three ways to order: in store (charged at once), 24–48h (card authorised, staff charge or release it in `/admin/orders/[id]`), on request (no online payment).
- Payments: `src/server/payments/` (`PaymentGateway`; Stripe code only in `stripe-adapter.ts`, `demo-adapter.ts` for dev). Env `PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; webhook at `/api/payments/stripe`.
- Suppliers: `src/server/suppliers/` (`SupplierConnector`; `manual.ts` today). A supplier API is one new adapter selected in `index.ts`.
- AI advisor: `src/server/advisor/`. Vendor code lives only in `ai-adapter.ts`; `guard.ts` re-checks every AI answer against the catalogue; `demo/` is the rule-based fallback.
- Support chat: bubble in `src/components/support/`, `POST /api/chat`, server code in `src/server/support/` (knowledge built from live data + `src/config/support.config.ts`, where the owner fills contact details and policies; `TODO` lines are skipped). Same `ai-adapter.ts` as the advisor (`generateText`); no AI → contact details.
- 3D: `src/components/three/`. Scenes load lazily through `three-slot.tsx`; each has a static fallback. `?3d=off|on` switches for testing.
- Before pushing: `npm run check` (typecheck, lint, unit tests) and `npm run build`.
