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
export const TRANSACTION_OVER = 'Transaction terminée : base de transaction inutilisable';
export const BROKEN_CONNECTION = 'Connexion dans un état inconnu : rouvrir la base';

// Seul échec de ROLLBACK sans danger : SQLite avait déjà annulé la transaction lui-même.
const NO_ACTIVE_TRANSACTION = /no transaction is active/i;

/**
 * Base commune aux deux adaptateurs.
 * - Une seule connexion : `PRAGMA foreign_keys = ON` s'y applique aussi dans les transactions
 *   (SEC-11 ; withExclusiveTransactionAsync d'expo-sqlite ouvre une autre connexion, sans lui).
 * - Une file : chaque opération attend la fin de la précédente ; rien ne s'intercale dans une
 *   transaction, et une écriture lancée pendant elle n'est pas annulée avec elle.
 * Règle (décision du porteur du 2026-11-26) : dans `fn`, n'utiliser que `tx`, jamais la base
 * principale, qui attendrait la fin de la transaction et bloquerait tout. Les dépôts reçoivent
 * la base en paramètre (`tx` ou `db`) et ne la capturent jamais. Vérifié en revue.
 */
export const createDb = (driver: Driver): Db => {
  let queue: Promise<unknown> = Promise.resolve();
  let broken = false;
  const enqueue = <T>(task: () => Promise<T>, evenIfBroken = false): Promise<T> => {
    const run = queue.then(() =>
      broken && !evenIfBroken ? Promise.reject(new Error(BROKEN_CONNECTION)) : task(),
    );
    queue = run.catch(() => undefined);
    return run;
  };

  // Une base de transaction neuve à chaque fois, refusée une fois la transaction terminée.
  const openTx = () => {
    let open = true;
    const guard = <T>(task: () => Promise<T>) =>
      open ? task() : Promise.reject(new Error(TRANSACTION_OVER));
    const tx: Db = {
      execute: (sql, params = []) => guard(() => driver.run(sql, params)),
      query: (sql, params = []) => guard(() => driver.all(sql, params)),
      transaction: () => Promise.reject(new Error(NESTED_TRANSACTION)),
      close: () => Promise.reject(new Error(CLOSE_IN_TRANSACTION)),
    };
    return { tx, end: () => (open = false) };
  };

  return {
    execute: (sql, params = []) => enqueue(() => driver.run(sql, params)),
    query: (sql, params = []) => enqueue(() => driver.all(sql, params)),
    transaction: (fn) =>
      enqueue(async () => {
        await driver.exec('BEGIN IMMEDIATE');
        const { tx, end } = openTx();
        try {
          const value = await fn(tx);
          await driver.exec('COMMIT');
          return value;
        } catch (error) {
          try {
            await driver.exec('ROLLBACK');
          } catch (rollbackError) {
            // Toute autre cause laisse peut-être la transaction ouverte : plus rien n'est écrit.
            if (!NO_ACTIVE_TRANSACTION.test(String(rollbackError))) {
              broken = true;
            }
          }
          throw error;
        } finally {
          end();
        }
      }),
    // Fermer reste permis sur une connexion cassée : c'est le moyen de rouvrir la base.
    close: () => enqueue(() => driver.close(), true),
  };
};
