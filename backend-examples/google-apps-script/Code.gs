/**
 * Warmup landing page -> Google Sheet collector.
 *
 * Paste into the Apps Script editor of a Google Sheet (Extensions > Apps Script), then
 * Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 * Put the resulting .../exec URL into config.js (`endpoint`).
 *
 * The page sends JSON with Content-Type text/plain (fetch mode 'no-cors' or navigator.sendBeacon),
 * so the browser never sends a CORS preflight (Apps Script can't answer one). We read e.postData.contents.
 * Rows go to one tab, "data" (created with a header row on first use). Events have an empty email;
 * signups (type = signup) carry the email.
 */
var SHEET_NAME = 'data';
var COLUMNS = ['timestamp', 'type', 'event', 'kind', 'email', 'utm_source', 'utm_medium', 'utm_campaign',
               'utm_content', 'utm_term', 'session_id', 'referrer', 'path', 'source_button', 'client_ts', 'id'];
var EVENTS = ['page_view', 'waitlist_signup', 'fake_door_click', 'fake_door_signup'];
var KINDS = ['waitlist', 'fake_door'];
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  var raw = (e && e.postData && e.postData.contents) || '';
  if (!raw || raw.length > 10000) return reply_('empty or too large');
  var p;
  try { p = JSON.parse(raw); } catch (err) { return reply_('bad json'); }

  var type = String(p.type || '');
  var row = {
    timestamp: new Date(),
    type: type,
    event: '',
    kind: '',
    email: '',
    utm_source: p.utm_source, utm_medium: p.utm_medium, utm_campaign: p.utm_campaign,
    utm_content: p.utm_content, utm_term: p.utm_term,
    session_id: p.session_id, referrer: p.referrer, path: p.path,
    source_button: p.source_button, client_ts: p.ts, id: p.event_id || p.signup_id
  };
  if (type === 'event' && EVENTS.indexOf(p.event) > -1) {
    row.event = p.event;
  } else if (type === 'signup' && KINDS.indexOf(p.kind) > -1 && EMAIL_RE.test(String(p.email || '')) && String(p.email).length <= 254) {
    row.kind = p.kind;
    row.email = String(p.email).trim().toLowerCase();
  } else {
    return reply_('ignored');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_();
    sheet.appendRow(COLUMNS.map(function (c) { return clean_(row[c]); }));
  } finally {
    lock.releaseLock();
  }
  return reply_('ok');
}

// Visiting the /exec URL in a browser shows this, which is a quick "is it deployed?" check.
function doGet() { return reply_('warmup collector is running'); }

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  }
  return sheet;
}

function clean_(v) {
  if (v instanceof Date) return v;
  if (v === null || v === undefined) return '';
  var s = String(v).slice(0, 500);
  // Stop spreadsheet formula injection from user-controlled strings (UTMs, referrer, email).
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function reply_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}

// Optional: run once from the editor (select setup, click Run) to create the header row and trigger authorization.
function setup() { getSheet_(); }
