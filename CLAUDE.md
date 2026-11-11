# CLAUDE.md

Kontekst projektu dla kolejnych sesji. Pełny opis mechanizmu, konfiguracji GTM i rozliczeń: `README.md`.

## Co to jest

Deduplikacja konwersji partnerów rozliczanych od sprzedaży (CPS) w modelu last click, po stronie klienta w GTM, tylko przy zgodzie `ad_storage`. Do tego zasady rozliczeń (bez zgody = bez prowizji, tylko sklep WWW, kody rabatowe nie przypisują zamówień) i zapytania BigQuery do rozliczeń miesięcznych. Repozytorium publiczne na GitHubie (`pmackowka/affiliate-last-click-gtm`, MIT).

## Komendy

```bash
npm test        # 18 ścieżek z README + testy jednostkowe, Node ≥ 20, zero zależności
npm run build   # po każdej zmianie src/attribution.js — odbudowuje gtm/01-library.html
```

Test pilnuje, że `gtm/01-library.html` jest zgodny z `src/attribution.js` — bez `npm run build` test pada.

## Struktura i zasady

- `src/attribution.js` — jedyne źródło logiki. **ES5** (bez `let`/`const`/strzałek/template stringów), bo ten sam kod trafia do tagu Custom HTML w GTM. Plik nie dotyka `document.cookie` przy ładowaniu — tylko definiuje funkcje.
- `gtm/variable-config.js` — jedyne miejsce konfiguracji (domena, partnerzy, okna atrybucji, źródła przezroczyste). Testy czytają ten plik, nie kopię.
- `gtm/0X-*.html` — tagi do wklejenia. Każdy tag czytający lub zapisujący ciasteczko wymaga zgody `ad_storage`; wyjątek: 05 kasuje ciasteczka po wycofaniu zgody i działa bez niej.
- `docs/contract/` — `zalacznik-techniczny.md` (draft sekcji technicznej umowy z partnerem, dla prawnika) i `wdrozenie-zmian.md` (zapis umowy → miejsce w GTM/BigQuery). **Zmiana logiki lub konfiguracji = sprawdź, czy oba pliki dalej się zgadzają.**
- Nazwy encji GTM: `AFF NN - …` (np. `AFF 00 - config`, `AFF 03 - decide winner`, `AFF 06 - GA4 affiliate_attribution`) — te same w README, `gtm/*.html` i w kontenerze GTM. Zmiana nazwy zmiennej = zmiana odwołań `{{…}}` w kodzie tagów.
- `tests/journeys.js` — ścieżki klientów (jedyne źródło, README do nich linkuje). Zmiana logiki = sprawdź też wyniki oczekiwane w `docs/testy-podglad-gtm.md`.
- `sql/` — BigQuery; placeholdery `your-project`, `affiliate`, `analytics_123456789`. **Zapytania nie były uruchomione na danych** — przy pierwszym użyciu zrób dry-run.
- Nazwy w przykładach: `partner_a…partner_d`, `retargeting_a` (CPS post-click, w deduplikacji), `retargeting_b` (CPC/CPM, poza deduplikacją), domena `example-shop.pl`.
- Kod i nazwy po angielsku, komentarze i dokumentacja po polsku.

## Twarde ograniczenia

- **Żadnych nazw klientów, byłych pracodawców, sieci z realnych wdrożeń, identyfikatorów kontenerów ani ofert** — w kodzie, README, testach i commitach. Przykłady zawsze fikcyjne (Partner A, Retargeting B).
- Zgoda: bez `ad_storage` nic nie jest zapisywane ani czytane. Nie dodawaj trybu „bez zgody” opartego na localStorage, sessionStorage czy ciasteczku sesyjnym — to też zapis na urządzeniu (art. 399 PKE).
- Push na GitHub tylko na wyraźne polecenie.

## Następna iteracja

Przeniesienie mechanizmu na server-side GTM: ciasteczko ustawiane nagłówkiem HTTP z serwera (dłuższe życie w Safari/ITP), decyzja i wysyłka do sieci po stronie serwera. Obecna wersja jest wyłącznie client-side — opis ograniczeń w README, sekcja „Ograniczenia i dalsze kroki”.
