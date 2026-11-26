#!/usr/bin/env node
// Registre des licences embarquées (EX-42, CONFORMITE §7), généré, jamais écrit à la main.
// « Embarquées » (décision du porteur du 2026-11-26) : paquets du bundle JavaScript exporté
// (carte des sources, Android et iOS), modules natifs liés automatiquement, polices.
// Les bibliothèques natives Gradle et CocoaPods sont inventoriées à part (CONFORMITE §8).
// Usage : node scripts/licences.js          écrit src/config/licences.json
//         node scripts/licences.js --check  échoue si le fichier n'est plus à jour (CI)
// Échoue (code 1) sur une licence refusée ou inconnue. Commandes lancées sans shell.
const { execFileSync } = require('node:child_process');
const {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require('node:fs');
const { dirname, join } = require('node:path');
const { tmpdir } = require('node:os');

const ROOT = join(__dirname, '..');
const OUTPUT = join(ROOT, 'src/config/licences.json');
const ACCEPTED = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Unlicense',
  'OFL-1.1',
]);
const LICENCE_FILE = /^(licen[cs]e|copying)(\.(md|txt))?$/i;

/** Expression SPDX simple : « A OR B » acceptée si l'une l'est, « A AND B » si les deux. */
const isAccepted = (expression) => {
  if (typeof expression !== 'string' || expression.trim() === '') return false;
  const bare = expression.replace(/[()]/g, '').trim();
  if (/\sOR\s/.test(bare)) return bare.split(/\s+OR\s+/).some(isAccepted);
  if (/\sAND\s/.test(bare)) return bare.split(/\s+AND\s+/).every(isAccepted);
  return ACCEPTED.has(bare);
};

/** Dossiers des paquets (relatifs à la racine) cités par la carte des sources, triés. */
const packageDirsFromSources = (sources) => {
  const dirs = new Set();
  for (const source of sources) {
    const at = source.lastIndexOf('node_modules/');
    if (at < 0) continue;
    const parts = source.slice(at + 'node_modules/'.length).split('/');
    const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
    dirs.add(`${source.slice(0, at).replace(/^\//, '')}node_modules/${name}`);
  }
  return [...dirs].sort();
};

/** Texte du fichier de licence d'un paquet, ou null s'il n'en livre pas. */
const licenceText = (dir) => {
  const file = readdirSync(dir).find((name) => LICENCE_FILE.test(name));
  return file ? readFileSync(join(dir, file), 'utf8').trim() : null;
};

const licenceOf = (json) =>
  typeof json.license === 'string' ? json.license : (json.license?.type ?? '');

/** Entrées triées par nom (sans tenir compte de la casse), dédoublonnées, et refus. */
const buildRegistry = (root, dirs, extra = []) => {
  const byKey = new Map();
  for (const dir of dirs) {
    const json = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
    const key = `${json.name}@${json.version}`;
    if (byKey.has(key)) continue;
    const text = licenceText(join(root, dir));
    // Nom seul : l'adresse et le site du champ « author » de npm ne sont pas repris.
    const author = (typeof json.author === 'string' ? json.author : json.author?.name)
      ?.replace(/\s*<[^>]*>/g, '')
      .replace(/\s*\([^)]*\)/g, '')
      .trim();
    byKey.set(key, {
      name: json.name,
      version: json.version,
      license: licenceOf(json),
      text,
      // Sans fichier de licence, l'auteur sert de mention obligatoire.
      ...(text === null && author ? { author } : {}),
    });
  }
  for (const entry of extra) byKey.set(`${entry.name}@${entry.version}`, entry);
  const entries = [...byKey.values()].sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
      a.version.localeCompare(b.version),
  );
  const refused = entries
    .filter((e) => !isAccepted(e.license))
    .map((e) => `${e.name}@${e.version} (${e.license || 'licence absente'})`);
  return { entries, refused };
};

const run = (args) =>
  execFileSync('npx', args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1' } });

/** Sources des bundles exportés pour Android et iOS. */
const bundleSources = () => {
  const out = mkdtempSync(join(tmpdir(), 'kila-export-'));
  try {
    run([
      'expo',
      'export',
      '--platform',
      'android',
      '--platform',
      'ios',
      '--source-maps',
      '--output-dir',
      out,
    ]);
    const maps = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith('.map')) maps.push(path);
      }
    };
    walk(out);
    return maps.flatMap((map) => JSON.parse(readFileSync(map, 'utf8')).sources);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
};

/** Modules natifs liés automatiquement (Expo et React Native), pour les deux plateformes. */
const nativeDirs = () => {
  const names = new Set();
  for (const platform of ['android', 'ios']) {
    const expo = JSON.parse(run(['expo-modules-autolinking', 'resolve', '-p', platform, '--json']));
    for (const m of expo.modules) names.add(m.packageName);
    const rn = JSON.parse(
      run(['expo-modules-autolinking', 'react-native-config', '-p', platform, '--json']),
    );
    for (const name of Object.keys(rn.dependencies)) names.add(name);
  }
  return [...names].map((name) => {
    const dir = dirname(require.resolve(`${name}/package.json`, { paths: [ROOT] }));
    return dir.slice(ROOT.length + 1);
  });
};

const FONTS = () => ({
  name: 'IBM Plex Sans, IBM Plex Mono',
  version: '',
  license: 'OFL-1.1',
  text: readFileSync(join(ROOT, 'assets/fonts/OFL.txt'), 'utf8').trim(),
});

const main = (check) => {
  const dirs = [...new Set([...packageDirsFromSources(bundleSources()), ...nativeDirs()])];
  const { entries, refused } = buildRegistry(ROOT, dirs, [FONTS()]);
  if (refused.length > 0) {
    console.error(`Licences refusées ou inconnues (CONFORMITE §7) : ${refused.length}`);
    for (const r of refused) console.error(`- ${r}`);
    return 1;
  }
  const json = `${JSON.stringify(entries, null, 2)}\n`;
  if (check) {
    if (!existsSync(OUTPUT) || readFileSync(OUTPUT, 'utf8') !== json) {
      console.error('src/config/licences.json n’est plus à jour : node scripts/licences.js');
      return 1;
    }
    console.log(`Registre des licences à jour : ${entries.length} entrées`);
    return 0;
  }
  writeFileSync(OUTPUT, json);
  console.log(`Registre des licences écrit : ${entries.length} entrées`);
  return 0;
};

if (require.main === module) {
  process.exitCode = main(process.argv.includes('--check'));
}

module.exports = { isAccepted, packageDirsFromSources, licenceText, buildRegistry };
