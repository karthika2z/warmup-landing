// Cloudflare Worker: POST /collect  (body = JSON from tracking.js, sent as text/plain)
// Bind a D1 database as DB (see wrangler.toml.example). Set ALLOWED_ORIGIN to the landing page origin.
export default {
  async fetch(req, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || new URL(req.url).pathname !== '/collect') return new Response('Not found', { status: 404, headers: cors });
    let p; try { p = JSON.parse(await req.text()); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }
    const s = (v, n = 200) => (v == null ? null : String(v).slice(0, n));
    const ALLOWED = ['page_view', 'waitlist_signup', 'fake_door_click', 'fake_door_signup'];
    if (p.type === 'event' && ALLOWED.includes(p.event)) {
      const { type, event, event_id, ts, session_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, source_button, ...rest } = p;
      await env.DB.prepare('INSERT OR IGNORE INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(s(event_id, 64) || crypto.randomUUID(), new Date().toISOString(), event, s(session_id, 64), s(utm_source), s(utm_medium), s(utm_campaign), s(utm_content), s(utm_term), s(referrer, 500), s(source_button, 40), s(JSON.stringify(rest), 1000)).run();
    } else if (p.type === 'signup' && ['waitlist', 'fake_door'].includes(p.kind) && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email || '')) {
      await env.DB.prepare('INSERT OR IGNORE INTO signups VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(s(p.signup_id, 64) || crypto.randomUUID(), new Date().toISOString(), p.kind, s(p.email, 254).toLowerCase(), s(p.session_id, 64), s(p.utm_source), s(p.utm_medium), s(p.utm_campaign), s(p.utm_content), s(p.utm_term), s(p.referrer, 500), s(p.source_button, 40)).run();
    } else {
      return new Response('Ignored', { status: 400, headers: cors });
    }
    return new Response('ok', { headers: cors });
  }
};
