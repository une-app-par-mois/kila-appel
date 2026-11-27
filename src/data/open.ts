// Préparation de la base à chaque ouverture (docs/ARCHITECTURE.md §4.1).
import type { Db } from '@/data/db';
import { log } from '@/data/log';
import { migrate, UNKNOWN_VERSION } from '@/data/migrations';

export const FOREIGN_KEYS_OFF = 'Clés étrangères inactives';
export const SECURE_DELETE_OFF = 'Effacement des données supprimées inactif';
export const JOURNAL_MODE_OFF = 'Mode de journal de la base non fixé';
/** EX-22 (ticket 014c) : fichier illisible (lecture d'essai ou `quick_check`). */
export const DATABASE_DAMAGED = 'Fichier de données abîmé';
/** EX-22 : toute autre erreur à l'ouverture ; rien n'est effacé, « Réessayer ». */
export const DATABASE_UNAVAILABLE = 'Fichier de données indisponible';

/**
 * Cause d'un échec d'ouverture (EX-22, écran de récupération) : réglage refusé ou erreur non
 * reconnue (fichier gardé, « Réessayer »), version plus récente que l'appli (« mettez l'appli à
 * jour »), ou base abîmée (« Repartir de zéro » possible).
 */
export type OpenFailure = 'settings' | 'unavailable' | 'newer' | 'damaged';

const SETTINGS_REFUSED = [FOREIGN_KEYS_OFF, SECURE_DELETE_OFF, JOURNAL_MODE_OFF];

/**
 * Classe une erreur d'ouverture par son texte fixe. Réponse du porteur du 2026-11-27 : « abîmée »
 * seulement pour DATABASE_DAMAGED ; tout ce qui n'est pas reconnu garde le fichier.
 */
export const classifyOpenError = (error: unknown): OpenFailure => {
  const message = error instanceof Error ? error.message : null;
  if (message === DATABASE_DAMAGED) return 'damaged';
  if (message !== null && SETTINGS_REFUSED.includes(message)) return 'settings';
  if (message === UNKNOWN_VERSION) return 'newer';
  return 'unavailable';
};

/** Erreur au texte fixe de sa cause : le message de SQLite ne sort jamais (ABS-04). */
const fixedError = (error: unknown): Error =>
  classifyOpenError(error) === 'unavailable' ? new Error(DATABASE_UNAVAILABLE) : (error as Error);

// Codes primaires SQLITE_CORRUPT (11) et SQLITE_NOTADB (26) ; un code étendu garde le primaire
// dans son octet de poids faible (779 = SQLITE_CORRUPT_INDEX).
const CORRUPTION_CODES = [11, 26];
const isCorruptionCode = (code: number) => CORRUPTION_CODES.includes(code & 0xff);
// Textes de SQLite pour ces deux codes (sqlite3_errstr).
const CORRUPTION_TEXTS = ['database disk image is malformed', 'file is not a database'];

/**
 * Erreur de SQLite qui dit que le fichier est abîmé. node:sqlite donne `errcode` ; expo-sqlite
 * écrit « Error code N: … » dans le message (code natif d'expo-sqlite 58, Android et iOS, relu).
 */
export const isCorruption = (error: unknown): boolean => {
  // Pas d'`instanceof Error` : l'erreur peut venir d'un autre contexte (module natif, node:sqlite).
  if (typeof error !== 'object' || error === null) return false;
  const { errcode, message } = error as { errcode?: unknown; message?: unknown };
  if (typeof errcode === 'number' && isCorruptionCode(errcode)) return true;
  if (typeof message !== 'string') return false;
  const expoCode = /Error code (\d+)/.exec(message)?.[1];
  if (expoCode !== undefined && isCorruptionCode(Number(expoCode))) return true;
  return CORRUPTION_TEXTS.some((text) => message.includes(text));
};

/**
 * EX-22 (ticket 014c) : lecture d'essai de `sqlite_schema`, puis `quick_check`, avant tout
 * réglage. Un fichier qui n'est pas une base échoue ici, au lieu de passer pour un réglage refusé.
 * Une erreur passagère (base verrouillée, disque) n'est pas une corruption : DATABASE_UNAVAILABLE.
 */
const checkReadable = async (db: Db): Promise<void> => {
  let rows: { quick_check: string }[];
  try {
    // `main.` : sans lui, quick_check parcourt aussi la base `temp`, et la crée.
    await db.query('SELECT count(*) AS tables FROM main.sqlite_schema');
    rows = await db.query<{ quick_check: string }>('PRAGMA main.quick_check');
  } catch (error) {
    throw new Error(isCorruption(error) ? DATABASE_DAMAGED : DATABASE_UNAVAILABLE);
  }
  if (rows.length !== 1 || rows[0]?.quick_check !== 'ok') throw new Error(DATABASE_DAMAGED);
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
