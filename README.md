# affiliate-last-click-gtm

Deduplikacja konwersji partnerów rozliczanych od sprzedaży (CPS) w modelu **last click**, po stronie klienta w Google Tag Manager, **tylko przy zgodzie `ad_storage`**. Do tego model rozliczeń zamówień bez zgody i zapytania BigQuery do rozliczenia miesięcznego.

**Problem:** klient przed zakupem przechodzi przez kilka sieci afiliacyjnych, porównywarek i reklam. Jeśli każda sieć dostanie pixel zakupu, każda policzy prowizję od tego samego zamówienia. Mechanizm zapisuje ścieżkę wejść i wysyła pixel **tylko do sieci, która przyprowadziła klienta jako ostatnia**.

## Jak to działa

```text
Wejście ─► klasyfikacja źródła ─► dopisanie do _aff_path                    (przy zgodzie)
Zakup ───────────────────────────► decyzja: kto ostatni? ─► aff_decision w dataLayer
                                                              ├─► pixel zwycięzcy
                                                              └─► GA4: affiliate_attribution
```

### Klasyfikacja wejścia

| # | Sygnał | Token | Przykład |
|---|---|---|---|
| — | strona z `noCapturePaths` (koszyk, płatność, podziękowanie) | **nic nie zapisujemy** | powrót z bramki lub 3DS banku |
| 1 | `utm_source` | wartość parametru | `?utm_source=partner_a` → `partner_a` |
| 2 | identyfikator kliknięcia bez UTM | nazwa z konfiguracji | `?gclid=…` → `google-ads` |
| 3 | wyszukiwarka organiczna | token nawigacyjny | `google.pl` → `organic.google` |
| 4 | inny referrer zewnętrzny | domena bez `www.` | `some-blog.example` |
| — | brak referrera, własna domena | **nic nie zapisujemy** | wpisany adres |
| — | źródło przezroczyste | **nic nie zapisujemy** | PayU, BLIK, bank, Gmail (web i aplikacja) |

Źródła przezroczyste to bramki płatności, banki i poczta — gdyby trafiły do ścieżki, każdy zakup opłacony przelewem „należałby” do banku. `noCapturePaths` to druga linia obrony: listy bramek nigdy nie będą kompletne, a ścieżki checkoutu sklep zna. Referrery `android-app://` (aplikacja Gmail, aplikacja Google) są mapowane jak ich wersje webowe.

### Ciasteczko `_aff_path`

```text
partner_a~tq4k2o|organic.google~tq5b8c|partner_b~tq6x1d      token~czas (sekundy, base36)
```

Token tylko `[a-z0-9._-]`, maks. 32 znaki. Najwyżej 10 wejść; powtórzone źródło odświeża czas; wejścia starsze niż czas życia ciasteczka wypadają.

### Decyzja przy zakupie

Od końca ścieżki, z pominięciem wyszukiwarek organicznych (klient kliknął partnera, a potem wrócił, wpisując nazwę sklepu w Google). Pierwsze wejście, które zostanie, rozstrzyga:

| Wejście | Wynik | `aff.reason` |
|---|---|---|
| partner w swoim oknie atrybucji | **partner wygrywa** | `partner_last_click` |
| partner po oknie | nikt (bez cofania do starszego partnera) | `partner_window_expired` |
| źródło spoza listy partnerów | nikt | `non_partner_last_click` |
| same organiczne / brak ciasteczka | nikt | `only_navigational` / `no_touchpoints` |
| to samo zamówienie drugi raz | nikt | `duplicate_transaction` |

## Zgoda i przepisy

> Opis założeń, nie opinia prawna.

- Zapis i odczyt `_aff_path` to przechowywanie informacji na urządzeniu — art. 399 PKE (art. 5 ust. 3 ePrivacy). Rozliczenie prowizji nie jest „niezbędne do świadczenia usługi”; EDPB (Wytyczne 2/2023) podaje afiliację jako przykład.
- Tagi 02 i 03 oraz pixele sieci (na każdej stronie, nie tylko przy zakupie) wymagają `ad_storage`. Tag 01 tylko definiuje funkcje.
- Po odmowie lub wycofaniu zgody tag 05 kasuje `_aff_path` i `_aff_tx`.
- Serwer nie zwalnia ze zgody, dopóki identyfikator jest zapisywany w przeglądarce.

## Konfiguracja w GTM

**Wymagania:** Consent Mode v2 przez CMP (`consent default` przed tagami, `consent update` po decyzji), włączony przegląd zgody w kontenerze, `purchase` w schemacie GA4 (`transaction_id`, `value`, `shipping`, `currency`), stały `utm_source` partnerów zapisany w umowie.

### Zmienne

| Nazwa | Typ | Ustawienia |
|---|---|---|
| `AFF - config` | Niestandardowy JS | [`gtm/variable-config.js`](gtm/variable-config.js) — **podmień domenę, partnerów i `noCapturePaths`** |
| `DLV - ecommerce.transaction_id`, `…currency` | Warstwa danych v2 | pola `ecommerce` |
| `DLV - aff.order_id`, `.winner`, `.reason`, `.touch`, `.path` | Warstwa danych v2 | pola `aff` |
| `JS - order value net of shipping` | Niestandardowy JS | `value − shipping` — **tylko jeśli `value` zawiera wysyłkę**, inaczej odejmiesz ją dwa razy |
| `LT - partner_a event by customer type` | Tabela przeglądowa | nowy / powracający klient → ID zdarzenia w sieci |

### Reguły

| Nazwa | Typ | Warunek |
|---|---|---|
| `AFF - Initialization` | Inicjowanie | wszystkie strony |
| `AFF - DOM Ready` | DOM gotowy | wszystkie strony |
| `AFF - consent update` | Zdarzenie niestandardowe | zdarzenie CMP po decyzji (np. `OneTrustGroupsUpdated`) — sprawdź w podglądzie |
| `AFF - purchase` | Zdarzenie niestandardowe | `purchase` |
| `AFF - decision (all)` | Zdarzenie niestandardowe | `aff_decision` |
| `AFF - winner: partner_a` (po jednej na partnera) | Zdarzenie niestandardowe | `aff_decision` i `{{DLV - aff.winner}}` = `partner_a` |

### Tagi

| # | Nazwa | Reguła | Zgoda | Kod |
|---|---|---|---|---|
| 01 | `AFF - 01 library` | Initialization | bez dodatkowej | [`01-library.html`](gtm/01-library.html) (generowany) |
| 02 | `AFF - 02 capture touchpoint` | DOM Ready **+** consent update | `ad_storage` | [`02-capture-touchpoint.html`](gtm/02-capture-touchpoint.html) |
| 03 | `AFF - 03 decide winner` | purchase | `ad_storage` | [`03-decide-winner.html`](gtm/03-decide-winner.html) |
| 05 | `AFF - 05 consent revoke` | DOM Ready **+** consent update | **bez dodatkowej** | [`05-consent-revoke.html`](gtm/05-consent-revoke.html) |
| — | `Partner A - purchase` (B, C, D, Retargeting A) | winner: partner_a | `ad_storage` | szkielet: [`04-partner-purchase-example.html`](gtm/04-partner-purchase-example.html) |
| — | `Retargeting B - purchase` | purchase (bez deduplikacji) | `ad_storage` | od sieci |
| — | `GA4 - affiliate_attribution` | decision (all) | wbudowana GA4 | parametry `aff_order_id`, `aff_winner`, `aff_reason`, `aff_touch`, `aff_path` |

Drugi wyzwalacz tagu 02 łapie wejście z linku partnera, gdy zgoda pada na tej samej stronie — GTM nie odpala wstecz tagu zablokowanego na DOM Ready. Tag 05 czyta stan z komend `gtag('consent', 'update', …)` w dataLayer; jeśli CMP ustawia zgodę szablonem GTM, sprawdź w podglądzie, że tag kasuje ciasteczka.

### Test w podglądzie (incognito)

1. `?utm_source=partner_a`, **odrzuć zgodę** → brak `_aff_path`.
2. `?utm_source=partner_a`, **zaakceptuj na tej samej stronie** → `partner_a~…`.
3. Kolejna strona sklepu → bez zmian. Potem `?utm_source=partner_b` → `partner_a~…|partner_b~…`.
4. Zamówienie → `aff_decision` z `winner: partner_b`, odpala się tylko pixel Partnera B.
5. Odśwież stronę podziękowania → `duplicate_transaction`, żaden pixel.
6. Wycofaj zgodę w CMP → `_aff_path` i `_aff_tx` znikają.
7. GA4 DebugView → `affiliate_attribution` z parametrami. Po publikacji sprawdź [`sql/05_qa_checks.sql`](sql/05_qa_checks.sql), zapytanie 1.

## Ścieżki klientów — kto wygrywa

Partner A i B — okno 30 dni, C — 14 dni, D (porównywarka) i Retargeting A (CPS post-click) — 7 dni. Retargeting B (CPC/CPM) jest poza deduplikacją. Wiersze 1–18 to testy w [`tests/journeys.js`](tests/journeys.js); 19–20 sprawdzasz w podglądzie GTM.

| # | Ścieżka | `_aff_path` przy zakupie | Pixel zakupu | Dlaczego |
|---|---|---|---|---|
| 1 | Partner A → zakup | `partner_a` | **Partner A** | jedyne wejście |
| 2 | Partner A → Partner B → zakup | `partner_a\|partner_b` | **Partner B** | ostatni klik |
| 3 | Partner A → Google organic → zakup | `partner_a\|organic.google` | **Partner A** | organic pomijany |
| 4 | Partner A → Google → Google → zakup | `partner_a\|organic.google` | **Partner A** | powtórzenie nie dopisuje |
| 5 | Partner B → PayU (powrót) → zakup | `partner_b` | **Partner B** | bramka przezroczysta |
| 6 | Partner A → Google Ads (`gclid`) → zakup | `partner_a\|google-ads` | nikt | ostatni klik płatny |
| 7 | Partner C → newsletter → zakup | `partner_c\|newsletter` | nikt | własny kanał |
| 8 | Retargeting A (klik) → zakup | `retargeting_a` | **Retargeting A** | CPS post-click |
| 9 | Partner A → Retargeting B (klik) → zakup | `partner_a\|retargeting_b` | nikt z CPS; Retargeting B jak zawsze | B poza deduplikacją |
| 10 | Partner D → 10 dni → wpisany adres → zakup | `partner_d` | nikt | okno 7 dni minęło |
| 11 | Partner A → wpisany adres → zakup | `partner_a` | **Partner A** | direct nie nadpisuje |
| 12 | Partner B → Gmail (web) → zakup | `partner_b` | **Partner B** | poczta przezroczysta |
| 13 | Partner A → blog (referral) → zakup | `partner_a\|some-blog.example` | nikt | inna strona |
| 14 | Porównywarka D bez UTM → zakup | `comparison-d.example` | **Partner D** | domena w `sources` |
| 15 | Partner A → Google Ads → Partner A → zakup | `partner_a\|google-ads\|partner_a` | **Partner A** | ostatni klik |
| 16 | Partner A → 3DS banku spoza listy → strona podziękowania | `partner_a` | **Partner A** | `noCapturePaths` |
| 17 | Partner B → aplikacja Gmail (Android) → zakup | `partner_b` | **Partner B** | poczta przezroczysta |
| 18 | Partner A → aplikacja Google (Android) → zakup | `partner_a\|organic.google` | **Partner A** | organic pomijany |
| 19 | Partner A → **odmowa zgody** → zakup | brak | rozliczenie bez ciasteczka | sekcja niżej |
| 20 | Partner A → zakup → odświeżenie podziękowania | `partner_a` | Partner A **raz** | `duplicate_transaction` |

## Retargeting: dwa modele

| | Retargeting A — CPS post-click | Retargeting B — CPC / CPM |
|---|---|---|
| W `partners` | **tak** | **nie** |
| Pixel zakupu | tylko gdy wygra | przy każdym zakupie (optymalizacja kampanii) |
| Ryzyko bez deduplikacji | płacisz za cudzą sprzedaż | brak |

Mechanizm widzi tylko kliknięcia. Sieć liczącą **post-view** zobowiąż w umowie do rozliczenia wyłącznie post-click z raportu sklepu.

## Rozliczenia bez zgody

Hierarchia zapisana w umowie z każdym partnerem; jedno zamówienie = jedna metoda:

1. **Zgoda** → ciasteczko last click. Kod rabatowy nie nadpisuje decyzji — kody wyciekają do serwisów kuponowych.
2. **Brak zgody, kod partnera** → kod rabatowy (podaje go klient, nic nie jest zapisywane na urządzeniu).
3. **Brak zgody, brak kodu** → pula modelowana albo brak prowizji.

```text
udział partnera = sprzedaż partnera (ze zgodą) / cała sprzedaż ze zgodą
prowizja z puli = MIN(udział × sprzedaż bez zgody i kodu × stawka modelowana, limit miesięczny)
```

Mianownik obejmuje zamówienia ze zgodą bez zwycięzcy — inaczej pula szłaby w 100% do partnerów.

**W umowie:** stawka modelowana niższa od podstawowej (50–70%), miesięczny limit, comiesięczny raport udziału zgód, okno i model (last click, post-click) w dniach, kody dedykowane z zakazem publikacji w serwisach kuponowych, zwroty pomniejszają podstawę, podstawa bez wysyłki, pixele sieci tylko przy zgodzie. Prostsza alternatywa: brak prowizji z puli w zamian za wyższą stawkę — przy wysokim odsetku zgód często uczciwsza.

## BigQuery

Źródła: eksport GA4 (`affiliate_attribution`) i tabela zamówień z backendu — prowizji nie liczy się z samego GA4, bo nie zna zwrotów.

| Plik | Co robi |
|---|---|
| [`01_tables.sql`](sql/01_tables.sql) | tabele: zamówienia, kody, umowy, wynik atrybucji (raz) |
| [`02_order_attribution.sql`](sql/02_order_attribution.sql) | przypisanie zamówień okresu: ciasteczko → kod → pula |
| [`03_settlement.sql`](sql/03_settlement.sql) | prowizje per partner i metoda |
| [`04_modelled_share.sql`](sql/04_modelled_share.sql) | podział puli bez zgody z limitem |
| [`05_qa_checks.sql`](sql/05_qa_checks.sql) | pokrycie, zamówienia bez pary, duplikaty, konflikty kodów |

Podmień `your-project`, `affiliate`, `analytics_123456789` i daty w `DECLARE`. Zapytania nie były uruchomione na danych — zacznij od dry-runu.

## Testy

```bash
npm test        # 18 ścieżek z tabeli + testy jednostkowe (Node ≥ 20, zero zależności)
npm run build   # po zmianie src/attribution.js — odbudowuje gtm/01-library.html
```

Testy czytają [`gtm/variable-config.js`](gtm/variable-config.js) — ten sam plik, który wklejasz do GTM — i pilnują, że `01-library.html` jest aktualny.

## Ograniczenia i dalsze kroki

- **Safari (ITP)** skraca życie ciasteczka z JavaScriptu do 7 dni, przy linkach z parametrami śledzącymi do 24 h — część zakupów z oknem 30 dni wypadnie.
- **Wejście sprzed zgody na innej stronie** niż strona zgody przepada — nie wolno go było zapisać.
- **Adblockery** blokują pixele, a czasem GTM — zamówienie trafia do metody 2 lub 3.
- **Aplikacje mobilne** i zakupy telefoniczne są poza zasięgiem.
- **Następna iteracja: server-side GTM** — ciasteczko z nagłówka HTTP, decyzja i wysyłka do sieci po stronie serwera.
