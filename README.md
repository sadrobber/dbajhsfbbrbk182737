# Riviera smartphone shop: homepage prototype + AI shopping advisor

First step of the e-commerce platform for a smartphone shop serving Menton, Monaco, Beausoleil, Cap-d'Ail, Roquebrune-Cap-Martin and Sospel. This version contains the **homepage** (visual prototype, FR/EN/IT) and a **working "Help me choose" advisor**. Product pages, cart, checkout, accounts and the back office are out of scope; their links open "coming soon" pages.

## Run it

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. It opens the French site at `/fr`; English is at `/en` and Italian at `/it`.

The advisor works immediately in **demo mode** (no API key). To plug in an AI provider, copy `.env.example` to `.env.local` and follow the comments in it (see [AI advisor](#ai-advisor)).

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Unit tests (advisor rules, catalogue guard, translations) |
| `npm run check` | Typecheck + lint + tests |

## Where to change things

| What | Where |
| --- | --- |
| Brand name (text wordmark, titles, app icon letter) | `BRAND_NAME` in `src/config/site.config.ts` |
| Gauge % (and on/off, prizes, rules page) | `merchandising.gauge` in `src/config/site.config.ts` |
| Products shown in Great Deals | `merchandising.greatDeals.productIds` in `src/config/site.config.ts` (ids from the catalogue; sold-out ones are skipped) |
| Catalogue (models, prices, stock, grades, battery, warranty, badges, "good for" tags) | `src/data/catalog.json` (validated at startup, errors name the faulty product) |
| Packages (price, contents, icons, TODO markers) | `merchandising.packages` in `src/config/site.config.ts` |
| Package names, taglines and item labels | `Packages` in `messages/fr.json`, `en.json`, `it.json` |
| Towns and services in "Close to you" | `merchandising.serviceArea` in `src/config/site.config.ts` + `Local` in the message files |
| "Only N left" threshold | `merchandising.lowStockThreshold` |
| Any text on the site | `messages/{fr,en,it}.json` (French is the default language) |
| AI provider | `.env.local` (see below); the only vendor-specific code is `src/server/advisor/ai-adapter.ts` |
| Search engine indexing (off while prices are mock data) | `ALLOW_SEARCH_INDEXING` in `src/config/site.config.ts` |

Notes:

- "Last one available" is added automatically when stock is 1. For a refurbished phone, the "New: €X / You save €Y" line appears when the catalogue has the same model and storage new.
- Package items marked `todo: true` are shown with a dashed border and a **TODO** tag until their contents are confirmed.
- The Gauge copy ("When it reaches 100%, a winner is drawn", steps, prizes) lives in the `Gauge` section of the message files and still needs legal review.
- Phone pictures are neutral illustrations (`src/components/product/phone-visual.tsx`), no brand-owned photos.

## AI advisor

"Help me choose" opens a chat panel. Customers write freely ("An iPhone for my daughter around €400") and get at most three product cards: **The Right Choice**, **The Smart Deal** (cheaper) and **The Premium Option** (above budget, only when worth it), plus a package when relevant. A vague request gets one short question with tap-to-answer buttons. Replies follow the customer's language (FR/EN/IT).

How it is built:

1. `POST /api/advisor` (`src/app/api/advisor/route.ts`) validates the request and applies a per-visitor rate limit.
2. `src/server/advisor/index.ts` sends the in-stock catalogue, the rules and the conversation to the AI provider and asks for **structured JSON** (product ids, slots, short reasons), not free text.
3. `src/server/advisor/guard.ts` re-checks every answer: only phones that exist and are in stock, one per slot, Smart Deal cheaper and Premium pricier than the Right Choice, no invented prices in the text. Cards are built from the real catalogue, so specs and prices are always correct.
4. If no provider is configured, or the provider fails or returns something unusable, the **rule-based demo engine** (`src/server/advisor/demo/`) answers instead, using budget, brand, condition, storage and "good for" tags. The customer always gets an answer.

Choosing a provider (in `.env.local`; keys stay on the server and never reach the browser):

| `AI_PROVIDER` | Needs | Notes |
| --- | --- | --- |
| `demo` (default) | nothing | Rule-based, for demos without any account |
| `anthropic` | `AI_API_KEY` or `ANTHROPIC_API_KEY` | Claude via the official SDK. Default model `claude-opus-5` at low effort for fast replies; change with `AI_MODEL`. Server-side refusal fallback is on (`AI_FALLBACKS=default`); set `AI_FALLBACKS=off` if you pick a model that does not support it. |
| `openai-compatible` | `AI_MODEL`, usually `AI_API_KEY`, optional `AI_BASE_URL` | Any OpenAI-compatible Chat Completions API (OpenAI, Mistral, Groq, OpenRouter, local Ollama...) |

To add another vendor, add a case in `getAiClient()` in `src/server/advisor/ai-adapter.ts`; nothing else changes. The rate limit is in memory (fine for one server); move it to a shared store such as Redis when running several instances.

## Tech stack, and why

- **Next.js 16 (App Router), React 19, TypeScript.** Server rendering gives fast pages on phones and good local SEO. Server-only API routes keep AI keys secret. The same app can later host the back office (a protected `/admin` area) and serve as the storefront of a headless commerce backend.
- **Tailwind CSS 4.** Theme tokens (dark, electric blue) in one place, mobile-first, very little CSS shipped.
- **next-intl.** French at `/fr` (the default, `/` opens it), English at `/en`, Italian at `/it`; ICU messages for plurals and prices.
- **Zod.** The same schemas validate the mock catalogue today, database or API data tomorrow, and the AI's JSON.
- **A data access layer** (`src/lib/data`). Components only call functions like `getGreatDeals()` or `getRefurbishedPicks()`; switching from JSON files to a database means implementing one interface (`DataSource`) and changing one line in `src/lib/data/index.ts`.
- **Vitest** for the advisor rules, the guard and translation completeness.

Growth path:

- **E-commerce and back office:** PostgreSQL plus a headless commerce engine such as Medusa (open source, TypeScript) for products, variants, stock per location, orders, customer accounts, promotions and an admin dashboard, plugged in behind `src/lib/data`. The Great Deals list, Gauge % and packages move from `site.config.ts` into the admin.
- **Real-time stock with the physical shop:** the point-of-sale pushes stock changes (webhook or sync job) to the stock module; the site refreshes affected pages on demand (`revalidateTag`) and product pages read live availability. The advisor already reads stock through the same layer.
- **PWA and mobile app:** the web manifest and app icon are in place (`src/app/manifest.ts`); a service worker adds offline support. A React Native (Expo) app can reuse the TypeScript types, the translation files and the same API.

## Folder structure

```text
messages/                 fr.json, en.json, it.json: every text on the site
src/
  app/
    [locale]/             pages per language: homepage, placeholder routes, 404
    api/advisor/          the advisor API (POST: ask, GET: demo or AI mode)
    manifest.ts, icon.tsx PWA manifest and generated app icons
  components/
    home/                 homepage sections (hero, deals, refurbished, packages, Gauge, trade-in, close to you)
    product/              product cards and the neutral phone illustration
    advisor/              chat panel, its state, cards and "Help me choose" buttons
    layout/               header, language switcher, footer
    ui/                   shared styles, carousel, placeholder page
  config/site.config.ts   brand name, Gauge, Great Deals, packages, service area
  data/catalog.json       mock catalogue (16 phones)
  i18n/                   language routing and message loading
  lib/
    data/                 schemas, data source interface, queries used by the UI
    advisor/              request/response contract shared by browser and server
    product-view.ts       turns a product into translated, formatted card text
  server/advisor/         orchestrator, AI adapter, prompt, output schema, guard, demo engine
  proxy.ts                adds the language to each request (Next.js 16 "proxy")
```

## Accessibility and design

- Dark theme with an electric-blue accent; every text colour pair meets WCAG AA contrast.
- Tap targets are at least 44 px, main buttons 64 px; body text is 17 px.
- Keyboard and screen-reader support: skip link, visible focus, labelled controls, native modal dialog for the advisor, announced replies.
- Animations are subtle and switch off with the system's "reduce motion" setting.
- Swipeable carousels on phones (no JavaScript needed), grids on large screens.
