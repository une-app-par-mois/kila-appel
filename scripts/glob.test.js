/**
 * @jest-environment node
 */
// Ticket 018 : aucune version de glob dans la plage vulnérable du verrou de versions
// (GHSA-3g3m-2fjr-6pw4, annulation par AbortSignal contournée, >= 9.0.0 et < 14.0.2).
// glob 7.x, hors de la plage et d'une autre interface (test-exclude@6), reste permis.
// Lecture du fichier local, aucun réseau.
const { readLock, lowerThan, installed, withoutVersion, declaredFrom } = require('./lock-versions');

const lock = readLock();

function isVulnerable(version) {
  return !lowerThan(version, '9.0.0') && lowerThan(version, '14.0.2');
}

function vulnerable(lockFile) {
  return installed(lockFile, 'glob').filter(
    ({ version }) => typeof version === 'string' && isVulnerable(version),
  );
}

describe('018 glob hors de la plage vulnérable', () => {
  it('reconnaît la plage vulnérable', () => {
    expect(['7.2.3', '8.1.0', '14.0.2', '14.0.6'].map(isVulnerable)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(['9.0.0', '10.5.0', '13.0.7', '14.0.1'].map(isVulnerable)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('classe vulnérable une préversion de 14.0.2', () => {
    expect(isVulnerable('14.0.2-rc.1')).toBe(true);
    expect(isVulnerable('9.0.0-beta.1')).toBe(false);
  });

  it('lit une version avec indication de build', () => {
    expect(isVulnerable('14.0.1+meta')).toBe(true);
    expect(isVulnerable('14.0.2+meta')).toBe(false);
    expect(isVulnerable('14.0.2-rc.1+meta')).toBe(true);
  });

  it('signale par son chemin une entrée sans version, sans planter', () => {
    const fake = { packages: { 'node_modules/x/node_modules/glob': { link: true } } };
    expect(withoutVersion(fake, 'glob')).toEqual([
      'node_modules/x/node_modules/glob : entrée sans version',
    ]);
    expect(vulnerable(fake)).toEqual([]);
  });

  it('repère une dépendance que l’override redescendrait', () => {
    const fake = {
      packages: {
        'node_modules/a': { dependencies: { glob: '^15.0.0' } },
        'node_modules/b': { dependencies: { glob: '^14.0.2' } },
        'node_modules/c': { peerDependencies: { glob: '>=16 || ^15.1.0' } },
      },
    };
    expect(declaredFrom(fake, 'glob', '15.0.0')).toEqual([
      "node_modules/a déclare glob ^15.0.0 : ajuster l'override",
      "node_modules/c déclare glob >=16 || ^15.1.0 : ajuster l'override",
    ]);
  });

  it('le verrou contient glob', () => {
    expect(installed(lock, 'glob').length).toBeGreaterThan(0);
  });

  it('chaque copie de glob a une version', () => {
    expect(withoutVersion(lock, 'glob')).toEqual([]);
  });

  it("aucune version vulnérable n'est installée", () => {
    expect(vulnerable(lock)).toEqual([]);
  });

  it("aucun paquet ne demande glob 15 ou plus (sinon ajuster l'override)", () => {
    expect(declaredFrom(lock, 'glob', '15.0.0')).toEqual([]);
  });
});
