/**
 * @jest-environment node
 */
// Tests du registre des licences (EX-42, CONFORMITE §7), sur des paquets fictifs dans un dossier
// temporaire : aucun appel réseau, aucun export réel.
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { isAccepted, packageDirsFromSources, licenceText, buildRegistry } = require('./licences');

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
    const { entries } = buildRegistry(root, ['node_modules/m', 'node_modules/n']);
    expect(entries).toEqual([
      { name: 'm', version: '1.0.0', license: 'MIT', text: null, author: 'Meta Platforms' },
      { name: 'n', version: '1.0.0', license: 'MIT', text: null, author: 'Expo' },
    ]);
  });
});
