-- Atrybucja zamówień za okres: łączy backend z decyzjami z GA4.
-- Idempotentne: kasuje i odbudowuje wiersze okresu. Uruchamiaj po zamknięciu okresu zwrotów.
--
-- Hierarchia przypisania (jedno zamówienie = jedna ścieżka, nigdy dwie):
--   1. kanał inny niż web                          → out_of_scope (poza atrybucją i pulą),
--   2. jest decyzja z tagu (była zgoda ad_storage) → wynik ciasteczka, także „nikt z partnerów”
--      (w tym no_touchpoints i only_navigational — zgoda była, kliknięcia partnera brak),
--   3. brak decyzji                                → unattributed (brak zgody = brak prowizji).
-- Kody rabatowe nie są metodą przypisania — sklep ich nie używa w programie partnerskim.

DECLARE period_start DATE DEFAULT DATE '2026-09-01';
DECLARE period_end   DATE DEFAULT DATE '2026-09-30';
DECLARE tz STRING DEFAULT 'Europe/Warsaw';

DELETE FROM `your-project.affiliate.order_attribution`
WHERE order_date BETWEEN period_start AND period_end;

INSERT INTO `your-project.affiliate.order_attribution`
WITH decisions AS (
  SELECT
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'aff_order_id') AS order_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'aff_winner')   AS winner,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'aff_reason')   AS reason,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'aff_path')     AS path,
    event_timestamp
  FROM `your-project.analytics_123456789.events_*`
  -- Dzień zapasu z obu stron: tabele GA4 są w strefie czasowej property, zamówienia w UTC.
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(period_start, INTERVAL 1 DAY))
                          AND FORMAT_DATE('%Y%m%d', DATE_ADD(period_end, INTERVAL 1 DAY))
    AND event_name = 'affiliate_attribution'
),

first_decision AS (
  SELECT order_id, winner, reason, path
  FROM decisions
  WHERE order_id IS NOT NULL
    AND reason != 'duplicate_transaction'
  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY event_timestamp) = 1
),

orders AS (
  SELECT
    order_id,
    DATE(order_ts, tz) AS order_date,
    is_new_customer,
    sales_channel,
    revenue - shipping - IFNULL(returned_amount, 0) AS commission_base
  FROM `your-project.affiliate.orders`
  WHERE DATE(order_ts, tz) BETWEEN period_start AND period_end
    AND status != 'cancelled'
)

SELECT
  o.order_id,
  o.order_date,
  o.is_new_customer,
  GREATEST(o.commission_base, 0) AS commission_base,
  IF(o.sales_channel = 'web' AND d.order_id IS NOT NULL, NULLIF(d.winner, 'none'), NULL) AS partner_id,
  CASE
    WHEN o.sales_channel != 'web'                      THEN 'out_of_scope'
    WHEN d.order_id IS NOT NULL AND d.winner != 'none' THEN 'cookie_last_click'
    WHEN d.order_id IS NOT NULL                        THEN 'cookie_no_partner'
    ELSE 'unattributed'
  END AS method,
  d.reason AS decision_reason,
  d.path   AS decision_path
FROM orders o
LEFT JOIN first_decision d
  ON d.order_id = o.order_id;  -- tag wysyła surowe ID z dataLayer, bez normalizacji
