/**
 * @jest-environment node
 */
// ABS-01, SEC-01 (tickets 014b et 014e, décisions du porteur du 2026-11-27) : expo-file-system,
// expo-sharing et expo-document-picker ne sont importés que par l'adaptateur src/data/expoFiles.ts ;
// leurs sous-chemins (legacy, next, build), leurs fonctions réseau et l'accès direct aux modules
// natifs (requireNativeModule) sont refusés partout (revue de sécurité du 014b).
// Contrôle sur l'arbre syntaxique de TypeScript, comme src/staticChecks.test.ts. Limite connue :
// un nom calculé (obj[a + b], obj[nom]) n'est pas vu ; la revue et l'audit de l'APK le complètent.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { tempDir } from '@/__fixtures__/backupFiles';
import {
  literalText,
  moduleName,
  readsExpoModules,
  readsGlobalExpo,
} from '@/__fixtures__/expoAccess';
import { scriptKind, TEST_FILE, walkSources } from '@/__fixtures__/sourceFiles';

/** Seul fichier autorisé à importer ces modules de fichiers (liste testée). */
const FILE_MODULE_OWNERS = ['src/data/expoFiles.ts'];
const FILE_MODULES = /^(expo-file-system|expo-sharing|expo-document-picker)$/;
// Sous-chemin d'un de ces modules (legacy, next, build/…) : refusé partout, adaptateur compris.
const SUBPATH = /^(expo-file-system|expo-sharing|expo-document-picker)\//;
// Accès direct à un module natif, qui contournerait l'adaptateur et ce contrôle.
const NATIVE_ACCESS = new Set(['requireNativeModule', 'requireOptionalNativeModule']);
// Noms des modules natifs de fichiers (revue du 014e) : refusés hors de l'adaptateur, en chaîne
// comme en identifiant (`globalThis.expo.modules.ExpoDocumentPicker`, `NativeModules[…]`).
const NATIVE_NAMES = new Set(['ExpoDocumentPicker', 'FileSystem', 'ExpoSharing']);
// Téléchargement et envoi d'expo-file-system (nouvelle API et legacy), et résolution d'un contenu
// partagé par expo-sharing (« peut demander une connexion au réseau »).
const FILE_NETWORK = new Set([
  'downloadFileAsync',
  'downloadAsync',
  'uploadAsync',
  'createDownloadResumable',
  'createUploadTask',
  'DownloadResumable',
  'UploadTask',
  'createDownloadTask',
  'DownloadTask',
  'upload',
  'getResolvedSharedPayloadsAsync',
]);

type Violation = { rule: string; line: number };

const check = (file: string, source: string): Violation[] => {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));
  const found: Violation[] = [];
  const add = (rule: string, node: ts.Node) =>
    found.push({ rule, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
  const visit = (node: ts.Node) => {
    const name = moduleName(node);
    if (name !== undefined && SUBPATH.test(name)) add('ABS-01 sous-chemin', node);
    else if (name !== undefined && FILE_MODULES.test(name) && !FILE_MODULE_OWNERS.includes(file)) {
      add('ABS-01 import hors de expoFiles.ts', node);
    }
    const key = ts.isElementAccessExpression(node)
      ? literalText(node.argumentExpression)
      : ts.isIdentifier(node)
        ? node.text
        : undefined;
    if (key !== undefined && FILE_NETWORK.has(key)) add('ABS-01 réseau', node);
    if (key !== undefined && NATIVE_ACCESS.has(key)) add('ABS-01 module natif', node);
    if (readsExpoModules(node)) add('ABS-01 module natif', node);
    if (readsGlobalExpo(node) && !FILE_MODULE_OWNERS.includes(file)) {
      add('ABS-01 objet expo global', node);
    }
    const named = ts.isIdentifier(node) ? node.text : literalText(node);
    if (named !== undefined && NATIVE_NAMES.has(named) && !FILE_MODULE_OWNERS.includes(file)) {
      add('ABS-01 nom de module natif', node);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
};

const rules = (file: string, source: string) => check(file, source).map((v) => v.rule);

describe('ABS-01 modules de fichiers seulement dans src/data/expoFiles.ts', () => {
  it.each([
    "import { File } from 'expo-file-system';",
    "import * as Sharing from 'expo-sharing';",
    "import type { FileInfo } from 'expo-file-system';",
    "export { Paths } from 'expo-file-system';",
    "const fs = require('expo-file-system');",
    "const fs = await import('expo-file-system');",
    "type F = import('expo-file-system').File;",
    "import { getDocumentAsync } from 'expo-document-picker';",
    "const picker = require('expo-document-picker');",
    "const picker = await import('expo-document-picker');",
    "export * from 'expo-document-picker';",
  ])('repère hors de l’adaptateur : %s', (source) => {
    expect(rules('src/hooks/useBackupExport.ts', source)).toEqual([
      'ABS-01 import hors de expoFiles.ts',
    ]);
  });

  it('autorise l’adaptateur, et lui seul', () => {
    const source =
      "import { File } from 'expo-file-system'; import { shareAsync } from 'expo-sharing';" +
      " import { getDocumentAsync } from 'expo-document-picker';";
    expect(rules('src/data/expoFiles.ts', source)).toEqual([]);
    expect(rules('src/data/expoFiles.test.ts', source)).toEqual([
      'ABS-01 import hors de expoFiles.ts',
      'ABS-01 import hors de expoFiles.ts',
      'ABS-01 import hors de expoFiles.ts',
    ]);
  });

  it.each([
    "import { getInfoAsync } from 'expo-file-system/legacy';",
    "const legacy = require('expo-file-system/legacy');",
    "import { File } from 'expo-file-system/next';",
    "import { File } from 'expo-file-system/build/File';",
    "const n = require('expo-file-system/build/ExpoFileSystem');",
    "import { shareAsync } from 'expo-sharing/build/Sharing';",
    "import { getDocumentAsync } from 'expo-document-picker/build/index';",
    "const m = require('expo-document-picker/build/ExpoDocumentPicker');",
    "const m = await import('expo-document-picker/src/index');",
  ])('refuse partout, adaptateur compris : %s', (source) => {
    expect(rules('src/data/expoFiles.ts', source)).toEqual(['ABS-01 sous-chemin']);
  });

  it.each([
    "import { requireNativeModule } from 'expo-modules-core';",
    "const m = requireOptionalNativeModule('FileSystem');",
    "const m = expo['requireNativeModule']('FileSystem');",
  ])('refuse l’accès direct à un module natif, partout : %s', (source) => {
    expect(rules('src/data/expoFiles.ts', source)).toEqual(['ABS-01 module natif']);
  });

  it.each([
    'const m = globalThis.expo.modules.ExpoDocumentPicker;',
    "const m = globalThis.expo['modules'];",
    'const m = global.expo.modules;',
    'const { modules } = globalThis.expo;',
  ])('refuse la table des modules natifs (expo.modules), partout : %s', (source) => {
    expect(rules('src/data/expoFiles.ts', source)).toEqual(['ABS-01 module natif']);
  });

  it.each([
    "const name = 'ExpoDocumentPicker';",
    'const m = FileSystem;',
    "const n = NativeModules['ExpoSharing'];",
    'const n = `FileSystem`;',
  ])('refuse le nom d’un module natif hors de l’adaptateur : %s', (source) => {
    expect(rules('src/hooks/useRestore.ts', source)).toEqual(['ABS-01 nom de module natif']);
    expect(rules('src/data/expoFiles.ts', source)).toEqual([]);
  });

  it.each([
    'const e = globalThis.expo; e.modules[name];',
    "const e = global['expo'];",
    'const { expo } = globalThis;',
  ])('refuse l’objet global expo hors de l’adaptateur : %s', (source) => {
    expect(rules('src/hooks/useRestore.ts', source)).toEqual(['ABS-01 objet expo global']);
    expect(rules('src/data/expoFiles.ts', source)).toEqual([]);
  });

  it('laisse passer `modules` lu ailleurs que sur expo', () => {
    expect(
      rules('src/hooks/useRestore.ts', 'const m = config.modules; const e = expo.version;'),
    ).toEqual([]);
  });

  it('analyse aussi le JavaScript (.js, .jsx, .mjs, .cjs)', () => {
    for (const file of ['src/a.js', 'src/a.jsx', 'src/a.mjs', 'src/a.cjs']) {
      expect(rules(file, "const fs = require('expo-file-system'); fs.upload(u);")).toEqual([
        'ABS-01 import hors de expoFiles.ts',
        'ABS-01 réseau',
      ]);
    }
  });

  it.each([
    'await File.downloadFileAsync(url, dir);',
    'await FileSystem.downloadAsync(url, path);',
    'await FileSystem.uploadAsync(url, path);',
    'const d = FileSystem.createDownloadResumable(url, path);',
    'const t = file.createUploadTask(url);',
    'const t = File.createDownloadTask(url, dir);',
    'await file.upload(url);',
    "await file['upload'](url);",
    "import { UploadTask, DownloadTask } from 'x';",
    'let d: DownloadResumable;',
    'await Sharing.getResolvedSharedPayloadsAsync();',
  ])('refuse une fonction réseau, partout : %s', (source) => {
    const found = rules('src/data/expoFiles.ts', source);
    expect(found.length).toBeGreaterThan(0);
    expect(new Set(found)).toEqual(new Set(['ABS-01 réseau']));
  });

  it('laisse passer le texte d’une chaîne et les autres noms', () => {
    const source = "const m = 'pas de upload ici'; const uploaded = 1; file.copy(dest);";
    expect(rules('src/data/expoFiles.ts', source)).toEqual([]);
  });
});

describe('Le code du dépôt respecte le contrôle des fichiers', () => {
  const root = join(__dirname, '..');
  const files = walkSources(join(root, 'src')).map((path) => relative(root, path));
  const read = (file: string) => readFileSync(join(root, file), 'utf8');
  // Ce fichier-ci nomme ces modules et ces fonctions pour les contrôler.
  const SELF = 'src/staticChecksFiles.test.ts';

  it('aucun écart dans src/, tests compris', () => {
    const violations = files
      .filter((file) => file !== SELF)
      .flatMap((file) => check(file, read(file)).map((v) => ({ file, ...v })));
    expect(violations).toEqual([]);
  });

  it('seul src/data/expoFiles.ts importe les modules de fichiers', () => {
    const importing = files
      .filter((file) => !TEST_FILE.test(file))
      .filter((file) =>
        /['"](expo-file-system|expo-sharing|expo-document-picker)/.test(read(file)),
      );
    expect(importing).toEqual(FILE_MODULE_OWNERS);
  });

  it('staticChecks.test.ts parcourt src/ avec le même parcours et la même grammaire', () => {
    const source = read('src/staticChecks.test.ts');
    expect(source).toContain("from '@/__fixtures__/sourceFiles'");
    expect(source).toContain('walkSources');
    expect(source).toContain('scriptKind(file)');
  });

  it('le parcours de src/ (les deux contrôles) prend tous les fichiers de code, sous-dossiers compris', () => {
    const dir = tempDir();
    try {
      mkdirSync(dir.path('sous'), { recursive: true });
      const names = ['a.ts', 'b.tsx', 'c.js', 'd.jsx', 'e.mjs', 'sous/f.cjs', 'g.d.ts', 'h.json'];
      for (const name of names) writeFileSync(dir.path(name), '');
      const found = walkSources(dir.path('')).map((path) => relative(dir.path(''), path));
      expect(found.sort()).toEqual(['a.ts', 'b.tsx', 'c.js', 'd.jsx', 'e.mjs', 'sous/f.cjs']);
    } finally {
      dir.remove();
    }
  });
});
