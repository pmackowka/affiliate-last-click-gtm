# Wdrożenie zmian z umowy — notatka robocza

Dla wdrażającego, nie dla prawnika. `gtm/variable-config.js` w repo to wzorzec pod testy — konfiguracja sklepu żyje w kontenerze.

## Gdzie co jest w GTM

Prawie każda zmiana z umowy to edycja **jednej zmiennej**: GTM → **Zmienne** → `AFF 00 - config` (typ: Niestandardowy kod JavaScript). Wszystkie pola niżej (`partners`, `windowDays`, `cookieMaxAgeDays`, `noCapturePaths`, `passThroughHosts`) to klucze w kodzie tej zmiennej, np.:

```js
cookieMaxAgeDays: 30,
partners: {
  partner_a: { sources: ['partner_a'], windowDays: 30 },   // ← okno i utm_source partnera
  ...
}
```

Pozostałe miejsca: **Wyzwalacze** `AFF 02 - consent update` i `AFF 04 - winner = <id>`, **Tagi** `AFF 04x - <Partner> - purchase`, **BigQuery** tabela `partner_contracts`.

## Sytuacja → zmiana

| Sytuacja | Gdzie | Co zmienić | Jak sprawdzić |
|---|---|---|---|
| Nowy partner (§2–§5) | 1. **Zmienna** `AFF 00 - config`<br>2. **Wyzwalacz** (nowy)<br>3. **Tag** (nowy)<br>4. **BigQuery** `partner_contracts` | 1. w `partners` dopisz `<id>: { sources: ['<utm_source>'], windowDays: <dni> }`; okno > `cookieMaxAgeDays` → podnieś `cookieMaxAgeDays`<br>2. `AFF 04 - winner = <id>`: zdarzenie `aff_decision` i `{{AFF 04 - aff.winner}}` równa się `<id>`<br>3. `AFF 04x - <Partner> - purchase`: kod pixela sieci, wyzwalacz z pkt 2, zgoda `ad_storage`, ID zamówienia `{{AFF 04 - aff.order_id}}`<br>4. wiersz ze stawkami i `valid_from` | [`testy-podglad-gtm.md`](../testy-podglad-gtm.md), A1 z `utm_source` nowego partnera |
| Zmiana okna (§3 ust. 1) | **Zmienna** `AFF 00 - config` | `partners` → `<id>` → `windowDays`; okno > `cookieMaxAgeDays` → podnieś `cookieMaxAgeDays` | sekcja E testów z nowym oknem |
| Zmiana `utm_source` lub hostów porównywarki (§2) | **Zmienna** `AFF 00 - config` | `partners` → `<id>` → `sources`: dopisz nową wartość, starą zostaw do końca okna | A1 z nową wartością |
| Zmiana stawek (§5 ust. 2) | **BigQuery** `partner_contracts` | nowy wiersz z `valid_from` = data z §7; staremu `valid_to` = dzień wcześniej | `sql/03` za miesiąc przełomu |
| Koniec współpracy | **BigQuery** `partner_contracts`<br>**Tag** `AFF 04x - <Partner> - purchase`<br>**Zmienna** `AFF 00 - config` | `valid_to` = data końca<br>wstrzymaj tag (Pause)<br>wpis w `partners` zostaw do końca okna, potem usuń | ostatni Raport do daty końca |
| Nowa ścieżka checkoutu lub bramka płatności (§3 ust. 3) | **Zmienna** `AFF 00 - config` | `noCapturePaths` (regex na ścieżkę) albo `passThroughHosts` (regex na host) | C2 testów z nową ścieżką |
| Zmiana CMP (§4) | **Wyzwalacz** `AFF 02 - consent update` | nazwa zdarzenia, które nowy CMP pushuje po decyzji; sprawdź, czy CMP wysyła `gtag('consent', 'update', …)` (od tego zależy tag `AFF 05`) | D2–D4 testów |

**Kolejność wdrożenia:** zmiany w BigQuery od razu z `valid_from` = data obowiązywania → zmiany w kontenerze w osobnym obszarze roboczym → testy w Podglądzie → publikacja w dniu obowiązywania, nazwa wersji `AFF — <partner> — <zmiana> — aneks <nr>` → po 24–48 h `sql/05`, zapytania 1 i 3.

**Stałe decyzje bez konfiguracji per partner:** drugi zakup w oknie bez nowego kliknięcia idzie do partnera (`clearPathOnPurchase: false` w `AFF 00 - config`, wspólne dla wszystkich); bez decyzji atrybucji prowizji nie ma; atrybucja tylko dla sklepu WWW (`orders.sales_channel = 'web'`).
