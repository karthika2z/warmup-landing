/* Single config object for tracking + email capture. Swap the backend here only. */
window.WARMUP_CONFIG = {
  // 'local'   -> console + localStorage only (dev / preview; nothing leaves the browser)
  // 'webhook' -> POST JSON as text/plain, no-cors (or sendBeacon) to `endpoint`
  //              (Google Apps Script web app /exec URL, Cloudflare Worker, ...)
  // 'netlify' -> signups to Netlify Forms (same-origin POST); pair with `goatcounter` for event counts
  mode: 'webhook',
  // >>> PLACEHOLDER: paste the Apps Script web app URL (ends in /exec) here. <<<
  // While empty, the page still works (forms show success) but nothing is sent or stored.
  endpoint: '',
  debug: false,            // true = console.info + keep events/signups in localStorage (dev only)
  goatcounter: '',         // optional GoatCounter site URL, '' = off
  utmKeys: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'],
  storagePrefix: 'warmup_'
};
