// Copies the latin font subsets from the @fontsource packages into assets/fonts, so the site serves its own fonts
// (no request to Google, no visitor IP shared). Re-run after updating the font packages: npm run fonts
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const files = [
  '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2',
  '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2',
  '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2',
  '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2',
  '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
  '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2',
];

const out = fileURLToPath(new URL('../assets/fonts/', import.meta.url));
mkdirSync(out, { recursive: true });
for (const f of files) {
  const name = f.slice(f.lastIndexOf('/') + 1);
  copyFileSync(fileURLToPath(new URL('../node_modules/' + f, import.meta.url)), out + name);
  console.log('assets/fonts/' + name);
}
