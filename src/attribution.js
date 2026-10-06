/*
 * Atrybucja last click dla partnerów rozliczanych od sprzedaży (CPS) — logika po stronie przeglądarki.
 *
 * ES5 celowo: ten sam plik trafia do tagu Custom HTML w GTM (`npm run build` → gtm/01-library.html),
 * a starsze przeglądarki i walidator GTM nie znoszą składni ES2015+.
 *
 * Sam plik niczego nie zapisuje ani nie odczytuje z urządzenia przy ładowaniu — tylko definiuje funkcje.
 * Odczyt i zapis ciasteczka robią tagi 02 i 03, które w GTM wymagają zgody `ad_storage`.
 *
 * Format ciasteczka: `token~ts|token~ts|…`
 *   token — źródło wejścia, tylko [a-z0-9._-] (bez kodowania, odporne na `;` i `,` z utm_source),
 *   ts    — sekundy epoki w base36 (krótsze o ~4 znaki niż dziesiętnie).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.affAttribution = api;
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var TOUCH_SEP = '|';
  var TS_SEP = '~';
  var TOKEN_MAX = 32;
  var DAY = 86400;

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  // Normalizacja do bezpiecznego alfabetu. Pusty wynik = brak sygnału.
  function sanitizeToken(raw) {
    if (raw === null || raw === undefined) return '';
    var t = String(raw)
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '');
    return t.slice(0, TOKEN_MAX).replace(/[-.]+$/, '');
  }

  // Domena z adresu, bez www. Regex zamiast `new URL`, żeby działało w ES5.
  function hostOf(url) {
    var m = /^[a-z][a-z0-9+.-]*:\/\/([^\/?#:]+)/i.exec(String(url || ''));
    return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
  }

  function queryParam(search, name) {
    var re = new RegExp('[?&]' + name + '=([^&#]*)');
    var m = re.exec(String(search || ''));
    if (!m) return '';
    try {
      return decodeURIComponent(m[1].replace(/\+/g, ' '));
    } catch (e) {
      return m[1];
    }
  }

  function matchesAny(host, patterns) {
    var list = patterns || [];
    for (var i = 0; i < list.length; i++) {
      if (new RegExp(list[i], 'i').test(host)) return true;
    }
    return false;
  }

  // Własna domena i jej subdomeny — ruch wewnętrzny nie jest źródłem.
  function isOwnHost(host, ownHosts) {
    var list = ownHosts || [];
    for (var i = 0; i < list.length; i++) {
      var own = String(list[i]).toLowerCase().replace(/^www\./, '');
      if (host === own || host.slice(-(own.length + 1)) === '.' + own) return true;
    }
    return false;
  }

  function isNavigationalToken(token, cfg) {
    var list = cfg.navigational || [];
    for (var i = 0; i < list.length; i++) {
      if (sanitizeToken(list[i].token) === token) return true;
    }
    return false;
  }

  function partnerForToken(token, cfg) {
    var partners = cfg.partners || {};
    for (var id in partners) {
      if (!hasOwn(partners, id)) continue;
      var sources = partners[id].sources || [];
      for (var i = 0; i < sources.length; i++) {
        if (sanitizeToken(sources[i]) === token) return id;
      }
    }
    return null;
  }

  /*
   * Klasyfikacja wejścia na stronę. Kolejność = pierwszeństwo:
   *   1. utm_source        — jawne oznaczenie kampanii,
   *   2. identyfikator kliknięcia (gclid, msclkid…) — płatne kliknięcie bez UTM,
   *   3. referrer zewnętrzny, z wyjątkiem źródeł przezroczystych (płatności, banki, poczta),
   *   4. brak referrera albo własna domena → null (wejście bezpośrednie nie nadpisuje źródła).
   * Zwraca { token, kind } albo null, gdy wejścia nie należy zapisywać.
   */
  function classifyLanding(input, cfg) {
    var search = input.search;
    var utm = sanitizeToken(queryParam(search, 'utm_source'));
    if (utm) return { token: utm, kind: 'utm' };

    var ids = cfg.clickIds || {};
    for (var key in ids) {
      if (hasOwn(ids, key) && queryParam(search, key)) {
        return { token: sanitizeToken(ids[key]), kind: 'click_id' };
      }
    }

    var host = hostOf(input.referrer);
    if (!host || isOwnHost(host, cfg.ownHosts)) return null;
    // Przezroczyste: powrót z bramki płatności czy logowania do banku nie zmienia źródła zakupu.
    if (matchesAny(host, cfg.passThroughHosts)) return null;

    var nav = cfg.navigational || [];
    for (var i = 0; i < nav.length; i++) {
      if (new RegExp(nav[i].pattern, 'i').test(host)) {
        return { token: sanitizeToken(nav[i].token), kind: 'navigational' };
      }
    }
    return { token: sanitizeToken(host), kind: 'referral' };
  }

  function parsePath(value) {
    var out = [];
    if (!value) return out;
    var parts = String(value).split(TOUCH_SEP);
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split(TS_SEP);
      var token = sanitizeToken(pair[0]);
      var ts = parseInt(pair[1], 36);
      if (token && !isNaN(ts)) out.push({ t: token, ts: ts });
    }
    return out;
  }

  function serializePath(path) {
    var parts = [];
    for (var i = 0; i < path.length; i++) {
      parts.push(path[i].t + TS_SEP + path[i].ts.toString(36));
    }
    return parts.join(TOUCH_SEP);
  }

  /*
   * Dopisanie wejścia do ścieżki. Trzy ograniczenia wzrostu ciasteczka:
   *   - powtórzone to samo źródło odświeża czas zamiast dopisywać kolejny element,
   *   - elementy starsze niż cookieMaxAgeDays wypadają,
   *   - zostaje najwyżej maxTouchpoints ostatnich elementów.
   */
  function appendTouch(path, token, now, cfg) {
    var maxAge = (cfg.cookieMaxAgeDays || 90) * DAY;
    var out = [];
    for (var i = 0; i < path.length; i++) {
      if (now - path[i].ts <= maxAge) out.push(path[i]);
    }
    var last = out[out.length - 1];
    if (last && last.t === token) {
      out[out.length - 1] = { t: token, ts: now };
    } else {
      out.push({ t: token, ts: now });
    }
    var max = cfg.maxTouchpoints || 10;
    if (out.length > max) out = out.slice(out.length - max);
    return out;
  }

  /*
   * Decyzja przy zakupie: last non-direct click z pominięciem wejść nawigacyjnych
   * (wyszukiwarka organiczna po kliknięciu w partnera to zwykle powrót po nazwie sklepu).
   * Pierwsze od końca wejście nienawigacyjne rozstrzyga:
   *   - partner w swoim oknie atrybucji → wygrywa,
   *   - partner po oknie → nikt (nie cofamy się do starszego partnera),
   *   - źródło spoza listy partnerów → nikt (sprzedaż należy do innego kanału).
   */
  function decideWinner(path, now, cfg) {
    if (!path.length) return { winner: null, reason: 'no_touchpoints', touch: '' };
    for (var i = path.length - 1; i >= 0; i--) {
      var tp = path[i];
      if (isNavigationalToken(tp.t, cfg)) continue;
      var partnerId = partnerForToken(tp.t, cfg);
      if (!partnerId) return { winner: null, reason: 'non_partner_last_click', touch: tp.t };
      var windowDays = cfg.partners[partnerId].windowDays || 30;
      if (now - tp.ts > windowDays * DAY) {
        return { winner: null, reason: 'partner_window_expired', touch: tp.t };
      }
      return { winner: partnerId, reason: 'partner_last_click', touch: tp.t };
    }
    return { winner: null, reason: 'only_navigational', touch: '' };
  }

  // Ścieżka czytelna dla raportu GA4: same tokeny, ucięte do limitu parametru.
  function pathLabel(path) {
    var tokens = [];
    for (var i = 0; i < path.length; i++) tokens.push(path[i].t);
    return tokens.join('>').slice(0, 100);
  }

  // --- Ciasteczka. Wywoływane wyłącznie z tagów wymagających zgody ad_storage. ---

  function readCookie(doc, name) {
    var pairs = String(doc.cookie || '').split(/;\s*/);
    for (var i = 0; i < pairs.length; i++) {
      var idx = pairs[i].indexOf('=');
      if (idx > 0 && pairs[i].slice(0, idx) === name) return pairs[i].slice(idx + 1);
    }
    return '';
  }

  // maxAgeDays = 0 usuwa ciasteczko.
  function writeCookie(doc, name, value, maxAgeDays, cfg, isHttps) {
    var parts = [name + '=' + value, 'Max-Age=' + Math.round(maxAgeDays * DAY), 'Path=/', 'SameSite=Lax'];
    if (cfg.cookieDomain) parts.push('Domain=' + cfg.cookieDomain);
    if (isHttps) parts.push('Secure');
    doc.cookie = parts.join('; ');
  }

  return {
    sanitizeToken: sanitizeToken,
    hostOf: hostOf,
    queryParam: queryParam,
    classifyLanding: classifyLanding,
    parsePath: parsePath,
    serializePath: serializePath,
    appendTouch: appendTouch,
    decideWinner: decideWinner,
    partnerForToken: partnerForToken,
    pathLabel: pathLabel,
    readCookie: readCookie,
    writeCookie: writeCookie
  };
});
