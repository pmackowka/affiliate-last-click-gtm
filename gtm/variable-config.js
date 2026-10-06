// GTM → Zmienna typu „Niestandardowy kod JavaScript”, nazwa: `AFF - config`.
// Jedyne miejsce konfiguracji mechanizmu. Wartości przykładowe — podmień domenę i listę partnerów.
function () {
  return {
    // Własne domeny: wejście z nich nie jest źródłem (nawigacja wewnętrzna).
    ownHosts: ['example-shop.pl'],

    cookieName: '_aff_path',
    // Ostatnie zamówienie zgłoszone partnerom — ochrona przed podwójnym pixelem po odświeżeniu strony podziękowania.
    txCookieName: '_aff_tx',
    // Czas życia ciasteczka = najdłuższe okno atrybucji z umów, nie dłużej (minimalizacja danych).
    cookieMaxAgeDays: 30,
    // Pusta wartość = ciasteczko tylko dla bieżącego hosta. Przy subdomenach (m., checkout.) wpisz '.example-shop.pl'.
    cookieDomain: '',
    maxTouchpoints: 10,
    // true = po zakupie przypisanym partnerowi ścieżka się zeruje i kolejny zakup wymaga nowego kliknięcia.
    // false = kolejne zakupy w oknie też idą do tego partnera (zależy od umowy).
    clearPathOnPurchase: false,

    // Kliknięcia płatne bez utm_source: parametr URL → token źródła.
    clickIds: {
      gclid: 'google-ads',
      gbraid: 'google-ads',
      wbraid: 'google-ads',
      msclkid: 'microsoft-ads'
    },

    // Źródła przezroczyste: nigdy nie trafiają do ścieżki (wspólne dla wszystkich partnerów).
    passThroughHosts: [
      // bramki płatności i odroczone płatności
      '(^|\\.)payu\\.com$', '(^|\\.)paypal\\.com$', '(^|\\.)przelewy24\\.pl$', '(^|\\.)tpay\\.com$',
      '(^|\\.)eblik\\.pl$', '(^|\\.)blik\\.com$', '(^|\\.)paypo\\.pl$', '(^|\\.)klarna\\.com$',
      '(^|\\.)stripe\\.com$', '(^|\\.)adyen\\.com$',
      // bankowość elektroniczna (powrót po autoryzacji przelewu)
      '(^|\\.)ipko\\.pl$', '(^|\\.)pekao24\\.pl$', '(^|\\.)aliorbank\\.pl$', '(^|\\.)mbank\\.pl$',
      '(^|\\.)santander\\.pl$', '(^|\\.)ingbank\\.pl$', '(^|\\.)bankmillennium\\.pl$',
      '(^|\\.)credit-agricole\\.pl$', '(^|\\.)inteligo\\.pl$', '(^|\\.)getinbank\\.pl$',
      // poczta webowa (kliknięcie w link z maila transakcyjnego)
      '^mail\\.google\\.com$', '^poczta\\.(onet|wp|interia|o2)\\.pl$', '^outlook\\.live\\.com$'
    ],

    // Wyszukiwarki organiczne: zapisywane (do raportu), ale pomijane przy decyzji —
    // po kliknięciu w partnera klient często wraca, wpisując nazwę sklepu w Google.
    navigational: [
      { pattern: '(^|\\.)google\\.[a-z.]{2,6}$', token: 'organic.google' },
      { pattern: '(^|\\.)bing\\.com$', token: 'organic.bing' },
      { pattern: '(^|\\.)duckduckgo\\.com$', token: 'organic.duckduckgo' }
    ],

    // Kanały rozliczane od sprzedaży po kliknięciu. Tylko one biorą udział w deduplikacji.
    // sources: wartości utm_source (albo tokeny referrera) przypisane partnerowi.
    // windowDays: okno atrybucji z umowy.
    partners: {
      partner_a: { sources: ['partner_a'], windowDays: 30 },
      partner_b: { sources: ['partner_b'], windowDays: 30 },
      partner_c: { sources: ['partner_c'], windowDays: 14 },
      partner_d: { sources: ['partner_d', 'comparison-d.example'], windowDays: 7 },
      // Retargeting rozliczany CPS post-click — konkuruje z partnerami jak każda sieć afiliacyjna.
      retargeting_a: { sources: ['retargeting_a'], windowDays: 7 }
      // retargeting_b celowo poza listą: rozliczany CPC/CPM, jego pixel zakupu odpala się zawsze (przy zgodzie).
    }
  };
}
