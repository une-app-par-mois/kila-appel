// Vérification d'une sauvegarde avant toute restauration (EX-20, SEC-10, ARCHITECTURE §4.3).
// Elle copie d'abord le fichier choisi dans un chemin temporaire, puis ne travaille que sur cette
// copie (ouverture, contrôles, migrations) : ni le fichier choisi ni la base de l'appareil ne sont
// ouverts en écriture.
// ABS-04, SEC-12 : le journal ne reçoit qu'un code ; aucune valeur du fichier n'en sort.

import { type BACKUP_ALIAS, checkRows } from '@/data/backupRows';
import type { Db } from '@/data/db';
import { log } from '@/data/log';
import { MIGRATIONS, type Migration, migrate } from '@/data/migrations';
import { settingsRepo } from '@/data/settingsRepo';
import { validateDate } from '@/domain/validation';

/** Accès aux fichiers sans les ouvrir comme base (014b : expo-file-system ; tests : node:fs). */
export type BackupFiles = {
  size(path: string): Promise<number>;
  readHead(path: string, length: number): Promise<Uint8Array>;
  /** Copie octet pour octet ; la destination est un chemin temporaire neuf. */
  copy(from: string, to: string): Promise<void>;
};

/**
 * Ouvre la base à ce chemin **telle quelle**, ou une base vide en mémoire avec ':memory:'.
 * Contrat de l'appelant (014b) : ni prepareDatabase ni migrations, sinon une base en version 0
 * serait migrée puis acceptée. L'appelant supprime ensuite la copie et ses fichiers `-wal`,
 * `-shm` et `-journal`.
 */
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

// Symbole de typage seulement, non exporté : aucun autre module ne peut poser la marque.
declare const verifiedBrand: unique symbol;
/**
 * Copie acceptée par verifyBackup, seule à pouvoir être restaurée (restoreBackup) : la marque est
 * obligatoire et seule verifyBackup la pose. `path` est le chemin de la copie temporaire.
 */
export type VerifiedBackup = {
  readonly path: string;
  readonly summary: BackupSummary;
  /** Jour de la vérification (AAAA-MM-JJ), repris par le recontrôle de la restauration. */
  readonly today: string;
  readonly [verifiedBrand]: true;
};

export type Verification =
  | { ok: true; backup: VerifiedBackup }
  | { ok: false; reason: RejectReason };

export const SAME_PATH = 'La copie à vérifier doit avoir son propre chemin';

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

/** Schéma d'une base (`main`) ou de la copie attachée, trié : comparé exactement. */
export const schemaOf = async (
  db: Db,
  schema: 'main' | typeof BACKUP_ALIAS = 'main',
): Promise<string[]> =>
  (await db.query<SchemaRow>(`SELECT type, name, tbl_name, sql FROM ${schema}.sqlite_schema`))
    .map((row) => JSON.stringify([row.type, row.name, row.tbl_name, row.sql]))
    .sort();

/** Schéma exact d'une base de l'appli à cette version : tables, index, déclencheur ; rien de plus. */
const expectedSchema = async (open: OpenDb, migrations: Migration[]) => {
  const scratch = await open(':memory:');
  try {
    await migrate(scratch, migrations);
    return await schemaOf(scratch);
  } finally {
    await scratch.close().catch(() => undefined);
  }
};

const count = async (db: Db, sql: string) => (await db.query<{ n: number }>(sql))[0]?.n ?? 0;

const summarize = async (db: Db): Promise<BackupSummary> => ({
  members: await count(db, 'SELECT count(*) AS n FROM members'),
  groups: await count(db, 'SELECT count(*) AS n FROM groups'),
  recordedSessions: await count(db, "SELECT count(*) AS n FROM sessions WHERE state = 'recorded'"),
  backupDate: await settingsRepo(db).lastBackupDate(),
});

// Ordre voulu : la version avant le schéma (une version future a un autre schéma, cause à part),
// le schéma avant integrity_check (aucune expression du fichier n'est évaluée avant d'être connue).
const inspect = async (copy: Db, open: OpenDb, migrations: Migration[], today: string) => {
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
  const invalid = await checkRows(copy, today);
  if (invalid) reject(invalid);
  return version;
};

/**
 * Vérifie le fichier choisi `sourcePath` : contrôle de sa taille et de son en-tête, copie dans
 * `copyPath` (chemin temporaire neuf), puis tous les contrôles sur la copie seule. Accepté : le
 * résumé et la copie, prête pour restoreBackup. Refusé : une cause ; rien n'a touché la base de
 * l'appareil ni le fichier choisi.
 */
export const verifyBackup = async (
  sourcePath: string,
  copyPath: string,
  deps: { files: BackupFiles; open: OpenDb; today: string; migrations?: Migration[] },
): Promise<Verification> => {
  const { files, open, migrations = MIGRATIONS } = deps;
  // Erreurs de l'appelant, levées avant tout : le fichier choisi ne doit jamais être la copie.
  if (copyPath === sourcePath) throw new Error(SAME_PATH);
  const today = validateDate(deps.today);
  try {
    // Un fichier trop gros ou étranger n'est même pas copié ; la copie est recontrôlée ensuite.
    await checkFile(files, sourcePath);
    // Une copie impossible (place, droits) est rapportée comme un fichier abîmé (DAMAGED).
    await files.copy(sourcePath, copyPath);
    await checkFile(files, copyPath);
    let copy: Db;
    try {
      copy = await open(copyPath);
    } catch {
      return reject('DAMAGED');
    }
    try {
      const version = await inspect(copy, open, migrations, today);
      const summary = await summarize(copy);
      log('RESTORE_VERIFIED', { version });
      // Seul endroit où la marque d'une copie vérifiée est posée.
      return { ok: true, backup: { path: copyPath, summary, today } as VerifiedBackup };
    } finally {
      // Une fermeture qui échoue ne change ni le résultat ni la cause d'un refus.
      await copy.close().catch(() => undefined);
    }
  } catch (error) {
    // Toute autre erreur de SQLite sur la copie (fichier malformé, page illisible) : abîmée.
    const reason = error instanceof Rejected ? error.reason : 'DAMAGED';
    log(`RESTORE_REJECTED_${reason}`);
    return { ok: false, reason };
  }
};
