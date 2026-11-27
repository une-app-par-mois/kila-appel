/**
 * @jest-environment node
 */
// EX-20, SEC-10 : chaque ligne d'une sauvegarde rejouée contre les règles de l'appli (ticket 014).
import { seed } from '@/__fixtures__/seed';
import { checkRows } from '@/data/backupRows';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

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
  });
  afterEach(async () => {
    await db.close();
  });

  it('accepte le jeu fictif', async () => {
    expect(await checkRows(db)).toBeNull();
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
  ])('refuse : %s (INVALID_DATA)', async (_rule, sql) => {
    await db.execute(sql);
    expect(await checkRows(db)).toBe('INVALID_DATA');
  });

  it('EX-14 accepte un updated_at avec ou sans secondes', async () => {
    await db.execute("UPDATE roll_call_drafts SET updated_at = '2026-12-02T17:35'");
    expect(await checkRows(db)).toBeNull();
  });
});
