// Accès à l'objet global `expo` et à sa table des modules natifs, repérés sur l'arbre syntaxique
// de TypeScript pour le contrôle src/staticChecksFiles.test.ts (ABS-01, revues du ticket 014e).
import ts from 'typescript';

/** Texte d'une chaîne écrite telle quelle (guillemets ou gabarit sans substitution). */
export const literalText = (node: ts.Node | undefined): string | undefined =>
  node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;

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
