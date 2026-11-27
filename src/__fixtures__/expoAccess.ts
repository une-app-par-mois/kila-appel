// Accès à l'objet global `expo` et à sa table des modules natifs, repérés sur l'arbre syntaxique
// de TypeScript pour le contrôle src/staticChecksFiles.test.ts (ABS-01, revues du ticket 014e).
import { dirname, join } from 'node:path';
import ts from 'typescript';

/** Texte d'une chaîne écrite telle quelle (guillemets ou gabarit sans substitution). */
export const literalText = (node: ts.Node | undefined): string | undefined =>
  node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;

/** Appel `jest.<nom>(…)` pour l'un des noms donnés. */
const isJestCall = (node: ts.CallExpression, names: readonly string[]): boolean =>
  ts.isPropertyAccessExpression(node.expression) &&
  ts.isIdentifier(node.expression.expression) &&
  node.expression.expression.text === 'jest' &&
  names.includes(node.expression.name.text);

/** `jest.requireMock(…)` : rend la simulation, le vrai module seulement sans fabrique. */
export const isRequireMock = (node: ts.Node): boolean =>
  ts.isCallExpression(node) && isJestCall(node, ['requireMock']);

/** Modules simulés par une fabrique dans ce fichier (`jest.mock(nom, () => …)`). */
export const factoryMocks = (tree: ts.SourceFile): Set<string> => {
  const found = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && isJestCall(node, ['mock', 'doMock'])) {
      const name = literalText(node.arguments[0]);
      if (name !== undefined && node.arguments.length > 1) found.add(name);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
};

/**
 * Module nommé par un import, un export, un `import N = require()`, un require(), un import(),
 * un type import(), `jest.requireActual`, `jest.requireMock`, ou `jest.mock` sans fabrique (qui
 * charge le vrai module) ; sinon undefined (contrôles staticChecksFiles et
 * staticChecksNotifications, revue du 028a).
 */
export const moduleName = (node: ts.Node): string | undefined => {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return literalText(node.moduleSpecifier);
  }
  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
    return literalText(node.moduleReference.expression);
  }
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    const isRequire = ts.isIdentifier(callee) && callee.text === 'require';
    const automock = isJestCall(node, ['mock', 'doMock']) && node.arguments.length === 1;
    if (
      isRequire ||
      callee.kind === ts.SyntaxKind.ImportKeyword ||
      isJestCall(node, ['requireActual', 'requireMock']) ||
      automock
    ) {
      return literalText(node.arguments[0]);
    }
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    return literalText(node.argument.literal);
  }
  return undefined;
};

/** `expo`, `globalThis.expo`, `global['expo']` : l'objet qui porte la table des modules natifs. */
const isExpo = (node: ts.Expression): boolean =>
  (ts.isIdentifier(node) && node.text === 'expo') ||
  (ts.isPropertyAccessExpression(node) && node.name.text === 'expo') ||
  (ts.isElementAccessExpression(node) && literalText(node.argumentExpression) === 'expo');

/** Lecture de `modules` sur `expo` : par un point, des crochets ou une déstructuration. */
export const readsExpoModules = (node: ts.Node): boolean => {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text === 'modules' && isExpo(node.expression);
  }
  if (ts.isElementAccessExpression(node)) {
    return literalText(node.argumentExpression) === 'modules' && isExpo(node.expression);
  }
  if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer) {
    const names = node.name.elements.map((e) => (e.propertyName ?? e.name).getText());
    return names.includes('modules') && isExpo(node.initializer);
  }
  return false;
};

// Objets globaux par lesquels on atteint `expo` (revue de sécurité du 014e).
const GLOBALS = new Set(['globalThis', 'global', 'window', 'self']);
const isGlobal = (node: ts.Expression) => ts.isIdentifier(node) && GLOBALS.has(node.text);

/** Lecture de `globalThis.expo` (point, crochets, déstructuration) : refusée hors de l'adaptateur. */
export const readsGlobalExpo = (node: ts.Node): boolean => {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text === 'expo' && isGlobal(node.expression);
  }
  if (ts.isElementAccessExpression(node)) {
    return literalText(node.argumentExpression) === 'expo' && isGlobal(node.expression);
  }
  if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer) {
    const names = node.name.elements.map((e) => (e.propertyName ?? e.name).getText());
    return names.includes('expo') && isGlobal(node.initializer);
  }
  return false;
};

// Chemin vers node_modules : contournerait le nom du module (revue de sécurité du 028a, M1).
export const NODE_MODULES = /(^|\/)node_modules\//;

/**
 * Import relatif qui sort de src/ (M1, revue du 028a) : refusé, sauf un fichier JSON (données,
 * jamais de code : app.json, design/jetons.json). Plus simple que de parcourir la racine.
 */
export const leavesSrc = (file: string, name: string): boolean =>
  name.startsWith('.') && !name.endsWith('.json') && !join(dirname(file), name).startsWith('src/');

/** Clé d'objet ou de déstructuration écrite en chaîne : `{ 'nom': x }`, `{ ['nom']: x }`. */
export const stringKey = (node: ts.Node): string | undefined => {
  if (ts.isComputedPropertyName(node)) return literalText(node.expression);
  const parent = node.parent;
  if (parent === undefined || literalText(node) === undefined) return undefined;
  const isKey =
    (ts.isBindingElement(parent) && parent.propertyName === node) ||
    ((ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent)) && parent.name === node);
  return isKey ? literalText(node) : undefined;
};

/** Module chargé par ce nœud ; `jest.requireMock` d'un module simulé par une fabrique : aucun. */
export const loadedModule = (node: ts.Node, mocked: Set<string>): string | undefined => {
  const name = moduleName(node);
  return name !== undefined && isRequireMock(node) && mocked.has(name) ? undefined : name;
};
