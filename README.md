# affiliate-last-click-gtm

Deduplikacja konwersji partnerów rozliczanych od sprzedaży (CPS) w modelu **last click**, po stronie klienta w Google Tag Manager, **tylko przy zgodzie marketingowej** (`ad_storage`). Do tego model rozliczeń dla zamówień bez zgody i zapytania BigQuery do comiesięcznego rozliczenia.

**Problem biznesowy:** klient przed zakupem przechodzi przez kilka sieci afiliacyjnych, porównywarek i reklam retargetingowych. Jeśli każda sieć dostanie pixel zakupu, każda policzy sobie prowizję od tego samego zamówienia, a sklep zapłaci kilka razy za jedną sprzedaż. Mechanizm zapisuje ścieżkę wejść klienta i przy zakupie wysyła pixel **tylko do sieci, która przyprowadziła klienta jako ostatnia**.

## Spis treści

1. [Jak to działa](#jak-to-działa)
2. [Zgoda i przepisy](#zgoda-i-przepisy)
3. [Konfiguracja w GTM krok po kroku](#konfiguracja-w-gtm-krok-po-kroku)
4. [Ścieżki klientów — kto wygrywa](#ścieżki-klientów--kto-wygrywa)
5. [Retargeting: dwa modele rozliczenia](#retargeting-dwa-modele-rozliczenia)
6. [Rozliczenia bez zgody marketingowej](#rozliczenia-bez-zgody-marketingowej)
7. [Raporty rozliczeń w BigQuery](#raporty-rozliczeń-w-bigquery)
8. [Testy](#testy)
9. [Ograniczenia i dalsze kroki](#ograniczenia-i-dalsze-kroki)

## Jak to działa

```text
Wejście na stronę ─► klasyfikacja źródła ─► dopisanie do ciasteczka _aff_path      (przy zgodzie)
                                                     │
Zakup (purchase) ──────────────────────────► decyzja: kto ostatni? ─► aff_decision w dataLayer
                                                                          │
                                                ┌─────────────────────────┼─────────────────────┐
                                                ▼                         ▼                     ▼
                                        pixel zwycięzcy          GA4: affiliate_attribution   nikt (inny kanał)
```

### Klasyfikacja wejścia

Każde wejście na stronę z zewnątrz dostaje **token źródła**. Pierwszeństwo:

| # | Sygnał | Token | Przykład |
|---|---|---|---|
| 1 | `utm_source` w URL | wartość parametru | `?utm_source=partner_a` → `partner_a` |
| 2 | identyfikator kliknięcia bez UTM | nazwa z konfiguracji | `?gclid=…` → `google-ads` |
| 3 | wyszukiwarka organiczna | token nawigacyjny | `google.pl` → `organic.google` |
| 4 | inny referrer zewnętrzny | domena bez `www.` | `some-blog.example` |
| — | brak referrera, własna domena | **nic nie zapisujemy** | wpisany adres, nawigacja wewnętrzna |
| — | źródło przezroczyste | **nic nie zapisujemy** | powrót z PayU, BLIK, banku, Gmaila |

**Źródła przezroczyste** to strony, przez które klient przechodzi w trakcie zakupu albo po nim, a które nie są kanałem marketingowym: bramki płatności, logowanie do banku, poczta webowa. Gdyby trafiły do ścieżki, każdy zakup opłacony przelewem „należałby” do banku.

### Format ciasteczka

```text
_aff_path = partner_a~tq4k2o|organic.google~tq5b8c|partner_b~tq6x1d
            └─token─┘ └czas┘
```

- token: tylko `[a-z0-9._-]`, maks. 32 znaki — wartości z `;`, `,` czy spacją nie rozbiją ciasteczka,
- czas wejścia w sekundach, zapis base36 — potrzebny do okna atrybucji każdego partnera osobno,
- najwyżej **10 ostatnich wejść**; to samo źródło dwa razy z rzędu odświeża czas zamiast dopisywać element; wejścia starsze niż czas życia ciasteczka wypadają.

W praktyce ciasteczko ma 20–400 znaków i nie rośnie bez końca.

### Decyzja przy zakupie

Idziemy od końca ścieżki i **pomijamy wejścia nawigacyjne** (wyszukiwarki organiczne). Pierwsze wejście, które zostanie:

| Pierwsze wejście od końca (bez organicznych) | Wynik | Powód (`aff.reason`) |
|---|---|---|
| partner z listy, w swoim oknie atrybucji | **partner wygrywa** | `partner_last_click` |
| partner z listy, po upływie okna | nikt | `partner_window_expired` |
| źródło spoza listy partnerów (Google Ads, newsletter, blog) | nikt | `non_partner_last_click` |
| same wejścia organiczne | nikt | `only_navigational` |
| brak ciasteczka | nikt | `no_touchpoints` |
| to samo zamówienie drugi raz (odświeżenie strony podziękowania) | nikt | `duplicate_transaction` |

„Nikt” oznacza, że sprzedaż należy do innego kanału albo do wejścia bezpośredniego — żaden partner nie dostaje pixela zakupu.

Dlaczego organiczne wyszukiwanie jest pomijane: klient klika w link partnera, ogląda, wychodzi, a dwa dni później wpisuje nazwę sklepu w Google i kupuje. Google nie sprowadził tego klienta, tylko pomógł mu wrócić.

## Zgoda i przepisy

> To opis przyjętych założeń, nie opinia prawna. Brzmienie polityki prywatności i umów z partnerami zatwierdza prawnik sklepu.

- Zapis i odczyt ciasteczka `_aff_path` to przechowywanie informacji na urządzeniu użytkownika — w Polsce art. 399 Prawa komunikacji elektronicznej (wdrożenie art. 5 ust. 3 dyrektywy ePrivacy). Wyjątek „niezbędne do świadczenia usługi” obejmuje to, czego żąda użytkownik (zakup), a nie rozliczenie prowizji ze sklepem. EDPB w Wytycznych 2/2023 wymienia afiliację jako przykład objęty tym przepisem.
- Dlatego **wszystkie tagi, które czytają albo zapisują ciasteczko, wymagają zgody `ad_storage`**. Tag biblioteki (01) tylko definiuje funkcje i może działać bez zgody.
- To samo dotyczy pixeli partnerów i retargetingu **na każdej stronie** (wejście, lista, produkt, koszyk), nie tylko przy zakupie.
- Przeniesienie logiki na serwer nie zwalnia ze zgody, dopóki identyfikator jest zapisywany albo odczytywany w przeglądarce.

## Konfiguracja w GTM krok po kroku

### 0. Wymagania

1. **Consent Mode v2** wdrożony przez CMP (Cookiebot, OneTrust, własny baner). Stan `ad_storage` musi być ustawiany *przed* załadowaniem tagów (`consent default`) i aktualizowany po decyzji (`consent update`).
2. W kontenerze: *Administracja → Ustawienia kontenera → Włącz przegląd zgody*.
3. Zakup w dataLayer w schemacie GA4: zdarzenie `purchase` z `ecommerce.transaction_id`, `ecommerce.value`, `ecommerce.shipping`, `ecommerce.currency`.
4. Partnerzy oznaczają linki `utm_source` zgodnym z konfiguracją (`partner_a`, `partner_b`…). To warunek z umowy — bez stałego `utm_source` partner jest rozpoznawalny tylko po referrerze.

### 1. Zmienne

| Nazwa | Typ | Ustawienia |
|---|---|---|
| `AFF - config` | Niestandardowy kod JavaScript | treść z [`gtm/variable-config.js`](gtm/variable-config.js) — **podmień domenę i listę partnerów** |
| `DLV - ecommerce.transaction_id` | Zmienna warstwy danych (v2) | `ecommerce.transaction_id` |
| `DLV - ecommerce.currency` | Zmienna warstwy danych (v2) | `ecommerce.currency` |
| `DLV - aff.order_id` | Zmienna warstwy danych (v2) | `aff.order_id` |
| `DLV - aff.winner` | Zmienna warstwy danych (v2) | `aff.winner` |
| `DLV - aff.reason` | Zmienna warstwy danych (v2) | `aff.reason` |
| `DLV - aff.touch` | Zmienna warstwy danych (v2) | `aff.touch` |
| `DLV - aff.path` | Zmienna warstwy danych (v2) | `aff.path` |
| `JS - order value net of shipping` | Niestandardowy kod JavaScript | `function(){ return Math.round(({{DLV - ecommerce.value}} - ({{DLV - ecommerce.shipping}} \|\| 0)) * 100) / 100; }` — **tylko jeśli `value` w Twoim dataLayer zawiera wysyłkę**; jeśli nie zawiera (częsta praktyka w GA4), użyj samego `ecommerce.value`, inaczej odejmiesz wysyłkę dwa razy |
| `LT - partner_a event by customer type` | Tabela przeglądowa | wejście: zmienna „nowy klient” z dataLayer → ID zdarzenia w sieci dla nowego / powracającego (jeśli umowa ma różne stawki) |

### 2. Reguły (wyzwalacze)

| Nazwa | Typ | Warunek |
|---|---|---|
| `AFF - Initialization` | Inicjowanie | Wszystkie strony |
| `AFF - DOM Ready` | DOM gotowy | Wszystkie strony |
| `AFF - consent update` | Zdarzenie niestandardowe | nazwa zdarzenia, które Twój CMP pushuje po decyzji (np. OneTrust: `OneTrustGroupsUpdated`) — **sprawdź w podglądzie GTM** |
| `AFF - purchase` | Zdarzenie niestandardowe | `purchase` |
| `AFF - decision (all)` | Zdarzenie niestandardowe | `aff_decision` |
| `AFF - winner: partner_a` | Zdarzenie niestandardowe | `aff_decision` **i** `{{DLV - aff.winner}}` równa się `partner_a` |
| `AFF - winner: …` | jak wyżej | po jednej regule na każdego partnera i Retargeting A |

### 3. Tagi

| # | Nazwa | Typ | Reguła | Zgoda | Kod |
|---|---|---|---|---|---|
| 01 | `AFF - 01 library` | Niestandardowy HTML | `AFF - Initialization` | bez dodatkowej | [`gtm/01-library.html`](gtm/01-library.html) (generowany) |
| 02 | `AFF - 02 capture touchpoint` | Niestandardowy HTML | `AFF - DOM Ready` **+** `AFF - consent update` | `ad_storage` | [`gtm/02-capture-touchpoint.html`](gtm/02-capture-touchpoint.html) |
| 03 | `AFF - 03 decide winner` | Niestandardowy HTML | `AFF - purchase` | `ad_storage` | [`gtm/03-decide-winner.html`](gtm/03-decide-winner.html) |
| — | `Partner A - purchase` (B, C, D, Retargeting A) | pixel sieci | `AFF - winner: partner_a` | `ad_storage` | szkielet: [`gtm/04-partner-purchase-example.html`](gtm/04-partner-purchase-example.html) |
| — | `Retargeting B - purchase` | pixel sieci | `AFF - purchase` (bez deduplikacji) | `ad_storage` | od sieci |
| — | `Partner X / Retargeting X - pageview, view_item, add_to_cart` | pixel sieci | zdarzenia lejka | `ad_storage` | od sieci |
| — | `GA4 - affiliate_attribution` | Zdarzenie GA4 | `AFF - decision (all)` | wbudowana GA4 | parametry niżej |

**Ustawienie zgody w tagu:** *Ustawienia zaawansowane → Ustawienia zgody → Wymagaj dodatkowej zgody na uruchomienie tagu → `ad_storage`*.

**Tag GA4 `affiliate_attribution`** — nazwa zdarzenia `affiliate_attribution`, parametry:

| Parametr | Wartość |
|---|---|
| `aff_order_id` | `{{DLV - aff.order_id}}` |
| `aff_winner` | `{{DLV - aff.winner}}` |
| `aff_reason` | `{{DLV - aff.reason}}` |
| `aff_touch` | `{{DLV - aff.touch}}` |
| `aff_path` | `{{DLV - aff.path}}` |

Wymiary niestandardowe w GA4 nie są potrzebne do rozliczeń — BigQuery czyta parametry z eksportu. Zarejestruj je tylko, jeśli chcesz raporty w interfejsie GA4.

### 4. Test w podglądzie GTM

Dla każdego wiersza wykonaj kroki w trybie incognito (czyste ciasteczka):

1. Wejdź z `?utm_source=partner_a`, **odrzuć zgodę** → tag 02 zablokowany, brak `_aff_path` w *DevTools → Application → Cookies*.
2. Wejdź z `?utm_source=partner_a`, **zaakceptuj zgodę na tej samej stronie** → tag 02 odpala się na `AFF - consent update`, ciasteczko `partner_a~…`.
3. Przejdź na drugą stronę sklepu → ciasteczko bez zmian (nawigacja wewnętrzna).
4. Wejdź z `?utm_source=partner_b` → `partner_a~…|partner_b~…`.
5. Złóż zamówienie testowe → w dataLayer `aff_decision` z `winner: partner_b`; odpala się tylko `Partner B - purchase`.
6. Odśwież stronę podziękowania → `aff_decision` z `reason: duplicate_transaction`, żaden pixel partnera.
7. W GA4 DebugView: zdarzenie `affiliate_attribution` z parametrami.

### 5. Publikacja

Opisz wersję kontenera (np. „AFF last click v1 — deduplikacja partnerów CPS”), opublikuj i po 24–48 h sprawdź raport jakości [`sql/05_qa_checks.sql`](sql/05_qa_checks.sql), zapytanie 1 (pokrycie decyzjami).

## Ścieżki klientów — kto wygrywa

Konfiguracja przykładowa: Partner A i B (okno 30 dni), Partner C (14 dni), Partner D — porównywarka (7 dni), Retargeting A (CPS post-click, 7 dni). Retargeting B jest rozliczany CPC/CPM i nie bierze udziału w deduplikacji.

Kolumna „ciasteczko” pokazuje tokeny bez znaczników czasu. Wiersze 1–15 są testami w [`tests/journeys.js`](tests/journeys.js); 16 i 17 dzieją się w tagach GTM i sprawdzasz je w podglądzie (krok 4 konfiguracji).

| # | Ścieżka klienta | Ciasteczko `_aff_path` przy zakupie | Kto dostaje pixel zakupu | Dlaczego |
|---|---|---|---|---|
| 1 | Partner A → **zakup** | `partner_a` | **Partner A** | jedyne wejście |
| 2 | Partner A → Partner B → **zakup** | `partner_a\|partner_b` | **Partner B** | ostatni klik |
| 3 | Partner A → Google organic (nazwa sklepu) → **zakup** | `partner_a\|organic.google` | **Partner A** | organic pomijany |
| 4 | Partner A → Google → Google → **zakup** | `partner_a\|organic.google` | **Partner A** | powtórzenie nie dopisuje elementu |
| 5 | Partner B → płatność PayU (powrót) → **zakup** | `partner_b` | **Partner B** | bramka płatności przezroczysta |
| 6 | Partner A → reklama Google Ads (`gclid`) → **zakup** | `partner_a\|google-ads` | nikt | ostatni klik to płatna wyszukiwarka |
| 7 | Partner C → newsletter → **zakup** | `partner_c\|newsletter` | nikt | ostatni klik to własny kanał |
| 8 | Retargeting A (klik w reklamę) → **zakup** | `retargeting_a` | **Retargeting A** | retargeting CPS post-click |
| 9 | Partner A → Retargeting B (klik) → **zakup** | `partner_a\|retargeting_b` | nikt z partnerów CPS; Retargeting B dostaje swój pixel jak zawsze | Retargeting B poza deduplikacją |
| 10 | Partner D → 10 dni → wpisany adres → **zakup** | `partner_d` | nikt | okno Partnera D (7 dni) minęło |
| 11 | Partner A → wpisany adres → **zakup** | `partner_a` | **Partner A** | wejście bezpośrednie nie nadpisuje |
| 12 | Partner B → link w Gmailu → **zakup** | `partner_b` | **Partner B** | poczta przezroczysta |
| 13 | Partner A → artykuł na blogu (referral) → **zakup** | `partner_a\|some-blog.example` | nikt | ostatni klik z innej strony |
| 14 | Porównywarka D bez UTM (referrer) → **zakup** | `comparison-d.example` | **Partner D** | domena przypisana partnerowi w `sources` |
| 15 | Partner A → Google Ads → Partner A → **zakup** | `partner_a\|google-ads\|partner_a` | **Partner A** | ostatni klik znów u Partnera A |
| 16 | Partner A → **odmowa zgody** → **zakup** | brak ciasteczka | rozliczenie poza ciasteczkiem | [Rozliczenia bez zgody](#rozliczenia-bez-zgody-marketingowej) |
| 17 | Partner A → **zakup** → odświeżenie strony podziękowania | `partner_a` | Partner A **raz** | `duplicate_transaction` przy drugim `purchase` |

## Retargeting: dwa modele rozliczenia

Retargeting nie jest jednym przypadkiem — zależy od tego, za co płacisz.

| | Retargeting A — CPS post-click | Retargeting B — CPC / CPM |
|---|---|---|
| Za co płacisz | prowizja od sprzedaży po kliknięciu w reklamę | kliknięcia albo wyświetlenia |
| W `partners` w konfiguracji | **tak** | **nie** |
| Pixel zakupu | tylko gdy wygra (`AFF - winner: retargeting_a`) | przy każdym zakupie, potrzebny sieci do optymalizacji kampanii |
| Pixele lejka (produkt, koszyk) | przy każdej odsłonie, ze zgodą | przy każdej odsłonie, ze zgodą |
| Ryzyko bez deduplikacji | płacisz za sprzedaż, którą przyprowadził ktoś inny | brak — prowizji nie ma |

Uwaga na **atrybucję post-view**: część sieci retargetingowych liczy sprzedaż także po samym *wyświetleniu* reklamy. Ten mechanizm rozpoznaje tylko kliknięcia. Jeśli umowa przewiduje post-view, sieć przypisze sobie zamówienia, w których w ciasteczku nie ma jej śladu — zapisz w umowie, że rozliczasz wyłącznie post-click z raportu sklepu.

## Rozliczenia bez zgody marketingowej

Bez zgody nie ma ciasteczka, więc nie ma ścieżki. Zamówienie trzeba rozliczyć inaczej albo wcale. Rekomendacja: **hierarchia trzech metod, zapisana w umowie z każdym partnerem**.

| Kolejność | Kiedy | Metoda | Uwagi |
|---|---|---|---|
| 1 | klient wyraził zgodę | **ciasteczko last click** (ten mechanizm) | kod rabatowy nie nadpisuje decyzji — kody wyciekają do serwisów kuponowych |
| 2 | brak zgody, kod rabatowy partnera | **kod rabatowy** | jedyna metoda per zamówienie bez zapisu na urządzeniu — kod podaje klient |
| 3 | brak zgody, brak kodu | **pula modelowana** albo brak prowizji | udział partnera w puli = jego udział w sprzedaży ze zgodą |

### Pula modelowana — jak liczyć

```text
udział partnera   = sprzedaż przypisana partnerowi (ze zgodą) / cała sprzedaż ze zgodą
podstawa z puli   = udział partnera × sprzedaż bez zgody i bez kodu
prowizja z puli   = MIN(podstawa z puli × stawka modelowana, miesięczny limit)
```

Mianownik obejmuje także zamówienia ze zgodą, w których **nie wygrał żaden partner** — inaczej pula zostałaby rozdzielona w 100% między partnerów, choć większość sprzedaży należy do innych kanałów.

### Co zapisać w umowie

1. **Hierarchia metod** jak wyżej i zasada: jedno zamówienie rozliczane jedną metodą.
2. **Stawka modelowana niższa niż podstawowa** (np. 50–70% stawki) — model ma błąd, którego żadna strona nie może zweryfikować per zamówienie.
3. **Miesięczny limit** prowizji z puli.
4. **Raport udziału zgód** co miesiąc dla partnera — bez niego partner nie ma podstaw ufać puli.
5. **Okno atrybucji i model** (last click, tylko post-click) — wprost, z liczbą dni.
6. **Kody rabatowe:** dedykowane per partner, zakaz publikacji w serwisach kuponowych, prawo do odrzucenia zamówień z wyciekłych kodów.
7. **Zwroty i anulacje** pomniejszają podstawę; termin zamknięcia okresu (np. 30 dni po końcu miesiąca, po upływie terminu zwrotu).
8. **Podstawa prowizji bez kosztu wysyłki.**
9. **Pixele sieci tylko przy zgodzie** — sieć nie może wymagać ładowania swoich skryptów bez zgody klienta.

Alternatywa prostsza w obsłudze: **brak prowizji za zamówienia bez zgody i bez kodu** w zamian za wyższą stawkę podstawową. Dla sklepu z wysokim odsetkiem zgód (np. >70%) to często uczciwszy układ niż model.

## Raporty rozliczeń w BigQuery

Źródła danych:

- **eksport GA4 do BigQuery** — zdarzenie `affiliate_attribution` z decyzją dla zamówień ze zgodą,
- **tabela zamówień z backendu** — przychód, wysyłka, zwroty, anulacje, kod rabatowy, nowy/powracający klient. Prowizji nie liczy się z samego GA4: GA4 nie zna zwrotów i może zgubić część zdarzeń.

| Plik | Co robi | Kiedy |
|---|---|---|
| [`sql/01_tables.sql`](sql/01_tables.sql) | tabele: zamówienia, kody partnerów, umowy, wynik atrybucji | raz |
| [`sql/02_order_attribution.sql`](sql/02_order_attribution.sql) | przypisanie każdego zamówienia z okresu: ciasteczko → kod → pula | po zamknięciu okresu zwrotów |
| [`sql/03_settlement.sql`](sql/03_settlement.sql) | prowizje per partner i metoda | po 02 |
| [`sql/04_modelled_share.sql`](sql/04_modelled_share.sql) | podział puli bez zgody z limitem | po 02 |
| [`sql/05_qa_checks.sql`](sql/05_qa_checks.sql) | pokrycie decyzjami, zamówienia bez pary, duplikaty, konflikty kodów | przed wysłaniem rozliczenia |

W każdym pliku podmień `your-project`, `affiliate` i `analytics_123456789` oraz daty w `DECLARE`.

## Testy

```bash
npm test        # 15 ścieżek z tabeli + testy jednostkowe (Node ≥ 20, zero zależności)
npm run build   # po zmianie src/attribution.js — odbudowuje gtm/01-library.html
```

Konfiguracja w testach jest czytana z [`gtm/variable-config.js`](gtm/variable-config.js) — testy sprawdzają ten sam plik, który wklejasz do GTM. Test pilnuje też, że `gtm/01-library.html` jest aktualny względem `src/attribution.js`.

## Ograniczenia i dalsze kroki

- **Ciasteczko pierwszej strony ustawiane z JavaScriptu** — Safari (ITP) skraca jego życie do 7 dni, a przy wejściu z linkiem z parametrami śledzącymi nawet do 24 h. Dla partnerów z oknem 30 dni część zakupów z Safari wypadnie. Rozwiązanie: ciasteczko ustawiane przez serwer (następna iteracja: server-side GTM).
- **Wejście sprzed zgody na innej stronie niż strona zgody przepada** — jeśli klient wszedł z linku partnera, przeszedł na kolejną stronę i dopiero tam zaakceptował zgodę, informacji o wejściu już nie ma (nie wolno jej było zapisać).
- **Adblockery** blokują część pixeli sieci, a czasem cały GTM — wtedy zamówienie trafia do metody 2 albo 3.
- **Aplikacje mobilne** i zakupy przez telefon są poza zasięgiem mechanizmu.
- **Następna iteracja: server-side** — zapis ścieżki w kontenerze serwerowym (ciasteczko HTTP z serwera, dłuższe życie w Safari), decyzja i wysyłka do sieci po stronie serwera, pixele sieci bez skryptów zewnętrznych w przeglądarce.
