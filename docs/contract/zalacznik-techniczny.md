# Załącznik techniczny do umowy partnerskiej — atrybucja i rozliczenie sprzedaży (CPS)

> **Dokument roboczy dla prawnika, nie porada prawna.** Zawiera wyłącznie warunki techniczne
> i rozliczeniowe. Strony, wynagrodzenie i terminy płatności, odpowiedzialność, kary umowne,
> wypowiedzenie oraz ochronę danych osobowych (w tym rolę Partnera wobec danych z pixela:
> odrębny administrator czy podmiot przetwarzający) reguluje umowa główna.
>
> Wartości w nawiasach kwadratowych `[…]` uzupełnia się dla każdego Partnera osobno.
> Warianty oznaczone „WARIANT A / B” — w umowie zostaje jeden.

## §1. Definicje

1. **Zamówienie** — zamówienie złożone w sklepie internetowym Sklepu `[domena]`, identyfikowane
   unikalnym numerem nadanym przez Sklep („ID Zamówienia”). Datą Zamówienia jest data jego
   złożenia według czasu polskiego. Zamówienia złożone innymi kanałami (aplikacja mobilna,
   telefon, platformy sprzedażowe, sprzedaż hurtowa) nie są Zamówieniami w rozumieniu Załącznika.
2. **Kliknięcie** — wejście Klienta na stronę Sklepu z linku Partnera, oznaczone parametrem
   `utm_source` o wartości wskazanej w §2 ust. 1. Wyświetlenie reklamy bez wejścia na stronę
   Sklepu nie jest Kliknięciem.
3. **Wejście z zewnątrz** — wejście Klienta na stronę Sklepu z innej witryny, reklamy lub
   wiadomości, z wyłączeniem wejść wymienionych w §3 ust. 4.
4. **Okno atrybucji** — liczba dni liczona od ostatniego Kliknięcia danego Partnera, w której
   Zamówienie może zostać przypisane temu Partnerowi.
5. **Zgoda marketingowa** — zgoda Klienta na przechowywanie informacji na jego urządzeniu
   w celach marketingowych, wyrażona w narzędziu do zarządzania zgodami Sklepu.
6. **Kod rabatowy** — kod obniżający cenę Zamówienia, wydany przez Sklep; nie jest podstawą
   przypisania Zamówienia (§5).
7. **Podstawa prowizji** — kwota, od której nalicza się prowizję, określona w §6.
8. **Raport Sklepu** — miesięczne zestawienie Zamówień przypisanych Partnerowi, sporządzane
   przez Sklep na podstawie jego systemu sprzedaży.
9. **Decyzja atrybucji** — zapis dokonany przez Sklep w chwili złożenia Zamówienia przez
   Klienta, który wyraził Zgodę marketingową, wskazujący partnera, któremu przypisano
   Zamówienie zgodnie z §3, albo brak takiego partnera.

## §2. Oznaczanie ruchu Partnera

1. Partner oznacza wszystkie linki prowadzące do Sklepu parametrem `utm_source=[partner_x]`.
   Wartość jest stała przez cały okres współpracy. Wielkość liter nie ma znaczenia.
2. `[Opcjonalnie — porównywarki]` Wejścia z adresów `[lista hostów, np. comparison-d.example]`
   bez parametru `utm_source` traktuje się jak Kliknięcia Partnera. Każdy host, w tym subdomena,
   musi być wymieniony osobno; prefiks `www.` jest pomijany.
3. Zmiana wartości z ust. 1 lub domeny z ust. 2 wymaga powiadomienia Sklepu z wyprzedzeniem
   co najmniej `[14]` dni, w trybie §9.
4. Partner nie stosuje technik, które oznaczają Klienta jako pochodzącego od Partnera bez
   świadomego Kliknięcia, w szczególności automatycznych przekierowań, otwierania stron Sklepu
   w tle i ukrytych elementów strony.
5. `[Do decyzji]` Partner nie emituje reklam w wyszukiwarkach na frazy zawierające nazwę lub
   znaki towarowe Sklepu `[lista]`.

## §3. Model atrybucji

1. Zamówienie przypisuje się Partnerowi, jeśli ostatnim Wejściem z zewnątrz przed Zamówieniem
   było Kliknięcie tego Partnera, wykonane w jego Oknie atrybucji (model „ostatniego kliknięcia”,
   wyłącznie po kliknięciu — *post-click*).
2. Okno atrybucji Partnera wynosi `[30]` dni.
3. Jeśli ostatnim Wejściem z zewnątrz było:
   1. Kliknięcie innego partnera — Zamówienie przypisuje się temu partnerowi, jeśli nastąpiło
      w jego oknie atrybucji, a w przeciwnym razie nikomu;
   2. Kliknięcie Partnera wykonane po upływie jego Okna atrybucji — Zamówienie nie jest
      przypisywane nikomu, także wcześniejszym partnerom;
   3. wejście z innego kanału (m.in. reklamy płatne Sklepu, newsletter Sklepu, inne witryny) —
      Zamówienie nie jest przypisywane żadnemu partnerowi.
4. Nie przerywają ścieżki Partnera i nie są Wejściem z zewnątrz:
   1. wejście bezpośrednie (wpisanie adresu, zakładka);
   2. przejścia w obrębie domen Sklepu `[lista domen i subdomen]`;
   3. wejście z bezpłatnych wyników wyszukiwarek `[Google, Bing, DuckDuckGo]`, w tym
      z aplikacji Google;
   4. wejście bez parametru `utm_source` z serwisów operatorów płatności, banków i poczty
      elektronicznej z listy prowadzonej przez Sklep `[udostępniana Partnerowi na żądanie]`;
   5. wejścia na stronach koszyka, płatności i potwierdzenia Zamówienia.

   Wejście z wiadomości e-mail oznaczone parametrem `utm_source` (np. newsletter Sklepu) jest
   Wejściem z zewnątrz zgodnie z ust. 3 pkt 3.
5. Kolejne Zamówienie tego samego Klienta w Oknie atrybucji, bez nowego Kliknięcia:
   - **WARIANT A:** przypisuje się Partnerowi na zasadach ust. 1–4;
   - **WARIANT B:** nie jest przypisywane — każde Zamówienie wymaga nowego Kliknięcia.

   Wariant jest jednolity dla wszystkich partnerów rozliczanych przez Sklep od sprzedaży;
   jego zmiana wymaga zmiany umów ze wszystkimi partnerami w trybie §9.
6. Wyświetlenia reklam (*post-view*) nie są podstawą do naliczenia prowizji, niezależnie od
   danych zbieranych przez Partnera.
7. Jedno Zamówienie może zostać przypisane najwyżej jednemu partnerowi.

## §4. Zgoda marketingowa i Zamówienia bez zgody

1. Kod śledzący konwersji Partnera (pixel zakupu) jest uruchamiany wyłącznie u Klientów, którzy
   wyrazili Zgodę marketingową, i tylko dla Zamówień przypisanych Partnerowi zgodnie z §3.
   `[Opcjonalnie]` Pozostałe kody śledzące Partnera (odsłony, produkt, koszyk) — wyłącznie przy
   Zgodzie marketingowej.
2. Bez Zgody marketingowej Sklep nie zapisuje ani nie odczytuje informacji o Kliknięciach
   na urządzeniu Klienta. Po odmowie lub wycofaniu zgody Sklep usuwa zapisane informacje.
3. Każde Zamówienie rozlicza się jedną metodą:
   1. istnieje Decyzja atrybucji — §3, także gdy Decyzja nie wskazuje żadnego partnera,
      w tym gdy przed Zamówieniem nie zarejestrowano żadnego Kliknięcia;
   2. brak Decyzji atrybucji:
      - **WARIANT A (pula modelowana):** prowizja zgodnie z §7;
      - **WARIANT B:** prowizja nie przysługuje; w zamian stawka podstawowa wynosi `[__]`.

## §5. Kody rabatowe

1. Użycie Kodu rabatowego, także udostępnionego Partnerowi do promocji, nie jest podstawą
   przypisania Zamówienia Partnerowi i nie zmienia przypisania ustalonego zgodnie z §3 i §4.
2. `[Opcjonalnie]` Partner nie publikuje Kodów rabatowych Sklepu w serwisach agregujących kody
   rabatowe bez zgody Sklepu.

## §6. Podstawa prowizji i Raport Sklepu

1. Podstawa prowizji to wartość Zamówienia `[netto / brutto]` bez kosztu dostawy, pomniejszona
   o wartość zwróconych towarów (bez kosztu dostawy). Zamówienia anulowane nie wchodzą do
   rozliczenia. Kwoty w walucie innej niż `[PLN]` przelicza się `[kursem średnim NBP z dnia
   poprzedzającego datę Zamówienia]`.
2. Stawka prowizji wynosi `[__]%` dla nowego Klienta i `[__]%` dla Klienta powracającego.
   Nowy Klient to `[definicja, np. brak opłaconego Zamówienia na ten sam adres e-mail
   w ciągu ostatnich 12 miesięcy]`.
3. Okresem rozliczeniowym jest miesiąc kalendarzowy według daty Zamówienia. Raport Sklepu za
   dany miesiąc sporządza się po upływie okresu na zwroty `[30]` dni, tj. do `[10.]` dnia
   `[drugiego]` miesiąca następującego po okresie rozliczeniowym.
4. Rozliczenie następuje na podstawie Raportu Sklepu. Raport zawiera dla każdego Zamówienia:
   ID Zamówienia, datę, Podstawę prowizji, typ Klienta, metodę przypisania (§4 ust. 3) i powód
   przypisania.
5. `[Do decyzji]` Zwroty zgłoszone po sporządzeniu Raportu Sklepu `[nie korygują rozliczenia /
   pomniejszają rozliczenie w kolejnym okresie]`.
6. W razie rozbieżności między Raportem Sklepu a danymi Partnera rozstrzyga Raport Sklepu,
   z zastrzeżeniem §10.

## §7. Pula modelowana (tylko WARIANT A z §4 ust. 3 pkt 2)

1. Udział Partnera = Podstawa prowizji Zamówień przypisanych Partnerowi na podstawie Decyzji
   atrybucji / Podstawa prowizji wszystkich Zamówień z Decyzją atrybucji, także tych, w których
   Decyzja nie wskazuje żadnego partnera — w danym okresie rozliczeniowym.
2. Prowizja z puli = MIN(Udział Partnera × Podstawa prowizji Zamówień rozliczanych według §4
   ust. 3 pkt 2 × stawka modelowana; limit miesięczny).
3. Stawka modelowana wynosi `[__]%` Podstawy prowizji (`[50–70]%` stawki podstawowej, jedna
   stawka bez podziału na typ Klienta), limit miesięczny `[__]`.
4. Sklep raz w miesiącu przekazuje udział Zamówień ze Zgodą marketingową w ogóle Zamówień.
5. Strony co `[kwartał]` przeglądają założenie, że Klienci bez Zgody wybierają partnerów
   w tych samych proporcjach co Klienci ze Zgodą.

## §8. Kod śledzący Partnera

1. Partner dostarcza kod śledzący wraz z dokumentacją; Sklep wdraża go w swoim systemie
   zarządzania tagami.
2. Kod śledzący przekazuje co najmniej: ID Zamówienia, wartość Zamówienia `[netto / brutto]`
   bez kosztu dostawy, walutę `[oraz typ Klienta: nowy / powracający]`. Wartość z kodu
   śledzącego jest wstępna — wiąże Podstawa prowizji z Raportu Sklepu (§6). Partner
   deduplikuje Zamówienia po ID Zamówienia.
3. Zmiana kodu śledzącego przez Partnera wymaga powiadomienia z wyprzedzeniem `[14]` dni.
4. Sklep może wstrzymać kod śledzący, jeśli zagraża on bezpieczeństwu, wydajności lub
   zgodności strony z prawem, powiadamiając Partnera niezwłocznie. Zamówienia z okresu
   wstrzymania rozlicza się na podstawie Raportu Sklepu.

## §9. Zmiany warunków technicznych

1. Zmiana Okna atrybucji, oznaczenia ruchu (§2), stawek lub wariantów wymaga
   `[aneksu / potwierdzenia e-mailem przez osoby z §11]`.
2. Zmiana obowiązuje od pierwszego dnia miesiąca następującego po upływie `[14]` dni od
   uzgodnienia. Sklep wdraża ją technicznie w ciągu `[5]` dni roboczych przed tą datą.
3. Zamówienia złożone przed datą obowiązywania zmiany rozlicza się na dotychczasowych zasadach.

## §10. Reklamacje

1. Partner może zgłosić reklamację Raportu Sklepu w ciągu `[14]` dni od jego otrzymania,
   wskazując ID Zamówień, których dotyczy.
2. Sklep rozpatruje reklamację w ciągu `[14]` dni, udostępniając dla wskazanych Zamówień
   metodę i powód przypisania.

## §11. Kontakt techniczny i awarie

1. Osoby do kontaktu w sprawach technicznych:
   - Sklep: `[imię, rola, kanał]`;
   - Partner: `[imię, rola, kanał]`.
2. Strona, która stwierdzi nieprawidłowe działanie kodu śledzącego lub oznaczania ruchu,
   powiadamia drugą Stronę w ciągu `[24]` godzin. Czas reakcji na zgłoszenie: `[1]` dzień roboczy.
3. Zamówienia z okresu awarii po stronie Sklepu rozlicza się
   `[na podstawie puli modelowanej / według średniego udziału Partnera
   z ostatnich 3 miesięcy]`.

## §12. Ograniczenia techniczne przyjęte do wiadomości

Strony przyjmują do wiadomości, że część Zamówień nie zostanie przypisana na podstawie
Kliknięć z przyczyn niezależnych od Sklepu, w szczególności z powodu ograniczeń przeglądarek
(m.in. skrócenia czasu przechowywania informacji w przeglądarce Safari), oprogramowania
blokującego reklamy lub wyrażenia Zgody marketingowej dopiero na kolejnej stronie po wejściu
z linku Partnera. Jeśli dla takiego Zamówienia istnieje Decyzja atrybucji, prowizja nie
przysługuje (§4 ust. 3 pkt 1); jeśli Decyzji brak — stosuje się §4 ust. 3 pkt 2. W przeglądarkach
ograniczających czas przechowywania informacji `[Safari]` skuteczne Okno atrybucji może być
krótsze niż określone w §3 ust. 2 `[od 24 godzin do 7 dni]`.
