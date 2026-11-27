/**
 * @jest-environment node
 */
// Ticket 018 : aucune version de glob dans la plage vulnérable du verrou de versions
// (GHSA-3g3m-2fjr-6pw4, annulation par AbortSignal contournée, >= 9.0.0 et < 14.0.2).
// glob 7.x, hors de la plage et d'une autre interface (test-exclude@6), reste permis.
// Lecture du fichier local, aucun réseau.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const lock = JSON.parse(readFileSync(join(__dirname, '..', 'package-lock.json'), 'utf8'));

function parts(version) {
  return version.split('-')[0].split('.').map(Number);
}

function lowerThan(a, b) {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i += 1) {
    if (x[i] !== y[i]) return x[i] < y[i];
  }
  // À égalité sur les trois nombres, une préversion (avec un tiret) est plus petite.
  return a.includes('-') && !b.includes('-');
}

function isVulnerable(version) {
  return !lowerThan(version, '9.0.0') && lowerThan(version, '14.0.2');
}

const globVersions = Object.entries(lock.packages)
  .filter(([path]) => path.endsWith('node_modules/glob'))
  .map(([path, info]) => ({ path, version: info.version }));

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

  it('le verrou contient glob', () => {
    expect(globVersions.length).toBeGreaterThan(0);
  });

  it("aucune version vulnérable n'est installée", () => {
    expect(globVersions.filter(({ version }) => isVulnerable(version))).toEqual([]);
  });
});
