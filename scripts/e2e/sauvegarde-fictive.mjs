// Sauvegardes fictives des parcours de bout en bout (tickets 016 et 030), lancées par scripts/e2e.sh :
//   node --experimental-transform-types scripts/e2e/sauvegarde-fictive.mjs <dossier> [AAAA-MM-JJ]
// Écrit dans <dossier> les quatre sauvegardes de la campagne (E2E_FILES de e2eBackup.ts).
// Elle réutilise le code de src/data/ tel quel (node:sqlite, comme les tests, ADR-008) : Node 22
// traduit le TypeScript (l'option est nécessaire : src/ a des propriétés de paramètre), et ce
// crochet de résolution traduit l'alias « @/ » vers src/.
// Aucune dépendance ; aucun fichier versionné (SEC-13). Node 22.15 au moins (module.registerHooks).
import { existsSync } from 'node:fs';
import * as nodeModule from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

// Import en espace de noms : un Node plus ancien atteint ce message au lieu d'une erreur de liaison.
if (typeof nodeModule.registerHooks !== 'function') {
  console.error(
    `Node 22.15 ou plus récent est nécessaire (version actuelle : ${process.version}).`,
  );
  process.exit(1);
}

nodeModule.registerHooks({
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
  console.error('Usage : node scripts/e2e/sauvegarde-fictive.mjs <dossier> [AAAA-MM-JJ]');
  process.exit(2);
}
// Sans date : le jour local de la machine. Une date donnée (même vide) doit être AAAA-MM-JJ.
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const today =
  date === undefined
    ? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    : date;
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  console.error(`Date invalide : « ${today} » (attendu : AAAA-MM-JJ).`);
  process.exit(2);
}

const { E2E_FILES, writeE2eBackups } = await import('@/__fixtures__/e2eBackup');
try {
  await writeE2eBackups(resolve(target), today);
} catch (error) {
  // Refus attendu (jour hors du jeu des statistiques) : le message seul, sans pile.
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
console.log(`Sauvegardes fictives écrites dans ${target} (${today}) :`);
for (const name of Object.values(E2E_FILES)) console.log(`  ${name}`);
