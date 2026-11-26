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

/** Ce que chaque adaptateur fournit : une seule connexion, utilisée telle quelle. */
export interface Driver {
  run(sql: string, params: readonly SqlValue[]): Promise<RunResult>;
  all<T>(sql: string, params: readonly SqlValue[]): Promise<T[]>;
  /** Instruction fixe du code (BEGIN, COMMIT, ROLLBACK), jamais une valeur. */
  exec(sql: 'BEGIN IMMEDIATE' | 'COMMIT' | 'ROLLBACK'): Promise<void>;
  close(): Promise<void>;
}

export const NESTED_TRANSACTION = 'Transaction imbriquée refusée';
export const CLOSE_IN_TRANSACTION = 'Fermeture refusée pendant une transaction';

/**
 * Base commune aux deux adaptateurs.
 * - Une seule connexion : `PRAGMA foreign_keys = ON` s'y applique aussi dans les transactions
 *   (SEC-11 ; withExclusiveTransactionAsync d'expo-sqlite ouvre une autre connexion, sans lui).
 * - Une file : chaque opération attend la fin de la précédente ; rien ne s'intercale dans une
 *   transaction, et une écriture lancée pendant elle n'est pas annulée avec elle.
 */
export const createDb = (driver: Driver): Db => {
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task);
    queue = run.catch(() => undefined);
    return run;
  };

  const tx: Db = {
    execute: (sql, params = []) => driver.run(sql, params),
    query: (sql, params = []) => driver.all(sql, params),
    transaction: () => Promise.reject(new Error(NESTED_TRANSACTION)),
    close: () => Promise.reject(new Error(CLOSE_IN_TRANSACTION)),
  };

  return {
    execute: (sql, params = []) => enqueue(() => driver.run(sql, params)),
    query: (sql, params = []) => enqueue(() => driver.all(sql, params)),
    transaction: (fn) =>
      enqueue(async () => {
        await driver.exec('BEGIN IMMEDIATE');
        try {
          const value = await fn(tx);
          await driver.exec('COMMIT');
          return value;
        } catch (error) {
          try {
            await driver.exec('ROLLBACK');
          } catch {
            // SQLite a déjà annulé la transaction : c'est l'erreur d'origine qui compte.
          }
          throw error;
        }
      }),
    close: () => enqueue(() => driver.close()),
  };
};
