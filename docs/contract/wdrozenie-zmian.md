# Wdrożenie zmian z umowy — notatka robocza

Dla wdrażającego, nie dla prawnika. Każdy zapis z [`zalacznik-techniczny.md`](zalacznik-techniczny.md) ma swoje miejsce w GTM albo w BigQuery — tabela mówi gdzie.

**Nazewnictwo:** nazwy encji jak w kontenerze GTM: `AFF 00 - config`, `AFF 01 - library`, `AFF 02 - capture touchpoint`, `AFF 03 - decide winner`, `AFF 04a/04b/04c` (pixele Partnera A, Partnera B, Retargetingu A), `AFF 05 - consent revoke`; wyzwalacze `AFF 02 - DOM Ready`, `AFF 02 - consent update`, `AFF 04 - winner = …`. README i pliki `gtm/*.html` używają nazw ogólnych (`AFF - config`, `AFF - 02 capture touchpoint`) — odwołanie `{{AFF - config}}` w kodzie tagów musi odpowiadać nazwie zmiennej w kontenerze.

**Repo vs kontener:** `gtm/variable-config.js` w repo to wzorzec, na którym stoją testy. Konfiguracja konkretnego sklepu żyje w `AFF 00 - config` w kontenerze. Zmiana wzorca = `npm test` i aktualizacja ścieżek w `tests/journeys.js` oraz README.

## Zapis w umowie → zmiana

| Zapis w umowie | Gdzie zmienić | Co zmienić | Jak sprawdzić |
|---|---|---|---|
| §2 ust. 1 — `utm_source` partnera | `AFF 00 - config` | `partners.<id>.sources` — dopisz nową wartość, starą zostaw do końca najdłuższego okna | Podgląd: wejście z `?utm_source=<nowa>` → `_aff_path` zawiera token; zakup → `aff_decision.winner = <id>` |
| §2 ust. 2 — hosty porównywarki | `AFF 00 - config` | `partners.<id>.sources` — każdy host osobno, bez `www.` | Podgląd: wejście z referrerem z hosta, bez UTM → token hosta w `_aff_path` |
| §3 ust. 2 — okno atrybucji | `AFF 00 - config` | `partners.<id>.windowDays`; `cookieMaxAgeDays` ≥ najdłuższe okno ze wszystkich umów | Ciasteczko z czasem sprzed `windowDays` + 1 dzień (DevTools) → `reason: partner_window_expired` |
| §3 ust. 4 pkt 3 — lista wyszukiwarek | `AFF 00 - config` | `navigational` | wejście z referrerem wyszukiwarki → token `organic.*` |
| §3 ust. 4 pkt 4 — nowa bramka, bank, poczta | `AFF 00 - config` | `passThroughHosts` (regex na host) | wejście z referrerem bramki → `_aff_path` bez zmian |
| §3 ust. 4 pkt 5 — nowe ścieżki checkoutu | `AFF 00 - config` | `noCapturePaths` (regex na `pathname`) | wejście na ścieżkę z `?utm_source=partner_b` → `_aff_path` bez zmian |
| §3 ust. 5 — drugi zakup (WARIANT A / B) | `AFF 00 - config` | `clearPathOnPurchase`: A = `false`, B = `true`. Ustawienie globalne — obowiązuje wszystkich partnerów | B: po zakupie przypisanym partnerowi `_aff_path` znika; drugi zakup bez kliknięcia → `no_touchpoints` |
| §4 ust. 1 — pixel tylko przy zgodzie | tagi `AFF 04x` | Ustawienia zgody → wymagaj `ad_storage`; wyzwalacz `AFF 04 - winner = <id>` | Podgląd z odmową zgody → `AFF 04x` zablokowany |
| §4 ust. 2 — usunięcie po wycofaniu | `AFF 05 - consent revoke` | bez dodatkowej zgody; wyzwalacze `AFF 02 - DOM Ready` + `AFF 02 - consent update` | wycofaj zgodę w CMP → `_aff_path` i `_aff_tx` znikają |
| §4 ust. 3 pkt 2 — WARIANT A (pula) / B (brak prowizji) | `partner_contracts` | A: `modelled_share_enabled = TRUE`, `modelled_rate`, `modelled_cap`; B: `FALSE` i wyższe `rate_new` / `rate_returning` | `sql/04` zwraca partnera tylko przy A |
| §1 ust. 1 — kanały sprzedaży poza Załącznikiem | `orders.sales_channel` | każde zamówienie z kanałem; do atrybucji i puli wchodzi tylko `web`, reszta to `out_of_scope` w `sql/02`. Nowy kanał sprzedaży = nowa wartość w backendzie | `sql/05`, zapytanie 1 — `pct_out_of_scope` zgodny z udziałem kanałów w sprzedaży |
| §6 ust. 1 — netto / brutto | `orders` i zmienna `JS - order value net of shipping` | tabela: `revenue`, `shipping` i `returned_amount` w tej samej konwencji co umowa (dziś: brutto); pixel: ta sama konwencja | przykładowe zamówienie: `commission_base` = wartość z umowy |
| §6 ust. 1 — waluty | `sql/02`, `sql/03` | przeliczenie kursem z umowy — **dziś brak**, kwoty w różnych walutach są sumowane razem | — |
| §6 ust. 2 — stawki | `partner_contracts` | **nowy wiersz** z `valid_from` = data z §9; poprzedniemu wierszowi `valid_to` = dzień wcześniej. Nie nadpisuj starego wiersza | `sql/03` za miesiąc przełomu: zamówienia przed i po dacie z różnymi stawkami |
| §6 ust. 3 — okres i termin Raportu | harmonogram uruchomień | `sql/02` → `05` → `03` → `04` po upływie okresu zwrotów; `DECLARE period_start / period_end` | `sql/05` bez nieoczekiwanych wierszy przed wysłaniem Raportu |
| §8 ust. 2 — pola kodu śledzącego | tag `AFF 04x` | ID zamówienia (`{{DLV - aff.order_id}}`), wartość, waluta, typ klienta (tabela przeglądowa) | Podgląd: zapytanie sieci w zakładce Network zawiera ID zamówienia |
| §8 ust. 4 — wstrzymanie kodu | tag `AFF 04x` | wstrzymaj tag (Pause), nie usuwaj; decyzje dalej trafiają do GA4 przez `AFF 03` | `aff_decision` w podglądzie, brak `AFF 04x` |
| Nowy partner | kontener + BigQuery | 1. wpis w `partners` (`sources`, `windowDays`); 2. wyzwalacz `AFF 04 - winner = <id>`; 3. tag pixela `AFF 04x` (zgoda `ad_storage`, ID zamówienia); 4. wiersz `partner_contracts` | pełny scenariusz z README, sekcja „Test w podglądzie” |
| Koniec współpracy | kontener + BigQuery | `valid_to` w `partner_contracts`; wstrzymaj `AFF 04x`; wpis w `partners` zostaw do końca okna atrybucji (inaczej jego kliknięcia zaczną przerywać ścieżkę innym jako „inny kanał” — to też decyzja do podjęcia) | ostatni Raport obejmuje zamówienia do daty końca |
| Zmiana CMP | wyzwalacz `AFF 02 - consent update` | nazwa zdarzenia, które nowy CMP pushuje po decyzji; sprawdź, czy CMP wysyła `gtag('consent', 'update', …)` do dataLayer — od tego zależy `AFF 05` | Podgląd: akceptacja na stronie wejścia → `AFF 02` odpala; wycofanie → `AFF 05` kasuje ciasteczka |

## Kolejność wdrożenia zmiany

1. Ustal datę obowiązywania z §9 ust. 2 (pierwszy dzień miesiąca po upływie terminu).
2. Zmiany w BigQuery (`partner_contracts`) wpisz od razu z `valid_from` = data obowiązywania — wiersze z przyszłą datą niczego nie psują.
3. Zmiany w kontenerze przygotuj w osobnym workspace GTM.
4. Sprawdź w Podglądzie scenariusz z kolumny „Jak sprawdzić” i pełny test z README.
5. Opublikuj kontener w dniu obowiązywania (najpóźniej w terminie z §9 ust. 2). Nazwa wersji: `AFF — <partner> — <zmiana> — aneks <nr/data>`, opis z odwołaniem do paragrafu.
6. Po 24–48 h: `sql/05`, zapytanie 1 (pokrycie decyzjami) i 3 (rozkład powodów).
