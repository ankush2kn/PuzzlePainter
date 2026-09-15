# Deployment plan: Puzzle Painter on Cloudflare

**Status: live.** Deployed via vinext to the `puzzle-painter` Worker (`https://puzzle-painter.arshanti.workers.dev`), with `puzzlepainter.fultu.com` attached as a Custom Domain and verified working. `OPENROUTER_API_KEY` and `OPENROUTER_SITE_URL` are set as Worker secrets. See `CLAUDE.md`'s Deployment section for the day-to-day reference (redeploy command, secret rotation, gotchas); this file remains the narrative rationale and fallback plans below.

## Short answer

Yes — this can run entirely on Cloudflare, at **$0 infrastructure cost**, with `pp.fultu.com` (or `puzzlepainter.fultu.com`) pointed at a Cloudflare Worker. No Google Cloud, no separate hosting account, no database. `fultu.com` is already a Cloudflare zone, so DNS + TLS for the subdomain is a one-click "Add Custom Domain" step once the Worker is deployed — nothing to configure by hand.

The only real cost risk isn't hosting, it's **OpenRouter usage** on the public `/api/generate-page` route — see the abuse-proofing step below.

## Why this works for this app specifically

- Everything except one API route is client-side (canvas, localStorage autosave, PNG/PDF export via jsPDF) — no server DB, no ISR, no ISR/Cache Components, no ISR-cache KV/R2 needed. Confirmed no `next/image`, `sharp`, or `fs` usage in `src/`.
- The one server piece, `src/app/api/generate-page/route.ts`, just does a single `fetch()` to OpenRouter and returns JSON. That's a trivial fit for a Worker.
- `fultu.com` already lives on Cloudflare, so there's no DNS delegation step — the subdomain is just a record in a zone you already control.

## Recommended path: vinext (Cloudflare's current default for Next.js on Workers)

Cloudflare now recommends **vinext** (`@cloudflare/vinext` / `npx vinext`), a Vite plugin that reimplements the Next.js API surface, as the default way to run Next.js on Workers — ahead of the older OpenNext adapter. It targets Next.js 16.x, which matches this repo's `next@16.2.10`.

Note for this repo: `route.ts` currently has `export const runtime = "nodejs"` — under vinext this line is simply ignored (a no-op), not a blocker. Node APIs come from the Workers `nodejs_compat` compatibility flag instead.

### Steps

0. **Push the repo to GitHub first.** `git status` shows several untracked directories (`src/components/`, `src/lib/`, `src/app/api/`, `src/types/`) and only one commit on `master`. Nothing below matters until this is committed and pushed to a remote on `main` (or `master` — just be consistent, since Cloudflare's Git integration, if used later, needs to point at whatever branch you actually push). `.gitignore` already excludes `.env*`, so the OpenRouter key won't get committed — double-check `git status` after staging anyway.

1. **Cloudflare account + Wrangler.**
   ```bash
   npm install -g wrangler   # or use npx
   wrangler login
   ```
   Confirm `fultu.com` shows as an active zone in the same Cloudflare account.

2. **Run vinext's compatibility check, then init.**
   ```bash
   npx vinext check
   npx vinext init --platform=cloudflare
   ```
   This generates `vite.config.ts` (vinext + `@cloudflare/vite-plugin`) and `wrangler.jsonc`. Add your `account_id` to `wrangler.jsonc` (from the Cloudflare dashboard URL or `wrangler whoami`), and make sure `compatibility_flags: ["nodejs_compat"]` is set.

3. **Local production preview before touching real infra.**
   ```bash
   npm run build:vinext
   npm run start:vinext
   ```
   Exercise the app for real: paint, toggle cut lines, export PNG/PDF, and — with `OPENROUTER_API_KEY` set locally — try "Describe a page" to confirm the API route works through vinext's runtime, not just `next dev`. Check styling too, not just function — vinext moves the build from Next's bundler to Vite, and this repo uses Tailwind v4 via `@tailwindcss/postcss`. That pipeline swap is the kind of thing `vinext check` won't catch but a visual glance will.

4. **Secrets and env vars.**
   ```bash
   wrangler secret put OPENROUTER_API_KEY
   ```
   Never put the key in `wrangler.jsonc` `vars` (that's plaintext, committed). If you override the model, `OPENROUTER_MODEL` can be a plain var. Set `OPENROUTER_SITE_URL` to the real production URL (`https://pp.fultu.com`) — right now `route.ts` defaults it to `http://localhost:3000`, which is harmless but worth fixing for the OpenRouter referer header.

5. **Deploy, then verify the secret actually wired up.**
   ```bash
   npx @vinext/cloudflare deploy
   ```
   This publishes to a `*.workers.dev` URL first — verify it there before attaching the real domain. Specifically, hit "Describe a page" on that URL. `wrangler secret put` creates a runtime binding; vinext's documented env handling is `.env*` file loading at build time plus `import { env } from "cloudflare:workers"` for bindings — it's not confirmed that a Wrangler secret shows up in `process.env` (which is what `route.ts:19` reads) under vinext's Workers runtime. If "Describe a page" fails with *"OpenRouter API key missing"* even though the secret is set, that's this wiring gap, not a bad key. Fix: in `route.ts`, switch `process.env.OPENROUTER_API_KEY` to `import { env } from "cloudflare:workers"` and read `env.OPENROUTER_API_KEY` instead — same for `OPENROUTER_MODEL` / `OPENROUTER_SITE_URL` if you hit the same issue there.

6. **Attach the subdomain.** In the Cloudflare dashboard: Workers & Pages → your Worker → *Triggers* (or *Domains & Routes*) → **Add Custom Domain** → enter `pp.fultu.com`. Cloudflare creates the DNS record and issues the certificate automatically — no manual DNS edit. Pick `pp.fultu.com` or `puzzlepainter.fultu.com`, either works identically; there's no reason to spend more time on which.

   *If your plan doesn't expose the one-click Custom Domain button:* fall back to a **Workers Route**, which has always been free — add a placeholder DNS A record for the subdomain pointing at `192.0.2.1` (proxied / orange-clouded, so Cloudflare intercepts the request instead of actually routing to that IP), then attach a route pattern `pp.fultu.com/*` to the Worker under *Triggers → Routes*. Functionally identical, one extra manual step.

7. **Before sharing the link publicly, close the OpenRouter cost hole.** `/api/generate-page` is an unauthenticated POST endpoint that spends *your* OpenRouter credits (up to 4000 tokens per call, 500-char prompts). Pick at least one:
   - Point `OPENROUTER_MODEL` at a `:free`-suffixed OpenRouter model.
   - Add a Cloudflare Rate Limiting rule on the route (Free plan includes a small number of free rules) — e.g. cap requests per IP per minute.
   - Add Cloudflare Turnstile (free, unlimited) in front of the "Describe a page" button.
   - Set a hard monthly spend cap on the OpenRouter account itself as a backstop regardless of the above.
   - Or explicitly accept the risk for now (unlisted subdomain, low traffic) — just make it a conscious choice, not an oversight.

8. **Optional: auto-deploy on push.** Cloudflare's Git integration (Workers Builds) can redeploy on every push to your main branch, still on the free tier. Not required — manual `wrangler deploy` is fine for a low-traffic hobby site — but convenient once the initial deploy is working.

## Fallback path: OpenNext (`@opennextjs/cloudflare`)

vinext is new and self-described as "not yet a drop-in replacement for every application or production workload," with known gaps (build-time image/font pipeline, `cacheComponents`, some native modules in dev). If `npx vinext check` flags something on this repo, or the deploy misbehaves, switch to the older, more battle-tested adapter:

```bash
npm create cloudflare@latest -- --framework=next --platform=workers
# or add @opennextjs/cloudflare to this existing project per its docs
```

Same end state — one Worker, same Custom Domain step (step 6 above), same `wrangler secret put` for the API key. **Explicitly skip** the KV/R2 incremental-cache setup OpenNext's guide offers — this app has no ISR, no `use cache`, no server-rendered pages that need revalidation, so that infra would be pure unused cost/complexity.

## Last-resort fallback: no adapter at all

If both vinext and OpenNext fight you (plausible — both are adapters racing to track a very recent Next.js release), there's a third option that depends on neither: `next build` with `output: "export"` to produce a static site (served directly from Workers static assets, no adapter needed), plus a hand-written ~40-line Worker that only implements `POST /api/generate-page` — the same validation, `sanitizeSvg()` import from `lib/templates.ts`, and OpenRouter `fetch()` call as `route.ts`, just written as a plain Workers `fetch` handler instead of a Next route. More manual, but it can't be broken by Next-version churn in someone else's adapter. Worth keeping in your back pocket rather than attempting up front.

## What you don't need

- **No Google Cloud, no Vercel, no separate server.** The whole app — static assets, canvas UI, and the one API route — runs as a single Cloudflare Worker.
- **No database or KV/R2.** All persistence is `localStorage` in the browser; there's nothing server-side to store.
- **No image optimization infra.** No `next/image` or `sharp` usage in the codebase today.

## Cost summary (current traffic assumptions: low-volume hobby site)

| Component | Cost |
|---|---|
| Cloudflare Workers (Free plan: 100k requests/day, 10ms CPU/request) | $0 |
| Cloudflare DNS + Custom Domain + TLS on `fultu.com` | $0 (already your zone) |
| vinext / OpenNext / Wrangler tooling | $0 (open source) |
| OpenRouter API calls | Pay-per-use on your OpenRouter account — the one line item to actively guard (step 7) |

## Verify at implementation time, not from this doc

Cloudflare's Next.js-on-Workers tooling is moving fast; treat these as "confirm in the dashboard/CLI when you actually do this," not settled facts:
- Whether "Add Custom Domain" is exposed on your specific plan (Workers Route is the guaranteed-free fallback either way).
- Current Worker script size limits, if `wrangler deploy` ever complains (this app is small; unlikely to matter).
- vinext's exact compatibility with `next@16.2.10` — run `npx vinext check` first before committing to the migration.
