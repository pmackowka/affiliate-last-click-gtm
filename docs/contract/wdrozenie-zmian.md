# Wdrożenie zmian z umowy — notatka robocza

Dla wdrażającego, nie dla prawnika. Nazwy encji jak w README i w kontenerze (`AFF 00 - config`, `AFF 04x`…). `gtm/variable-config.js` w repo to wzorzec pod testy — konfiguracja sklepu żyje w `AFF 00 - config` w kontenerze.

| Sytuacja | Co zmienić | Jak sprawdzić |
|---|---|---|
| Nowy partner (§2–§5) | 1. `AFF 00 - config` → `partners`: `sources`, `windowDays` (okno > `cookieMaxAgeDays` → podnieś `cookieMaxAgeDays`); 2. wyzwalacz `AFF 04 - winner = <id>`; 3. tag `AFF 04x` (zgoda `ad_storage`, `{{AFF 04 - aff.order_id}}`); 4. wiersz w `partner_contracts` | [`docs/testy-podglad-gtm.md`](../testy-podglad-gtm.md), scenariusz A1 z `utm_source` nowego partnera |
| Zmiana okna (§3 ust. 1) | `partners.<id>.windowDays` (+ `cookieMaxAgeDays`) | sekcja E testów z nowym oknem |
| Zmiana `utm_source` lub hostów (§2) | `partners.<id>.sources` — dopisz nową wartość, starą zostaw do końca okna | scenariusz A1 z nową wartością |
| Zmiana stawek (§5 ust. 2) | `partner_contracts`: nowy wiersz z `valid_from` = data z §7; staremu `valid_to` = dzień wcześniej | `sql/03` za miesiąc przełomu |
| Koniec współpracy | `valid_to` w `partner_contracts`; wstrzymaj `AFF 04x`; wpis w `partners` zostaw do końca okna | ostatni Raport do daty końca |
| Nowa ścieżka checkoutu lub bramka płatności (§3 ust. 3) | `noCapturePaths` (regex na ścieżkę) albo `passThroughHosts` (regex na host) | scenariusz C2 testów z nową ścieżką |
| Zmiana CMP (§4) | wyzwalacz `AFF 02 - consent update` → zdarzenie nowego CMP; sprawdź, czy CMP wysyła `gtag('consent', 'update', …)` (od tego zależy `AFF 05`) | scenariusze D2–D4 testów |

**Kolejność wdrożenia:** zmiany w BigQuery wpisz od razu z `valid_from` = data obowiązywania → zmiany w kontenerze w osobnym obszarze roboczym → testy w Podglądzie → publikacja w dniu obowiązywania, nazwa wersji `AFF — <partner> — <zmiana> — aneks <nr>` → po 24–48 h `sql/05`, zapytania 1 i 3.

**Stałe decyzje bez konfiguracji per partner:** drugi zakup w oknie bez nowego kliknięcia idzie do partnera (`clearPathOnPurchase: false`, wspólne dla wszystkich); bez decyzji atrybucji prowizji nie ma; atrybucja tylko dla sklepu WWW (`orders.sales_channel = 'web'`).
