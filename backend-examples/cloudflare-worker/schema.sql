-- D1 schema for Warmup demand test
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, ts TEXT NOT NULL, event TEXT NOT NULL, session_id TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
  referrer TEXT, source_button TEXT, props TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_event ON events(event, utm_source, utm_campaign);
CREATE TABLE IF NOT EXISTS signups (
  id TEXT PRIMARY KEY, ts TEXT NOT NULL, kind TEXT NOT NULL, email TEXT NOT NULL, session_id TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
  referrer TEXT, source_button TEXT,
  UNIQUE(kind, email)
);
