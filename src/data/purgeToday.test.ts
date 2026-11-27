/**
 * @jest-environment node
 */
// Purge : seules les saisons commencées comptent parmi les gardées (ticket 015b, décision du
// porteur du 2026-11-27), et la purge revérifie la liste au jour donné.
import { addSeason, counts, oldSeason, TODAY } from '@/__fixtures__/purgeSeed';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { purge, purgeCandidates } from '@/data/purge';
import { InputError } from '@/domain/validation';

jest.mock('@/data/log', () => ({ log: jest.fn() }));

describe('Purge et date du jour (EX-24)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
  });
  afterEach(async () => {
    await db.close();
  });

  it('EX-24 une saison à venir n’est jamais candidate et ne compte pas parmi les gardées', async () => {
    const next = await addSeason(db, '2027-2028', '2027-09-01', '2028-07-31');
    const old = await addSeason(db, '2024-2025', '2024-09-01', '2025-07-31');
    expect((await purgeCandidates(db, 2, TODAY)).map((x) => x.id)).toEqual([old]);
    expect((await purgeCandidates(db, 1, TODAY)).map((x) => x.id)).toEqual([s.otherSeasonId, old]);
    // Même la plus récente des saisons, si elle n'a pas commencé, n'est jamais proposée.
    expect((await purgeCandidates(db, 1, '2020-01-01')).map((x) => x.id)).toEqual([]);
    expect((await purgeCandidates(db, 1, '2028-01-01')).map((x) => x.id)).not.toContain(next);
  });

  it('EX-24 une saison qui commence aujourd’hui compte parmi les gardées', async () => {
    await addSeason(db, 'Stage', TODAY, '2027-01-31');
    const old = await addSeason(db, '2024-2025', '2024-09-01', '2025-07-31');
    expect((await purgeCandidates(db, 2, TODAY)).map((x) => x.id)).toEqual([s.otherSeasonId, old]);
    // La veille, elle est à venir : elle ne compte pas.
    expect((await purgeCandidates(db, 2, '2026-11-26')).map((x) => x.id)).toEqual([old]);
  });

  it('EX-24 refuse un jour qui n’est pas une date', async () => {
    await expect(purgeCandidates(db, 2, '27/11/2026')).rejects.toThrow(
      new InputError('DATE_INVALID'),
    );
    const old = await oldSeason(db, s);
    await expect(purge(db, [old.seasonId], 2, '')).rejects.toThrow(new InputError('DATE_INVALID'));
  });

  it('EX-24 purge refusée, rien d’effacé, si la date change la liste des candidates', async () => {
    await addSeason(db, 'Stage', TODAY, '2027-01-31');
    const old = await oldSeason(db, s);
    // Confirmée la veille : seule 2023-2024 dépassait la durée.
    expect((await purgeCandidates(db, 2, '2026-11-26')).map((x) => x.id)).toEqual([old.seasonId]);
    const before = await counts(db);
    // Le jour a changé : le stage a commencé, 2025-2026 dépasse aussi la durée.
    await expect(purge(db, [old.seasonId], 2, TODAY)).rejects.toThrow(
      new DataError('NOT_PURGEABLE'),
    );
    expect(await counts(db)).toEqual(before);
    await purge(db, [old.seasonId], 2, '2026-11-26');
    expect(await count(db, 'seasons')).toBe(before.seasons - 1);
  });
});
