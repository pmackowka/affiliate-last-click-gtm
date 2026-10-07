-- Tabele referencyjne rozliczeń z partnerami.
-- Podmień `your-project` i `affiliate` na swój projekt i dataset. Uruchom raz.

-- Zamówienia z backendu sklepu — JEDYNE źródło prawdy o przychodzie, zwrotach i anulacjach.
-- GA4 mówi, kto wygrał atrybucję; ile zapłacić, mówi backend.
CREATE TABLE IF NOT EXISTS `your-project.affiliate.orders` (
  order_id         STRING    NOT NULL,  -- to samo ID co ecommerce.transaction_id w dataLayer
  order_ts         TIMESTAMP NOT NULL,
  revenue          NUMERIC   NOT NULL,  -- brutto z wysyłką, w walucie zamówienia
  shipping         NUMERIC   NOT NULL,
  currency         STRING    NOT NULL,
  is_new_customer  BOOL      NOT NULL,
  sales_channel    STRING    NOT NULL,  -- web | app | phone | marketplace | b2b — do atrybucji wchodzi tylko web
  status           STRING    NOT NULL,  -- paid | cancelled | returned | partially_returned
  returned_amount  NUMERIC              -- kwota zwrotu brutto bez wysyłki
);

-- Warunki umów. Wersjonowane datami, bo stawki zmieniają się w trakcie współpracy.
CREATE TABLE IF NOT EXISTS `your-project.affiliate.partner_contracts` (
  partner_id              STRING  NOT NULL,
  valid_from              DATE    NOT NULL,
  valid_to                DATE,
  rate_new                NUMERIC NOT NULL,  -- np. 0.08 = 8% od podstawy, nowy klient
  rate_returning          NUMERIC NOT NULL   -- powracający klient
);

-- Wynik atrybucji per zamówienie — budowany skryptem 02, czytany przez 03 i 05.
CREATE TABLE IF NOT EXISTS `your-project.affiliate.order_attribution` (
  order_id          STRING  NOT NULL,
  order_date        DATE    NOT NULL,
  is_new_customer   BOOL    NOT NULL,
  commission_base   NUMERIC NOT NULL,  -- przychód − wysyłka − zwroty
  partner_id        STRING,            -- NULL = nikt z partnerów
  method            STRING  NOT NULL,  -- cookie_last_click | cookie_no_partner | unattributed | out_of_scope
  decision_reason   STRING,            -- powód z tagu AFF 03 (gdy była zgoda)
  decision_path     STRING
)
PARTITION BY order_date;
