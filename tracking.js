/* Warmup tracking adapter: track(event, props) and submitEmail(kind, email).
   Backend is chosen only by window.WARMUP_CONFIG. Events: page_view, waitlist_signup,
   fake_door_click, fake_door_signup. Every event and signup carries the session's UTMs. */
(function () {
  'use strict';
  var C = window.WARMUP_CONFIG || { mode: 'local', utmKeys: ['utm_source', 'utm_medium', 'utm_campaign'], storagePrefix: 'warmup_' };
  var P = C.storagePrefix || 'warmup_';
  var DEV = C.mode === 'local' || C.debug === true;

  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(P + k); sessionStorage.setItem(P + k, v); } catch (e) { return null; } }
  function lsPush(k, item, cap) {
    if (!DEV) return; // production: keep nothing (no PII) in localStorage
    try {
      var arr = JSON.parse(localStorage.getItem(P + k) || '[]');
      arr.push(item); if (arr.length > (cap || 1000)) arr = arr.slice(-cap);
      localStorage.setItem(P + k, JSON.stringify(arr));
    } catch (e) { /* storage blocked: ignore */ }
  }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(P + k) || '[]'); } catch (e) { return []; } }
  function uid() { return (crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); }

  // --- UTM capture: keep for the whole session; a new tagged link in the same session replaces it.
  (function captureUtm() {
    var q = new URLSearchParams(location.search), found = {}, any = false;
    (C.utmKeys || []).forEach(function (k) { var v = q.get(k); if (v) { found[k] = v.slice(0, 200); any = true; } });
    if (any) ss('utm', JSON.stringify(found));
    if (!ss('sid')) ss('sid', uid());
    if (!ss('landing')) ss('landing', JSON.stringify({ landing_path: location.pathname + location.search, referrer: document.referrer || '' }));
  })();

  function getUtm() { try { return JSON.parse(ss('utm') || '{}'); } catch (e) { return {}; } }
  function context() {
    var u = getUtm(), l = {}; try { l = JSON.parse(ss('landing') || '{}'); } catch (e) {}
    var ctx = { ts: new Date().toISOString(), session_id: ss('sid'), path: location.pathname, referrer: l.referrer || '', landing_path: l.landing_path || '' };
    (C.utmKeys || []).forEach(function (k) { ctx[k] = u[k] || null; });
    return ctx;
  }
  function assign(a, b) { for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a; }

  function send(payload, wait) {
    if (C.mode === 'netlify') {
      // Netlify Forms: signups only (events go to GoatCounter). Needs the hidden form in index.html.
      if (payload.type !== 'signup') return Promise.resolve({ ok: true, mode: 'netlify-skip' });
      var f = new URLSearchParams({ 'form-name': 'signup' });
      ['kind', 'email', 'session_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referrer', 'source_button', 'ts']
        .forEach(function (k) { f.append(k, payload[k] == null ? '' : String(payload[k])); });
      return fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: f.toString() })
        .then(function (r) { return { ok: r.ok, status: r.status }; })
        .catch(function (e) { return { ok: false, error: String(e) }; });
    }
    if (C.mode !== 'webhook' || !C.endpoint) return Promise.resolve({ ok: true, mode: C.mode === 'webhook' ? 'no-endpoint' : 'local' });
    // Apps Script can't answer CORS preflights: send a "simple" request (text/plain) and don't read the reply.
    var body = JSON.stringify(payload);
    if (!wait && navigator.sendBeacon) {
      try {
        if (navigator.sendBeacon(C.endpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return Promise.resolve({ ok: true, mode: 'beacon' });
      } catch (e) { /* fall through to fetch */ }
    }
    return fetch(C.endpoint, { method: 'POST', mode: 'no-cors', keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body })
      .then(function () { return { ok: true, mode: 'no-cors' }; }) // opaque response: delivered as far as the browser can tell
      .catch(function (e) { if (DEV) console.warn('[warmup] send failed', e); return { ok: false, error: 'network' }; });
  }

  function goat(event) {
    if (!C.goatcounter) return;
    var u = getUtm();
    var isPv = event === 'page_view';
    var params = new URLSearchParams({ p: isPv ? location.pathname : event, t: isPv ? document.title : event, e: isPv ? 'false' : 'true', r: document.referrer || '', q: u.utm_source ? 'utm_source=' + u.utm_source : '', rnd: Math.random().toString(36).slice(2) });
    var img = new Image(); img.src = C.goatcounter.replace(/\/$/, '') + '/count?' + params.toString();
  }

  function track(event, props) {
    var payload = assign(assign({ type: 'event', event: String(event), event_id: uid() }, context()), props || {});
    lsPush('events', payload, 1000);
    if (C.debug === true) console.info('[warmup] event', event, payload);
    goat(event);
    return send(payload, false);
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function submitEmail(kind, email, extra) {
    email = String(email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) return Promise.resolve({ ok: false, error: 'invalid_email' });
    var payload = assign(assign({ type: 'signup', kind: kind, email: email, signup_id: uid() }, context()), extra || {});
    lsPush('signups', payload, 1000);
    if (C.debug === true) console.info('[warmup] signup', kind, payload);
    return send(payload, true).then(function (res) {
      if (res.ok) track(kind === 'fake_door' ? 'fake_door_signup' : 'waitlist_signup', { kind: kind });
      return res;
    });
  }

  // Local helper for checking the funnel in dev: Warmup.stats()
  function stats() {
    var ev = lsGet('events');
    function sessions(e) { var set = {}; ev.forEach(function (x) { if (x.event === e) set[x.session_id] = 1; }); return Object.keys(set).length; }
    function count(e) { return ev.filter(function (x) { return x.event === e; }).length; }
    var visitors = sessions('page_view');
    return { page_views: count('page_view'), visitors: visitors,
      waitlist_signups: count('waitlist_signup'), fake_door_clicks: count('fake_door_click'),
      fake_door_click_sessions: sessions('fake_door_click'), fake_door_signups: count('fake_door_signup'),
      signup_rate: visitors ? (function () { var set = {}; ev.forEach(function (x) { if (x.event === 'waitlist_signup' || x.event === 'fake_door_signup') set[x.session_id] = 1; }); return Object.keys(set).length; })() / visitors : 0,
      paid_intent_rate: visitors ? sessions('fake_door_click') / visitors : 0 };
  }

  window.Warmup = { track: track, submitEmail: submitEmail, getUtm: getUtm, stats: stats,
    events: function () { return lsGet('events'); }, signups: function () { return lsGet('signups'); }, config: C };
})();
