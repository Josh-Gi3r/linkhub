<div align="center">

# LinkHub

### A self-hosted link-in-bio platform for your whole team — your brand, your data, your infrastructure.

<a href="#"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
<a href="#"><img src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React"></a>
<a href="#"><img src="https://img.shields.io/badge/Express-404D59?style=flat-square&logo=express&logoColor=white" alt="Express"></a>
<a href="#"><img src="https://img.shields.io/badge/License-MIT-555?style=flat-square" alt="MIT"></a>

</div>

<div align="center"><img src="./docs/hero.png" alt="LinkHub screenshot" width="90%" /></div>

---

LinkHub gives every member of your team a public link-in-bio page (`/u/slug`) — organized links, a logo-branded QR code, a printable digital business card, and Apple/Google Wallet passes — backed by per-page click and geo analytics, and tied together by an admin-managed company page (`/c/slug`) with a live team roster. It runs entirely on **your** MySQL database, **your** S3 bucket, and **your** email provider. Built for startups, agencies, and teams who want a brandable team directory and digital-card platform without a per-seat SaaS bill — and who want to keep the data.

## What you can build

- **A whole-team link hub.** One shared company page (`/c/slug`) with categorized links and a live roster, plus a branded profile, QR code, and wallet card for every employee — a self-hosted alternative to paying per-seat for Linktree or HiHello.
- **A scannable digital business card.** A speaker or sales rep drops their logo-branded QR onto a badge or slide; whoever scans it lands on their profile and taps "Add to Wallet" to save the card to their phone — Apple or Android.
- **A creator page you actually own.** Keep your link-in-bio *and* your analytics — which links convert, where visitors come from, what referred them — instead of renting them from a SaaS that can change terms.
- **A directory that onboards itself.** Restrict signups to your email domain so only staff can self-serve a profile; seed admins automatically on first login.
- **Conference & booth collateral.** Hand out wallet passes and high-resolution QR PNGs for print, and watch page views, per-link taps, geo, and referrers roll into the analytics dashboard.
- **A compliance-friendly deploy.** Run the whole thing on your own VPS, database, and bucket so no profile data, avatars, or visitor IPs ever leave your infrastructure.

## Features

### Profiles & links

- **Per-user public profile.** Each person gets `/u/:slug` — a dark gradient, mobile-first page with avatar, display name, job title, bio, and links. Slugs are regex-validated (lowercase letters, digits, hyphens), globally unique with conflict handling on collision, and seeded from the email local-part for first-time onboarding. Bio is capped at 500 characters with a live counter.
- **Links CRUD with drag-to-reorder.** Reordering uses dnd-kit pointer **and** keyboard sensors with optimistic local reordering, then persists the new order. Every link carries a title, URL, description, icon type, preset id, sort order, and an active toggle — flip a link off without deleting it. The public page renders only active links; the editor shows everything, including inactive placeholders.
- **Smart link-type picker with URL auto-formatting.** `LinkModal` is a two-step flow: pick a type — Phone, WhatsApp, LinkedIn, X, Instagram, Telegram, Email, Calendar, Website, or Custom — then enter the value. It auto-formats as you go: a phone number becomes a `tel:` URI (spaces, dashes, and parens stripped), an email becomes `mailto:`, and a WhatsApp number becomes `https://wa.me/<digits>`. The URL validator accepts `https`, `http`, `mailto`, `tel`, `sms`, and `whatsapp` schemes.
- **Branded link icons.** `LinkIcon` renders inline-SVG branded squares (green `#00D26A` background, black glyph) for LinkedIn, X/Twitter, Instagram, TikTok, Email, Calendar, WhatsApp, Telegram, YouTube, GitHub, and Phone, with a chain-link default for anything else.
- **Two-section public page.** Links are auto-classified into a **Company Links** section (URLs matching the seeded company presets) and a **`<FirstName>`'s Links** section, each a collapsible block with a count and chevron. Hovering a link shows a tooltip with the cleaned URL (`https`/`tel`/`mailto` stripped).

### QR codes, business cards & wallet passes

- **QR code with embedded logo.** `QRWithLogo` draws a canvas QR at **H (30%) error correction**, scaled to `devicePixelRatio`, with the app's logo mark composited dead-center over a white pad — entirely inline-SVG, no CORS or network fetch. Four logo variants ship (dark-square, white-circle, green-square, green-circle). It exposes `downloadPNG()` and `getDataURL()` and appears in a modal on the dashboard, profile editor, public page, and company page with copy-link and download actions.
- **Canvas digital business card.** `DigitalBusinessCard` renders a true **ISO ID-1** card (85.6×54 mm, 1.585:1) on canvas: a black left accent bar, an auto-scaled name with ellipsis fallback, a green underline, job title, the app wordmark (accent-colored prefix), and its own logo-centered QR. It exports a **3× print-resolution** PNG via `downloadPNG()`.
- **Apple Wallet `.pkpass` generation.** Built server-side with `passkit-generator` into a signed generic pass — random serial, primary NAME field, secondary TITLE, auxiliary PROFILE URL, back fields (a clickable profile link plus a "Powered by" line), and a QR barcode of the profile URL. The server returns base64 and the client decodes it to an `application/vnd.apple.pkpass` blob download. Reads `APPLE_WALLET_CERT_P12/PASS/PASS_TYPE_ID/TEAM_ID/WWDR_PEM` and throws descriptive errors if unconfigured.
- **Google Wallet pass generation.** Signs an **RS256 "save-to-wallet" JWT** (`jsonwebtoken`) from your service-account key, with a `genericObject` (card title, header = name, subheader = job title, `QR_CODE` barcode, profile + app link modules, optional logo), and returns a `https://pay.google.com/gp/v/save/<jwt>` URL opened in a new tab. Reads `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON/ISSUER_ID/WALLET_LOGO_URL`.

> Both wallets are real signing code — Apple's pkpass cert chain and Google's service-account RS256 JWT — not placeholder buttons. Each embeds a QR of the profile URL.

### Avatars & storage

- **Avatar upload with in-browser crop.** `AvatarCropModal` (`react-easy-crop`) gives a 1:1 crop with drag-to-reposition and a 1–3× zoom slider (plus scroll-zoom), then canvas-crops to a **512px JPEG at quality 0.92**. The client enforces image-only, 5MB max; the base64 result uploads to S3 under `avatars/<userId>-<nanoid>.<ext>`. A plain "paste image URL" fallback also exists — upload **or** point at an existing image.
- **S3 / S3-compatible storage adapter.** A single, swappable adapter over AWS SDK v3. `storagePut`/`storageGet` return a CDN URL when `S3_PUBLIC_URL` is set, otherwise a **1-hour presigned GET URL**. Path-style addressing turns on automatically when `S3_ENDPOINT` is set, so the same code targets AWS S3, Cloudflare R2, MinIO, or Backblaze.

### Analytics (self-hosted)

- **Per-page analytics with geo + referrer.** Public `recordPageView` / `recordLinkClick` procedures capture event type, collection id, link id, referrer (`document.referrer`), user agent, client IP (from `x-forwarded-for` / `x-real-ip`), and geo country + city. The public page fires a page view on mount and a link-click on every tap. `myStats` returns total views, total clicks, CTR, a 30-day daily pivot (line chart), per-link click counts (top-10 bar chart), top-20 locations (with percentage bars), and top-20 referrers (hostname-shortened) — all rendered with Recharts.
- **IP geolocation.** `geoLookup` calls the free `ip-api.com` (no key, 3s timeout), skips RFC1918 / loopback private ranges, and caches per-IP results in-memory for one hour. No third-party analytics SaaS, no client-side tracker.

### Company page

- **Company / business page.** An admin-managed standalone page at `/c/:slug` (a single fixed slug from `VITE_COMPANY_SLUG`) with display name, tagline, bio, and logo avatar. Links live in **three independently reorderable categories** — main, partner, and product (a `mysqlEnum`) — alongside a team-member roster. The public `CompanyProfile` renders Company Links, Team (cards linking to each member's `/u/slug`), Partner Links, and Product Links as collapsible sections.
- **Company team management.** Admins add members by their profile slug (resolved to a user id), toggle visibility (Eye / EyeOff), drag-reorder, and remove them. `getCompanyTeamMembers` left-joins profiles to pull display name, job title, avatar, and slug. The public page only shows visible members.

### Editor experience

- **Live phone + QR + card preview.** The profile editor's right pane is a phone mockup with three tabs — **PREVIEW / QR / CARD** — that update as you type, plus QR download and business-card and wallet buttons. The company builder has a 2-tab (**PREVIEW / QR**) 390×780 phone mockup rendering the live company page.

### Auth & access

- **Passwordless magic-link authentication.** `POST /api/auth/magic/request` issues a `crypto.randomBytes(48)` hex token with a **30-minute TTL** stored in MySQL. `GET /api/auth/magic/verify` validates that it exists, is unused, and is unexpired, marks `usedAt`, upserts the user, sets a **1-year HS256 JWT** session cookie (`jose`), and redirects new users to `/welcome?email=…` and returning users to `/?magic=1`. Email goes out via Resend with a custom dark HTML template. Every token query uses Drizzle parameterized `sql`. There is no password or active OAuth path — legacy `/api/auth/login` returns `410` and `/api/oauth/callback` is a no-op redirect.
- **Domain-restricted signup + auto-admin.** `ALLOWED_EMAIL_DOMAIN` gates who can request a link (a `403` with a domain-specific message on mismatch; blank means open signup). `ADMIN_EMAILS` is a comma-separated allowlist that is auto-promoted to `role=admin` on first login **and re-applied on every login**; `OWNER_OPEN_ID` also forces admin in `upsertUser`.
- **Email aliases → one account.** A `user_email_aliases` table maps multiple emails to one user id. `getUserByEmail` checks aliases first, then the primary email, and a primary-alias row is `INSERT IGNORE`'d on first login — so a person can sign in from several addresses into the same profile.
- **Fail-closed JWT secret + tiered procedures.** The `cookieSecret` getter throws if `JWT_SECRET` is unset, so nothing is ever signed or verified with an empty key. tRPC exposes `publicProcedure`, `protectedProcedure` (requires a user), and `adminProcedure` (requires `role==='admin'`); context auth is optional so public procedures still work for anonymous visitors.

### Admin

- **Admin panel** (`/admin`). Three tabs. **Overview**: platform stat cards (users / collections / links / views / clicks), an admin-vs-member breakdown, a platform-wide CTR bar, and recent members. **Users**: a full table (joined, last sign-in, role) with Manage, Promote/Demote (confirmed, can't self), and Delete (cascades the profile, collections, links, analytics, and team rows; can't self). **Collections**: every collection across all users. The per-user **Manage** view drills into Profile / Analytics / Collections sub-tabs with full override editing — **no ownership checks** in admin procedures — including an icon-type `<select>` in the link editor. Admins can effectively impersonate-edit any user's profile, avatar, analytics, and collections.

### Platform plumbing

- **Dynamic Open Graph meta for crawlers.** Express middleware on `/u/:slug` and `/c/:slug` detects ~20 crawler user agents (`facebookexternalhit`, `twitterbot`, `telegrambot`, `whatsapp`, `slackbot`, `discordbot`, `applebot`, and more) and serves a tiny HTML page with OG and Twitter Card tags (title, description, avatar image) plus a meta-refresh to the SPA. Real browsers fall through to the SPA unchanged — so link previews in iMessage, Telegram, WhatsApp, and Slack render the right name and avatar.
- **Outbound webhook notifications.** `notifyOwner` POSTs `{title, content, timestamp}` JSON to `WEBHOOK_NOTIFICATION_URL`, optionally HMAC-SHA256-signing the body as `x-webhook-signature` when `WEBHOOK_NOTIFICATION_SECRET` is set. Exposed as `system.notifyOwner` (admin only); a no-op when unconfigured.
- **Auto-provisioned collection per user.** `ensureUserCollection` lazily creates one default `link_collections` row per user and keeps its slug synced to the profile slug. The data model retains collections (for analytics FKs and admin multi-collection editing) but the normal user UX hides "collections" entirely — links just attach to your one page.
- **Configurable branding.** App name (`VITE_APP_NAME` / `APP_NAME`), description, public base URL, company slug, and the brand accent (`--brand` CSS var, default `#22c55e`, honored by the canvas card and QR) are all env-driven. An optional self-hosted Umami analytics snippet is pre-wired (commented out) in `index.html` via `VITE_ANALYTICS_ENDPOINT` / `WEBSITE_ID`.

## Tech stack

| Layer    | Tech                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| Frontend | React 19, Vite 7, Wouter, TanStack Query, tRPC v11 (superjson), Tailwind CSS v4, Radix UI / shadcn-style components, lucide-react |
| UI utils | dnd-kit (drag reorder), Recharts (charts), react-easy-crop, qrcode / react-qr-code |
| API      | Express + tRPC v11, Drizzle ORM over MySQL (`mysql2`)                          |
| Auth     | Magic-link email (Resend) + `jose` / `jsonwebtoken` JWT cookies               |
| Storage  | AWS SDK v3, S3-compatible (AWS S3 / Cloudflare R2 / MinIO / Backblaze)         |
| Wallet   | `passkit-generator` (Apple) + RS256 save-to-wallet JWT (Google)               |
| Build    | esbuild server bundle + Vite client, drizzle-kit migrations, Vitest tests     |
| Language | TypeScript end-to-end                                                          |

## Quickstart

Requires **Node 20+**, **pnpm 10+**, a **MySQL-compatible database**, and a **Resend API key** (needed to complete sign-in — see the note below).

```bash
# 1. Clone
git clone <your-fork-url> linkhub
cd linkhub

# 2. Install
pnpm install

# 3. Configure
cp .env.example .env
# Edit .env — set at minimum DATABASE_URL, JWT_SECRET, RESEND_API_KEY, and MAILER_FROM.
# Generate a secret: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Create the schema
pnpm db:push

# 5. Run
pnpm dev
```

Open http://localhost:3000 and sign in with your email — LinkHub sends a magic link via Resend (it does **not** print to the console). Any address in `ADMIN_EMAILS` is promoted to admin on sign-in.

> **Logging in locally without email?** `JWT_SECRET` must be set or auth throws, and magic links are always sent through Resend. If you'd rather not configure email yet, pull the one-time token straight from the tokens table and visit the magic-link verify URL manually.

| Command        | What it does                                       |
| -------------- | -------------------------------------------------- |
| `pnpm dev`     | Start the dev server (API + Vite) with hot reload  |
| `pnpm build`   | Build the client and bundle the server to `dist/`  |
| `pnpm start`   | Run the production build                           |
| `pnpm check`   | TypeScript type-check                              |
| `pnpm test`    | Run the Vitest suite                               |
| `pnpm db:push` | Generate and apply database migrations             |

## Configuration

All configuration is via environment variables. See [`.env.example`](.env.example) for the full annotated list. The essentials:

| Variable               | Required | Description                                                         |
| ---------------------- | -------- | ------------------------------------------------------------------- |
| `DATABASE_URL`         | yes      | MySQL connection string (`mysql://user:pass@host:3306/db`)          |
| `JWT_SECRET`           | yes      | Long random string used to sign session tokens (auth fails if unset)|
| `RESEND_API_KEY`       | yes      | Resend key for magic-link emails — login can't complete without it  |
| `MAILER_FROM`          | yes      | From address for outgoing email (verified Resend domain)            |
| `PUBLIC_BASE_URL`      | rec.     | Public URL of the deployment; embedded in QR codes, OG tags, passes |
| `APP_NAME`             | no       | Display name in emails, passes, and UI (default `LinkHub`)          |
| `VITE_COMPANY_SLUG`    | no       | Slug for the shared company page at `/c/<slug>`                     |
| `ALLOWED_EMAIL_DOMAIN` | no       | Restrict signups to one domain (e.g. `example.com`); blank = open   |
| `ADMIN_EMAILS`         | no       | Comma-separated emails auto-granted `admin` on sign-in              |
| `S3_*`                 | no       | S3-compatible bucket for avatar uploads (see below)                 |

**Storage adapter.** Avatar uploads go to any S3-compatible bucket. AWS S3 needs `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`; Cloudflare R2 / MinIO / Backblaze need those **plus** `S3_ENDPOINT` (which auto-enables path-style addressing). Set `S3_PUBLIC_URL` to a CDN/public prefix, or stored avatar URLs are **1-hour presigned links** that expire.

**Wallet passes (optional).** Apple needs `APPLE_WALLET_CERT_P12`, `APPLE_WALLET_CERT_PASS`, `APPLE_WALLET_PASS_TYPE_ID`, `APPLE_WALLET_TEAM_ID`, `APPLE_WALLET_WWDR_PEM`; Google needs `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` (optionally `GOOGLE_WALLET_LOGO_URL`). There is no mock pass — leave these blank and the endpoints throw descriptive errors surfaced to the user.

**Notifications & analytics (optional).** `WEBHOOK_NOTIFICATION_URL` (+ optional `WEBHOOK_NOTIFICATION_SECRET` for HMAC signing) enables outbound owner notifications; `VITE_ANALYTICS_ENDPOINT` / `WEBSITE_ID` wire up a self-hosted Umami snippet.

## Make it yours

1. **Name & branding** — change `APP_NAME` / `VITE_APP_NAME`, the brand accent via the `--brand` CSS var (default `#22c55e`, honored by the canvas card and QR), and the `<title>` in `client/index.html`.
2. **Company page** — set `VITE_COMPANY_SLUG`, then manage its main/partner/product links and roster from the admin panel and company builder.
3. **Access policy** — restrict signups with `ALLOWED_EMAIL_DOMAIN` and seed admins with `ADMIN_EMAILS`.
4. **Storage** — point the `S3_*` vars at your own bucket; set `S3_PUBLIC_URL` for permanent CDN URLs.
5. **UI & API** — pages live in `client/src/pages`, components in `client/src/components`, the API in `server/routers.ts`, and the schema in `drizzle/schema.ts`.

## Status — what's real vs stubbed

Honest notes so you know exactly what ships:

- **AI chat is scaffolding only.** `server/_core/llm.ts` (`invokeLLM`, OpenAI-compatible) and `client/src/components/AIChatBox.tsx` exist, but `invokeLLM` is never called by any router, there is no `ai.*` tRPC procedure, and `AIChatBox` is not mounted on any page. Treat the `LLM_*` env vars as scaffolding — it does **not** ship as a working chat box.
- **Wallet passes need real credentials.** The Apple and Google code is genuine signing logic, but it's inert until you supply real certificates/credentials (Apple Developer `.p12` + WWDR PEM + Pass Type ID; Google service-account JSON + issuer id). Unconfigured, the endpoints throw descriptive errors surfaced via an alert.
- **Company "main links" seeding caveat.** The company builder labels main links as "seeded to all users," but new-user seeding actually reads the static `shared/presetLinks.ts` file (whose company entries ship commented out), **not** the company's DB main-links. By default a new allowed user gets only inactive LinkedIn / X / Email placeholder links.
- **Local login needs Resend.** Magic links are always sent via Resend and `JWT_SECRET` must be set, so out of the box you can't complete a login without configuring email (or pulling the token from the DB manually).
- **Avatar URLs expire without a CDN prefix.** Set `S3_PUBLIC_URL`, or stored avatar links are 1-hour presigned URLs that break.
- **Geo-location is best-effort.** Visitor geo uses the free `ip-api.com` over plain HTTP (~45 req/min, no key) — fine for low traffic, not production-grade at scale.
- **No bot filtering or rate limiting.** Analytics has no de-duplication or bot filtering — every page view that reaches the SPA is recorded — and there is no rate limit on magic-link requests. The session cookie is `sameSite:none`; domain-scoping is commented out.
- **MySQL only, fail-soft DB.** Database is MySQL-compatible (`mysql2` + Drizzle) with no Postgres or SQLite path. `getDb()` returns `null` if `DATABASE_URL` is unset/unreachable, and most DB functions then return empty/no-op rather than throwing.
- **Dormant code in the tree.** `DashboardLayout.tsx` is leftover boilerplate (the real sidebar is `DashboardShell.tsx`), legacy OAuth code is retained for back-compat but unused by the magic-link flow, and a `magic=new` onboarding branch in `Home.tsx` is dead — real onboarding is the `/welcome` page.

## License

MIT © 2026 Josh G. See [CONTRIBUTING.md](CONTRIBUTING.md) to get involved.
