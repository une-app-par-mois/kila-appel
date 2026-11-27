// Fichiers de code parcourus par les contrôles statiques (staticChecks, staticChecksFiles) :
// TypeScript et JavaScript, sous toutes leurs extensions (revue du ticket 014b). Les déclarations
// `.d.ts` sont exclues : elles n'ont pas de code.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

export const SOURCE_FILE = /\.(tsx?|jsx?|mjs|cjs)$/;
export const TEST_FILE = /\.test\.(tsx?|jsx?|mjs|cjs)$/;

/** Chemins absolus des fichiers de code sous `dir`, récursivement. */
export const walkSources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkSources(path);
    return SOURCE_FILE.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
  });

/** Grammaire d'un fichier pour l'analyseur de TypeScript. */
export const scriptKind = (file: string): ts.ScriptKind => {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.ts')) return ts.ScriptKind.TS;
  if (file.endsWith('.jsx')) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
};
