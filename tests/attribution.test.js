const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const api = require('../src/attribution.js');
const journeys = require('./journeys.js');

// Konfiguracja wczytana z pliku, który wkleja się do GTM — testy sprawdzają realne ustawienia, nie kopię.
function loadConfig() {
  const src = readFileSync(path.join(__dirname, '..', 'gtm', 'variable-config.js'), 'utf8');
  return new Function(`return (${src})`)()();
}

const cfg = loadConfig();
const T0 = 1800000000;
const DAY = 86400;

function simulate(journey) {
  let cookie = '';
  for (const step of journey.steps) {
    const touch = api.classifyLanding(step, cfg);
    if (!touch) continue;
    const pathNow = api.appendTouch(api.parsePath(cookie), touch.token, T0 + step.day * DAY, cfg);
    cookie = api.serializePath(pathNow);
  }
  const finalPath = api.parsePath(cookie);
  return {
    cookie: finalPath.map((tp) => tp.t).join('|'),
    decision: api.decideWinner(finalPath, T0 + journey.buyDay * DAY, cfg)
  };
}

for (const j of journeys) {
  test(`ścieżka ${j.id}: ${j.title}`, () => {
    const { cookie, decision } = simulate(j);
    assert.equal(cookie, j.cookie);
    assert.equal(decision.winner, j.winner);
    assert.equal(decision.reason, j.reason);
  });
}

test('utm_source ma pierwszeństwo przed gclid', () => {
  const t = api.classifyLanding({ search: '?gclid=1&utm_source=partner_b', referrer: '' }, cfg);
  assert.deepEqual(t, { token: 'partner_b', kind: 'utm' });
});

test('wejście z własnej domeny i subdomeny nie jest źródłem', () => {
  assert.equal(api.classifyLanding({ search: '', referrer: 'https://example-shop.pl/koszyk' }, cfg), null);
  assert.equal(api.classifyLanding({ search: '', referrer: 'https://m.example-shop.pl/' }, cfg), null);
});

test('wartość z ; , i spacjami nie psuje ciasteczka', () => {
  assert.equal(api.sanitizeToken('Partner A; evil=1, x'), 'partner-a-evil-1-x');
  assert.equal(api.sanitizeToken('x'.repeat(100)).length, 32);
});

test('ciasteczko nie rośnie bez limitu', () => {
  let p = [];
  for (let i = 0; i < 50; i++) p = api.appendTouch(p, `site-${i}.example`, T0 + i * 60, cfg);
  assert.equal(p.length, cfg.maxTouchpoints);
  assert.ok(api.serializePath(p).length < 500);
});

test('wejścia starsze niż czas życia ciasteczka wypadają przy dopisaniu', () => {
  let p = api.appendTouch([], 'partner_a', T0, cfg);
  p = api.appendTouch(p, 'partner_b', T0 + (cfg.cookieMaxAgeDays + 1) * DAY, cfg);
  assert.deepEqual(p.map((tp) => tp.t), ['partner_b']);
});

test('strony z noCapturePaths nie zapisują wejścia, nawet z utm_source', () => {
  assert.equal(api.classifyLanding({ pathname: '/checkout/platnosc', search: '?utm_source=partner_b', referrer: '' }, cfg), null);
  assert.deepEqual(api.classifyLanding({ pathname: '/checkout-guide', search: '?utm_source=partner_b', referrer: '' }, cfg),
    { token: 'partner_b', kind: 'utm' });
});

test('consentUpdateState czyta ostatnią komendę update i pomija default', () => {
  const cmd = (...a) => a; // gtag pushuje obiekt arguments — tablica ma ten sam kształt
  assert.equal(api.consentUpdateState([cmd('consent', 'default', { ad_storage: 'denied' })], 'ad_storage'), '');
  assert.equal(api.consentUpdateState([
    cmd('consent', 'default', { ad_storage: 'denied' }),
    { event: 'gtm.js' },
    cmd('consent', 'update', { ad_storage: 'granted' }),
    cmd('consent', 'update', { analytics_storage: 'granted' }),
    cmd('consent', 'update', { ad_storage: 'denied' })
  ], 'ad_storage'), 'denied');
  assert.equal(api.consentUpdateState(undefined, 'ad_storage'), '');
});

test('prunePath odświeża ścieżkę bez dopisywania i usuwa wejścia starsze niż czas życia', () => {
  const p = api.appendTouch([], 'partner_a', T0, cfg);
  assert.deepEqual(api.prunePath(p, T0 + 5 * DAY, cfg), p);
  assert.deepEqual(api.prunePath(p, T0 + (cfg.cookieMaxAgeDays + 1) * DAY, cfg), []);
});

test('uszkodzone ciasteczko nie wywraca parsera', () => {
  assert.deepEqual(api.parsePath('partner_a~|~zz|;;|partner_b~1a2b3c'), [{ t: 'partner_b', ts: parseInt('1a2b3c', 36) }]);
});

test('writeCookie ustawia SameSite, Secure i opcjonalną domenę', () => {
  const doc = { cookie: '' };
  api.writeCookie(doc, '_aff_path', 'partner_a~x', 30, { cookieDomain: '.example-shop.pl' }, true);
  assert.equal(doc.cookie, '_aff_path=partner_a~x; Max-Age=2592000; Path=/; SameSite=Lax; Domain=.example-shop.pl; Secure');
  assert.equal(api.readCookie({ cookie: 'a=1; _aff_path=partner_a~x; b=2' }, '_aff_path'), 'partner_a~x');
});

test('gtm/01-library.html jest zgodny z src/attribution.js (uruchom npm run build)', async () => {
  const { renderLibraryTag } = await import('../scripts/build-gtm.mjs');
  const current = readFileSync(path.join(__dirname, '..', 'gtm', '01-library.html'), 'utf8');
  assert.equal(current, renderLibraryTag());
});
