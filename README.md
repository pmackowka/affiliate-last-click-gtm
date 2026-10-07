# affiliate-last-click-gtm

Deduplikacja konwersji partnerów rozliczanych od sprzedaży (CPS) w modelu **last click**, po stronie klienta w Google Tag Manager, **tylko przy zgodzie `ad_storage`**. Do tego zapytania BigQuery do rozliczenia miesięcznego, draft załącznika do umowy i scenariusze testów.

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

Token tylko `[a-z0-9._-]`, maks. 32 znaki. Najwyżej 10 wejść; powtórzone źródło odświeża czas; wejścia starsze niż czas życia ciasteczka wypadają. Ciasteczko jest zapisywane na nowo przy każdej odsłonie (limit Safari liczy się od ostatniego zapisu), a okno atrybucji — od czasu kliknięcia zapisanego w ścieżce.

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
- Wszystko, co czyta lub zapisuje ciasteczko, oraz pixele sieci wymagają `ad_storage`; tag 05 kasuje ciasteczka po odmowie lub wycofaniu zgody.
- Serwer nie zwalnia ze zgody, dopóki identyfikator jest zapisywany w przeglądarce.

## Architektura kontenera

Folder w GTM: „AFF — deduplikacja CPS (last click)”. `[N]` = tu wprowadzasz zmiany przy nowym partnerze.

```text
Zmienne
├── AFF 00 - config [N]            konfiguracja całego mechanizmu: partnerzy (utm_source, okno), domena, wyjątki
├── AFF 04 - aff.order_id          ID zamówienia z decyzji — dla pixeli sieci i GA4
├── AFF 04 - aff.winner            zwycięzca decyzji — warunek wyzwalaczy „winner = …”
├── AFF 04 - aff.reason            powód decyzji (np. partner_last_click) — do GA4
├── AFF 04 - aff.touch             wejście, które rozstrzygnęło — do GA4
└── AFF 04 - aff.path              ścieżka wejść klienta — do GA4

Wyzwalacze
├── AFF 01 - Initialization        start strony, przed innymi tagami
├── AFF 02 - DOM Ready             każda odsłona
├── AFF 02 - consent update        decyzja klienta w banerze zgód
├── AFF 03 - purchase              zakup w dataLayer
├── AFF 04 - winner = partner_a    decyzja wskazała Partnera A (po jednym na partnera)
├── AFF 04 - winner = <id> [N]     nowy partner: kopia wyzwalacza z jego identyfikatorem
└── AFF 06 - aff_decision          każda decyzja, także „nikt”

Tagi
├── AFF 01 - library               definiuje funkcje mechanizmu, niczego nie zapisuje (bez zgody)
├── AFF 02 - capture touchpoint    zapisuje wejście klienta do ciasteczka _aff_path (ad_storage)
├── AFF 03 - decide winner         przy zakupie wybiera zwycięzcę i wysyła aff_decision (ad_storage)
├── AFF 04a - Partner A - purchase pixel zakupu sieci, tylko gdy wygrała (ad_storage)
├── AFF 04x - <Partner> [N]        nowy partner: kod pixela od sieci + wyzwalacz „winner = <id>”
├── AFF 05 - consent revoke        kasuje ciasteczka po odmowie lub wycofaniu zgody (bez zgody)
└── AFF 06 - GA4 affiliate_attribution  każda decyzja do GA4 → BigQuery → rozliczenie

Poza GTM
└── BigQuery: partner_contracts [N] stawki partnera od daty obowiązywania
```

Przepływ: `01` ładuje funkcje → `02` zapisuje wejścia → `03` przy zakupie decyduje → `04x` odpala pixel tylko zwycięzcy, `06` wysyła decyzję do GA4.

## Konfiguracja w GTM

**Wymagania:** Consent Mode v2 przez CMP (`consent default` przed tagami, `consent update` po decyzji), włączony przegląd zgody w kontenerze, `purchase` w schemacie GA4 (`transaction_id`, `value`, `shipping`, `currency`), stały `utm_source` partnerów zapisany w umowie.

### Zmienne

| Nazwa | Typ | Ustawienia |
|---|---|---|
| `AFF 00 - config` | Niestandardowy JS | [`gtm/variable-config.js`](gtm/variable-config.js) — **podmień domenę, partnerów i `noCapturePaths`** |
| `AFF 04 - aff.order_id`, `.winner`, `.reason`, `.touch`, `.path` | Warstwa danych v2 | pola `aff` |
| `DLV - ecommerce.transaction_id`, `…currency` | Warstwa danych v2 | pola `ecommerce` — jeśli sklep ma już takie zmienne, użyj istniejących |
| `JS - order value net of shipping` | Niestandardowy JS | `value − shipping` — **tylko jeśli `value` zawiera wysyłkę**, inaczej odejmiesz ją dwa razy |
| `LT - partner_a event by customer type` | Tabela przeglądowa | nowy / powracający klient → ID zdarzenia w sieci |

### Reguły

| Nazwa | Typ | Warunek |
|---|---|---|
| `AFF 01 - Initialization` | Inicjowanie | wszystkie strony |
| `AFF 02 - DOM Ready` | DOM gotowy | wszystkie strony |
| `AFF 02 - consent update` | Zdarzenie niestandardowe | zdarzenie CMP po decyzji (np. `OneTrustGroupsUpdated`) — sprawdź w podglądzie |
| `AFF 03 - purchase` | Zdarzenie niestandardowe | `purchase` |
| `AFF 04 - winner = partner_a` (po jednej na partnera) | Zdarzenie niestandardowe | `aff_decision` i `{{AFF 04 - aff.winner}}` = `partner_a` |
| `AFF 06 - aff_decision` | Zdarzenie niestandardowe | `aff_decision` |

Reguły inicjowania i `purchase` mogą być istniejącymi regułami sklepu — liczy się typ i warunek, nie nazwa.

### Tagi

| # | Nazwa | Reguła | Zgoda | Kod |
|---|---|---|---|---|
| 01 | `AFF 01 - library` | `AFF 01 - Initialization` | bez dodatkowej | [`01-library.html`](gtm/01-library.html) (generowany) |
| 02 | `AFF 02 - capture touchpoint` | `AFF 02 - DOM Ready` **+** `AFF 02 - consent update` | `ad_storage` | [`02-capture-touchpoint.html`](gtm/02-capture-touchpoint.html) |
| 03 | `AFF 03 - decide winner` | `AFF 03 - purchase` | `ad_storage` | [`03-decide-winner.html`](gtm/03-decide-winner.html) |
| 04a… | `AFF 04a - Partner A - purchase` (04b, 04c… kolejni partnerzy i Retargeting A) | `AFF 04 - winner = partner_a` | `ad_storage` | szkielet: [`04-partner-purchase-example.html`](gtm/04-partner-purchase-example.html) |
| 05 | `AFF 05 - consent revoke` | `AFF 02 - DOM Ready` **+** `AFF 02 - consent update` | **bez dodatkowej** | [`05-consent-revoke.html`](gtm/05-consent-revoke.html) |
| 06 | `AFF 06 - GA4 affiliate_attribution` | `AFF 06 - aff_decision` | wbudowana GA4 | zdarzenie GA4 `affiliate_attribution`, parametry `aff_order_id`, `aff_winner`, `aff_reason`, `aff_touch`, `aff_path` ← zmienne `AFF 04 - aff.*` |
| — | `Retargeting B - purchase` | `AFF 03 - purchase` (bez deduplikacji) | `ad_storage` | od sieci |

Bez tagu 06 decyzje nie trafią do eksportu GA4, a zapytania z `sql/` nie mają danych.

**Nowy partner** = 4 miejsca oznaczone `[N]` w [architekturze](#architektura-kontenera), bez zmian w kodzie. Kroki, nazwy i ustawienia: [`docs/contract/wdrozenie-zmian.md`](docs/contract/wdrozenie-zmian.md).

Drugi wyzwalacz tagu 02 łapie wejście z linku partnera, gdy zgoda pada na tej samej stronie — GTM nie odpala wstecz tagu zablokowanego na DOM Ready. Tag 05 czyta stan z komend `gtag('consent', 'update', …)` w dataLayer; jeśli CMP ustawia zgodę szablonem GTM, sprawdź w podglądzie, że tag kasuje ciasteczka.

### Test w podglądzie

Scenariusze z gotowymi adresami i wynikiem oczekiwanym: [`docs/testy-podglad-gtm.md`](docs/testy-podglad-gtm.md). Po publikacji: [`sql/05_qa_checks.sql`](sql/05_qa_checks.sql), zapytanie 1.

## Retargeting: dwa modele

| | Retargeting A — CPS post-click | Retargeting B — CPC / CPM |
|---|---|---|
| W `partners` | **tak** | **nie** |
| Pixel zakupu | tylko gdy wygra | przy każdym zakupie (optymalizacja kampanii) |
| Ryzyko bez deduplikacji | płacisz za cudzą sprzedaż | brak |

Mechanizm widzi tylko kliknięcia — rozliczenie post-view wyklucza załącznik (§3 ust. 1).

## Rozliczenia i umowa

Prowizja tylko za zamówienia z decyzją tagu wskazującą partnera; bez zgody nie ma decyzji ani prowizji (rekompensuje to stawka podstawowa), kody rabatowe nie przypisują zamówień. Warunki dla partnera: [`docs/contract/zalacznik-techniczny.md`](docs/contract/zalacznik-techniczny.md); gdzie je wdrożyć: [`docs/contract/wdrozenie-zmian.md`](docs/contract/wdrozenie-zmian.md).

## BigQuery

Źródła: eksport GA4 (`affiliate_attribution`) i tabela zamówień z backendu — prowizji nie liczy się z samego GA4, bo nie zna zwrotów.

| Plik | Co robi |
|---|---|
| [`01_tables.sql`](sql/01_tables.sql) | tabele: zamówienia (z kanałem sprzedaży), umowy, wynik atrybucji (raz) |
| [`02_order_attribution.sql`](sql/02_order_attribution.sql) | przypisanie zamówień okresu z decyzji tagu, kanały spoza WWW poza zakresem |
| [`03_settlement.sql`](sql/03_settlement.sql) | prowizje per partner i metoda |
| [`05_qa_checks.sql`](sql/05_qa_checks.sql) | pokrycie decyzjami, zamówienia bez pary, rozkład powodów |

Podmień `your-project`, `affiliate`, `analytics_123456789` i daty w `DECLARE`. Zapytania nie były uruchomione na danych — zacznij od dry-runu.

## Testy

```bash
npm test        # 18 ścieżek klientów + testy jednostkowe (Node ≥ 20, zero zależności)
npm run build   # po zmianie src/attribution.js — odbudowuje gtm/01-library.html
```

Testy czytają [`gtm/variable-config.js`](gtm/variable-config.js) — ten sam plik, który wklejasz do GTM — i pilnują, że `01-library.html` jest aktualny.

Kto wygrywa w jakiej ścieżce: [`tests/journeys.js`](tests/journeys.js) (18 ścieżek, także powroty z bramek, banków i poczty, których nie odtworzysz ręcznie).

## Ograniczenia i dalsze kroki

**W skrócie:** mechanizm widzi jedną przeglądarkę na jednym urządzeniu i tylko klientów, którzy dali zgodę. Ścieżka żyje w ciasteczku, więc wszystko, co je zmienia albo omija — inne urządzenie, inna przeglądarka, tryb prywatny, wyczyszczone ciasteczka, wbudowana przeglądarka aplikacji — zrywa ją bez śladu. Taki zakup nie ma partnera albo ma błędnego: klik z telefonu i zakup z laptopa trafia do kanału, z którego klient wszedł na laptopie, a nie do partnera. Sklep nigdy nie zapłaci przez to podwójnie: najczęściej partner nie dostaje prowizji, rzadziej dostaje ją inny partner, jeśli to od niego klient wszedł na drugim urządzeniu.

- **Cross-device i cross-browser** — klik na telefonie, zakup na komputerze; klik w Chrome, zakup w Safari. Bez logowania i wspólnego identyfikatora klienta nie da się tego połączyć.
- **Przeglądarki wbudowane w aplikacje** (Instagram, Facebook, TikTok, klient poczty) mają osobne ciasteczka — klient, który kliknął w aplikacji i wrócił w zwykłej przeglądarce, jest nowy.
- **Tylko WWW** — aplikacje mobilne sklepu, telefon, marketplace i B2B są poza zasięgiem i poza rozliczeniem (`out_of_scope`).
- **Safari (ITP)** przycina ciasteczka zapisywane z JavaScriptu — także `_aff_path` we własnej domenie — do 7 dni od ostatniego zapisu, a po wejściu z linku z parametrami z domeny uznanej za śledzącą do 24 h. Tag 02 odświeża ciasteczko przy każdej odsłonie, więc ścieżka przetrwa, dopóki klient wraca co najmniej raz na 7 dni; klient, który wróci po 8 dniach przerwy, przepada. Pełne 30 dni daje dopiero ciasteczko z serwera (sGTM pod tym samym IP co strona).
- **Zgoda** — bez `ad_storage` nie ma ścieżki ani prowizji; wejście sprzed zgody na innej stronie niż strona zgody przepada.
- **Adblockery** blokują GTM albo GA4 — decyzja nie dociera do BigQuery i zamówienie jest bez prowizji, choć pixel sieci mógł się odpalić. Rozbieżność wychodzi przy porównaniu z raportem sieci.
- **Następna iteracja: server-side GTM** — ciasteczko z nagłówka HTTP (dłuższe życie w Safari), decyzja i wysyłka do sieci po stronie serwera. Cross-device to nie rozwiąże; rozwiązuje je dopiero identyfikator zalogowanego klienta.
