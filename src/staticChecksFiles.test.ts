/**
 * @jest-environment node
 */
// ABS-01, SEC-01 (ticket 014b, décision du porteur du 2026-11-27) : expo-file-system et
// expo-sharing ne sont importés que par l'adaptateur src/data/expoFiles.ts ;
// expo-file-system/legacy et les fonctions réseau de ces modules sont refusés partout.
// Contrôle sur l'arbre syntaxique de TypeScript, comme src/staticChecks.test.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

/** Seul fichier autorisé à importer expo-file-system et expo-sharing (liste testée). */
const FILE_MODULE_OWNERS = ['src/data/expoFiles.ts'];
const FILE_MODULES = /^(expo-file-system|expo-sharing)(\/|$)/;
const LEGACY = /^expo-file-system\/(legacy|next)(\/|$)/;
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

const literalText = (node: ts.Node | undefined): string | undefined =>
  node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;

/** Module nommé par un import, un export, un require() ou un import() ; sinon undefined. */
const moduleName = (node: ts.Node): string | undefined => {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return literalText(node.moduleSpecifier);
  }
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    const isRequire = ts.isIdentifier(callee) && callee.text === 'require';
    if (isRequire || callee.kind === ts.SyntaxKind.ImportKeyword) {
      return literalText(node.arguments[0]);
    }
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    return literalText(node.argument.literal);
  }
  return undefined;
};

/** Écarts d'un fichier (`file` relatif à la racine du dépôt). */
const check = (file: string, source: string): Violation[] => {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const found: Violation[] = [];
  const add = (rule: string, node: ts.Node) =>
    found.push({ rule, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
  const visit = (node: ts.Node) => {
    const name = moduleName(node);
    if (name !== undefined && LEGACY.test(name)) add('ABS-01 expo-file-system/legacy', node);
    else if (name !== undefined && FILE_MODULES.test(name) && !FILE_MODULE_OWNERS.includes(file)) {
      add('ABS-01 import hors de expoFiles.ts', node);
    }
    if (ts.isIdentifier(node) && FILE_NETWORK.has(node.text)) add('ABS-01 réseau', node);
    if (ts.isElementAccessExpression(node)) {
      const key = literalText(node.argumentExpression);
      if (key !== undefined && FILE_NETWORK.has(key)) add('ABS-01 réseau', node);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
};

const rules = (file: string, source: string) => check(file, source).map((v) => v.rule);

describe('ABS-01 expo-file-system et expo-sharing seulement dans src/data/expoFiles.ts', () => {
  it.each([
    "import { File } from 'expo-file-system';",
    "import * as Sharing from 'expo-sharing';",
    "import type { FileInfo } from 'expo-file-system';",
    "export { Paths } from 'expo-file-system';",
    "const fs = require('expo-file-system');",
    "const fs = await import('expo-file-system');",
    "type F = import('expo-file-system').File;",
    "import { x } from 'expo-file-system/build/File';",
  ])('repère hors de l’adaptateur : %s', (source) => {
    expect(rules('src/hooks/useBackupExport.ts', source)).toEqual([
      'ABS-01 import hors de expoFiles.ts',
    ]);
  });

  it('autorise l’adaptateur, et lui seul', () => {
    const source =
      "import { File } from 'expo-file-system'; import { shareAsync } from 'expo-sharing';";
    expect(rules('src/data/expoFiles.ts', source)).toEqual([]);
    expect(rules('src/data/expoFiles.test.ts', source)).toEqual([
      'ABS-01 import hors de expoFiles.ts',
      'ABS-01 import hors de expoFiles.ts',
    ]);
  });

  it.each([
    "import { getInfoAsync } from 'expo-file-system/legacy';",
    "const legacy = require('expo-file-system/legacy');",
    "import { File } from 'expo-file-system/next';",
  ])('refuse partout, adaptateur compris : %s', (source) => {
    expect(rules('src/data/expoFiles.ts', source)).toEqual(['ABS-01 expo-file-system/legacy']);
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
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return walk(path);
      return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
    });
  const files = walk(join(root, 'src')).map((path) => relative(root, path));
  const read = (file: string) => readFileSync(join(root, file), 'utf8');
  // Ce fichier-ci nomme ces modules et ces fonctions pour les contrôler.
  const SELF = 'src/staticChecksFiles.test.ts';

  it('aucun écart dans src/, tests compris', () => {
    const violations = files
      .filter((file) => file !== SELF)
      .flatMap((file) => check(file, read(file)).map((v) => ({ file, ...v })));
    expect(violations).toEqual([]);
  });

  it('seul src/data/expoFiles.ts importe expo-file-system et expo-sharing', () => {
    const importing = files
      .filter((file) => !/\.test\.tsx?$/.test(file))
      .filter((file) => /['"](expo-file-system|expo-sharing)/.test(read(file)));
    expect(importing).toEqual(FILE_MODULE_OWNERS);
  });
});
