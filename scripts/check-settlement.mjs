// Kontrola rozliczenia na fikcyjnych zamówieniach: składa skrypt BigQuery z prawdziwych plików
// sql/01–03, podmieniając tabele na tymczasowe. Nie czyta ani nie zapisuje żadnych tabel w projekcie.
// Uruchomienie: npm run check:sql (wymaga zalogowanego `bq`).
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../sql/${name}`, import.meta.url), 'utf8');

// Brak szukanego fragmentu to błąd — inaczej kontrola po cichu przestałaby odpowiadać plikom SQL.
function swap(sql, pattern, replacement) {
  const out = sql.replace(pattern, replacement);
  if (out === sql) throw new Error(`Nie znaleziono w SQL: ${pattern}`);
  return out;
}

const useTempTables = (sql) => sql.replace(/`your-project\.affiliate\.(\w+)`/g, '$1');

const schema = read('01_tables.sql');

// Sandbox BigQuery (bez billingu) blokuje DML, więc zamiast INSERT jest CREATE TEMP TABLE … AS SELECT
// z listą kolumn z pliku 01. Kolumny dopasowują się po pozycji, tak jak w INSERT z pliku 02.
function createTempTable(name, query) {
  const match = schema.match(new RegExp(`\\.${name}\` (\\([\\s\\S]*?\\n\\))`));
  if (!match) throw new Error(`Brak tabeli ${name} w 01_tables.sql`);
  return `CREATE TEMP TABLE ${name} ${match[1]}\nAS\n${query}`;
}

// Tabela tymczasowa nie ma _TABLE_SUFFIX, więc filtr dat eksportu GA4 wypada z zapytania.
let attribution = swap(read('02_order_attribution.sql'), '`your-project.analytics_123456789.events_*`', 'ga4_events');
attribution = swap(attribution, /_TABLE_SUFFIX BETWEEN [\s\S]*?\n\s+AND (?=event_name)/, '');
attribution = swap(attribution, /^DELETE FROM [^;]*;/m, '');
attribution = swap(attribution, /^INSERT INTO `your-project\.affiliate\.order_attribution`$/m, '-- INSERT z pliku 02');
const [declarations, query] = useTempTables(attribution).split('-- INSERT z pliku 02');
if (!query) throw new Error('Nie rozdzielono pliku 02');
attribution = `${declarations}${createTempTable('order_attribution', query.trim())}`;

const settlement = useTempTables(swap(read('03_settlement.sql'), /^SELECT$/m, 'CREATE TEMP TABLE settlement AS\nSELECT'));

// EXAMPLE-1001 to przykład z README. EXAMPLE-2001 i 2002: te same kwoty i stawka, dwie waluty.
const orders = createTempTable('orders', `SELECT * FROM UNNEST([
  STRUCT('EXAMPLE-1001', TIMESTAMP '2026-09-10 12:00:00+00', NUMERIC '250', NUMERIC '20', 'PLN', TRUE,
         'web', 'partially_returned', NUMERIC '80'),
  ('EXAMPLE-2001', TIMESTAMP '2026-09-11 12:00:00+00', 100, 0, 'PLN', TRUE, 'web', 'paid', NULL),
  ('EXAMPLE-2002', TIMESTAMP '2026-09-11 13:00:00+00', 100, 0, 'EUR', TRUE, 'web', 'paid', NULL)
]);`);

// partner_b: od 15.09 wyższa stawka, która nie może objąć zamówienia z 10.09.
const contracts = createTempTable('partner_contracts', `SELECT * FROM UNNEST([
  STRUCT('partner_b', DATE '2026-01-01', DATE '2026-09-14', NUMERIC '0.08', NUMERIC '0.04'),
  ('partner_b', DATE '2026-09-15', NULL, NUMERIC '0.10', NUMERIC '0.05'),
  ('partner_c', DATE '2026-01-01', NULL, NUMERIC '0.10', NUMERIC '0.05')
]);`);

const events = `
CREATE TEMP TABLE ga4_events AS
SELECT
  'affiliate_attribution' AS event_name,
  1 AS event_timestamp,
  [STRUCT('aff_order_id' AS key, STRUCT(order_id AS string_value) AS value),
   STRUCT('aff_winner', STRUCT(winner)),
   STRUCT('aff_reason', STRUCT('partner_last_click')),
   STRUCT('aff_path', STRUCT(path))] AS event_params
FROM UNNEST([
  STRUCT('EXAMPLE-1001' AS order_id, 'partner_b' AS winner, 'partner_a|partner_b' AS path),
  ('EXAMPLE-2001', 'partner_c', 'partner_c'),
  ('EXAMPLE-2002', 'partner_c', 'partner_c')
]);
`;

const checks = `
SELECT * FROM settlement ORDER BY partner_id, currency;

ASSERT (
  SELECT STRING_AGG(
    FORMAT('%s %s %d %t %t', partner_id, currency, orders, commission_base, commission),
    '; ' ORDER BY partner_id, currency)
  FROM settlement
) = 'partner_b PLN 1 150 12; partner_c EUR 1 100 10; partner_c PLN 1 100 10'
AS 'rozliczenie niezgodne z oczekiwanym';
`;

// Bloki BEGIN…END, bo DECLARE z plików 02 i 03 musi otwierać skrypt albo blok.
const script = [orders, contracts, events, `BEGIN\n${attribution}\nEND;`, `BEGIN\n${settlement}\nEND;`, checks].join('\n');

if (script.includes('`your-project.')) throw new Error('W skrypcie została prawdziwa referencja do tabeli');
process.stdout.write(script);
