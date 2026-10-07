# Załącznik techniczny do umowy partnerskiej — atrybucja i rozliczenie sprzedaży (CPS)

> **Dokument roboczy dla prawnika, nie porada prawna.** Zawiera wyłącznie warunki techniczne
> i rozliczeniowe. Strony, płatności, odpowiedzialność, kary, wypowiedzenie i ochronę danych
> (w tym rolę Partnera wobec danych z pixela) reguluje umowa główna.
> W nawiasach `[…]` wartości uzupełniane dla każdego Partnera.

## §1. Definicje

1. **Zamówienie** — zamówienie złożone w sklepie internetowym `[domena]`, z unikalnym numerem
   („ID Zamówienia”), datowane według czasu polskiego. Zamówienia z aplikacji, telefonu, platform
   sprzedażowych i sprzedaży hurtowej nie są Zamówieniami w rozumieniu Załącznika.
2. **Kliknięcie** — wejście na stronę Sklepu przez adres z parametrem `utm_source` z §2 ust. 1
   albo z hosta z §2 ust. 2. Wyświetlenie reklamy nie jest Kliknięciem.
3. **Zgoda marketingowa** — zgoda Klienta w narzędziu zgód Sklepu na przechowywanie informacji
   na urządzeniu w celach marketingowych, w tym rozliczeń z partnerami.
4. **Decyzja atrybucji** — zapis Sklepu przy złożeniu Zamówienia przez Klienta ze Zgodą
   marketingową, wskazujący partnera z §3 albo brak partnera.

## §2. Oznaczanie ruchu i zakazy

1. Partner oznacza wszystkie linki do Sklepu parametrem `utm_source=[partner_x]`, stałym przez
   cały okres współpracy. Wielkość liter nie ma znaczenia.
2. `[Opcjonalnie — porównywarki]` Wejścia bez `utm_source` z hostów `[lista]` traktuje się jak
   Kliknięcia Partnera.
3. Partner nie stosuje technik oznaczających Klienta bez jego świadomego Kliknięcia
   (automatyczne przekierowania, otwieranie Sklepu w tle, ukryte elementy, rozszerzenia
   przeglądarki, pop-under). Zamówienia z takich Kliknięć nie są podstawą prowizji.
4. Partner i jego wydawcy nie emitują reklam w wyszukiwarkach na frazy z nazwą lub znakami
   Sklepu `[lista]` i nie kierują takich reklam na domenę Sklepu.

## §3. Model atrybucji

1. Zamówienie przypisuje się Partnerowi, jeśli ostatnim wejściem z zewnątrz przed Zamówieniem
   było jego Kliknięcie, od którego nie upłynęło `[30]` × 24 godziny (model ostatniego
   kliknięcia, wyłącznie *post-click*).
2. Jeśli ostatnim wejściem z zewnątrz było Kliknięcie innego partnera, wejście z innego kanału
   (reklamy płatne i newsletter Sklepu, inne witryny) albo Kliknięcie Partnera po upływie okna —
   Zamówienie nie jest przypisywane Partnerowi ani żadnemu wcześniejszemu partnerowi.
3. Nie są wejściem z zewnątrz: wejście bez `utm_source` i bez strony odsyłającej (wpisany adres,
   zakładka), przejścia w obrębie domen Sklepu, bezpłatne wyniki wyszukiwarek, powroty z
   operatorów płatności, banków i poczty elektronicznej z listy Sklepu oraz wejścia na strony
   koszyka, płatności i potwierdzenia Zamówienia. Sklep udostępnia listę na żądanie Partnera.
4. Kolejne Zamówienie tego samego Klienta w oknie, bez nowego Kliknięcia, przypisuje się
   Partnerowi na tych samych zasadach. Zasada jest jednakowa dla wszystkich partnerów Sklepu.
5. Jedno Zamówienie może zostać przypisane najwyżej jednemu partnerowi. Kod rabatowy, także
   udostępniony Partnerowi, nie jest podstawą przypisania.

## §4. Zgoda marketingowa

1. Kody śledzące Partnera działają wyłącznie u Klientów ze Zgodą marketingową; kod konwersji —
   tylko dla Zamówień przypisanych Partnerowi zgodnie z §3.
2. Bez Zgody marketingowej Sklep nie zapisuje ani nie odczytuje informacji o Kliknięciach.
   Po odmowie lub wycofaniu zgody Sklep usuwa informacje zapisane przez siebie na potrzeby
   atrybucji; za informacje zapisane przez kody Partnera odpowiada Partner.
3. Prowizja przysługuje wyłącznie za Zamówienia z Decyzją atrybucji wskazującą Partnera.
   Za Zamówienia bez Decyzji atrybucji prowizja nie przysługuje; uwzględnia to stawka z §5 ust. 2.

## §5. Podstawa prowizji i Raport Sklepu

1. Podstawa prowizji — kwota zapłacona przez Klienta za towary `[netto / brutto]`, po rabatach,
   bez kosztu dostawy, pomniejszona o zwroty. Zamówienia anulowane i nieopłacone nie wchodzą do
   rozliczenia.
2. Stawka prowizji: `[__]%` dla nowego Klienta, `[__]%` dla powracającego (`[definicja nowego
   Klienta]`, ocenianego na chwilę Zamówienia).
3. Okresem rozliczeniowym jest miesiąc według daty Zamówienia. Sklep przekazuje Raport do
   `[10.]` dnia `[drugiego]` miesiąca po okresie (po upływie terminu zwrotów). Raport zawiera dla
   każdego Zamówienia: ID, datę, Podstawę prowizji, typ Klienta i powód przypisania.
4. Raport sporządza się według §3–§5 na podstawie danych Sklepu. Brak reklamacji w terminie z §8
   oznacza akceptację Raportu jako podstawy faktury.

## §6. Kod śledzący Partnera

1. Partner dostarcza kod śledzący z dokumentacją i listą zapisywanych ciasteczek; Sklep wdraża
   go w systemie zarządzania tagami.
2. Kod przekazuje ID Zamówienia, wartość bez dostawy, walutę `[i typ Klienta]`. Wartość jest
   wstępna — wiąże Raport Sklepu. Partner deduplikuje Zamówienia po ID.
3. Partner nie zmienia zakresu danych zbieranych przez kod bez uzgodnienia w trybie §7.
   Sklep może wstrzymać kod zagrażający bezpieczeństwu, wydajności lub zgodności z prawem,
   powiadamiając Partnera niezwłocznie.

## §7. Zmiany

1. Zmiana `utm_source`, okna atrybucji lub stawek wymaga `[aneksu / formy dokumentowej]` i
   obowiązuje od pierwszego dnia miesiąca po upływie `[14]` dni od uzgodnienia.
2. Rozstrzyga data Zamówienia: Zamówienia sprzed daty obowiązywania rozlicza się po staremu.
3. Sklep może zmienić techniczny sposób atrybucji (np. przeniesienie na serwer, zmiana narzędzia
   zgód) bez zmiany zasad §3–§5, z wyprzedzeniem `[30]` dni.

## §8. Reklamacje i kontakt

1. Partner może zgłosić reklamację Raportu w ciągu `[30]` dni, wskazując ID Zamówień. Sklep
   odpowiada w ciągu `[14]` dni, podając dla nich powód przypisania i Podstawę prowizji.
2. Osoby do kontaktu technicznego: Sklep `[…]`, Partner `[…]`. Strona, która stwierdzi
   nieprawidłowe działanie kodu lub oznaczania ruchu, powiadamia drugą w ciągu `[24]` godzin.

## §9. Ograniczenia techniczne

Strony przyjmują do wiadomości, że część Zamówień nie zostanie przypisana z przyczyn
technicznych: ograniczeń przeglądarek (w Safari informacja o Kliknięciu wygasa po 7 dniach bez
wizyty Klienta w Sklepie, a w szczególnych przypadkach po 24 godzinach), oprogramowania blokującego reklamy lub wyrażenia Zgody marketingowej dopiero na kolejnej
stronie po wejściu z linku Partnera. Za takie Zamówienia prowizja nie przysługuje.
