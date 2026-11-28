/**
 * @jest-environment node
 */
// slots.schedule_from : date d'effet de l'horaire du créneau (EX-08, décisions du porteur du
// 2026-11-26). Fixée à la création, avancée quand le jour ou l'heure changent, jamais reculée.
// Ajoutée à la migration 1, encore corrigeable avant la publication (ADR-003).
import type { Db } from '@/data/db';
import { MIGRATIONS } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

const insertSlot = (db: Db, scheduleFrom: string | null) =>
  db.execute(
    "INSERT INTO slots (season_id, weekday, start_time, duration_min, schedule_from) VALUES (1, 3, '17:30', 90, ?)",
    [scheduleFrom],
  );

describe('EX-08 slots.schedule_from garanti par la base', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await db.execute(
      "INSERT INTO seasons (id, name, start_date, end_date) VALUES (1, 'Saison fictive', '2026-09-01', '2027-06-30')",
    );
  });
  afterEach(async () => {
    await db.close();
  });

  it('ADR-003 le déclencheur reste dans la migration 1 (la migration 2 vient du ticket 043)', () => {
    const [first] = MIGRATIONS;
    expect(first?.statements.some((sql) => sql.includes('slots_schedule_from_forward'))).toBe(true);
  });

  it('accepte un créneau avec sa date de création', async () => {
    await insertSlot(db, '2026-10-14');
    expect(await db.query('SELECT schedule_from FROM slots')).toEqual([
      { schedule_from: '2026-10-14' },
    ]);
  });

  it.each([
    ['absente', null],
    ['invalide', '2026-02-30'],
    ['au mauvais format', '14/10/2026'],
  ])('refuse un créneau dont la date de création est %s', async (_cas, value) => {
    await expect(insertSlot(db, value)).rejects.toThrow(/schedule_from|NOT NULL|CHECK/);
  });

  it('laisse avancer la date d’effet (changement d’horaire), jamais la reculer', async () => {
    await insertSlot(db, '2026-10-14');
    await db.execute("UPDATE slots SET weekday = 4, schedule_from = '2026-11-20'");
    await expect(db.execute("UPDATE slots SET schedule_from = '2026-11-19'")).rejects.toThrow(
      /schedule_from/,
    );
    await expect(db.execute('UPDATE slots SET schedule_from = NULL')).rejects.toThrow();
    expect(await db.query('SELECT weekday, schedule_from FROM slots')).toEqual([
      { weekday: 4, schedule_from: '2026-11-20' },
    ]);
  });

  it('laisse modifier le reste sans toucher à la date d’effet', async () => {
    await insertSlot(db, '2026-10-14');
    await db.execute("UPDATE slots SET start_time = '18:00'");
    expect(await db.query('SELECT start_time, schedule_from FROM slots')).toEqual([
      { start_time: '18:00', schedule_from: '2026-10-14' },
    ]);
  });
});
