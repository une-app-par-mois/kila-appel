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
const { join, relative } = require('node:path');
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
// LICENSE, LICENCE.md, LICENSE-MIT, LICENSE.markdown, COPYING…
const LICENCE_FILE = /^(licen[cs]e|copying)([.-].*)?$/i;

/**
 * Expression SPDX : identifiants, OR, AND et parenthèses (AND lie plus fort que OR).
 * Acceptée si l'un des termes d'un OR l'est, si tous ceux d'un AND le sont. Mal formée : refusée.
 */
const isAccepted = (expression) => {
  if (typeof expression !== 'string') return false;
  const tokens = expression.match(/\(|\)|[^\s()]+/g) ?? [];
  let at = 0;
  const orExpr = () => {
    let value = andExpr();
    while (tokens[at] === 'OR') {
      at += 1;
      value = andExpr() || value;
    }
    return value;
  };
  const andExpr = () => {
    let value = term();
    while (tokens[at] === 'AND') {
      at += 1;
      value = term() && value;
    }
    return value;
  };
  const term = () => {
    const token = tokens[at];
    at += 1;
    if (token === '(') {
      const value = orExpr();
      if (tokens[at] !== ')') throw new Error('parenthèse');
      at += 1;
      return value;
    }
    if (token === undefined || token === ')' || token === 'OR' || token === 'AND') {
      throw new Error('terme');
    }
    return ACCEPTED.has(token);
  };
  try {
    const value = orExpr();
    return at === tokens.length && tokens.length > 0 && value;
  } catch {
    return false;
  }
};

/** Dossiers des paquets (relatifs à la racine) cités par la carte des sources, triés. */
const packageDirsFromSources = (sources, root = ROOT) => {
  const dirs = new Set();
  for (const raw of sources) {
    // Chemin relatif à la racine, écrit « /node_modules/… », ou absolu sous la racine.
    const source = raw.startsWith(`${root}/`) ? raw.slice(root.length + 1) : raw.replace(/^\//, '');
    const at = source.lastIndexOf('node_modules/');
    if (at < 0) continue;
    const parts = source.slice(at + 'node_modules/'.length).split('/');
    const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
    dirs.add(`${source.slice(0, at)}node_modules/${name}`);
  }
  return [...dirs].sort();
};

/** Texte du fichier de licence d'un paquet (premier par ordre alphabétique), ou null. */
const licenceText = (dir) => {
  const file = readdirSync(dir)
    .filter((name) => LICENCE_FILE.test(name))
    .sort()[0];
  return file ? readFileSync(join(dir, file), 'utf8').trim() : null;
};

const licenceOf = (json) =>
  typeof json.license === 'string' ? json.license : (json.license?.type ?? '');

/** Adresse du dépôt, sans préfixe git ni suffixe .git : deux paquets d'un monorepo la partagent. */
const repositoryOf = (json) => {
  const url = typeof json.repository === 'string' ? json.repository : json.repository?.url;
  return url
    ?.replace(/^git\+/, '')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/\.git$/, '');
};

/**
 * Retire les groupes « <…> » et « (…) », imbrications comprises, caractère par caractère : aucun
 * chevron ne reste, même dans un texte mal formé (alerte CodeQL, ticket 019).
 */
const withoutGroups = (text) => {
  let kept = '';
  let angle = 0;
  let paren = 0;
  for (const char of text) {
    if (char === '<') angle += 1;
    else if (char === '>') angle = Math.max(0, angle - 1);
    else if (char === '(') paren += 1;
    else if (char === ')') paren = Math.max(0, paren - 1);
    else if (angle === 0 && paren === 0) kept += char;
  }
  return kept.replace(/\s+/g, ' ').trim();
};

/** Nom seul : l'adresse et le site du champ « author » de npm (« Nom <adresse> (site) ») sont retirés. */
const authorOf = (json) => {
  const author = typeof json.author === 'string' ? json.author : json.author?.name;
  return (typeof author === 'string' && withoutGroups(author)) || undefined;
};

/** Entrées triées par nom (sans tenir compte de la casse), dédoublonnées, et refus. */
const buildRegistry = (root, dirs, extra = []) => {
  const byKey = new Map();
  const repositories = new Map();
  for (const dir of dirs) {
    const json = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
    const key = `${json.name}@${json.version}`;
    if (byKey.has(key)) continue;
    const entry = {
      name: json.name,
      version: json.version,
      license: licenceOf(json),
      text: licenceText(join(root, dir)),
    };
    byKey.set(key, { entry, repository: repositoryOf(json), author: authorOf(json) });
    if (entry.text !== null && repositoryOf(json)) repositories.set(repositoryOf(json), entry.text);
  }
  const entries = [...byKey.values()].map(({ entry, repository, author }) => {
    if (entry.text !== null) return entry;
    // Sans fichier : licence d'un paquet embarqué du même dépôt, sinon l'auteur comme mention.
    const shared = repository ? repositories.get(repository) : undefined;
    if (shared) return { ...entry, text: shared };
    return author ? { ...entry, author } : entry;
  });
  entries.push(...extra);
  entries.sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
      a.version.localeCompare(b.version),
  );
  const refused = entries.flatMap((e) => {
    if (!isAccepted(e.license))
      return [`${e.name}@${e.version} (${e.license || 'licence absente'})`];
    if (e.text === null && !e.author)
      return [`${e.name}@${e.version} (ni texte de licence ni auteur)`];
    return [];
  });
  return { entries, refused };
};

/** Contenu du fichier : comparé tel quel par --check. */
const serialize = (entries) => `${JSON.stringify(entries, null, 2)}\n`;

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

/** Dossiers des modules natifs liés automatiquement, tels que l'autolinking les a trouvés. */
const nativeDirs = () => {
  const linked = new Set();
  const dirs = new Set();
  for (const platform of ['android', 'ios']) {
    const expo = JSON.parse(run(['expo-modules-autolinking', 'resolve', '-p', platform, '--json']));
    for (const m of expo.modules) linked.add(m.packageName);
    const rn = JSON.parse(
      run(['expo-modules-autolinking', 'react-native-config', '-p', platform, '--json']),
    );
    for (const dep of Object.values(rn.dependencies)) dirs.add(relative(ROOT, dep.root));
  }
  const found = JSON.parse(run(['expo-modules-autolinking', 'search', '--json']));
  for (const name of linked) dirs.add(relative(ROOT, found[name].path));
  return [...dirs];
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
  const json = serialize(entries);
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

module.exports = { isAccepted, packageDirsFromSources, licenceText, buildRegistry, serialize };
