/* Single config object for tracking + email capture. Swap the backend here only. */
window.WARMUP_CONFIG = {
  // 'local'   -> console + localStorage only (dev / preview; nothing leaves the browser)
  // 'netlify' -> signups to Netlify Forms (same-origin POST); pair with `goatcounter` for event counts
  // 'webhook' -> POST JSON to `endpoint` (Cloudflare Worker, Apps Script web app, Supabase Edge Function, ...)
  mode: 'local',
  endpoint: '',            // e.g. 'https://warmup-collect.<you>.workers.dev/collect'
  debug: true,             // console.info every event/signup
  // Optional: also send pageviews/events to GoatCounter (count.js-free, via its pixel API).
  // e.g. 'https://warmup.goatcounter.com' — leave '' to disable.
  goatcounter: '',
  utmKeys: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'],
  storagePrefix: 'warmup_'
};
