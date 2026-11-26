/**
 * @jest-environment node
 */
import { count, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { NOT_FOUND, seasonsRepo } from '@/data/seasonsRepo';

const input = (name: string, startDate = '2026-09-01', endDate = '2027-07-31') => ({
  name,
  startDate,
  endDate,
});

describe('Dépôt des saisons (EX-01)', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
  });
  afterEach(async () => {
    await db.close();
  });

  it('crée une saison inactive, nom nettoyé, et la relit', async () => {
    const repo = seasonsRepo(db);
    const id = await repo.create(input('  2026-2027 '));
    expect(await repo.list()).toEqual([
      { id, name: '2026-2027', startDate: '2026-09-01', endDate: '2027-07-31', isActive: false },
    ]);
    expect(await repo.getActive()).toBeNull();
  });

  it('liste les saisons de la plus récente à la plus ancienne', async () => {
    const repo = seasonsRepo(db);
    await repo.create(input('2025-2026', '2025-09-01', '2026-07-31'));
    await repo.create(input('2026-2027'));
    expect((await repo.list()).map((s) => s.name)).toEqual(['2026-2027', '2025-2026']);
  });

  it('refuse une saisie invalide sans rien écrire', async () => {
    const repo = seasonsRepo(db);
    await expect(repo.create(input('S', '2026-09-01', '2026-08-01'))).rejects.toThrow(
      'END_BEFORE_START',
    );
    expect(await count(db, 'seasons')).toBe(0);
  });

  it('modifie le nom et les dates', async () => {
    const repo = seasonsRepo(db);
    const id = await repo.create(input('2026-2027'));
    await repo.update(id, input('Saison 26-27', '2026-08-25', '2027-06-30'));
    expect((await repo.list())[0]).toMatchObject({
      name: 'Saison 26-27',
      startDate: '2026-08-25',
      endDate: '2027-06-30',
    });
    await expect(repo.update(id + 99, input('X'))).rejects.toThrow(NOT_FOUND);
  });

  it('EX-01 une seule saison active : en activer une désactive la précédente', async () => {
    const repo = seasonsRepo(db);
    const first = await repo.create(input('2025-2026', '2025-09-01', '2026-07-31'));
    const second = await repo.create(input('2026-2027'));
    await repo.activate(first);
    await repo.activate(second);
    expect((await repo.getActive())?.id).toBe(second);
    expect(await count(db, 'seasons', 'is_active = 1')).toBe(1);
  });

  it('activer une saison inconnue ne change rien (transaction annulée)', async () => {
    const repo = seasonsRepo(db);
    const id = await repo.create(input('2026-2027'));
    await repo.activate(id);
    await expect(repo.activate(id + 99)).rejects.toThrow(NOT_FOUND);
    expect((await repo.getActive())?.id).toBe(id);
  });

  it('EX-01 annonce ce que la suppression effacera, puis efface exactement cela', async () => {
    const s = await seed(db);
    const repo = seasonsRepo(db);
    expect(await repo.deletionImpact(s.seasonId)).toEqual({
      groups: 1,
      slots: 1,
      sessions: 1,
      attendances: 2,
    });
    await repo.remove(s.seasonId);
    expect(await count(db, 'seasons')).toBe(1);
    expect(await count(db, 'groups', 'season_id = ?', [s.seasonId])).toBe(0);
    expect(await count(db, 'slots')).toBe(0);
    expect(await count(db, 'sessions')).toBe(0);
    expect(await count(db, 'attendances')).toBe(0);
    expect(await count(db, 'members')).toBe(2);
    expect(await count(db, 'groups', 'season_id = ?', [s.otherSeasonId])).toBe(1);
  });

  it('supprimer une saison inconnue est refusé', async () => {
    await expect(seasonsRepo(db).remove(42)).rejects.toThrow(NOT_FOUND);
  });
});
