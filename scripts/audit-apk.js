#!/usr/bin/env node
// Audit du binaire Android construit, pas du manifeste source (SEC-02, ABS-01, ABS-07).
// Usage : node scripts/audit-apk.js <fichier.apk>
// Compare `aapt2 dump permissions` à config/permissions-attendues.txt et vérifie le manifeste
// compilé (allowBackup=false, aucun lien profond). Échoue (code 1) au moindre écart.
const { execFileSync } = require('node:child_process');
const { existsSync, readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const INTERNET = 'android.permission.INTERNET';
const ANDROID_NS = 'http://schemas.android.com/apk/res/android';

/** Liste figée : une permission par ligne ; `#` commente. */
const parseExpected = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));

/** Écarts entre les permissions du binaire et la liste attendue. */
const auditPermissions = (dump, expected) => {
  if (!/^package: /m.test(dump)) return ['Sortie aapt2 illisible'];
  const actual = [...dump.matchAll(/^uses-permission(?:-sdk-23)?: name='([^']+)'/gm)].map(
    (m) => m[1],
  );
  if (actual.includes(INTERNET)) return ['INTERNET interdite (ABS-01)'];
  return [
    ...actual.filter((p) => !expected.includes(p)).map((p) => `Permission non attendue : ${p}`),
    ...expected.filter((p) => !actual.includes(p)).map((p) => `Permission attendue absente : ${p}`),
  ];
};

/** Écarts du manifeste compilé (`aapt2 dump xmltree --file AndroidManifest.xml`). */
const auditManifest = (xmltree) => {
  const problems = [];
  if (!xmltree.includes(`${ANDROID_NS}:allowBackup(0x01010280)=false`)) {
    problems.push('allowBackup doit valoir false');
  }
  // Un lien profond entrant est un android:scheme sous un intent-filter. Celui d'un bloc
  // <queries> sert seulement à voir les navigateurs installés : il n'ouvre aucune entrée.
  const stack = [];
  for (const line of xmltree.split('\n')) {
    const depth = line.length - line.trimStart().length;
    const element = line.match(/^\s*E: ([\w-]+)/);
    if (element) {
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
      stack.push({ depth, name: element[1] });
      continue;
    }
    const scheme = line.match(new RegExp(`${ANDROID_NS}:scheme\\(0x[0-9a-f]+\\)="([^"]*)"`));
    if (scheme && stack.some((e) => e.name === 'intent-filter')) {
      problems.push(`Lien profond déclaré : ${scheme[1]}`);
    }
  }
  return problems;
};

/** aapt2 : variable AAPT2, sinon la version la plus récente des build-tools du SDK Android. */
const findAapt2 = () => {
  if (process.env.AAPT2) return process.env.AAPT2;
  const tools = join(process.env.ANDROID_HOME ?? '', 'build-tools');
  const versions = existsSync(tools) ? readdirSync(tools).sort() : [];
  const latest = versions[versions.length - 1];
  if (!latest) throw new Error('aapt2 introuvable : définir AAPT2 ou ANDROID_HOME');
  return join(tools, latest, 'aapt2');
};

const main = (apk) => {
  if (!apk || !existsSync(apk)) {
    console.error('Usage : node scripts/audit-apk.js <fichier.apk>');
    return 1;
  }
  const aapt2 = findAapt2();
  // Arguments passés sans shell : aucun risque d'injection par le nom du fichier.
  const run = (...args) => execFileSync(aapt2, args, { encoding: 'utf8' });
  const expected = parseExpected(
    readFileSync(join(__dirname, '..', 'config', 'permissions-attendues.txt'), 'utf8'),
  );
  const dump = run('dump', 'permissions', apk);
  const problems = [
    ...auditPermissions(dump, expected),
    ...auditManifest(run('dump', 'xmltree', '--file', 'AndroidManifest.xml', apk)),
  ];
  console.log(dump);
  if (problems.length > 0) {
    console.error(`Audit du binaire : ${problems.length} écart(s)`);
    for (const p of problems) console.error(`- ${p}`);
    return 1;
  }
  console.log('Audit du binaire : conforme (SEC-02)');
  return 0;
};

if (require.main === module) {
  process.exitCode = main(process.argv[2]);
}

module.exports = { auditManifest, auditPermissions, parseExpected };
