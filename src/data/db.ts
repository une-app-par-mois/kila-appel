// Interface minimale de la base (ADR-008) : la même pour expo-sqlite (appli) et node:sqlite (tests).
// SEC-05 : toute valeur passe par `params`. Seul `src/data/` écrit du SQL (CONV-18).

export type SqlValue = string | number | null;

export type RunResult = { changes: number; lastInsertRowId: number };

export interface Db {
  /** Exécute une requête d'écriture (une seule instruction). */
  execute(sql: string, params?: readonly SqlValue[]): Promise<RunResult>;
  /** Lit des lignes (une seule instruction). */
  query<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  /** Exécute `fn` dans une transaction : tout est validé, ou tout est annulé si `fn` échoue. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export const NESTED_TRANSACTION = 'Transaction imbriquée refusée';

/** Base passée à `fn` pendant une transaction : elle refuse d'en ouvrir une autre. */
export const inTransaction = (
  run: Pick<Db, 'execute' | 'query'>,
  close: () => Promise<void>,
): Db => ({
  execute: run.execute,
  query: run.query,
  transaction: () => Promise.reject(new Error(NESTED_TRANSACTION)),
  close,
});
