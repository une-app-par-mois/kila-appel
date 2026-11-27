/**
 * @jest-environment node
 */
// Ticket 017 : aucune version de minimatch dans la plage vulnérable du verrou de versions
// (GHSA-g3hv-75wg-m249, déni de service, >= 7.0.0 et < 11.0.1). Les versions 3.x, hors de la
// plage et d'une autre interface, restent permises. Lecture du fichier local, aucun réseau.
const { readLock, lowerThan, installed, withoutVersion, declaredFrom } = require('./lock-versions');

const lock = readLock();

function isVulnerable(version) {
  return !lowerThan(version, '7.0.0') && lowerThan(version, '11.0.1');
}

function vulnerable(lockFile) {
  return installed(lockFile, 'minimatch').filter(
    ({ version }) => typeof version === 'string' && isVulnerable(version),
  );
}

describe('017 minimatch hors de la plage vulnérable', () => {
  it('reconnaît la plage vulnérable', () => {
    expect(['3.1.5', '6.2.0', '11.0.1', '11.0.9'].map(isVulnerable)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(['7.0.0', '9.0.9', '10.2.6', '11.0.0'].map(isVulnerable)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('classe vulnérable une préversion de 11.0.1', () => {
    expect(isVulnerable('11.0.1-rc.1')).toBe(true);
    expect(isVulnerable('7.0.0-beta.1')).toBe(false);
  });

  it('lit une version avec indication de build (018)', () => {
    expect(isVulnerable('11.0.0+meta')).toBe(true);
    expect(isVulnerable('11.0.1+meta')).toBe(false);
  });

  it('signale par son chemin une entrée sans version, sans planter (018)', () => {
    const fake = { packages: { 'node_modules/x/node_modules/minimatch': { link: true } } };
    expect(withoutVersion(fake, 'minimatch')).toEqual([
      'node_modules/x/node_modules/minimatch : entrée sans version',
    ]);
    expect(vulnerable(fake)).toEqual([]);
  });

  it('repère une dépendance que l’override redescendrait (018)', () => {
    const fake = { packages: { 'node_modules/a': { dependencies: { minimatch: '^12.0.0' } } } };
    expect(declaredFrom(fake, 'minimatch', '12.0.0')).toEqual([
      "node_modules/a déclare minimatch ^12.0.0 : ajuster l'override",
    ]);
  });

  it('le verrou contient minimatch', () => {
    expect(installed(lock, 'minimatch').length).toBeGreaterThan(0);
  });

  it('chaque copie de minimatch a une version (018)', () => {
    expect(withoutVersion(lock, 'minimatch')).toEqual([]);
  });

  it("aucune version vulnérable n'est installée", () => {
    expect(vulnerable(lock)).toEqual([]);
  });

  it("aucun paquet ne demande minimatch 12 ou plus, sinon ajuster l'override (018)", () => {
    expect(declaredFrom(lock, 'minimatch', '12.0.0')).toEqual([]);
  });
});
