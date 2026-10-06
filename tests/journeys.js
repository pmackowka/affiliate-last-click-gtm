// Ścieżki klientów — to samo źródło co tabela w README. Zmiana tutaj = zmiana tabeli.
// Każdy krok: dzień od pierwszego wejścia + adres wejścia (search) i referrer.
// `cookie` = oczekiwana zawartość ciasteczka bez znaczników czasu.

const partner = (name) => ({ search: `?utm_source=${name}&utm_medium=affiliate`, referrer: `https://${name}.example/offer` });
const google = { search: '', referrer: 'https://www.google.pl/' };
const direct = { search: '', referrer: '' };

module.exports = [
  {
    id: 1,
    title: 'Partner A → zakup',
    steps: [{ day: 0, ...partner('partner_a') }],
    buyDay: 0,
    cookie: 'partner_a',
    winner: 'partner_a',
    reason: 'partner_last_click'
  },
  {
    id: 2,
    title: 'Partner A → Partner B → zakup',
    steps: [{ day: 0, ...partner('partner_a') }, { day: 2, ...partner('partner_b') }],
    buyDay: 2,
    cookie: 'partner_a|partner_b',
    winner: 'partner_b',
    reason: 'partner_last_click'
  },
  {
    id: 3,
    title: 'Partner A → Google organic (nazwa sklepu) → zakup',
    steps: [{ day: 0, ...partner('partner_a') }, { day: 1, ...google }],
    buyDay: 1,
    cookie: 'partner_a|organic.google',
    winner: 'partner_a',
    reason: 'partner_last_click'
  },
  {
    id: 4,
    title: 'Partner A → Google → Google → zakup',
    steps: [{ day: 0, ...partner('partner_a') }, { day: 1, ...google }, { day: 3, ...google }],
    buyDay: 3,
    cookie: 'partner_a|organic.google',
    winner: 'partner_a',
    reason: 'partner_last_click'
  },
  {
    id: 5,
    title: 'Partner B → bramka płatności (powrót z PayU) → zakup',
    steps: [{ day: 0, ...partner('partner_b') }, { day: 0, search: '', referrer: 'https://secure.payu.com/pay/' }],
    buyDay: 0,
    cookie: 'partner_b',
    winner: 'partner_b',
    reason: 'partner_last_click'
  },
  {
    id: 6,
    title: 'Partner A → Google Ads (gclid) → zakup',
    steps: [{ day: 0, ...partner('partner_a') }, { day: 1, search: '?gclid=abc123', referrer: 'https://www.google.pl/' }],
    buyDay: 1,
    cookie: 'partner_a|google-ads',
    winner: null,
    reason: 'non_partner_last_click'
  },
  {
    id: 7,
    title: 'Partner C → newsletter → zakup',
    steps: [{ day: 0, ...partner('partner_c') }, { day: 4, search: '?utm_source=newsletter&utm_medium=email', referrer: '' }],
    buyDay: 4,
    cookie: 'partner_c|newsletter',
    winner: null,
    reason: 'non_partner_last_click'
  },
  {
    id: 8,
    title: 'Retargeting A (klik w reklamę) → zakup',
    steps: [{ day: 0, search: '?utm_source=retargeting_a&utm_medium=display', referrer: '' }],
    buyDay: 0,
    cookie: 'retargeting_a',
    winner: 'retargeting_a',
    reason: 'partner_last_click'
  },
  {
    id: 9,
    title: 'Partner A → Retargeting B (klik) → zakup',
    steps: [{ day: 0, ...partner('partner_a') }, { day: 2, search: '?utm_source=retargeting_b&utm_medium=display', referrer: '' }],
    buyDay: 2,
    cookie: 'partner_a|retargeting_b',
    winner: null,
    reason: 'non_partner_last_click'
  },
  {
    id: 10,
    title: 'Partner D → po 10 dniach wejście bezpośrednie → zakup (okno 7 dni)',
    steps: [{ day: 0, ...partner('partner_d') }, { day: 10, ...direct }],
    buyDay: 10,
    cookie: 'partner_d',
    winner: null,
    reason: 'partner_window_expired'
  },
  {
    id: 11,
    title: 'Partner A → wejście bezpośrednie (wpisany adres) → zakup',
    steps: [{ day: 0, ...partner('partner_a') }, { day: 5, ...direct }],
    buyDay: 5,
    cookie: 'partner_a',
    winner: 'partner_a',
    reason: 'partner_last_click'
  },
  {
    id: 12,
    title: 'Partner B → link w poczcie webowej (Gmail) → zakup',
    steps: [{ day: 0, ...partner('partner_b') }, { day: 1, search: '', referrer: 'https://mail.google.com/' }],
    buyDay: 1,
    cookie: 'partner_b',
    winner: 'partner_b',
    reason: 'partner_last_click'
  },
  {
    id: 13,
    title: 'Partner A → artykuł na blogu (referral) → zakup',
    steps: [{ day: 0, ...partner('partner_a') }, { day: 2, search: '', referrer: 'https://some-blog.example/ranking-butow' }],
    buyDay: 2,
    cookie: 'partner_a|some-blog.example',
    winner: null,
    reason: 'non_partner_last_click'
  },
  {
    id: 14,
    title: 'Porównywarka bez UTM (rozpoznana po referrerze) → zakup',
    steps: [{ day: 0, search: '', referrer: 'https://www.comparison-d.example/produkt/123' }],
    buyDay: 0,
    cookie: 'comparison-d.example',
    winner: 'partner_d',
    reason: 'partner_last_click'
  },
  {
    id: 15,
    title: 'Partner A → Google Ads → ponownie Partner A → zakup',
    steps: [{ day: 0, ...partner('partner_a') }, { day: 1, search: '?gclid=xyz', referrer: '' }, { day: 3, ...partner('partner_a') }],
    buyDay: 3,
    cookie: 'partner_a|google-ads|partner_a',
    winner: 'partner_a',
    reason: 'partner_last_click'
  }
];
