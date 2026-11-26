// Adaptateur node:sqlite (Node 22) : vraie base SQLite pour les tests (ADR-008). Jamais dans l'appli.
import { DatabaseSync } from 'node:sqlite';
import { type Db, inTransaction, type SqlValue } from '@/data/db';

export const openNodeDb = (path = ':memory:'): Db => {
  const raw = new DatabaseSync(path);
  // Une transaction à la fois : les appels concurrents attendent leur tour.
  let queue: Promise<unknown> = Promise.resolve();

  const execute = async (sql: string, params: readonly SqlValue[] = []) => {
    const r = raw.prepare(sql).run(...params);
    return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
  };
  const query = async <T>(sql: string, params: readonly SqlValue[] = []) =>
    raw
      .prepare(sql)
      .all(...params)
      .map((row) => ({ ...row }) as T);
  const close = async () => raw.close();

  const transaction = <T>(fn: (tx: Db) => Promise<T>): Promise<T> => {
    const run = queue.then(async () => {
      raw.exec('BEGIN IMMEDIATE');
      try {
        const value = await fn(inTransaction({ execute, query }, close));
        raw.exec('COMMIT');
        return value;
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    });
    queue = run.catch(() => undefined);
    return run;
  };

  return { execute, query, transaction, close };
};
