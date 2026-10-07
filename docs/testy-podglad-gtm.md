# Testy w Podglądzie GTM — scenariusze do skopiowania

Kontener referencyjny na `pmdata.pl`, obszar roboczy „Do not publish !!!”. Zakup testowy: przycisk **purchase** na `https://pmdata.pl/sandbox` (stałe `transaction_id` = `T_12345`).

Partnerzy w `AFF 00 - config`: `partner_a`, `partner_b` (okno 30 dni), `retargeting_a` (CPS, 7 dni). `retargeting_b` = kanał CPC/CPM spoza deduplikacji.

## Przed testami

1. GTM → **Podgląd** → adres `https://pmdata.pl/` → Połącz.
2. W oknie strony: baner zgód → **zaakceptuj marketing**. Zgoda zostaje w `localStorage`, kolejne testy już jej nie pytają.
3. DevTools → Console — tu wklejasz snippety niżej.

## Snippety do konsoli

**Reset przed każdym testem** — kasuje ścieżkę i ostatnie zamówienie (bez tego drugi zakup `T_12345` = `duplicate_transaction`):

```js
['_aff_path','_aff_tx'].forEach(n => document.cookie = n + '=; Max-Age=0; Path=/'); 'reset'
```

**Wynik po zakupie:**

```js
({ cookie: (document.cookie.match(/_aff_path=([^;]*)/) || [, '(brak)'])[1].replace(/~[0-9a-z]+/g, ''),
   decision: (dataLayer.filter(e => e.event === 'aff_decision').pop() || {}).aff })
```

## Jak czytać kroki

- Każdy adres **wklejasz w pasek adresu** tej samej karty (wpisany adres = brak referrera, liczy się tylko `utm_source` / `gclid`).
- Ostatni krok zawsze: `https://pmdata.pl/sandbox` → przycisk **purchase** → snippet „Wynik”.
- „Pixel” = tag `AFF 04x`, który odpala się w Podglądzie (atrapa: log `[AFF] … pixel zakupu (atrapa)` w konsoli). Przy każdej decyzji odpala się też `AFF 06 - GA4 affiliate_attribution`.

## A. Kto wygrywa — sieci afiliacyjne i retargeting

| # | Kroki (adresy po kolei, potem zakup) | `cookie` | `winner` / `reason` | Pixel |
|---|---|---|---|---|
| A1 | `https://pmdata.pl/?utm_source=partner_a` | `partner_a` | `partner_a` / `partner_last_click` | **04a** |
| A2 | `https://pmdata.pl/?utm_source=partner_a` → `https://pmdata.pl/?utm_source=partner_b` | `partner_a\|partner_b` | `partner_b` / `partner_last_click` | **04b** |
| A3 | `https://pmdata.pl/?utm_source=partner_b` → `https://pmdata.pl/?utm_source=partner_a` | `partner_b\|partner_a` | `partner_a` / `partner_last_click` | **04a** |
| A4 | `https://pmdata.pl/?utm_source=retargeting_a&utm_medium=display` | `retargeting_a` | `retargeting_a` / `partner_last_click` | **04c** |
| A5 | `https://pmdata.pl/?utm_source=partner_a` → `https://pmdata.pl/?utm_source=retargeting_a&utm_medium=display` | `partner_a\|retargeting_a` | `retargeting_a` / `partner_last_click` | **04c** |
| A6 | `https://pmdata.pl/?utm_source=retargeting_a&utm_medium=display` → `https://pmdata.pl/?utm_source=partner_b` | `retargeting_a\|partner_b` | `partner_b` / `partner_last_click` | **04b** |
| A7 | `https://pmdata.pl/?utm_source=partner_a` → `https://pmdata.pl/?utm_source=partner_a` | `partner_a` (jeden element) | `partner_a` / `partner_last_click` | **04a** |
| A8 | `https://pmdata.pl/?utm_source=Partner_A` (wielkie litery) | `partner_a` | `partner_a` / `partner_last_click` | **04a** |

## B. Inny kanał jako ostatni klik — nikt z CPS

| # | Kroki | `cookie` | `winner` / `reason` | Pixel |
|---|---|---|---|---|
| B1 | `https://pmdata.pl/?utm_source=partner_a` → `https://pmdata.pl/?utm_source=retargeting_b&utm_medium=display` | `partner_a\|retargeting_b` | `none` / `non_partner_last_click` | **żaden 04** |
| B2 | `https://pmdata.pl/?utm_source=partner_a` → `https://pmdata.pl/?gclid=test123` | `partner_a\|google-ads` | `none` / `non_partner_last_click` | **żaden 04** |
| B3 | `https://pmdata.pl/?utm_source=partner_b` → `https://pmdata.pl/?utm_source=newsletter&utm_medium=email` | `partner_b\|newsletter` | `none` / `non_partner_last_click` | **żaden 04** |
| B4 | `https://pmdata.pl/?utm_source=partner_a` → `https://pmdata.pl/?gclid=test123` → `https://pmdata.pl/?utm_source=partner_a` | `partner_a\|google-ads\|partner_a` | `partner_a` / `partner_last_click` | **04a** |
| B5 | `https://pmdata.pl/?gclid=test123&utm_source=partner_b` (UTM ma pierwszeństwo) | `partner_b` | `partner_b` / `partner_last_click` | **04b** |

## C. Czego mechanizm nie zapisuje

| # | Kroki | `cookie` | `winner` / `reason` | Pixel |
|---|---|---|---|---|
| C1 | `https://pmdata.pl/?utm_source=partner_a` → `https://pmdata.pl/` (wejście bezpośrednie) | `partner_a` | `partner_a` / `partner_last_click` | **04a** |
| C2 | `https://pmdata.pl/?utm_source=partner_a` → `https://pmdata.pl/checkout?utm_source=partner_b` (strona 404 — w porządku, GTM się ładuje) | `partner_a` | `partner_a` / `partner_last_click` | **04a** |
| C3 | Tylko `https://pmdata.pl/sandbox` (bez żadnego wejścia) | `(brak)` | `none` / `no_touchpoints` | **żaden 04** |
| C4 | `https://pmdata.pl/?utm_source=partner_a` → w Google wyszukaj `pmdata.pl`, kliknij wynik organiczny | `partner_a\|organic.google` | `partner_a` / `partner_last_click` | **04a** |

## D. Duplikat, zgoda, wycofanie

| # | Kroki | Oczekiwane |
|---|---|---|
| D1 | Test A1, potem **drugi raz purchase** bez resetu | druga decyzja: `none` / `duplicate_transaction`; **04a nie odpala się drugi raz** |
| D2 | Nowe okno incognito → `https://pmdata.pl/?utm_source=partner_a` → baner: **odrzuć marketing** → `/sandbox` → purchase | brak `_aff_path`; tagi 02 i 03 zablokowane zgodą; **brak `aff_decision`**, żaden 04 |
| D3 | Nowe okno incognito → `https://pmdata.pl/?utm_source=partner_a` → **zaakceptuj na tej stronie** (bez przechodzenia dalej) | tag 02 odpala się na `AFF 02 - consent update`; `cookie` = `partner_a` |
| D4 | Po A1 (ciasteczka są) → stopka **„Ustawienia cookies”** → wyłącz marketing → zapisz | tag 05 odpala się; `_aff_path` i `_aff_tx` znikają; po zakupie brak `aff_decision` |

## E. Okno atrybucji — przez ręczne postarzenie wejścia

Wpisz w konsoli zamiast kroków z adresami, potem `/sandbox` → purchase. `d` = ile dni temu było kliknięcie.

```js
const setTouch = (token, d) => document.cookie = '_aff_path=' + token + '~' +
  (Math.floor(Date.now() / 1000) - d * 86400).toString(36) + '; Max-Age=2592000; Path=/';
```

| # | Snippet | `winner` / `reason` | Pixel |
|---|---|---|---|
| E1 | `setTouch('partner_a', 29)` | `partner_a` / `partner_last_click` | **04a** |
| E2 | `setTouch('partner_a', 31)` | `none` / `partner_window_expired` | **żaden 04** |
| E3 | `setTouch('retargeting_a', 6)` | `retargeting_a` / `partner_last_click` | **04c** |
| E4 | `setTouch('retargeting_a', 8)` | `none` / `partner_window_expired` | **żaden 04** |

## Po teście w GA4

DebugView → zdarzenie `affiliate_attribution` przy każdym zakupie z A–C i E, z parametrami `aff_order_id` = `T_12345`, `aff_winner`, `aff_reason`, `aff_touch`, `aff_path` zgodnymi z tabelą.

## Czego tu nie przetestujesz

- Powrotu z bramek płatności, banków i poczty — wymagają prawdziwego referrera z tych domen; pokrywają je testy automatyczne (`npm test`, ścieżki 5, 12, 16, 17).
- Safari ITP — skrócenie życia ciasteczka widać dopiero po dniach.
