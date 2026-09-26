# Novacell: smartphone shop homepage prototype + AI shopping advisor

First step of the e-commerce platform for a smartphone shop serving Menton, Monaco, Beausoleil, Cap-d'Ail, Roquebrune-Cap-Martin and Sospel. This version contains the **homepage** (visual prototype, FR/EN/IT), a **working "Help me choose" advisor** and a **staff back office** at `/admin` (see [Admin](#admin-back-office)). Product pages, cart, checkout and customer accounts are out of scope; their links open "coming soon" pages.

## Run it

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. It opens the French site at `/fr`; English is at `/en` and Italian at `/it`.

The advisor works immediately in **demo mode** (no API key). To plug in an AI provider, copy `.env.example` to `.env.local` and follow the comments in it (see [AI advisor](#ai-advisor)).

The back office is at http://localhost:3000/admin (or use the "Espace pro / Staff login" button at the bottom of every page). Sign in with `admin@novacell.test` / `novacell-dev`, or with your own `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Unit tests (advisor rules, catalogue guard, translations, data consistency, admin login) |
| `npm run check` | Typecheck + lint + tests |

## Where to change things

| What | Where |
| --- | --- |
| Brand name (text wordmark, titles, app icon letter), currently "Novacell" | `BRAND_NAME` in `src/config/site.config.ts` |
| Products (prices, stock, grades, battery, colours, photos, badges) | **Admin → Products** (stored in `data/products.json`) |
| Great Deals (which phones, order, promo badges) | **Admin → Great Deals** (`data/deals.json`; sold-out phones are skipped) |
| Packages (price, contents, "to be confirmed" markers) | **Admin → Packages** (`data/packages.json`) |
| Gauge (%, target, prizes, on/off) | **Admin → Gauge** (`data/gauge-config.json`) |
| Package names and taglines | `Packages` in `messages/fr.json`, `en.json`, `it.json` |
| Towns and services in "Close to you" | `storefrontSettings.serviceArea` in `src/config/site.config.ts` + `Local` in the message files |
| "Only N left" threshold, number of Great Deals / refurbished picks shown | `storefrontSettings` in `src/config/site.config.ts` |
| Any text on the site | `messages/{fr,en,it}.json` (French is the default language) |
| AI provider | `.env.local` (see below); the only vendor-specific code is `src/server/advisor/ai-adapter.ts` |
| Search engine indexing (off while prices are mock data) | `ALLOW_SEARCH_INDEXING` in `src/config/site.config.ts` |
| Colours (white theme, black and electric-blue accents) | Tokens at the top of `src/app/globals.css` |
| 3D scenes | `src/components/three/` (see [3D visuals](#3d-visuals)) |

Notes:

- "Last one available" is added automatically when stock is 1. For a refurbished phone, the "New: €X / You save €Y" line appears when the catalogue has the same model and storage new.
- Package items marked "to be confirmed" in the admin are shown with a dashed border and a **TODO** tag until their contents are confirmed.
- The Gauge copy ("When it reaches 100%, a winner is drawn", steps, prizes) lives in the `Gauge` section of the message files and still needs legal review.
- Phone pictures on product cards are neutral illustrations (`src/components/product/phone-visual.tsx`) until staff upload product photos in the admin.

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

## 3D visuals

Real-time 3D (three.js via React Three Fiber) on a white background, with electric-blue rim lighting and soft shadows under floating models:

| Where | What it shows |
| --- | --- |
| Hero | A generic phone floating and slowly turning, with small parts (chip, battery, camera module, cable) drifting beside it. It turns further as you scroll, follows the mouse on computers, and the finger or phone tilt on mobile. |
| More than just a phone | Scroll-driven exploded view: case, screen protector, wall charger and cable float out (Max Protection Package), then settle back while the phone powers on (Ready-to-Use Package). |
| The Gauge | A glowing blue tube that fills up to the configured %, with the number kept as normal text on top. |
| Trade-in | An old phone floats over to a new one and is swapped for it, on a loop. |

How it stays fast and safe:

- **Static first.** Each spot is server-rendered as a lightweight illustration. 3D is downloaded only on capable devices, when the section comes near the screen and the browser is idle, then cross-fades in. Scenes pause when off screen. The 3D code weighs about 240 KB compressed and never loads on devices that don't use it.
- **Fallback to the static image** without WebGL, with the system "reduce motion" setting, with "save data", on low-end devices (2 GB memory or 2 CPU cores or less), if the scene fails, or if the frame rate stays too low after lowering the resolution.
- **Never in the way.** Canvases ignore clicks and touches and sit only in the visual columns, never behind text or over the main buttons. Tilt uses the phone's sensor only where no permission prompt is needed.
- **Testing switch.** Add `?3d=off` to any URL to see the static version, or `?3d=on` to force 3D on any device with WebGL.

Sources and licences:

| Item | Source | Licence |
| --- | --- | --- |
| Rendering engine | three.js ([threejs.org](https://threejs.org)), pinned to r182 | MIT |
| React bindings | React Three Fiber ([pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber)) | MIT |
| Studio reflections | `RoomEnvironment`, shipped with three.js, generated in code | MIT |
| Phones, accessories and parts | Built in code from simple geometry in `src/components/three/scenes/models.tsx` (rounded slabs, cylinders, a tube for the cable). Generic shapes, no copy of any real phone. | Part of this project |
| Screen, glow and shadow textures | Drawn in code (`src/components/three/scenes/geometry.ts`) | Part of this project |

No downloaded glTF models, images or HDR files are used. three.js is pinned to r182 because React Three Fiber 9.8 still uses `THREE.Clock`, which r183 and later flag as deprecated in the console.

## Admin (back office)

A separate, staff-only area at `/admin`, with its own layout and login. Every page of the shop has a small "Espace pro / Staff login" button in the footer that opens it; the admin pages themselves are `noindex`.

### Logging in

| Where | Credentials |
| --- | --- |
| `npm run dev`, nothing configured | `admin@novacell.test` / `novacell-dev` (shown on the login page, with a warning banner in the admin) |
| Anywhere else | `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local` or the host's environment variables. Without them, the admin stays locked in production. |

Sessions last 8 hours (signed, `httpOnly` cookie limited to `/admin`); changing the password signs everyone out. Sign-in is limited to 5 attempts per minute per address.

> **⚠️ This is NOT production-grade authentication.** It is one shared password in an environment variable: no individual accounts, no roles (e.g. staff vs manager), no hashed passwords, no two-factor, no audit log. Replace it with real authentication (e.g. Auth.js or the commerce backend's admin users, with roles and hashed passwords) before launch. The code is in `src/server/admin/session.ts`, clearly marked as temporary.

### What each screen does

| Screen | Data | What staff can do |
| --- | --- | --- |
| Products | **Real, editable** (`data/products.json`, `data/uploads/`) | Add, edit, delete new and refurbished phones: price, previous price, stock, grade, battery health, colour, storage, warranty, photos, badges, "good for" tags. A live preview shows the Great Deals and Refurbished cards exactly as the shop draws them, in FR/EN/IT. |
| Great Deals | **Real, editable** (`data/deals.json`) | Pick phones, reorder them, add a promo badge (preset or custom text in three languages). Live preview of the homepage row. |
| Packages | **Real, editable** (`data/packages.json`) | Price and contents (label in FR/EN/IT, icon, "to be confirmed") of Max Protection and Ready-to-Use, with the homepage card as preview. |
| Gauge | **Real, editable** (`data/gauge-config.json`) | Current %, draw target (tickets), prizes, show/hide. Shows tickets issued vs target and can apply that %. |
| Orders | Placeholder (`data/orders.json`) | List with status, channel, items, invoice link; search and filters. |
| Customers | Placeholder (`data/customers.json`) | List with contact, town, counts of orders, tickets and trade-ins. |
| Trade-ins | Placeholder (`data/trade-ins.json`) | Estimate requests with device, condition, estimate and status. |
| Tickets | Placeholder (`data/tickets.json`) | Gauge tickets grouped by customer (who has how many), against the draw target. |
| Invoices | Placeholder (`data/invoices.json`) | One per paid order, amounts with VAT, linked to its order. |

Orders, customers, trade-ins, tickets and invoices show **placeholder data**, because there is no real checkout or customer flow yet. The screens (and the data shapes) are ready for real data once that's built.

Saving updates the shop straight away: the homepage, product pages and the advisor read the same files. Product and deal rules still apply automatically ("Only N left", "Last one available", sold-out phones hidden). Deleting a product that appears in orders is refused (set its stock to 0 instead), like a database foreign key would.

### The data files: a stand-in for the database

Each file in `data/` is one future database table: `{ "$comment": "...", "rows": [...] }` with a stable `id` per row and `<thing>Id` references between them (`order.customerId`, `order.lines[].productId`, `tradeIn.customerId`, `ticket.orderId`, `invoice.orderId`...). The schemas are in `src/lib/data/schema.ts` and `src/lib/data/records.ts`; `npm test` checks every file against them and checks that no reference points to a missing row (`src/lib/data/integrity.ts`).

The admin only goes through `src/lib/data/admin-repository.ts`, and the shop through `src/lib/data/queries.ts`. Writes are validated, one at a time per file, and atomic (temporary file then rename). `NOVACELL_DATA_DIR` points them to another folder (handy for tests).

### Before going live: what needs a real database

Saving writes to files on the server's disk. That works with `npm run dev` and with `npm start` on a normal server, but **not on serverless hosts such as Vercel**, whose files are read-only (the admin says so and refuses to save). Files also don't work with several servers, have no history and no concurrent editing. Before launch:

1. Move the tables in `data/` to a database (PostgreSQL, or the commerce backend from [Growth path](#tech-stack-and-why)); re-implement `src/lib/data/local-source.ts` and `src/lib/data/admin-repository.ts` on top of it. The screens don't change.
2. Store product photos in object storage (e.g. S3, Cloudflare R2, Vercel Blob) instead of `data/uploads/`.
3. Replace the temporary login (above).
4. Feed orders, customers, trade-ins, tickets and invoices from the real checkout and trade-in forms, and generate real invoice PDFs.

## Supabase

Supabase is set up but not used by any screen yet: the shop and the admin still read and write `data/*.json`. It's the planned database for [Before going live](#before-going-live-what-needs-a-real-database).

- Package: `@supabase/server` (with `@supabase/supabase-js`).
- Client: `getSupabaseAdmin()` in `src/lib/supabase/server.ts`. It uses the **secret key**, so it bypasses Row Level Security, and it is marked `server-only`: importing it from a client component fails the build, so the key can't reach the browser.
- No browser code needs Supabase today, so there are no `NEXT_PUBLIC_` variables. If that changes, expose only the URL and the publishable key (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), never the secret key.

Environment variables (in `.env.local` locally, never committed; in Vercel under Settings → Environment Variables):

| Name | Value | Used for |
| --- | --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | Always |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` | The server client (`getSupabaseAdmin()`) |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Future RLS-scoped server access |
| `SUPABASE_JWKS_URL` | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` | Future signed-in users (JWT checks) |

## Tech stack, and why

- **Next.js 16 (App Router), React 19, TypeScript.** Server rendering gives fast pages on phones and good local SEO. Server-only API routes keep AI keys secret. The same app can later host the back office (a protected `/admin` area) and serve as the storefront of a headless commerce backend.
- **Tailwind CSS 4.** Theme tokens (white, black and electric blue) in one place, mobile-first, very little CSS shipped.
- **three.js + React Three Fiber** for the 3D scenes, loaded lazily with static fallbacks.
- **next-intl.** French at `/fr` (the default, `/` opens it), English at `/en`, Italian at `/it`; ICU messages for plurals and prices.
- **Zod.** The same schemas validate the mock catalogue today, database or API data tomorrow, and the AI's JSON.
- **A data access layer** (`src/lib/data`). Components only call functions like `getGreatDeals()` or `getRefurbishedPicks()`, and the admin only calls `admin-repository.ts`; switching from JSON files to a database means re-implementing those two files (`DataSource` for the shop), not touching the UI.
- **Server Actions** for admin saves: validated on the server, the page and the shop refresh in the same round trip (no reload).
- **Vitest** for the advisor rules, the guard and translation completeness.

Growth path:

- **E-commerce and back office:** PostgreSQL plus a headless commerce engine such as Medusa (open source, TypeScript) for products, variants, stock per location, orders, customer accounts, promotions and an admin dashboard, plugged in behind `src/lib/data`. The admin screens built here can stay as the shop's own merchandising tool, or be replaced by the engine's dashboard.
- **Real-time stock with the physical shop:** the point-of-sale pushes stock changes (webhook or sync job) to the stock module; the site refreshes affected pages on demand (`revalidateTag`) and product pages read live availability. The advisor already reads stock through the same layer.
- **PWA and mobile app:** the web manifest and app icon are in place (`src/app/manifest.ts`); a service worker adds offline support. A React Native (Expo) app can reuse the TypeScript types, the translation files and the same API.

## Folder structure

```text
data/                     the JSON "database": one file per table, uploads/ for product photos
messages/                 fr.json, en.json, it.json: every text on the site
src/
  app/
    [locale]/             pages per language: homepage, placeholder routes, 404
    admin/                back office: login/, (panel)/ with one folder (page + actions) per screen
    api/advisor/          the advisor API (POST: ask, GET: demo or AI mode)
    api/media/            serves product photos uploaded in the admin
    manifest.ts, icon.tsx PWA manifest and generated app icons
  components/
    home/                 homepage sections (hero, deals, refurbished, packages, Gauge, trade-in, close to you)
    product/              product cards and the neutral phone illustration
    three/                3D scenes, their lazy loader and static fallbacks
    advisor/              chat panel, its state, cards and "Help me choose" buttons
    admin/                admin screens, tables, previews and form pieces
    layout/               header, language switcher, footer
    ui/                   shared styles, carousel, placeholder page
  config/site.config.ts   brand name, stock threshold, service area
  i18n/                   language routing and message loading
  lib/
    data/                 schemas, JSON store, queries used by the shop, admin repository
    advisor/              request/response contract shared by browser and server
    product-view.ts       turns a product into translated, formatted card text
  server/advisor/         orchestrator, AI adapter, prompt, output schema, guard, demo engine
  server/admin/           temporary admin login, action helpers
  proxy.ts                adds the language to each request; first login check for /admin
```

## Accessibility and design

- White theme with black and electric-blue accents; every text colour pair meets WCAG AA contrast (blue text uses the darker `#0052cc`, bright `#0066ff` is for buttons, icons and the Gauge).
- Tap targets are at least 44 px, main buttons 64 px; body text is 17 px.
- Keyboard and screen-reader support: skip link, visible focus, labelled controls, native modal dialog for the advisor, announced replies.
- Animations are subtle and switch off with the system's "reduce motion" setting, which also replaces 3D with static images.
- Swipeable carousels on phones (no JavaScript needed), grids on large screens.
