// Préparation de la base à chaque ouverture (docs/ARCHITECTURE.md §4.1).
import type { Db } from '@/data/db';
import { log } from '@/data/log';
import { migrate, UNKNOWN_VERSION } from '@/data/migrations';

export const FOREIGN_KEYS_OFF = 'Clés étrangères inactives';
export const SECURE_DELETE_OFF = 'Effacement des données supprimées inactif';
export const JOURNAL_MODE_OFF = 'Mode de journal de la base non fixé';
/** EX-22 (ticket 014c) : fichier illisible, ou toute erreur non reconnue à l'ouverture. */
export const DATABASE_DAMAGED = 'Fichier de données abîmé';

/**
 * Cause d'un échec d'ouverture (EX-22, écran de récupération) : réglage refusé (fichier sain,
 * « Réessayer »), version plus récente que l'appli (« mettez l'appli à jour »), ou base abîmée.
 */
export type OpenFailure = 'settings' | 'newer' | 'damaged';

const SETTINGS_REFUSED = [FOREIGN_KEYS_OFF, SECURE_DELETE_OFF, JOURNAL_MODE_OFF];

/** Classe une erreur d'ouverture par son texte fixe ; tout le reste est une base abîmée. */
export const classifyOpenError = (error: unknown): OpenFailure => {
  const message = error instanceof Error ? error.message : null;
  if (message !== null && SETTINGS_REFUSED.includes(message)) return 'settings';
  if (message === UNKNOWN_VERSION) return 'newer';
  return 'damaged';
};

/** Erreur au texte fixe de sa cause : le message de SQLite ne sort jamais (ABS-04). */
const fixedError = (error: unknown): Error =>
  classifyOpenError(error) === 'damaged' ? new Error(DATABASE_DAMAGED) : (error as Error);

/**
 * EX-22 (ticket 014c) : lecture d'essai de `sqlite_schema`, puis `quick_check`, avant tout
 * réglage. Un fichier qui n'est pas une base échoue ici, au lieu de passer pour un réglage refusé.
 */
const checkReadable = async (db: Db): Promise<void> => {
  let readable = false;
  try {
    // `main.` : sans lui, quick_check parcourt aussi la base `temp`, et la crée.
    await db.query('SELECT count(*) AS tables FROM main.sqlite_schema');
    const rows = await db.query<{ quick_check: string }>('PRAGMA main.quick_check');
    readable = rows.length === 1 && rows[0]?.quick_check === 'ok';
  } catch {
    readable = false;
  }
  if (!readable) throw new Error(DATABASE_DAMAGED);
};

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
 * Vérifie que le fichier se lit, active les clés étrangères (hors transaction, sinon SQLite
 * l'ignore) et l'effacement des données supprimées dans le fichier, fixe le mode de journal, puis
 * applique les migrations.
 */
export const prepareDatabase = async (db: Db): Promise<Db> => {
  await checkReadable(db);
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

/**
 * Ouverture au démarrage de l'appli : base prête, version écrite dans le journal (ADR-008). En cas
 * d'échec, la connexion est fermée et l'erreur porte le texte fixe de sa cause (classifyOpenError).
 */
export const openAppDatabase = async (open: () => Promise<Db>): Promise<Db> => {
  let raw: Db;
  try {
    raw = await open();
  } catch (error) {
    throw fixedError(error);
  }
  try {
    const db = await prepareDatabase(raw);
    const rows = await db.query<{ user_version: number }>('PRAGMA user_version');
    log('DB_READY', { version: rows[0]?.user_version ?? 0 });
    return db;
  } catch (error) {
    // Ne pas garder le fichier ouvert : l'écran de récupération (EX-22) doit pouvoir le remplacer.
    await raw.close().catch(() => undefined);
    throw fixedError(error);
  }
};
