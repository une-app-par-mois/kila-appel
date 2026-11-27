/**
 * @jest-environment node
 */
// Tests du registre des licences (EX-42, CONFORMITE §7), sur des paquets fictifs dans un dossier
// temporaire : aucun appel réseau, aucun export réel.
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const {
  isAccepted,
  packageDirsFromSources,
  licenceText,
  buildRegistry,
  serialize,
} = require('./licences');

describe('CONFORMITE §7 licences acceptées', () => {
  it.each([
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
  ])('accepte %s', (id) => expect(isAccepted(id)).toBe(true));

  it.each([
    'GPL-3.0',
    'LGPL-2.1',
    'AGPL-3.0',
    'SSPL-1.0',
    'MPL-2.0',
    'CC-BY-4.0',
    'UNLICENSED',
    '',
    undefined,
  ])('refuse %s', (id) => expect(isAccepted(id)).toBe(false));

  it('double licence : acceptée si l’une l’est ; « ET » : il faut les deux', () => {
    expect(isAccepted('(MIT OR CC0-1.0)')).toBe(true);
    expect(isAccepted('(BSD-3-Clause OR GPL-2.0)')).toBe(true);
    expect(isAccepted('(GPL-2.0 OR MPL-2.0)')).toBe(false);
    expect(isAccepted('(MIT AND CC-BY-4.0)')).toBe(false);
    expect(isAccepted('(MIT AND ISC)')).toBe(true);
  });

  it('respecte les parenthèses : « (A OR B) AND GPL » est refusée', () => {
    expect(isAccepted('(MIT OR Apache-2.0) AND GPL-2.0')).toBe(false);
    expect(isAccepted('(MIT OR GPL-3.0) AND GPL-3.0')).toBe(false);
    expect(isAccepted('MIT OR (GPL-3.0 AND ISC)')).toBe(true);
    expect(isAccepted('(MIT OR GPL-3.0) AND (ISC OR GPL-2.0)')).toBe(true);
  });

  it('refuse une expression mal formée', () => {
    expect(isAccepted('(MIT')).toBe(false);
    expect(isAccepted('MIT OR')).toBe(false);
    expect(isAccepted('MIT ISC')).toBe(false);
  });
});

describe('Paquets du bundle, d’après la carte des sources', () => {
  it('donne le dossier de chaque paquet, portée et dépendance imbriquée comprises', () => {
    expect(
      packageDirsFromSources([
        '/node_modules/react/index.js',
        '/node_modules/react/cjs/react.production.js',
        '/node_modules/@babel/runtime/helpers/x.js',
        '/node_modules/expo/node_modules/nanoid/index.js',
        '/src/app/_layout.tsx',
        '\u0000polyfill:external-require',
      ]),
    ).toEqual([
      'node_modules/@babel/runtime',
      'node_modules/expo/node_modules/nanoid',
      'node_modules/react',
    ]);
  });

  it('accepte des chemins absolus sous la racine du projet', () => {
    expect(
      packageDirsFromSources(['/ci/projet/node_modules/react/index.js'], '/ci/projet'),
    ).toEqual(['node_modules/react']);
  });
});

describe('Registre', () => {
  let root;
  const pkg = (dir, json, files = {}) => {
    mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, dir, 'package.json'), JSON.stringify(json));
    for (const [name, text] of Object.entries(files)) writeFileSync(join(root, dir, name), text);
  };
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'kila-licences-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('lit le fichier de licence (LICENSE, LICENCE.md, COPYING), sinon rien', () => {
    pkg('node_modules/a', { name: 'a' }, { 'LICENSE.md': 'Copyright (c) A' });
    pkg('node_modules/b', { name: 'b' }, { COPYING: 'Copyright (c) B' });
    pkg('node_modules/c', { name: 'c' });
    expect(licenceText(join(root, 'node_modules/a'))).toBe('Copyright (c) A');
    expect(licenceText(join(root, 'node_modules/b'))).toBe('Copyright (c) B');
    expect(licenceText(join(root, 'node_modules/c'))).toBeNull();
  });

  it('reconnaît LICENSE-MIT et LICENSE.markdown', () => {
    pkg('node_modules/d', { name: 'd' }, { 'LICENSE-MIT': 'Copyright (c) D' });
    pkg('node_modules/e', { name: 'e' }, { 'LICENSE.markdown': 'Copyright (c) E' });
    expect(licenceText(join(root, 'node_modules/d'))).toBe('Copyright (c) D');
    expect(licenceText(join(root, 'node_modules/e'))).toBe('Copyright (c) E');
  });

  it('sans fichier : reprend la licence d’un paquet embarqué du même dépôt (monorepo)', () => {
    const repository = { type: 'git', url: 'git+https://exemple.invalid/mono.git' };
    pkg(
      'node_modules/mono',
      { name: 'mono', version: '1.0.0', license: 'MIT', repository },
      {
        LICENSE: 'Copyright (c) Mono',
      },
    );
    pkg('node_modules/@mono/part', {
      name: '@mono/part',
      version: '1.0.0',
      license: 'MIT',
      repository: {
        ...repository,
        url: 'https://exemple.invalid/mono',
        directory: 'packages/part',
      },
    });
    const { entries } = buildRegistry(root, ['node_modules/@mono/part', 'node_modules/mono']);
    expect(entries[0]).toEqual({
      name: '@mono/part',
      version: '1.0.0',
      license: 'MIT',
      text: 'Copyright (c) Mono',
    });
  });

  it('refuse une entrée sans texte de licence ni auteur (mention obligatoire impossible)', () => {
    pkg('node_modules/o', { name: 'o', version: '1.0.0', license: 'MIT' });
    expect(buildRegistry(root, ['node_modules/o']).refused).toEqual([
      'o@1.0.0 (ni texte de licence ni auteur)',
    ]);
  });

  it('--check : une dépendance ajoutée rend le registre périmé', () => {
    pkg('node_modules/a', { name: 'a', version: '1.0.0', license: 'MIT' }, { LICENSE: 'A' });
    pkg('node_modules/b', { name: 'b', version: '1.0.0', license: 'MIT' }, { LICENSE: 'B' });
    const before = serialize(buildRegistry(root, ['node_modules/a']).entries);
    const after = serialize(buildRegistry(root, ['node_modules/a', 'node_modules/b']).entries);
    expect(after).not.toBe(before);
  });

  it('trie, dédoublonne nom et version, ajoute les polices, signale les refus', () => {
    pkg('node_modules/zed', { name: 'zed', version: '1.0.0', license: 'MIT' }, { LICENSE: 'Z' });
    pkg(
      'node_modules/alpha',
      { name: 'alpha', version: '2.0.0', license: { type: 'ISC' } },
      { LICENSE: 'A' },
    );
    pkg('node_modules/x/node_modules/alpha', { name: 'alpha', version: '2.0.0', license: 'ISC' });
    pkg(
      'node_modules/bad',
      { name: 'bad', version: '0.1.0', license: 'GPL-3.0' },
      { LICENSE: 'G' },
    );
    const { entries, refused } = buildRegistry(
      root,
      [
        'node_modules/zed',
        'node_modules/alpha',
        'node_modules/x/node_modules/alpha',
        'node_modules/bad',
      ],
      [{ name: 'IBM Plex Sans, IBM Plex Mono', version: '', license: 'OFL-1.1', text: 'OFL' }],
    );
    expect(entries.map((e) => `${e.name}@${e.version}`)).toEqual([
      'alpha@2.0.0',
      'bad@0.1.0',
      'IBM Plex Sans, IBM Plex Mono@',
      'zed@1.0.0',
    ]);
    expect(entries[0]).toEqual({ name: 'alpha', version: '2.0.0', license: 'ISC', text: 'A' });
    expect(refused).toEqual(['bad@0.1.0 (GPL-3.0)']);
  });

  it('sans fichier de licence : garde l’auteur pour la mention obligatoire', () => {
    pkg('node_modules/m', {
      name: 'm',
      version: '1.0.0',
      license: 'MIT',
      author: 'Meta Platforms <contact@exemple.invalid> (https://exemple.invalid)',
    });
    pkg('node_modules/n', {
      name: 'n',
      version: '1.0.0',
      license: 'MIT',
      author: { name: 'Expo' },
    });
    // Chevrons imbriqués : rien après le premier « < » n'est gardé (alerte CodeQL, ticket 019).
    pkg('node_modules/o', {
      name: 'o',
      version: '1.0.0',
      license: 'MIT',
      author: 'Alix Exemple <a<b>c> (https://exemple.invalid)',
    });
    const { entries } = buildRegistry(root, ['node_modules/m', 'node_modules/n', 'node_modules/o']);
    expect(entries).toEqual([
      { name: 'm', version: '1.0.0', license: 'MIT', text: null, author: 'Meta Platforms' },
      { name: 'n', version: '1.0.0', license: 'MIT', text: null, author: 'Expo' },
      { name: 'o', version: '1.0.0', license: 'MIT', text: null, author: 'Alix Exemple' },
    ]);
  });
});
