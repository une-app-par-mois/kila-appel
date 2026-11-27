/**
 * @jest-environment node
 */
// EX-20, SEC-10 : chaque ligne d'une sauvegarde rejouée contre les règles de l'appli (ticket 014).
import { seed } from '@/__fixtures__/seed';
import { checkRows } from '@/data/backupRows';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

// Jour de la vérification : borne de la date de naissance (EX-03).
const TODAY = '2026-11-27';

const ID_COLUMNS: [string, string][] = [
  ['seasons', 'id'],
  ['members', 'id'],
  ['emergency_contacts', 'id'],
  ['emergency_contacts', 'member_id'],
  ['groups', 'id'],
  ['groups', 'season_id'],
  ['enrollments', 'id'],
  ['enrollments', 'member_id'],
  ['enrollments', 'group_id'],
  ['slots', 'id'],
  ['slots', 'season_id'],
  ['slot_dates', 'slot_id'],
  ['slot_groups', 'slot_id'],
  ['slot_groups', 'group_id'],
  ['sessions', 'id'],
  ['sessions', 'season_id'],
  ['sessions', 'slot_id'],
  ['session_groups', 'session_id'],
  ['session_groups', 'group_id'],
  ['attendances', 'session_id'],
  ['attendances', 'member_id'],
  ['roll_call_drafts', 'id'],
  ['roll_call_drafts', 'season_id'],
  ['roll_call_drafts', 'slot_id'],
  ['roll_call_draft_groups', 'draft_id'],
  ['roll_call_draft_groups', 'group_id'],
  ['roll_call_draft_statuses', 'draft_id'],
  ['roll_call_draft_statuses', 'member_id'],
  ['alert_acks', 'member_id'],
];

describe('checkRows : toute ligne de la copie passe les règles de l’appli', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    await db.execute("INSERT INTO settings (key, value) VALUES ('last_backup_at', '2026-10-22')");
    await db.execute("INSERT INTO settings (key, value) VALUES ('backup_invite_seen', '1')");
    await db.execute("INSERT INTO settings (key, value) VALUES ('retention_seasons', '2')");
    await db.execute("UPDATE sessions SET comment = 'Séance fictive'");
    // Les contraintes de la base sont contournées : seule checkRows doit refuser.
    await db.execute('PRAGMA ignore_check_constraints = ON');
    await db.execute('PRAGMA foreign_keys = OFF');
  });
  afterEach(async () => {
    await db.close();
  });

  it('accepte le jeu fictif', async () => {
    expect(await checkRows(db, TODAY)).toBeNull();
  });

  const long = 'x'.repeat(501);
  it.each([
    ['EX-01 nom de saison vide', "UPDATE seasons SET name = '  '"],
    ['EX-01 fin de saison avant son début', "UPDATE seasons SET end_date = '2000-01-01'"],
    ['ABS-03 nom de membre vide', "UPDATE members SET last_name = ' '"],
    ['ABS-03 prénom de membre vide', "UPDATE members SET first_name = ''"],
    ['EX-03 date de naissance invalide', "UPDATE members SET birth_date = '2015-02-30'"],
    ['EX-03 date d’archivage d’un membre invalide', "UPDATE members SET archived_at = 'hier'"],
    ['ticket 008 téléphone d’un contact invalide', "UPDATE emergency_contacts SET phone = '12'"],
    ['ticket 008 contact sans nom', 'UPDATE emergency_contacts SET label = NULL'],
    ['EX-02 nom de groupe vide', "UPDATE groups SET name = ' '"],
    ['EX-02 date d’archivage d’un groupe invalide', "UPDATE groups SET archived_at = '2026-13-01'"],
    ['EX-04 début d’inscription invalide', "UPDATE enrollments SET start_date = '01/09/2026'"],
    ['EX-04 fin d’inscription invalide', "UPDATE enrollments SET end_date = '2026-09-31'"],
    ['EX-08 schedule_from invalide', "UPDATE slots SET schedule_from = 'demain'"],
    ['EX-07 heure de créneau invalide', "UPDATE slots SET start_time = '25:00'"],
    ['F-10 date d’un créneau ponctuel invalide', "UPDATE slot_dates SET date = '2026-12-32'"],
    ['RM-04 date de séance invalide', "UPDATE sessions SET date = '2026-11'"],
    ['RM-04 heure de séance invalide', "UPDATE sessions SET start_time = '9h'"],
    ['EX-13 commentaire de séance trop long', `UPDATE sessions SET comment = '${long}'`],
    ['EX-10 statut de présence inconnu', "UPDATE attendances SET status = 'peut-être'"],
    ['EX-14 date du brouillon invalide', "UPDATE roll_call_drafts SET date = 'hier'"],
    [
      'EX-14 heure de début du brouillon invalide',
      "UPDATE roll_call_drafts SET started_at = '24:00'",
    ],
    ['EX-14 updated_at du brouillon invalide', "UPDATE roll_call_drafts SET updated_at = 'hier'"],
    ['EX-13 commentaire du brouillon trop long', `UPDATE roll_call_drafts SET comment = '${long}'`],
    ['EX-10 statut du brouillon inconnu', "UPDATE roll_call_draft_statuses SET status = 'x'"],
    ['EX-26 date d’alerte traitée invalide', "UPDATE alert_acks SET acked_at = '2026-02-29'"],
    ['ADR-002 réglage inconnu', "INSERT INTO settings (key, value) VALUES ('nom', 'Exemple')"],
    [
      'EX-21 date de sauvegarde invalide',
      "UPDATE settings SET value = 'hier' WHERE key = 'last_backup_at'",
    ],
    [
      'EX-21 invitation vue invalide',
      "UPDATE settings SET value = '2' WHERE key = 'backup_invite_seen'",
    ],
    [
      'EX-24 conservation invalide',
      "UPDATE settings SET value = '7' WHERE key = 'retention_seasons'",
    ],
    // Les lignes acceptées sont celles que l'appli écrirait : valeurs nettoyées et normalisées.
    [
      'EX-03 date de naissance après le jour de la vérification',
      "UPDATE members SET birth_date = '2026-11-28'",
    ],
    ['EX-01 nom de saison avec des espaces autour', "UPDATE seasons SET name = ' Saison '"],
    ['EX-03 nom de membre avec des espaces autour', "UPDATE members SET last_name = 'Exemple '"],
    ['EX-03 prénom de membre avec des espaces autour', "UPDATE members SET first_name = ' Alix'"],
    [
      'ticket 008 téléphone non normalisé',
      "UPDATE emergency_contacts SET phone = '06 00 00 00 00'",
    ],
    [
      'ticket 008 nom de contact avec des espaces autour',
      "UPDATE emergency_contacts SET label = 'Parent '",
    ],
    ['EX-02 nom de groupe avec des espaces autour', "UPDATE groups SET name = ' Poussins'"],
    ['EX-07 lieu de créneau vide', "UPDATE slots SET place = ''"],
    ['EX-07 lieu de créneau fait d’espaces', "UPDATE slots SET place = '   '"],
    ['EX-07 lieu de créneau avec des espaces autour', "UPDATE slots SET place = 'Gymnase '"],
    ['EX-07 nom de créneau fait d’espaces', "UPDATE slots SET name = ' '"],
    ['EX-07 nom de créneau avec des espaces autour', "UPDATE slots SET name = ' Mercredi'"],
    ['EX-13 commentaire de séance vide', "UPDATE sessions SET comment = ''"],
    ['EX-13 commentaire de séance fait d’espaces', "UPDATE sessions SET comment = '  '"],
    [
      'EX-13 commentaire de séance avec des espaces autour',
      "UPDATE sessions SET comment = 'Séance '",
    ],
    ['EX-13 commentaire du brouillon fait d’espaces', "UPDATE roll_call_drafts SET comment = ' '"],
    [
      'EX-13 commentaire du brouillon avec des espaces autour',
      "UPDATE roll_call_drafts SET comment = ' Note'",
    ],
  ])('refuse : %s (INVALID_DATA)', async (_rule, sql) => {
    await db.execute(sql);
    expect(await checkRows(db, TODAY)).toBe('INVALID_DATA');
  });

  it('EX-14 accepte un updated_at avec ou sans secondes', async () => {
    await db.execute("UPDATE roll_call_drafts SET updated_at = '2026-12-02T17:35'");
    expect(await checkRows(db, TODAY)).toBeNull();
  });

  it('EX-03 accepte une date de naissance le jour même de la vérification', async () => {
    await db.execute("UPDATE members SET birth_date = '2026-11-27'");
    expect(await checkRows(db, TODAY)).toBeNull();
  });

  it('EX-07 accepte un lieu et un nom de créneau nettoyés, ou absents', async () => {
    await db.execute("UPDATE slots SET place = NULL, name = 'Mercredi soir'");
    expect(await checkRows(db, TODAY)).toBeNull();
  });

  it('EX-39 accepte une séance et un brouillon sans créneau (slot_id nul)', async () => {
    await db.execute('UPDATE sessions SET slot_id = NULL');
    await db.execute('UPDATE roll_call_drafts SET slot_id = NULL');
    expect(await checkRows(db, TODAY)).toBeNull();
  });

  // Chaque colonne id et *_id : un entier de 1 ou plus (isId).
  it.each(ID_COLUMNS)(
    'refuse un identifiant invalide : %s.%s (INVALID_DATA)',
    async (table, column) => {
      // Une seule ligne modifiée (rowid le plus petit) : 0 puis -1 refusés.
      for (const value of [0, -1]) {
        await db.execute(
          `UPDATE ${table} SET ${column} = ? WHERE rowid = (SELECT min(rowid) FROM ${table})`,
          [value],
        );
        expect(await checkRows(db, TODAY)).toBe('INVALID_DATA');
      }
    },
  );

  it('chaque colonne id et *_id du schéma est dans la liste', async () => {
    const columns = await db.query<{ t: string; c: string }>(
      `SELECT m.name AS t, p.name AS c FROM sqlite_schema m, pragma_table_info(m.name) p
       WHERE m.type = 'table'`,
    );
    const found = columns
      .filter(({ c }) => c === 'id' || c.endsWith('_id'))
      .map(({ t, c }) => `${t}.${c}`)
      .sort();
    expect(found).toEqual(ID_COLUMNS.map(([t, c]) => `${t}.${c}`).sort());
  });
});
