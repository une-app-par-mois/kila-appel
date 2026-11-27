// Sauvegarde et restauration (EX-19, EX-20, NF-04 ; ARCHITECTURE §4.3, zone sensible).
// Les chemins sont passés par l'appelant (014b) ; ce module ne touche aux fichiers que par SQLite.
// ABS-06 : la copie est en clair, sans chiffrement. ABS-04 : le journal ne reçoit que des codes.
import { schemaOf, type VerifiedBackup } from '@/data/backupCheck';
import { BACKUP_ALIAS as ALIAS, checkRows } from '@/data/backupRows';
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { log } from '@/data/log';
import { SETTING_KEYS } from '@/data/settingsRepo';
import { validateDate } from '@/domain/validation';

// Noms de tables et de colonnes lus dans le schéma de l'appli, contrôlés avant d'entrer dans le SQL.
export const IDENTIFIER = /^[a-z][a-z0-9_]*$/;

const quoted = (name: string) => {
  if (!IDENTIFIER.test(name)) throw new DataError('RESTORE_FAILED');
  return `"${name}"`;
};

// Un DETACH qui échoue est ignoré : l'erreur d'origine reste celle qui remonte, et l'ATTACH
// suivant détache d'abord l'alias resté en place.
const detach = (db: Db) =>
  db.execute(`DETACH DATABASE ${ALIAS}`).then(
    () => undefined,
    () => undefined,
  );

const attach = async (db: Db, path: string) => {
  const attached = await db.query<{ name: string }>('SELECT name FROM pragma_database_list');
  if (attached.some((row) => row.name === ALIAS)) await db.execute(`DETACH DATABASE ${ALIAS}`);
  await db.execute(`ATTACH DATABASE ? AS ${ALIAS}`, [path]);
};

/**
 * EX-19 : copie cohérente de la base dans `path` (fichier neuf : un fichier existant est refusé),
 * avec la date de la sauvegarde (`today`, AAAA-MM-JJ) écrite dans la copie seulement. La base de
 * l'appareil n'est pas modifiée : l'écran (014b) note la date une fois le fichier partagé.
 * Contrat de l'appelant : un chemin neuf à chaque essai ; si l'export échoue après `VACUUM INTO`,
 * il supprime le fichier, qui serait une copie sans date.
 */
export const exportBackup = async (db: Db, path: string, today: string): Promise<void> => {
  const date = validateDate(today);
  await db.execute('VACUUM INTO ?', [path]);
  await attach(db, path);
  try {
    await db.execute(
      `INSERT INTO ${ALIAS}.settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      [SETTING_KEYS.lastBackupAt, date],
    );
  } finally {
    await detach(db);
  }
  log('BACKUP_EXPORTED');
};

const mainTables = async (tx: Db) =>
  (
    await tx.query<{ name: string }>(
      "SELECT name FROM main.sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).map((row) => quoted(row.name));

const columns = async (tx: Db, table: string) =>
  (
    await tx.query<{ name: string }>("SELECT name FROM pragma_table_info(?, 'main') ORDER BY cid", [
      table.slice(1, -1),
    ])
  )
    .map((row) => quoted(row.name))
    .join(', ');

const userVersion = async (tx: Db, schema: string) =>
  (await tx.query<{ user_version: number }>(`PRAGMA ${schema}.user_version`))[0]?.user_version;

/**
 * SEC-10 : la copie a pu changer depuis sa vérification. Dans la transaction, avant d'écrire :
 * même schéma et même version que la base de l'appareil, et chaque ligne valide.
 */
const recheck = async (tx: Db) => {
  const same = JSON.stringify(await schemaOf(tx, ALIAS)) === JSON.stringify(await schemaOf(tx));
  if (!same || (await userVersion(tx, ALIAS)) !== (await userVersion(tx, 'main')))
    throw new DataError('RESTORE_FAILED');
  if ((await checkRows(tx, ALIAS)) !== null) throw new DataError('RESTORE_FAILED');
};

/**
 * Recopie toutes les tables de la copie dans la base de l'appareil, en une seule transaction :
 * tables vidées puis remplies, colonne par colonne selon le schéma de l'appli. Aucun objet de la
 * copie (déclencheur, vue) n'entre ; les clés étrangères sont contrôlées à la validation.
 */
const copyAll = async (tx: Db) => {
  await recheck(tx);
  // Valable jusqu'à la fin de la transaction : l'ordre de recopie des tables n'importe plus.
  await tx.execute('PRAGMA defer_foreign_keys = ON');
  const tables = await mainTables(tx);
  for (const table of tables) await tx.execute(`DELETE FROM main.${table}`);
  for (const table of tables) {
    const list = await columns(tx, table);
    await tx.execute(`INSERT INTO main.${table} (${list}) SELECT ${list} FROM ${ALIAS}.${table}`);
  }
  const [members] = await tx.query<{ n: number }>('SELECT count(*) AS n FROM main.members');
  return members?.n ?? 0;
};

/**
 * EX-20, NF-04 : remplace toutes les données (réglages et appel en cours compris) par celles d'une
 * copie vérifiée. La connexion est gardée ; un échec annule tout et laisse la base intacte. Les
 * anciennes valeurs sont effacées du fichier par secure_delete (ticket 007d).
 */
export const restoreBackup = async (db: Db, backup: VerifiedBackup): Promise<void> => {
  let memberCount: number;
  try {
    await attach(db, backup.path);
    try {
      memberCount = await db.transaction(copyAll);
    } finally {
      await detach(db);
    }
  } catch {
    // L'erreur de SQLite n'est pas relayée : un code seul (ABS-04).
    log('RESTORE_FAILED');
    throw new DataError('RESTORE_FAILED');
  }
  log('RESTORE_DONE', { memberCount });
};
