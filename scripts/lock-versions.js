// Lecture du verrou de versions (package-lock.json) pour les garde-fous de l'outillage
// (tickets 017 et 018). Fichier local seulement, aucun réseau.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

function readLock() {
  return JSON.parse(readFileSync(join(__dirname, '..', 'package-lock.json'), 'utf8'));
}

// Trois nombres de la version, sans préversion (-…) ni indication de build (+…).
function parts(version) {
  return version.split(/[-+]/)[0].split('.').map(Number);
}

function lowerThan(a, b) {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i += 1) {
    if (x[i] !== y[i]) return x[i] < y[i];
  }
  // À égalité sur les trois nombres, une préversion (avec un tiret avant tout +) est plus petite.
  const pre = (v) => v.split('+')[0].includes('-');
  return pre(a) && !pre(b);
}

// Copies installées du paquet `name` : chemin et version (absente pour un lien, par exemple).
function installed(lock, name) {
  return Object.entries(lock.packages)
    .filter(([path]) => path.endsWith(`node_modules/${name}`))
    .map(([path, info]) => ({ path, version: info.version }));
}

function withoutVersion(lock, name) {
  return installed(lock, name)
    .filter(({ version }) => typeof version !== 'string')
    .map(({ path }) => `${path} : entrée sans version`);
}

// Version minimale d'une plage déclarée (« ^14.0.2 », « >=9 <15 », « ^7 || ^8 ») : la plus petite
// version citée ; null si la plage n'en cite aucune (« * », « latest »).
function minVersion(spec) {
  const found = spec
    .split('||')
    .map((range) => range.match(/\d+(\.\d+){0,2}/))
    .filter(Boolean)
    .map(([v]) => [...v.split('.'), '0', '0'].slice(0, 3).join('.'));
  if (found.length === 0) return null;
  return found.reduce((min, v) => (lowerThan(v, min) ? v : min));
}

// Paquets du verrou qui déclarent `name` avec une version minimale >= `ceiling` : l'override,
// borné vers une version plus basse, les redescendrait sans bruit.
function declaredFrom(lock, name, ceiling) {
  const found = [];
  for (const [path, info] of Object.entries(lock.packages)) {
    const deps = { ...info.peerDependencies, ...info.optionalDependencies, ...info.dependencies };
    const spec = deps[name];
    const min = typeof spec === 'string' ? minVersion(spec) : null;
    if (min !== null && !lowerThan(min, ceiling)) {
      found.push(`${path || '(racine)'} déclare ${name} ${spec} : ajuster l'override`);
    }
  }
  return found;
}

module.exports = { readLock, lowerThan, installed, withoutVersion, declaredFrom };
