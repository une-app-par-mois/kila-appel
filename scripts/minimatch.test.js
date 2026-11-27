/**
 * @jest-environment node
 */
// Ticket 017 : aucune version de minimatch dans la plage vulnérable du verrou de versions
// (GHSA-g3hv-75wg-m249, déni de service, >= 7.0.0 et < 11.0.1). Les versions 3.x, hors de la
// plage et d'une autre interface, restent permises. Lecture du fichier local, aucun réseau.
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
  return !lowerThan(version, '7.0.0') && lowerThan(version, '11.0.1');
}

const minimatchVersions = Object.entries(lock.packages)
  .filter(([path]) => path.endsWith('node_modules/minimatch'))
  .map(([path, info]) => ({ path, version: info.version }));

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

  it('le verrou contient minimatch', () => {
    expect(minimatchVersions.length).toBeGreaterThan(0);
  });

  it("aucune version vulnérable n'est installée", () => {
    expect(minimatchVersions.filter(({ version }) => isVulnerable(version))).toEqual([]);
  });
});
