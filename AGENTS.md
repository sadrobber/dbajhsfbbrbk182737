<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project map

- Homepage sections: `src/components/home/`; pages and placeholder routes: `src/app/[locale]/`.
- Every UI text lives in `messages/{fr,en,it}.json` (same keys in all three; `npm test` checks it).
- Data access: UI and advisor only call `src/lib/data/queries.ts`. Swap the source in `src/lib/data/index.ts`.
- Brand name, Gauge %, Great Deals, packages: `src/config/site.config.ts`. Catalogue: `src/data/catalog.json`.
- AI advisor: `src/server/advisor/`. Vendor code lives only in `ai-adapter.ts`; `guard.ts` re-checks every AI answer against the catalogue; `demo/` is the rule-based fallback.
- Before pushing: `npm run check` (typecheck, lint, unit tests) and `npm run build`.
