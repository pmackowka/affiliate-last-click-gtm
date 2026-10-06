-- Kontrole jakości przed wysłaniem rozliczenia. Każde zapytanie powinno zwrócić 0 wierszy
-- albo wartości w spodziewanym zakresie — opis przy każdym.

DECLARE period_start DATE DEFAULT DATE '2026-09-01';
DECLARE period_end   DATE DEFAULT DATE '2026-09-30';

-- 1. Pokrycie decyzjami per dzień. Nagły spadek udziału `cookie_*` = zepsuty tag albo zmiana banera zgód,
--    nie nagła zmiana zachowań klientów.
SELECT
  order_date,
  COUNT(*) AS orders,
  ROUND(100 * COUNTIF(method IN ('cookie_last_click', 'cookie_no_partner')) / COUNT(*), 1) AS pct_with_decision,
  ROUND(100 * COUNTIF(method = 'coupon') / COUNT(*), 1)       AS pct_coupon,
  ROUND(100 * COUNTIF(method = 'unattributed') / COUNT(*), 1) AS pct_unattributed
FROM `your-project.affiliate.order_attribution`
WHERE order_date BETWEEN period_start AND period_end
GROUP BY order_date
ORDER BY order_date;

-- 2. Decyzje z GA4 bez zamówienia w backendzie (oczekiwane: 0). Inne ID w dataLayer niż w backendzie
--    albo zamówienia testowe na produkcji.
WITH ga4 AS (
  SELECT DISTINCT
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'aff_order_id') AS order_id
  FROM `your-project.analytics_123456789.events_*`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', period_start) AND FORMAT_DATE('%Y%m%d', period_end)
    AND event_name = 'affiliate_attribution'
)
SELECT g.order_id
FROM ga4 g
LEFT JOIN `your-project.affiliate.orders` o ON o.order_id = g.order_id
WHERE o.order_id IS NULL;

-- 3. Rozkład powodów decyzji. `duplicate_transaction` powinien być mały; duży = strona podziękowania
--    pushuje `purchase` przy każdym wejściu.
SELECT decision_reason, COUNT(*) AS orders
FROM `your-project.affiliate.order_attribution`
WHERE order_date BETWEEN period_start AND period_end
GROUP BY decision_reason
ORDER BY orders DESC;

-- 4. Konflikty: zamówienie ze zgodą przypisane partnerowi X, ale z kodem rabatowym partnera Y.
--    Nie zmieniają rozliczenia (wygrywa ciasteczko), ale duża liczba = kody wyciekły do serwisów kuponowych.
SELECT a.partner_id AS cookie_partner, c.partner_id AS coupon_partner, COUNT(*) AS orders
FROM `your-project.affiliate.order_attribution` a
JOIN `your-project.affiliate.orders` o USING (order_id)
JOIN `your-project.affiliate.partner_coupons` c ON UPPER(TRIM(o.coupon_code)) = UPPER(TRIM(c.coupon_code))
WHERE a.order_date BETWEEN period_start AND period_end
  AND a.method = 'cookie_last_click'
  AND a.partner_id != c.partner_id
GROUP BY 1, 2
ORDER BY orders DESC;
