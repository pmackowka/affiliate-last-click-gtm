// Generuje gtm/01-library.html z src/attribution.js — jedno źródło kodu dla testów i dla GTM.
// Uruchom po każdej zmianie src/attribution.js: `npm run build`. Test pilnuje, że plik jest aktualny.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

export function renderLibraryTag() {
  const lib = readFileSync(`${root}src/attribution.js`, 'utf8');
  return [
    '<!--',
    '  GTM → Tag „Niestandardowy kod HTML”, nazwa: `AFF - 01 library`.',
    '  Wyzwalacz: `AFF - Initialization` (Inicjowanie — wszystkie strony).',
    '  Ustawienia zgody: bez dodatkowej zgody — tag tylko definiuje funkcje, niczego nie zapisuje ani nie czyta.',
    '  PLIK GENEROWANY przez `npm run build` z src/attribution.js — nie edytuj ręcznie.',
    '-->',
    '<script>',
    lib.trimEnd(),
    '</script>',
    ''
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(`${root}gtm/01-library.html`, renderLibraryTag());
  console.log('gtm/01-library.html zaktualizowany');
}
