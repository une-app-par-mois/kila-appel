// Adaptateur expo-sqlite : la base de l'appli, dans le stockage privé de l'appareil (ADR-002).
// Transactions par createDb sur la connexion principale : pas de withExclusiveTransactionAsync,
// qui ouvre une autre connexion où les clés étrangères sont inactives (SEC-11).
import { openDatabaseAsync } from 'expo-sqlite';
import { createDb, type Db } from '@/data/db';

export const openExpoDb = async (name = 'kila.db'): Promise<Db> => {
  const raw = await openDatabaseAsync(name);
  return createDb({
    run: async (sql, params) => {
      const r = await raw.runAsync(sql, [...params]);
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    all: (sql, params) => raw.getAllAsync(sql, [...params]),
    exec: (sql) => raw.execAsync(sql),
    close: () => raw.closeAsync(),
  });
};
