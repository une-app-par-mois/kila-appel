/**
 * @jest-environment node
 */
// slots.created_on : date de création d'un créneau (EX-08, décision du porteur du 2026-11-26).
// Ajoutée à la migration 1, encore corrigeable avant la publication (ADR-003).
import type { Db } from '@/data/db';
import { LATEST_VERSION } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

const insertSlot = (db: Db, createdOn: string | null) =>
  db.execute(
    "INSERT INTO slots (season_id, weekday, start_time, duration_min, created_on) VALUES (1, 3, '17:30', 90, ?)",
    [createdOn],
  );

describe('EX-08 slots.created_on garanti par la base', () => {
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

  it('ADR-003 reste dans la migration 1, seule avant la publication', () => {
    expect(LATEST_VERSION).toBe(1);
  });

  it('accepte un créneau avec sa date de création', async () => {
    await insertSlot(db, '2026-10-14');
    expect(await db.query('SELECT created_on FROM slots')).toEqual([{ created_on: '2026-10-14' }]);
  });

  it.each([
    ['absente', null],
    ['invalide', '2026-02-30'],
    ['au mauvais format', '14/10/2026'],
  ])('refuse un créneau dont la date de création est %s', async (_cas, value) => {
    await expect(insertSlot(db, value)).rejects.toThrow(/created_on|NOT NULL|CHECK/);
  });

  it('refuse de changer la date de création, mais laisse modifier le reste', async () => {
    await insertSlot(db, '2026-10-14');
    await expect(db.execute("UPDATE slots SET created_on = '2026-09-01'")).rejects.toThrow(
      /created_on/,
    );
    await db.execute("UPDATE slots SET start_time = '18:00'");
    expect(await db.query('SELECT start_time, created_on FROM slots')).toEqual([
      { start_time: '18:00', created_on: '2026-10-14' },
    ]);
  });
});
