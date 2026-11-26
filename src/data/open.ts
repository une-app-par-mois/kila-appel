// Préparation de la base à chaque ouverture (docs/ARCHITECTURE.md §4.1).
import type { Db } from '@/data/db';
import { log } from '@/data/log';
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

/** Ouverture au démarrage de l'appli : base prête, version écrite dans le journal (ADR-008). */
export const openAppDatabase = async (open: () => Promise<Db>): Promise<Db> => {
  const db = await prepareDatabase(await open());
  const rows = await db.query<{ user_version: number }>('PRAGMA user_version');
  log('DB_READY', { version: rows[0]?.user_version ?? 0 });
  return db;
};
