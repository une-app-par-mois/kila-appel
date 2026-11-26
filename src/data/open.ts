// Préparation de la base à chaque ouverture (docs/ARCHITECTURE.md §4.1).
import type { Db } from '@/data/db';
import { migrate } from '@/data/migrations';

export const FOREIGN_KEYS_OFF = 'Clés étrangères inactives';

/** Active les clés étrangères (hors transaction, sinon SQLite l'ignore), puis applique les migrations. */
export const prepareDatabase = async (db: Db): Promise<Db> => {
  await db.execute('PRAGMA foreign_keys = ON');
  const rows = await db.query<{ foreign_keys: number }>('PRAGMA foreign_keys');
  if (rows[0]?.foreign_keys !== 1) {
    // SEC-11 : sans clés étrangères, les suppressions en cascade ne se feraient pas.
    throw new Error(FOREIGN_KEYS_OFF);
  }
  await migrate(db);
  return db;
};
