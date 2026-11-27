// Préparation de la base à chaque ouverture (docs/ARCHITECTURE.md §4.1).
import type { Db } from '@/data/db';
import { log } from '@/data/log';
import { migrate } from '@/data/migrations';

export const FOREIGN_KEYS_OFF = 'Clés étrangères inactives';
export const SECURE_DELETE_OFF = 'Effacement des données supprimées inactif';
export const JOURNAL_MODE_OFF = 'Mode de journal de la base non fixé';

/**
 * SEC-11 (ticket 015c) : fixe le mode de journal à `delete`, puis le relit. En WAL, d'anciennes
 * trames resteraient dans le fichier `-wal` malgré `secure_delete`. Une base sans fichier répond
 * toujours `memory` : accepté seulement si la base principale n'a pas de fichier (chemin vide).
 * Toute erreur, SQLite comprise, devient JOURNAL_MODE_OFF au texte fixe (ABS-04).
 */
const setJournalMode = async (db: Db): Promise<void> => {
  let accepted = false;
  try {
    await db.execute('PRAGMA main.journal_mode = DELETE');
    const rows = await db.query<{ journal_mode: string }>('PRAGMA main.journal_mode');
    const mode = rows[0]?.journal_mode;
    if (mode === 'delete') {
      accepted = true;
    } else if (mode === 'memory') {
      const main = await db.query<{ file: string | null }>(
        "SELECT file FROM pragma_database_list WHERE name = 'main'",
      );
      accepted = main.length === 1 && !main[0]?.file;
    }
  } catch {
    accepted = false;
  }
  if (!accepted) throw new Error(JOURNAL_MODE_OFF);
};

/**
 * Active les clés étrangères (hors transaction, sinon SQLite l'ignore) et l'effacement des données
 * supprimées dans le fichier, fixe le mode de journal, puis applique les migrations.
 */
export const prepareDatabase = async (db: Db): Promise<Db> => {
  await db.execute('PRAGMA foreign_keys = ON');
  const rows = await db.query<{ foreign_keys: number }>('PRAGMA foreign_keys');
  if (rows[0]?.foreign_keys !== 1) {
    // SEC-11 : sans clés étrangères, les suppressions en cascade ne se feraient pas.
    throw new Error(FOREIGN_KEYS_OFF);
  }
  // ABS-05 (ticket 007d) : SQLite écrit des zéros sur ce qu'il supprime, au lieu de laisser les
  // anciennes valeurs dans les pages libérées du fichier.
  await db.execute('PRAGMA secure_delete = ON');
  const secure = await db.query<{ secure_delete: number }>('PRAGMA secure_delete');
  if (secure[0]?.secure_delete !== 1) throw new Error(SECURE_DELETE_OFF);
  await setJournalMode(db);
  await migrate(db);
  return db;
};

/** Ouverture au démarrage de l'appli : base prête, version écrite dans le journal (ADR-008). */
export const openAppDatabase = async (open: () => Promise<Db>): Promise<Db> => {
  const raw = await open();
  let db: Db;
  try {
    db = await prepareDatabase(raw);
  } catch (error) {
    // Ne pas garder le fichier ouvert : l'écran de récupération (EX-22) doit pouvoir le remplacer.
    await raw.close().catch(() => undefined);
    throw error;
  }
  const rows = await db.query<{ user_version: number }>('PRAGMA user_version');
  log('DB_READY', { version: rows[0]?.user_version ?? 0 });
  return db;
};
