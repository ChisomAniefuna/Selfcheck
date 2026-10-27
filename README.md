# ShelfCheck

Skincare purchase comparisons with a responsive interface, 16 fictional sample products, transparent verdicts, optional read-aloud decisions and a Supabase backend.

Production: https://shelfcheck-mu.vercel.app

Repository: https://github.com/ChisomAniefuna/Selfcheck

## Run locally

Requires Node.js 22+.

```sh
npm ci
npm run dev
```

Open http://localhost:4173. `npm run build` bundles the official Supabase browser client locally. No browser CDN is required. `npm test` runs comparison, narration, backend and PostgreSQL row-level security tests.

Without Supabase configuration the app clearly shows **Local preview**. Comparisons, narration, downloads and browser-local saves still work. Once configured, saved decisions use Supabase and connection failures are shown; they never silently fall back to local saves.

## Backend architecture

- **Supabase Auth:** anonymous guest sessions; no email or password required.
- **PostgreSQL:** text-only `saved_decisions`, with RLS limiting each guest to their own rows. Nothing is saved until the visitor selects Save.
- **Supabase Edge Function `shelfcheck`:** authenticated YouCam upload, task creation/polling, availability and session deletion.
- **PostgreSQL `scan_jobs`:** private task references with atomic per-user reservations, polling limits and expiry. Browser roles have no direct access.
- **Supabase Cron:** removes expired task references every minute. Task access expires at 15 minutes; physical deletion normally follows within a minute. Monitor the job rather than assuming it ran.
- **Static frontend:** routine selections/preferences and scan scores stay in tab memory. Inspectable purchase-comparison rules stay in `dist/catalog.js`.
- `server.mjs` is now a static development server, not the production backend.

Original photos and provider results are not stored in Supabase Storage or database tables. Images go through the Edge Function to YouCam only after consent. Provider-side retention is separate.

## Create and connect your Supabase project

1. Create a project at https://supabase.com/dashboard. Keep the database password private.
2. Enable **Anonymous Sign-Ins** in Authentication settings. For a public launch, configure Supabase's recommended CAPTCHA/abuse protections and wire its token into guest sign-in before exposing the app broadly.
3. Install/use the Supabase CLI and authenticate:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   This applies both migrations, including the Cron extension/job. If your project's extension permissions differ, enable Supabase Cron in the dashboard first, then rerun the pending migration. Inspect migration success and the Cron job history.
4. In **Edge Functions → Secrets**, set:
   - `YOUCAM_API_KEY`: your YouCam key; never expose it in browser config.
   - `ALLOWED_ORIGINS`: exact comma-separated frontend origins, for example `http://localhost:4173,https://your-production-domain.example`. No wildcards or paths. If this secret is unset, the function permits `http://localhost:4173`, `http://127.0.0.1:4173` and the exact production origin `https://shelfcheck-mu.vercel.app`.
   Supabase injects its own project URL and public/secret key dictionaries. The function uses the `default` entries, with legacy environment fallbacks.
5. Deploy the function with JWT verification enabled:

   ```sh
   npx supabase functions deploy shelfcheck
   ```

   `supabase/config.toml` sets `verify_jwt = true`; the handler also verifies the user with Auth. Do not disable authentication to work around a 401.
6. Copy `.env.example` to `.env` and set **public configuration only**:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
   PORT=4173
   ```

   Then run:

   ```sh
   npm run configure:supabase
   npm run dev
   ```

   The configuration helper refuses secret/service-role keys. `dist/config.js` contains only public values and may be deployed. `.env` is ignored. For a static host, run `npm ci && npm run build`, then publish `dist/`.

Guest access is tied to this browser's Supabase session token. Clearing browser storage or switching devices loses access to that guest account. Cross-device access needs a future permanent sign-in/linking flow; responsive layouts alone do not provide account syncing. Existing browser-local summaries are not uploaded automatically.

## Deletion and retention

Delete session first deletes the authenticated guest account through the Edge Function. Foreign-key cascades remove its summaries and scan references. Only after remote success does the frontend clear its local state. A remote failure keeps local data and shows a retryable error.

Saved cloud summaries remain until explicitly deleted. Guest accounts are not automatically cleaned up by Supabase. Clearing browser storage without using Delete session does not delete the remote account or summaries; schedule a separately reviewed retention policy before a public launch. YouCam deletion is not promised. Never log photo bytes, tokens, provider upload URLs or sensitive provider responses.

## Product and device behavior

- All catalogue products, ingredient data and USD prices are fictional/incomplete demonstrations.
- Verdicts explain category/ingredient overlap, budget, unknowns and next steps. They do not establish personal safety, allergies, clinical diagnosis or product effectiveness.
- Optional Read aloud speaks the same verdict, reasons and limitations with voice/speed selection and Pause/Resume/Stop. Available voices depend on device/browser; some may require internet. No microphone is used.
- Responsive QA passed at 320, 375, 768, 1024 and 1440 CSS pixels for Overview, My shelf, Comparison, Skin insights and Saved decisions before the backend change. Reusable manual fixture: `tests/responsive-qa.html` (temporarily copy into `dist/` to run).

## Verification limits / remaining setup

The code, browser bundle and local PostgreSQL policy tests can run without a cloud account. Project `xtellserfsxjjonepfkh` is configured in `dist/config.js`. Both database migrations and the authenticated `shelfcheck` Edge Function are deployed. The cleanup Cron job is active. Anonymous Sign-Ins is enabled. Live verification passed for guest sign-in, saving/reloading/deleting summaries, isolation between two guests, authenticated Edge Function access with allowed-origin CORS, rejection of unauthenticated requests, and deletion of both disposable test guests. YouCam still requires an actual key and a consented sandbox image; no live scan has been claimed. Check exact account response shapes and unit costs before using credits. Physical iOS/Android and cross-browser audio/upload QA remain outstanding.

Official references:
- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/cron
- https://docs.perfectcorp.com/reference/file
- https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.0
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis

The security advisor reports an informational “RLS enabled, no policy” entry for `scan_jobs`. This is intentional deny-by-default: browser roles have no table grants or policies; only the authenticated Edge Function uses its server credential to access task references.

## Repeat the live backend smoke test

```sh
node scripts/verify-supabase.mjs --live
```

This opt-in command creates two disposable guest accounts in the configured project, checks persistence/isolation/function authentication, and deletes the accounts in a `finally` block. It uses only fictional text and does not upload photos or consume YouCam scan credits. If cleanup fails it reports the failure and exits unsuccessfully.

## Vercel frontend deployment

`vercel.json` selects a static frontend with `npm ci`, `npm run build`, output directory `dist`, and Node.js 22. Supabase remains the backend. Only the public Supabase URL/publishable key are shipped; YouCam and Supabase server secrets stay in the Edge Function.

Deploy from this repository root using the Vercel CLI:

```sh
npx vercel login
npx vercel deploy --prod
```

Or import `ChisomAniefuna/Selfcheck` in Vercel with framework **Other**, root directory **.**, build command **npm run build**, and output directory **dist**. The repository contains configuration for those build settings.

After Vercel assigns the production origin, add that exact origin to the Supabase Edge Function's allowed origins before considering the deployment complete. Do not permit every `vercel.app` domain. Preview domains are not automatically trusted. Verify cloud saving and Edge Function requests from the production origin. Deployment does not configure the missing YouCam API key.

### Verified production deployment

- Team/project: `aniefuns-projects/shelfcheck`
- Public production alias: https://shelfcheck-mu.vercel.app
- Framework: static HTML/CSS/JavaScript; Node.js 22 builds the bundled Supabase client.
- GitHub repository connected for subsequent deployments.
- Browser verification: guest connection, comparison, cloud save and persistence after reload passed.
- Live smoke test passed with `SHELFCHECK_ORIGIN=https://shelfcheck-mu.vercel.app node scripts/verify-supabase.mjs --live`, including CORS preflight, guest isolation and deletion of disposable test accounts.
- Supabase Edge Function v2 includes the exact production origin; preview URLs are not broadly allowed.
- Live YouCam analysis remains unavailable until its secret is configured and sandbox-tested.

Vercel CLI 65.4.0 is installed globally and authenticated as `aniefun`. The user-scoped Vercel plugin is installed and enabled. The shared Codex MCP endpoint `https://mcp.vercel.com` is configured and OAuth login succeeded, with write-tool confirmation retained. Its tools were not yet loaded in the current chat; reopen/reload the agent to perform the guide's authenticated `list_teams` MCP check. This does not affect the verified CLI deployment.
