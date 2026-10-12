// Google Apps Script web app bound to a Google Sheet with two tabs: "events" and "signups".
// Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone. Put the /exec URL in config.js
// (mode: 'webhook', endpoint: '<exec url>'). tracking.js posts text/plain JSON, so no CORS preflight is needed.
var EVENT_COLS = ['ts','event','session_id','utm_source','utm_medium','utm_campaign','utm_content','utm_term','referrer','source_button','event_id'];
var SIGNUP_COLS = ['ts','kind','email','session_id','utm_source','utm_medium','utm_campaign','utm_content','utm_term','referrer','source_button','signup_id'];
function doPost(e) {
  var p; try { p = JSON.parse(e.postData.contents); } catch (err) { return out('bad json'); }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getScriptLock(); lock.waitLock(5000);
  try {
    if (p.type === 'event' && ['page_view','waitlist_signup','fake_door_click','fake_door_signup'].indexOf(p.event) > -1) {
      ss.getSheetByName('events').appendRow(EVENT_COLS.map(function (k) { return k === 'ts' ? new Date() : String(p[k] || '').slice(0, 300); }));
    } else if (p.type === 'signup' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email || '')) {
      ss.getSheetByName('signups').appendRow(SIGNUP_COLS.map(function (k) { return k === 'ts' ? new Date() : String(p[k] || '').slice(0, 300); }));
    }
  } finally { lock.releaseLock(); }
  return out('ok');
}
function out(t) { return ContentService.createTextOutput(t); }
