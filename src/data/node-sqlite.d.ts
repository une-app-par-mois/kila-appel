// Types minimaux du module node:sqlite (Node 22), pour l'adaptateur de test seulement (ADR-008).
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
