// Adaptateur expo-sqlite : la base de l'appli, dans le stockage privé de l'appareil (ADR-002).
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { type Db, inTransaction, type SqlValue } from '@/data/db';

const wrap = (conn: Pick<SQLiteDatabase, 'runAsync' | 'getAllAsync'>) => ({
  execute: async (sql: string, params: readonly SqlValue[] = []) => {
    const r = await conn.runAsync(sql, [...params]);
    return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
  },
  query: <T>(sql: string, params: readonly SqlValue[] = []) =>
    conn.getAllAsync<T>(sql, [...params]),
});

export const openExpoDb = async (name = 'kila.db'): Promise<Db> => {
  const raw = await openDatabaseAsync(name);
  const close = () => raw.closeAsync();

  // Transaction exclusive : aucune autre requête ne s'intercale (contrairement à withTransactionAsync).
  const transaction = async <T>(fn: (tx: Db) => Promise<T>): Promise<T> => {
    let value: T | undefined;
    await raw.withExclusiveTransactionAsync(async (txn) => {
      value = await fn(inTransaction(wrap(txn), close));
    });
    return value as T;
  };

  return { ...wrap(raw), transaction, close };
};
