// Sauvegarde fictive des parcours de bout en bout (ticket 016), lancée par scripts/e2e.sh :
//   node --experimental-transform-types scripts/e2e/sauvegarde-fictive.mjs <fichier.db> [AAAA-MM-JJ]
// Elle réutilise le code de src/data/ tel quel (node:sqlite, comme les tests, ADR-008) : Node 22
// traduit le TypeScript (l'option est nécessaire : src/ a des propriétés de paramètre), et ce
// crochet de résolution traduit l'alias « @/ » vers src/.
// Aucune dépendance ; aucun fichier versionné (SEC-13).
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

registerHooks({
  resolve(specifier, context, next) {
    if (!specifier.startsWith('@/')) return next(specifier, context);
    const base = join(SRC, specifier.slice(2));
    const file = [`${base}.ts`, join(base, 'index.ts')].find((path) => existsSync(path));
    if (file === undefined) return next(specifier, context);
    return { url: pathToFileURL(file).href, format: 'module-typescript', shortCircuit: true };
  },
});

const [target, date] = process.argv.slice(2);
if (target === undefined) {
  console.error('Usage : node scripts/e2e/sauvegarde-fictive.mjs <fichier.db> [AAAA-MM-JJ]');
  process.exit(2);
}
// Le jour local de la machine : celui de l'émulateur, réglé sur la même horloge.
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const today = date ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const { writeE2eBackup } = await import('@/__fixtures__/e2eBackup');
await writeE2eBackup(resolve(target), today);
console.log(`Sauvegarde fictive écrite : ${target} (${today})`);
