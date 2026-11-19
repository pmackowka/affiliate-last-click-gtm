# Diagram sekwencji UML: wejścia partnerów → decyzja → rozliczenie

Jak jedno zamówienie dostaje co najwyżej jednego partnera i jak z tego powstaje prowizja. Opis tagów i reguł: [README](README.md).

```mermaid
sequenceDiagram
    autonumber
    actor K as Klient
    participant P as Sieć partnera
    participant S as Sklep www
    participant GTM as GTM: tagi AFF
    participant C as Cookie _aff_path
    participant PX as Pixel zwycięskiej sieci
    participant GA as GA4 → BigQuery
    participant BE as Backend sklepu
    participant FIN as Rozliczenie (SQL)

    K->>P: klik w link partnera
    P->>S: wejście z utm_source=partner_a
    S->>GTM: DOM Ready (AFF 02)
    Note over GTM,C: tylko przy zgodzie ad_storage — bez niej nic nie jest zapisywane ani czytane
    GTM->>C: dopisanie partner_a~czas
    Note over K,C: kolejne wejścia (organic, partner_b…) dopisują się do ścieżki, maks. 10
    K->>S: zakup
    S->>GTM: purchase w dataLayer (AFF 03)
    GTM->>C: odczyt ścieżki
    GTM->>GTM: od końca, bez organicznych: ostatni partner w swoim oknie?
    GTM->>S: dataLayer aff_decision (winner, reason)
    alt wygrał partner
        GTM->>PX: pixel zakupu tylko zwycięzcy (AFF 04x)
    end
    GTM->>GA: affiliate_attribution — każda decyzja, także „nikt” (AFF 06)
    BE->>FIN: zamówienia, kanał, zwroty
    GA->>FIN: decyzje z eksportu GA4
    FIN->>FIN: po okresie zwrotów: 02_order_attribution, 03_settlement
    FIN->>P: prowizja wg stawek z partner_contracts
```

| Krok | Kto | Po co |
|---|---|---|
| 1–4 | tag GTM | ścieżka wejść zapisana na urządzeniu, tylko za zgodą |
| 5–10 | tag GTM | pixel dostaje jedna sieć, więc zamówienie nie jest opłacane dwa razy |
| 11 | tag GTM → GA4 | decyzja trafia do BigQuery, także gdy nikt nie wygrał |
| 12–15 | data engineer / finanse | prowizja z backendu, bo tylko on zna zwroty |
