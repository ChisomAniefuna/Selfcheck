# ShelfCheck

A mobile-first skincare purchase comparison prototype. 16 fictional sample catalogue items, editable routine, transparent rule-based verdicts, goal/budget/sensitivity preferences, consent-gated photo path, local text-only saved summaries, downloads, and session deletion.

## Run

Requires Node.js 22+. No dependency installation required.

```sh
npm run dev
```

Open http://localhost:4173. Run `npm test` for decision-engine acceptance checks.

## Optional YouCam connection

Copy `.env.example` to `.env` and set your own `YOUCAM_API_KEY` locally. Run:

```sh
node --env-file=.env server.mjs
```

Never commit `.env`. The key is used only by the Node server. The adapter follows the official File API and asynchronous Skin Analysis v2.0 task workflow, validates size/MIME/signature, uses consent, session ownership, a one-minute scan limit, 10-second polling, and transient 15-minute server memory. The browser checks availability before sending photos. No simulated scores are substituted.

**Live integration is not verified:** no YouCam credentials or consenting test image were provided. Verify account capabilities, exact response nesting, supported scores, upload headers, and credit cost in the sandbox before a judged demo. The normalizer only accepts returned numeric `ui_score` fields; unsupported responses show an actionable failure. Provider URLs and raw images are not persisted or logged. Provider-side retention/deletion is separate. Additional production hardening and server-side image dimension decoding are needed before accepting public uploads.

Official references:
- https://docs.perfectcorp.com/reference/file
- https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.0
- https://docs.perfectcorp.com/develop/quick_start_guide

## Deployment

The Sites deployment serves `dist/` as a private static app. All shelf, comparison, summary and deletion interactions work there. It intentionally has no YouCam backend or key; scanning reports that the connection is unavailable. To enable real scans, deploy the Node server on a server-capable host and configure its secret. Do not put credentials in static files.

## Privacy and scope

Routine, photo previews and scan observations are held in browser memory. Saved text summaries use localStorage only when the user selects Save. Delete session clears that browser's app-held data and requests server memory deletion; provider-side deletion is not promised. The sample catalogue is fictional and incomplete, and verdicts are educational shopping support, not clinical or individual safety assessments. Scans do not establish product need or affect the purchase verdict.

## Demo path

1. Overview → My shelf: add Cloud Wash, Daily Dew and Daylight 50.
2. Check a product → Quiet Cream → Check this product.
3. Read Hold, the role/ingredient overlap, uncertainties and next steps.
4. Save or download the text summary; inspect Saved decisions.
5. Select Mystery Serum to demonstrate missing-data handling.
6. Skin insights: inspect consent and the transparent unavailable-provider path.

## Remaining hackathon work

Complete a genuine consented YouCam sandbox scan; deploy a server-capable build; verify provider terms and retention; conduct diverse-image and user testing; capture screenshots and a 1–3 minute public demo; prepare submission access. GroupFit is not included because the supplied detailed specification covers ShelfCheck only.

## Responsive compatibility

The interface adapts from small phones to desktop: wrapping phone navigation, 44px primary touch controls, 16px form inputs, flexible grids, safe-area spacing, wrapping summaries, and scrollable dialogs/short desktop sidebars. Privacy and deletion controls remain available on mobile.

Browser viewport QA passed at 320, 375, 768, 1024 and 1440 CSS pixels for Overview, My shelf, Comparison, Skin insights, and Saved decisions: no document horizontal overflow in 25 screen/width combinations. These are viewport checks in the in-app browser, not physical-device or cross-engine certification. Physical iOS/Android, Safari/Firefox/Chrome, camera uploads and real YouCam analysis still need testing.

The reusable manual test fixture is `tests/responsive-qa.html`. Temporarily copy it into `dist/` and open `/responsive-qa.html` while the server runs, then remove the temporary copy. It embeds same-origin viewports and reports document overflow; it is not shipped with the application.

## Read aloud

On the decision screen, select **Read aloud** to hear the verdict, evidence, uncertainties, next steps and limitations. Playback is optional, with English voice selection, 0.8×/1×/1.2× speed, Pause/Resume and Stop. Navigation, hiding the tab or deleting the session stops narration. Changing voice or speed stops playback so the next explicit play uses your selection.

Uses the browser Web Speech API; no API key or microphone permission is required. Voice availability and quality depend on the browser/device, and some system voices may require internet. Text remains visible and unsupported browsers show a fallback message. Browser playback start, pause and resume were verified; physical-device audio QA remains necessary.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis

## Repository

Canonical source: https://github.com/ChisomAniefuna/Selfcheck
