-- Funnel by source/campaign (unique sessions). Run: wrangler d1 execute warmup --remote --file funnel.sql
WITH v AS (SELECT utm_source, utm_campaign, COUNT(DISTINCT session_id) visitors FROM events WHERE event='page_view' GROUP BY 1,2),
     su AS (SELECT utm_source, utm_campaign, COUNT(DISTINCT session_id) signup_sessions FROM events WHERE event IN ('waitlist_signup','fake_door_signup') GROUP BY 1,2),
     fd AS (SELECT utm_source, utm_campaign, COUNT(DISTINCT session_id) fake_door_sessions FROM events WHERE event='fake_door_click' GROUP BY 1,2)
SELECT v.utm_source, v.utm_campaign, v.visitors,
       COALESCE(su.signup_sessions,0) AS signups,
       ROUND(1.0*COALESCE(su.signup_sessions,0)/v.visitors,4) AS signup_rate,
       COALESCE(fd.fake_door_sessions,0) AS fake_door_clickers,
       ROUND(1.0*COALESCE(fd.fake_door_sessions,0)/v.visitors,4) AS paid_intent_rate
FROM v LEFT JOIN su USING (utm_source, utm_campaign) LEFT JOIN fd USING (utm_source, utm_campaign)
ORDER BY v.visitors DESC;
