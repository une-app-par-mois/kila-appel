// Vérification d'une sauvegarde avant toute restauration (EX-20, SEC-10, ARCHITECTURE §4.3).
// Elle porte sur une copie temporaire du fichier choisi, jamais sur la base de l'appareil : la
// copie est seulement ouverte, contrôlée et migrée si elle est plus ancienne.
// ABS-04, SEC-12 : le journal ne reçoit qu'un code ; aucune valeur du fichier n'en sort.
import type { Db } from '@/data/db';
import { log } from '@/data/log';
import { MIGRATIONS, type Migration, migrate } from '@/data/migrations';
import { settingsRepo } from '@/data/settingsRepo';
import { isIsoDate } from '@/domain/formats';
import { validateContact } from '@/domain/validation';

/** Lecture du fichier sans l'ouvrir comme base (014b : expo-file-system ; tests : node:fs). */
export type BackupFiles = {
  size(path: string): Promise<number>;
  readHead(path: string, length: number): Promise<Uint8Array>;
};

/** Ouvre une base à ce chemin, ou une base vide en mémoire avec ':memory:'. */
export type OpenDb = (path: string) => Promise<Db>;

/**
 * Causes d'un refus. NEWER_VERSION est à part : le fichier est sain, l'appli doit être mise à jour
 * (décision du porteur du 2026-11-27). Les textes viennent avec les écrans (014b, 014c).
 */
export type RejectReason =
  | 'TOO_LARGE'
  | 'NOT_SQLITE'
  | 'DAMAGED'
  | 'NEWER_VERSION'
  | 'NOT_A_BACKUP'
  | 'INVALID_DATA';

/** Ce que l'écran Restauration annonce avant de remplacer (maquette « Restaurer ? »). */
export type BackupSummary = {
  members: number;
  /** Groupes de toutes les saisons. */
  groups: number;
  recordedSessions: number;
  /** AAAA-MM-JJ, ou null si la copie n'en porte pas de lisible. */
  backupDate: string | null;
};

declare const verifiedBrand: unique symbol;
/** Seule une copie passée par verifyBackup peut être restaurée (restoreBackup). */
export type VerifiedBackup = {
  readonly path: string;
  readonly summary: BackupSummary;
  readonly [verifiedBrand]?: true;
};

export type Verification =
  | { ok: true; backup: VerifiedBackup }
  | { ok: false; reason: RejectReason };

/** Environ 50 Mo : bien au-delà d'une base réelle, refusé avant toute ouverture. */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

// En-tête d'un fichier SQLite : « SQLite format 3 » suivi d'un octet nul.
const SQLITE_HEADER = 'SQLite format 3\u0000';
// Plus petite page SQLite : un fichier plus court ne peut pas être une base.
const MIN_BYTES = 512;

class Rejected extends Error {
  constructor(readonly reason: RejectReason) {
    super(`Sauvegarde refusée : ${reason}`);
  }
}

const reject = (reason: RejectReason): never => {
  throw new Rejected(reason);
};

const checkFile = async (files: BackupFiles, path: string) => {
  const size = await files.size(path);
  if (size > MAX_BACKUP_BYTES) reject('TOO_LARGE');
  if (size < MIN_BYTES) reject('NOT_SQLITE');
  const head = await files.readHead(path, SQLITE_HEADER.length);
  const text = String.fromCharCode(...head);
  if (text !== SQLITE_HEADER) reject('NOT_SQLITE');
};

type SchemaRow = { type: string; name: string; tbl_name: string; sql: string | null };

const schemaOf = async (db: Db): Promise<string[]> =>
  (await db.query<SchemaRow>('SELECT type, name, tbl_name, sql FROM sqlite_schema'))
    .map((row) => JSON.stringify([row.type, row.name, row.tbl_name, row.sql]))
    .sort();

/** Schéma exact d'une base de l'appli à cette version : tables, index, déclencheur ; rien de plus. */
const expectedSchema = async (open: OpenDb, migrations: Migration[]) => {
  const scratch = await open(':memory:');
  try {
    await migrate(scratch, migrations);
    return await schemaOf(scratch);
  } finally {
    await scratch.close();
  }
};

const count = async (db: Db, sql: string) => (await db.query<{ n: number }>(sql))[0]?.n ?? 0;

/**
 * Règles que les contraintes de la base ne garantissent pas seules : un contact valide (ticket 008,
 * la base ne vérifie que le non-vide du téléphone) et `slots.schedule_from`, dont le déclencheur
 * ne protège que les modifications (ticket 005), vérifié même si integrity_check le laissait passer.
 */
export const checkRows = async (db: Db): Promise<RejectReason | null> => {
  const slots = await db.query<{ schedule_from: unknown }>('SELECT schedule_from FROM slots');
  if (slots.some((row) => typeof row.schedule_from !== 'string' || !isIsoDate(row.schedule_from)))
    return 'INVALID_DATA';
  const contacts = await db.query<{ label: string | null; phone: string }>(
    'SELECT label, phone FROM emergency_contacts',
  );
  try {
    for (const contact of contacts)
      validateContact({ label: contact.label ?? '', phone: contact.phone });
  } catch {
    return 'INVALID_DATA';
  }
  return null;
};

const summarize = async (db: Db): Promise<BackupSummary> => ({
  members: await count(db, 'SELECT count(*) AS n FROM members'),
  groups: await count(db, 'SELECT count(*) AS n FROM groups'),
  recordedSessions: await count(db, "SELECT count(*) AS n FROM sessions WHERE state = 'recorded'"),
  backupDate: await settingsRepo(db).lastBackupDate(),
});

// Ordre voulu : la version avant le schéma (une version future a un autre schéma, cause à part),
// le schéma avant integrity_check (aucune expression du fichier n'est évaluée avant d'être connue).
const inspect = async (copy: Db, open: OpenDb, migrations: Migration[]) => {
  const [row] = await copy.query<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version > migrations.length) reject('NEWER_VERSION');
  // Version 0 : base vide ou étrangère ; la migrer en ferait une sauvegarde vide qui effacerait tout.
  if (version < 1) reject('NOT_A_BACKUP');
  const expected = await expectedSchema(open, migrations.slice(0, version));
  if (JSON.stringify(await schemaOf(copy)) !== JSON.stringify(expected)) reject('NOT_A_BACKUP');
  const integrity = await copy.query<{ integrity_check: string }>('PRAGMA integrity_check');
  if (integrity.length !== 1 || integrity[0]?.integrity_check !== 'ok') reject('DAMAGED');
  if ((await copy.query('PRAGMA foreign_key_check')).length > 0) reject('DAMAGED');
  await migrate(copy, migrations);
  const invalid = await checkRows(copy);
  if (invalid) reject(invalid);
  return version;
};

/**
 * Vérifie la copie temporaire `path` d'un fichier choisi. Accepté : son résumé et la copie, prête
 * pour restoreBackup. Refusé : une cause, et rien n'a touché la base de l'appareil.
 */
export const verifyBackup = async (
  path: string,
  deps: { files: BackupFiles; open: OpenDb; migrations?: Migration[] },
): Promise<Verification> => {
  const { files, open, migrations = MIGRATIONS } = deps;
  try {
    await checkFile(files, path);
    let copy: Db;
    try {
      copy = await open(path);
    } catch {
      return reject('DAMAGED');
    }
    try {
      const version = await inspect(copy, open, migrations);
      const summary = await summarize(copy);
      log('RESTORE_VERIFIED', { version });
      return { ok: true, backup: { path, summary } };
    } finally {
      await copy.close();
    }
  } catch (error) {
    // Toute autre erreur de SQLite sur la copie (fichier malformé, page illisible) : abîmée.
    const reason = error instanceof Rejected ? error.reason : 'DAMAGED';
    log(`RESTORE_REJECTED_${reason}`);
    return { ok: false, reason };
  }
};
