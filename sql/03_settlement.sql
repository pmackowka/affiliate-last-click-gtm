-- Rozliczenie z partnerami za okres: zamówienia przypisane ciasteczkiem (last click).
-- Pula bez zgody (modelowana) jest osobno, w 04 — żeby w raporcie było widać, z czego wynika kwota.

DECLARE period_start DATE DEFAULT DATE '2026-09-01';
DECLARE period_end   DATE DEFAULT DATE '2026-09-30';

SELECT
  a.partner_id,
  a.method,
  COUNT(*)                                   AS orders,
  COUNTIF(a.is_new_customer)                 AS orders_new_customers,
  ROUND(SUM(a.commission_base), 2)           AS commission_base,
  ROUND(SUM(a.commission_base
            * IF(a.is_new_customer, k.rate_new, k.rate_returning)), 2) AS commission
FROM `your-project.affiliate.order_attribution` a
JOIN `your-project.affiliate.partner_contracts` k
  ON k.partner_id = a.partner_id
 AND a.order_date BETWEEN k.valid_from AND IFNULL(k.valid_to, DATE '9999-12-31')
WHERE a.order_date BETWEEN period_start AND period_end
  AND a.method = 'cookie_last_click'
GROUP BY a.partner_id, a.method
ORDER BY a.partner_id, a.method;
