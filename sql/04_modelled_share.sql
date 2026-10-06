-- Pula zamówień bez zgody i bez kodu: podział proporcjonalny do udziału partnera
-- w zamówieniach ZE zgodą, tylko dla umów z `modelled_share_enabled`, z miesięcznym limitem.
--
-- Założenie modelu (zapisać w umowie): klienci bez zgody wybierają partnerów w tych samych
-- proporcjach co klienci ze zgodą. Jeśli jakiś partner sprowadza ruch, który częściej odmawia zgody
-- (np. ruch mobilny z aplikacji), model go niedoszacuje — dlatego limit i przegląd kwartalny.

DECLARE period_start DATE DEFAULT DATE '2026-09-01';
DECLARE period_end   DATE DEFAULT DATE '2026-09-30';

WITH period AS (
  SELECT *
  FROM `your-project.affiliate.order_attribution`
  WHERE order_date BETWEEN period_start AND period_end
),

-- Mianownik: wszystkie zamówienia z decyzją (ze zgodą), także te, w których nie wygrał żaden partner.
-- Bez tego udział partnerów sumowałby się do 100% i pula byłaby rozdzielana w całości.
consented AS (
  SELECT SUM(commission_base) AS base
  FROM period
  WHERE method IN ('cookie_last_click', 'cookie_no_partner')
),

partner_share AS (
  SELECT partner_id, SUM(commission_base) / (SELECT base FROM consented) AS share
  FROM period
  WHERE method = 'cookie_last_click'
  GROUP BY partner_id
),

pool AS (
  SELECT SUM(commission_base) AS base, COUNT(*) AS orders
  FROM period
  WHERE method = 'unattributed'
)

SELECT
  s.partner_id,
  ROUND(s.share * 100, 2)                         AS share_pct,
  p.orders                                        AS pool_orders,
  ROUND(p.base, 2)                                AS pool_base,
  ROUND(s.share * p.base, 2)                      AS modelled_base,
  ROUND(s.share * p.base * k.modelled_rate, 2)    AS modelled_commission_raw,
  ROUND(LEAST(s.share * p.base * k.modelled_rate,
              IFNULL(k.modelled_cap, s.share * p.base * k.modelled_rate)), 2) AS modelled_commission
FROM partner_share s
CROSS JOIN pool p
JOIN `your-project.affiliate.partner_contracts` k
  ON k.partner_id = s.partner_id
 AND period_end BETWEEN k.valid_from AND IFNULL(k.valid_to, DATE '9999-12-31')
WHERE k.modelled_share_enabled
ORDER BY modelled_commission DESC;
