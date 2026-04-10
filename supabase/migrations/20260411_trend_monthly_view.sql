-- Monthly trending aggregation VIEW
-- Aggregates keyword_trend_daily over a 30-day rolling window.
-- Only includes RISING keywords (avg change_rate > 0) with at least 3 days of data.
-- Used by GET /api/keywords/trending?period=monthly

CREATE OR REPLACE VIEW keyword_trend_monthly_agg AS
SELECT
  keyword,
  ROUND(AVG(change_rate)::numeric, 2) AS avg_change_rate,
  MAX(monthly_volume) AS monthly_volume,
  COUNT(*) AS appearance_count,
  ROUND(AVG(composite_score)::numeric, 4) AS avg_composite_score,
  MAX(composite_score) AS peak_composite_score,
  -- Most recent news headline (non-null)
  (ARRAY_AGG(news_title ORDER BY recorded_date DESC) FILTER (WHERE news_title IS NOT NULL))[1] AS news_title,
  (ARRAY_AGG(news_link ORDER BY recorded_date DESC) FILTER (WHERE news_link IS NOT NULL))[1] AS news_link,
  MAX(recorded_date)::text AS last_recorded_date
FROM keyword_trend_daily
WHERE recorded_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY keyword
HAVING COUNT(*) >= 3
   AND AVG(change_rate) > 0;
