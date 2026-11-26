/**
 * @jest-environment node
 */
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

describe('Contraintes du schéma', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = openNodeDb();
    await prepareDatabase(db);
    s = await seed(db);
  });
  afterEach(async () => {
    await db.close();
  });

  it('EX-01 une seule saison active (index unique partiel)', async () => {
    await expect(
      db.execute(
        'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES (?, ?, ?, 1)',
        ['Autre', '2027-09-01', '2028-07-31'],
      ),
    ).rejects.toThrow();
    await db.execute(
      'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES (?, ?, ?, 0)',
      ['Inactive', '2027-09-01', '2028-07-31'],
    );
    expect(await count(db, 'seasons')).toBe(3);
  });

  it('RM-05 une seule séance par créneau et par date', async () => {
    await expect(
      db.execute(
        "INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, ?, ?, ?, 'prepared')",
        [s.seasonId, s.slotId, '2026-11-25', '17:30'],
      ),
    ).rejects.toThrow();
  });

  it('EX-39 plusieurs appels sans créneau le même jour sont permis', async () => {
    for (let i = 0; i < 2; i++) {
      await db.execute(
        "INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, NULL, ?, ?, 'recorded')",
        [s.seasonId, '2026-11-25', '10:00'],
      );
    }
    expect(await count(db, 'sessions', 'slot_id IS NULL')).toBe(2);
  });

  it.each([
    ['statut de présence inconnu', "UPDATE attendances SET status = 'malade'"],
    ['état de séance inconnu', "UPDATE sessions SET state = 'done'"],
    ['date inexistante (RM-04)', "UPDATE sessions SET date = '2027-02-29'"],
    ['date au format affiché (RM-04)', "UPDATE sessions SET date = '25/11/2026'"],
    ['année hors de 1900 à 2100 (RM-04)', "UPDATE members SET birth_date = '1899-12-31'"],
    ['heure invalide', "UPDATE sessions SET start_time = '24:00'"],
    ['heure sans zéro', "UPDATE slots SET start_time = '9:30'"],
    ['jour de semaine hors de 1 à 7', 'UPDATE slots SET weekday = 8'],
    ['durée nulle', 'UPDATE slots SET duration_min = 0'],
    [
      'fin de saison avant le début',
      "UPDATE seasons SET end_date = '2026-08-01' WHERE is_active = 1",
    ],
    ['fin d’inscription avant le début', "UPDATE enrollments SET end_date = '2020-01-01'"],
    ['nom de membre vide (ABS-03)', "UPDATE members SET last_name = '  '"],
    ['prénom absent (ABS-03)', 'UPDATE members SET first_name = NULL'],
    ['statut inconnu dans le brouillon', "UPDATE roll_call_draft_statuses SET status = 'parti'"],
  ])('refuse : %s', async (_cas, sql) => {
    await expect(db.execute(sql)).rejects.toThrow();
  });

  it('EX-14 un seul brouillon d’appel à la fois', async () => {
    await expect(
      db.execute(
        'INSERT INTO roll_call_drafts (id, season_id, slot_id, date, updated_at) VALUES (2, ?, NULL, ?, ?)',
        [s.seasonId, '2026-12-03', '2026-12-03T10:00:00'],
      ),
    ).rejects.toThrow();
  });

  it('refuse une référence vers une ligne absente (clés étrangères actives)', async () => {
    await expect(
      db.execute(
        "INSERT INTO attendances (session_id, member_id, status) VALUES (?, 9999, 'present')",
        [s.sessionId],
      ),
    ).rejects.toThrow();
  });

  it('SEC-05 les valeurs avec apostrophe, guillemet et point-virgule sont stockées telles quelles', async () => {
    const lastName = 'D\'Artagnan"; DROP TABLE members; --';
    const firstName = "Zoé'); DELETE FROM attendances; --";
    const { lastInsertRowId } = await db.execute(
      'INSERT INTO members (last_name, first_name) VALUES (?, ?)',
      [lastName, firstName],
    );
    const rows = await db.query<{ last_name: string; first_name: string }>(
      'SELECT last_name, first_name FROM members WHERE id = ?',
      [lastInsertRowId],
    );
    expect(rows).toEqual([{ last_name: lastName, first_name: firstName }]);
    expect(await count(db, 'members')).toBe(3);
    expect(await count(db, 'attendances')).toBe(2);
  });
});
