/**
 * @jest-environment node
 */
// ABS-01, SEC-08 (ticket 038, décisions du porteur du 2026-11-28) : expo-print n'est importé que
// par l'adaptateur src/data/expoPrint.ts (créé au 040), et seulement printToFileAsync, sans alias ;
// son argument est un objet écrit en entier, sans `...` ni variable, aux seules clés html, width,
// height et margins. printAsync (lit une adresse http), selectPrinterAsync (recherche d'imprimantes
// sur le réseau) et ExpoPrint (module natif) sont refusés comme noms dans tout src/, même en
// chaîne. Contrôle sur l'arbre syntaxique de TypeScript, comme staticChecksNotifications.
// Limite connue : un nom calculé (`print${'Async'}`) n'est pas vu ; la revue complète.
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { factoryMocks, literalText, loadedModule } from '@/__fixtures__/expoAccess';
import { scriptKind, TEST_FILE, walkSources } from '@/__fixtures__/sourceFiles';

const OWNER = 'src/data/expoPrint.ts';
const MODULE = 'expo-print';
const FUNCTION = 'printToFileAsync';
/** Seules clés permises dans l'argument de printToFileAsync. */
const KEYS = new Set(['html', 'width', 'height', 'margins']);
/** Refusés partout, adaptateur et tests compris, comme identifiant ou comme chaîne. */
const REFUSED = new Set(['printAsync', 'selectPrinterAsync', 'ExpoPrint']);

/** `import { printToFileAsync } from 'expo-print'`, rien d'autre (ni alias, ni type, ni défaut). */
const inList = (node: ts.Node): boolean => {
  if (!ts.isImportDeclaration(node)) return false;
  const clause = node.importClause;
  if (!clause || clause.isTypeOnly || clause.name || !clause.namedBindings) return false;
  if (!ts.isNamedImports(clause.namedBindings)) return false;
  return clause.namedBindings.elements.every(
    (e) => e.name.text === FUNCTION && e.propertyName === undefined && !e.isTypeOnly,
  );
};

const isNamespace = (node: ts.Node) =>
  (ts.isImportDeclaration(node) &&
    node.importClause?.namedBindings !== undefined &&
    ts.isNamespaceImport(node.importClause.namedBindings)) ||
  (ts.isExportDeclaration(node) &&
    (node.exportClause === undefined || ts.isNamespaceExport(node.exportClause)));

/** Appel dont ce nœud (nom, `.nom` ou `['nom']`) est la fonction appelée. */
const calleeOf = (node: ts.Node): ts.CallExpression | undefined => {
  const parent = node.parent;
  if (ts.isCallExpression(parent) && parent.expression === node) return parent;
  const isMember =
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isElementAccessExpression(parent) && parent.argumentExpression === node);
  const call = isMember ? parent.parent : undefined;
  return call !== undefined && ts.isCallExpression(call) && call.expression === parent
    ? call
    : undefined;
};

/** Nom d'une propriété écrite en clair (`html: x`, `html`, `'html': x`), sinon undefined. */
const keyOf = (property: ts.ObjectLiteralElementLike): string | undefined => {
  if (ts.isShorthandPropertyAssignment(property)) return property.name.text;
  if (!ts.isPropertyAssignment(property)) return undefined;
  const name = property.name;
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
};

const argumentProblems = (call: ts.CallExpression): string[] => {
  const [argument] = call.arguments;
  const whole =
    call.arguments.length === 1 &&
    argument !== undefined &&
    ts.isObjectLiteralExpression(argument) &&
    !argument.properties.some(ts.isSpreadAssignment);
  if (!whole) return ['SEC-08 argument non écrit en entier'];
  const refused = argument.properties.filter((p) => !KEYS.has(keyOf(p) ?? ''));
  return refused.length > 0 ? ['SEC-08 clé refusée'] : [];
};

/** Usage de printToFileAsync : appel contrôlé ; ailleurs qu'un test, aucune autre référence. */
const functionProblems = (file: string, node: ts.Node): string[] => {
  const parent = node.parent;
  // Import et réexport (`export { … } from 'expo-print'`) : contrôlés par les règles du module.
  if (ts.isImportSpecifier(parent)) return [];
  if (ts.isExportSpecifier(parent) && parent.parent.parent.moduleSpecifier) return [];
  // Clé d'une simulation (`jest.mock('expo-print', () => ({ printToFileAsync: … }))`).
  if (ts.isPropertyAssignment(parent) && parent.name === node) return [];
  const call = calleeOf(node);
  if (call !== undefined) return argumentProblems(call);
  return TEST_FILE.test(file) ? [] : ['SEC-08 printToFileAsync hors appel'];
};

const parse = (file: string, source: string) =>
  ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));

const visitModules = (file: string, source: string, onModule: (n: ts.Node, m: string) => void) => {
  const tree = parse(file, source);
  const mocked = factoryMocks(tree);
  const visit = (node: ts.Node) => {
    const name = loadedModule(node, mocked);
    if (name !== undefined) onModule(node, name);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return tree;
};

/** Modules chargés par un fichier (test « seul importeur »). */
const modulesOf = (file: string, source: string): string[] => {
  const found: string[] = [];
  visitModules(file, source, (_, name) => found.push(name));
  return found;
};

const check = (file: string, source: string): string[] => {
  const found: string[] = [];
  const tree = visitModules(file, source, (node, name) => {
    if (name.startsWith(`${MODULE}/`)) found.push('ABS-01 sous-chemin');
    if (name !== MODULE) return;
    if (file !== OWNER) found.push('ABS-01 import hors de expoPrint.ts');
    if (isNamespace(node)) found.push('ABS-01 import *');
    else if (file === OWNER && !inList(node)) found.push('ABS-01 import hors liste');
  });
  const visit = (node: ts.Node) => {
    const text = ts.isIdentifier(node) ? node.text : literalText(node);
    if (text !== undefined && REFUSED.has(text)) found.push('ABS-01 nom refusé');
    if (text === FUNCTION) found.push(...functionProblems(file, node));
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
};

describe('ABS-01 expo-print seulement dans l’adaptateur, printToFileAsync seul', () => {
  it.each([
    "import { printToFileAsync } from 'expo-print';",
    "import type { PrintOptions } from 'expo-print';",
    "export { printToFileAsync } from 'expo-print';",
    "const p = require('expo-print');",
    "const p = await import('expo-print');",
    "type O = import('expo-print').PrintOptions;",
    "jest.mock('expo-print');",
  ])('repère hors de l’adaptateur : %s', (source) => {
    expect(check('src/hooks/useReport.ts', source)).toEqual(['ABS-01 import hors de expoPrint.ts']);
  });

  it('autorise l’adaptateur pour printToFileAsync, et lui seul', () => {
    const source = "import { printToFileAsync } from 'expo-print';";
    expect(check(OWNER, source)).toEqual([]);
    expect(check('src/data/expoPrint.test.ts', source)).toEqual([
      'ABS-01 import hors de expoPrint.ts',
    ]);
  });

  it.each([
    "import { printToFileAsync as p } from 'expo-print';",
    "import { Orientation as printToFileAsync } from 'expo-print';",
    "import { printToFileAsync, Orientation } from 'expo-print';",
    "import { type printToFileAsync } from 'expo-print';",
    "import type { printToFileAsync } from 'expo-print';",
    "import Print from 'expo-print';",
    "import 'expo-print';",
    "export { printToFileAsync } from 'expo-print';",
    "const p = require('expo-print');",
    "const p = await import('expo-print');",
    "import P = require('expo-print');",
  ])('refuse dans l’adaptateur ce qui sort de la liste : %s', (source) => {
    expect(check(OWNER, source)).toEqual(['ABS-01 import hors liste']);
  });

  it.each([
    "import * as Print from 'expo-print';",
    "export * from 'expo-print';",
    "export * as P from 'expo-print';",
  ])('refuse import * partout : %s', (source) => {
    expect(check(OWNER, source)).toEqual(['ABS-01 import *']);
  });

  it.each([
    "import { printToFileAsync } from 'expo-print/build/Print';",
    "const m = require('expo-print/build/ExpoPrint');",
  ])('refuse tout sous-chemin, adaptateur compris : %s', (source) => {
    expect(check(OWNER, source)).toContain('ABS-01 sous-chemin');
  });

  it.each([...REFUSED])('refuse %s partout : nom, propriété, crochets, chaîne', (name) => {
    expect(check(OWNER, `import { ${name} } from 'x'; await ${name}();`)).toEqual([
      'ABS-01 nom refusé',
      'ABS-01 nom refusé',
    ]);
    expect(check('src/a.test.ts', `await Print.${name}({});`)).toEqual(['ABS-01 nom refusé']);
    expect(check('src/a.test.ts', `await Print['${name}']({});`)).toEqual(['ABS-01 nom refusé']);
    expect(check('src/a.ts', `requireNativeModule('${name}');`)).toEqual(['ABS-01 nom refusé']);
    expect(check('src/a.ts', `const o = { ${name}: 1 };`)).toEqual(['ABS-01 nom refusé']);
  });

  it('laisse passer Orientation et base64 comme noms, hors de l’argument', () => {
    const source = "const base64 = ''; const o = Orientation.portrait; f({ base64 });";
    expect(check('src/a.ts', source)).toEqual([]);
  });
});

describe('SEC-08 argument de printToFileAsync écrit en entier', () => {
  const call = (argument: string) =>
    `import { printToFileAsync } from 'expo-print'; await printToFileAsync(${argument});`;

  it.each([
    '{ html }',
    '{ html: page, width: 595, height: 842, margins: { top: 0, left: 0, right: 0, bottom: 0 } }',
    "{ 'html': page }",
  ])('accepte %s', (argument) => {
    expect(check(OWNER, call(argument))).toEqual([]);
  });

  it.each([
    '{ html, uri }',
    '{ html, base64: true }',
    '{ html, useMarkupFormatter: true }',
    "{ html, ['uri']: u }",
    '{ html, [key]: u }',
    '{ html, get uri() { return u; } }',
    '{ html, uri() {} }',
    '{ html, 1: u }',
  ])('refuse une clé hors liste : %s', (argument) => {
    expect(check(OWNER, call(argument))).toEqual(['SEC-08 clé refusée']);
  });

  it.each(['options', '{ ...options }', '{ html, ...options }', '', '{ html }, extra', 'f()'])(
    'refuse un argument qui n’est pas un objet écrit en entier : (%s)',
    (argument) => {
      expect(check(OWNER, call(argument))).toEqual(['SEC-08 argument non écrit en entier']);
    },
  );

  it('contrôle aussi l’appel par un membre, et dans un fichier de test', () => {
    expect(check('src/a.test.ts', 'await Print.printToFileAsync({ uri: u });')).toEqual([
      'SEC-08 clé refusée',
    ]);
    expect(check('src/a.test.ts', "await m['printToFileAsync']({ html, base64: true });")).toEqual([
      'SEC-08 clé refusée',
    ]);
    expect(check('src/a.test.ts', 'printToFileAsync?.(options);')).toEqual([
      'SEC-08 argument non écrit en entier',
    ]);
  });

  it.each([
    'const f = printToFileAsync; f({ uri });',
    'export { printToFileAsync };',
    'const o = { printToFileAsync };',
    'printToFileAsync.call(null, { uri });',
    'const { printToFileAsync: p } = m;',
  ])('refuse une référence hors appel dans le code de l’appli : %s', (source) => {
    expect(check(OWNER, source)).toEqual(['SEC-08 printToFileAsync hors appel']);
  });

  it('permet dans un test la clé d’une simulation et une vérification de l’appel', () => {
    const source =
      "jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));" +
      'expect(printToFileAsync).toHaveBeenCalled();';
    expect(check('src/data/expoPrint.test.ts', source)).toEqual([]);
  });
});

describe('Le code du dépôt respecte le contrôle d’expo-print', () => {
  const root = join(__dirname, '..');
  const files = walkSources(join(root, 'src')).map((path) => relative(root, path));
  const read = (file: string) => readFileSync(join(root, file), 'utf8');
  // Ce fichier-ci nomme ce module et ces fonctions pour les contrôler.
  const SELF = 'src/staticChecksPrint.test.ts';

  it('aucun écart dans src/, tests compris', () => {
    const violations = files
      .filter((file) => file !== SELF)
      .flatMap((file) => check(file, read(file)).map((rule) => ({ file, rule })));
    expect(violations).toEqual([]);
  });

  it('expo-print n’est importé que par src/data/expoPrint.ts, ou par aucun fichier (avant le 040)', () => {
    const importing = files
      .filter((file) => !TEST_FILE.test(file))
      .filter((file) => modulesOf(file, read(file)).includes(MODULE));
    expect(importing.filter((file) => file !== OWNER)).toEqual([]);
  });
});
