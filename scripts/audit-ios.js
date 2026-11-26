#!/usr/bin/env node
// Contrôles du binaire iOS construit (ABS-06, ABS-07, SEC-03). macOS seulement (plutil).
// Usage : node scripts/audit-ios.js <KiLa.app> <KiLa.entitlements>
// Échoue (code 1) au moindre écart.
const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

/** Écarts d'un Info.plist et d'un fichier d'habilitations, déjà lus en objets. */
const auditIos = (infoPlist, entitlements) => {
  const problems = [];
  if (infoPlist.ITSAppUsesNonExemptEncryption !== false) {
    problems.push('ITSAppUsesNonExemptEncryption doit valoir false');
  }
  for (const type of infoPlist.CFBundleURLTypes ?? []) {
    for (const scheme of type.CFBundleURLSchemes ?? []) {
      problems.push(`Scheme d’URL déclaré : ${scheme}`);
    }
  }
  for (const key of Object.keys(entitlements)) {
    problems.push(`Habilitation non attendue : ${key}`);
  }
  return problems;
};

/** Lit un plist (binaire ou XML) en JSON ; arguments passés sans shell. */
const readPlist = (file) =>
  JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', file], { encoding: 'utf8' }));

const main = (app, entitlementsFile) => {
  const infoFile = app ? join(app, 'Info.plist') : '';
  if (!existsSync(infoFile) || !entitlementsFile || !existsSync(entitlementsFile)) {
    console.error('Usage : node scripts/audit-ios.js <KiLa.app> <KiLa.entitlements>');
    return 1;
  }
  const problems = auditIos(readPlist(infoFile), readPlist(entitlementsFile));
  if (problems.length > 0) {
    console.error(`Audit du binaire iOS : ${problems.length} écart(s)`);
    for (const p of problems) console.error(`- ${p}`);
    return 1;
  }
  console.log('Audit du binaire iOS : conforme');
  return 0;
};

if (require.main === module) {
  process.exitCode = main(process.argv[2], process.argv[3]);
}

module.exports = { auditIos };
