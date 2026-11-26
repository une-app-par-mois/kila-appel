/**
 * @jest-environment node
 */
import { count, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { groupsRepo } from '@/data/groupsRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

describe('Dépôt des groupes (EX-02)', () => {
  let db: Db;
  let seasonId: number;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    seasonId = (
      await db.execute(
        "INSERT INTO seasons (name, start_date, end_date) VALUES ('2026-2027', '2026-09-01', '2027-07-31')",
      )
    ).lastInsertRowId;
  });
  afterEach(async () => {
    await db.close();
  });

  it('EX-02 crée des groupes, nom nettoyé, triés à la française (accents, casse)', async () => {
    const repo = groupsRepo(db);
    await repo.create(seasonId, ' Poussins mercredi ');
    await repo.create(seasonId, 'Élite');
    await repo.create(seasonId, 'benjamins');
    expect((await repo.listBySeason(seasonId)).map((g) => g.name)).toEqual([
      'benjamins',
      'Élite',
      'Poussins mercredi',
    ]);
  });

  it('EX-02 refuse un nom vide ou une saison inconnue', async () => {
    const repo = groupsRepo(db);
    await expect(repo.create(seasonId, '  ')).rejects.toThrow('NAME_REQUIRED');
    await expect(repo.create(seasonId + 99, 'Poussins')).rejects.toThrow();
    expect(await count(db, 'groups')).toBe(0);
  });

  it('EX-02 renomme un groupe', async () => {
    const repo = groupsRepo(db);
    const id = await repo.create(seasonId, 'Poussins');
    await repo.rename(id, 'Poussins mercredi');
    expect((await repo.listBySeason(seasonId))[0]?.name).toBe('Poussins mercredi');
    await expect(repo.rename(id + 99, 'X')).rejects.toThrow('NOT_FOUND');
  });

  it('EX-02 archive un groupe à la date donnée, puis le désarchive', async () => {
    const repo = groupsRepo(db);
    const id = await repo.create(seasonId, 'Poussins');
    await repo.archive(id, '2026-11-26');
    expect(await repo.listBySeason(seasonId)).toEqual([]);
    expect(await repo.listBySeason(seasonId, { archived: true })).toEqual([
      { id, seasonId, name: 'Poussins', archivedAt: '2026-11-26' },
    ]);
    await repo.unarchive(id);
    expect((await repo.listBySeason(seasonId))[0]?.archivedAt).toBeNull();
    await expect(repo.archive(id, '26/11/2026')).rejects.toThrow('DATE_INVALID');
  });

  it('EX-02 annonce ce que la suppression effacera ; séances et présences restent', async () => {
    const s = await seed(db);
    const repo = groupsRepo(db);
    expect(await repo.deletionImpact(s.groupId)).toEqual({ enrollments: 2, slots: 1, sessions: 1 });
    await repo.remove(s.groupId);
    expect(await count(db, 'groups', 'id = ?', [s.groupId])).toBe(0);
    expect(await count(db, 'enrollments', 'group_id = ?', [s.groupId])).toBe(0);
    expect(await count(db, 'slot_groups', 'group_id = ?', [s.groupId])).toBe(0);
    expect(await count(db, 'session_groups', 'group_id = ?', [s.groupId])).toBe(0);
    expect(await count(db, 'sessions', 'id = ?', [s.sessionId])).toBe(1);
    expect(await count(db, 'attendances', 'session_id = ?', [s.sessionId])).toBe(2);
    expect(await count(db, 'slots', 'id = ?', [s.slotId])).toBe(1);
    expect(await count(db, 'members')).toBe(2);
  });

  it('EX-02 supprimer un groupe inconnu, ou demander ce qu’il effacerait, est refusé', async () => {
    await expect(groupsRepo(db).remove(42)).rejects.toThrow('NOT_FOUND');
    await expect(groupsRepo(db).deletionImpact(42)).rejects.toThrow('NOT_FOUND');
  });
});
