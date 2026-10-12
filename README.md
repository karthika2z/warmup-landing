# Warmup — demand-test landing page

Static, no-build, no-framework one-pager (HTML/CSS/vanilla JS, ~12 KB gzipped excl. OG image). Dark, mobile-first, 18+.
Live: https://karthika2z.github.io/warmup-landing/ (GitHub Pages, `noindex`). `WARMUP_CONFIG.mode` is `'webhook'` with an **empty endpoint placeholder**: until the Apps Script `/exec` URL is added, forms show success but nothing is sent or stored. Set `debug: true` (or `mode: 'local'`) to log to the console + localStorage while developing.

## Files
| File | Purpose |
|---|---|
| `index.html` | Page: hero + HTML/CSS example scorecard, how it works, 6 partner levels, waitlist, FAQ, fake-door modal, OG/meta |
| `styles.css` | All styles (dark, AA contrast, focus rings, reduced motion, forced colors, 375px→desktop) |
| `config.js` | **The only place to switch backend** (`mode`, `endpoint`, `goatcounter`) |
| `tracking.js` | Adapter: `Warmup.track(event, props)`, `Warmup.submitEmail(kind, email)`, UTM capture, `Warmup.stats()` |
| `app.js` | UI wiring: forms, fake-door modal (focus trap, Esc, backdrop click, focus return) |
| `assets/favicon.svg`, `assets/og.png` | Icon; 1200×630 social preview (rendered from the page) |
| `backend-examples/` | Not deployed (Apps Script is the planned backend): Cloudflare Worker + D1 (`worker.js`, `schema.sql`, `funnel.sql`, `wrangler.toml.example`), Google Apps Script (`Code.gs`) |
| `screenshots/` | Mobile 375×667 (hero, full, modal, modal submitted), desktop 1280×800 (hero, full) |

## Events
`page_view`, `waitlist_signup`, `fake_door_click`, `fake_door_signup`. Each carries `session_id`, `ts`, `path`, `referrer`,
`landing_path`, and `utm_source/medium/campaign/content/term` (captured on landing, kept in `sessionStorage` for the session).
Signups (`{type:'signup', kind:'waitlist'|'fake_door', email, ...utm}`) are separate from events, so emails never sit in the event stream.
Local mode: everything goes to `console.info` and `localStorage` (`warmup_events`, `warmup_signups`). In the browser console: `Warmup.stats()`.

Backends (set in `config.js`): `local` · `webhook` (POST JSON as text/plain to Worker / Apps Script / Edge Function) · `netlify` (signups to Netlify Forms; uses the hidden form stub) · optional `goatcounter` URL (page views + events as GoatCounter events).

## Formulas (use unique visitors = distinct sessions with a page_view, per utm_source/campaign)
- **Signup rate** = sessions with a waitlist_signup or fake_door_signup ÷ visitors
- **Paid-intent rate** = sessions with a fake_door_click ÷ visitors (also useful: fake_door_click sessions ÷ signup sessions, and fake_door_signup ÷ fake_door_click = email capture after the fake door)
- **Cost per signup (CPS)** = ad spend for that utm_source/campaign ÷ signups from that utm_source/campaign (dedupe emails across waitlist + fake door)
- Also: **cost per paid-intent click** = ad spend ÷ fake_door_click sessions; CPC-implied CPS = CPC ÷ signup rate.

Use ad-platform spend; tag every ad link, e.g. `?utm_source=tiktok&utm_medium=paid&utm_campaign=a2_72pct`.
