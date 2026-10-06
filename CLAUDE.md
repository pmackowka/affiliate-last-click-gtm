# CLAUDE.md

Kontekst projektu dla kolejnych sesji. Pełny opis mechanizmu, konfiguracji GTM i rozliczeń: `README.md`.

## Co to jest

Deduplikacja konwersji partnerów rozliczanych od sprzedaży (CPS) w modelu last click, po stronie klienta w GTM, tylko przy zgodzie `ad_storage`. Do tego model rozliczeń bez zgody (kod rabatowy → pula modelowana) i zapytania BigQuery do rozliczeń miesięcznych. Repozytorium prywatne na GitHubie (`affiliate-last-click-gtm`).

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
- `tests/journeys.js` — ścieżki klientów; **zmiana tu = zmiana tabeli w README** (sekcja „Ścieżki klientów”), i odwrotnie.
- `sql/` — BigQuery; placeholdery `your-project`, `affiliate`, `analytics_123456789`. **Zapytania nie były uruchomione na danych** — przy pierwszym użyciu zrób dry-run.
- Nazwy w przykładach: `partner_a…partner_d`, `retargeting_a` (CPS post-click, w deduplikacji), `retargeting_b` (CPC/CPM, poza deduplikacją), domena `example-shop.pl`.
- Kod i nazwy po angielsku, komentarze i dokumentacja po polsku.

## Twarde ograniczenia

- **Żadnych nazw klientów, byłych pracodawców, sieci z realnych wdrożeń, identyfikatorów kontenerów ani ofert** — w kodzie, README, testach i commitach. Przykłady zawsze fikcyjne (Partner A, Retargeting B).
- Zgoda: bez `ad_storage` nic nie jest zapisywane ani czytane. Nie dodawaj trybu „bez zgody” opartego na localStorage, sessionStorage czy ciasteczku sesyjnym — to też zapis na urządzeniu (art. 399 PKE).
- Push na GitHub tylko na wyraźne polecenie.

## Następna iteracja

Przeniesienie mechanizmu na server-side GTM: ciasteczko ustawiane nagłówkiem HTTP z serwera (dłuższe życie w Safari/ITP), decyzja i wysyłka do sieci po stronie serwera. Obecna wersja jest wyłącznie client-side — opis ograniczeń w README, sekcja „Ograniczenia i dalsze kroki”.
