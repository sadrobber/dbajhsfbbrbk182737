<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project map

- Homepage sections: `src/components/home/`; pages and placeholder routes: `src/app/[locale]/`.
- Every UI text lives in `messages/{fr,en,it}.json` (same keys in all three; `npm test` checks it).
- Data access: UI and advisor only call `src/lib/data/queries.ts`. Swap the source in `src/lib/data/index.ts`.
- Brand name and fixed settings: `src/config/site.config.ts`. Products, Great Deals, packages, Gauge: edited in `/admin`, stored in `data/*.json` (one file per future DB table; schemas in `src/lib/data/schema.ts` + `records.ts`, FK check in `integrity.ts`).
- Admin: `src/app/admin/` (own root layout). Screens call only `src/lib/data/admin-repository.ts`; every page and server action calls `requireAdmin()` (the proxy is only the first gate). Login in `src/server/admin/session.ts` is temporary, not production auth.
- AI advisor: `src/server/advisor/`. Vendor code lives only in `ai-adapter.ts`; `guard.ts` re-checks every AI answer against the catalogue; `demo/` is the rule-based fallback.
- 3D: `src/components/three/`. Scenes load lazily through `three-slot.tsx`; each has a static fallback. `?3d=off|on` switches for testing.
- Before pushing: `npm run check` (typecheck, lint, unit tests) and `npm run build`.
