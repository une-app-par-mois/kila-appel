// Types minimaux de modules Node 22, pour les tests seulement (ADR-008, ticket 003).
// Déclaration locale plutôt que @types/node : décision du porteur du 2026-11-26.
declare module 'node:sqlite' {
  type Value = string | number | bigint | null | Uint8Array;

  interface StatementSync {
    run(...params: Value[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    all(...params: Value[]): Record<string, Value>[];
  }

  export class DatabaseSync {
    constructor(path: string);
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close(): void;
  }
}

// node:fs et node:path : tests des contrôles automatiques et des polices (ticket 003).
declare module 'node:fs' {
  interface Dirent {
    name: string;
    isDirectory(): boolean;
  }
  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readFileSync(path: string): Uint8Array;
  // Dossier temporaire du test d'effacement dans le fichier (ticket 007d).
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string, options: { recursive: true; force: true }): void;
  // Fichiers piégés des tests de sauvegarde (ticket 014).
  export function writeFileSync(path: string, data: string | Uint8Array): void;
}

declare module 'node:os' {
  export function tmpdir(): string;
}

// node:crypto : empreintes des polices (ticket 003).
declare module 'node:crypto' {
  interface Hash {
    update(data: Uint8Array): Hash;
    digest(encoding: 'hex'): string;
  }
  export function createHash(algorithm: 'sha256'): Hash;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function relative(from: string, to: string): string;
}

// Variable globale de Node (CommonJS), utilisée par les tests qui lisent le dépôt.
declare const __dirname: string;
