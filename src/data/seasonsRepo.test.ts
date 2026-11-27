/**
 * @jest-environment node
 */
import { count, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { seasonsRepo } from '@/data/seasonsRepo';

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

  it('EX-01 crée une saison, nom nettoyé ; la première devient active, pas les suivantes', async () => {
    const repo = seasonsRepo(db);
    const id = await repo.create(input('  2026-2027 '));
    expect(await repo.list()).toEqual([
      { id, name: '2026-2027', startDate: '2026-09-01', endDate: '2027-07-31', isActive: true },
    ]);
    const next = await repo.create(input('2027-2028', '2027-09-01', '2028-07-31'));
    expect((await repo.getActive())?.id).toBe(id);
    expect((await repo.list()).find((s) => s.id === next)?.isActive).toBe(false);
  });

  it('EX-01 sans saison active (active supprimée), la saison créée devient active', async () => {
    const repo = seasonsRepo(db);
    const first = await repo.create(input('2025-2026', '2025-09-01', '2026-07-31'));
    await repo.remove(first);
    const id = await repo.create(input('2026-2027'));
    expect((await repo.getActive())?.id).toBe(id);
  });

  it('EX-01 liste les saisons de la plus récente à la plus ancienne', async () => {
    const repo = seasonsRepo(db);
    await repo.create(input('2025-2026', '2025-09-01', '2026-07-31'));
    await repo.create(input('2026-2027'));
    expect((await repo.list()).map((s) => s.name)).toEqual(['2026-2027', '2025-2026']);
  });

  it('EX-01 refuse une saisie invalide sans rien écrire', async () => {
    const repo = seasonsRepo(db);
    await expect(repo.create(input('S', '2026-09-01', '2026-08-01'))).rejects.toThrow(
      'END_BEFORE_START',
    );
    expect(await count(db, 'seasons')).toBe(0);
  });

  it('EX-01 modifie le nom et les dates', async () => {
    const repo = seasonsRepo(db);
    const id = await repo.create(input('2026-2027'));
    await repo.update(id, input('Saison 26-27', '2026-08-25', '2027-06-30'));
    expect((await repo.list())[0]).toMatchObject({
      name: 'Saison 26-27',
      startDate: '2026-08-25',
      endDate: '2027-06-30',
    });
    await expect(repo.update(id + 99, input('X'))).rejects.toThrow('NOT_FOUND');
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

  it('EX-01 activer une saison inconnue ne change rien (transaction annulée)', async () => {
    const repo = seasonsRepo(db);
    const id = await repo.create(input('2026-2027'));
    await repo.activate(id);
    await expect(repo.activate(id + 99)).rejects.toThrow('NOT_FOUND');
    expect((await repo.getActive())?.id).toBe(id);
  });

  it('EX-01 annonce ce que la suppression effacera, puis efface exactement cela', async () => {
    const s = await seed(db);
    const repo = seasonsRepo(db);
    expect(await repo.deletionImpact(s.seasonId)).toEqual({
      groups: 1,
      enrollments: 2,
      slots: 1,
      sessions: 1,
      attendances: 2,
      rollCallDraft: true,
    });
    await repo.remove(s.seasonId);
    expect(await count(db, 'seasons')).toBe(1);
    expect(await count(db, 'groups', 'season_id = ?', [s.seasonId])).toBe(0);
    expect(await count(db, 'slots')).toBe(0);
    expect(await count(db, 'sessions')).toBe(0);
    expect(await count(db, 'attendances')).toBe(0);
    expect(await count(db, 'enrollments', 'group_id = ?', [s.groupId])).toBe(0);
    expect(await count(db, 'roll_call_drafts')).toBe(0);
    expect(await count(db, 'members')).toBe(2);
    expect(await count(db, 'groups', 'season_id = ?', [s.otherSeasonId])).toBe(1);
  });

  it('EX-01 supprimer une saison inconnue, ou demander ce qu’elle effacerait, est refusé', async () => {
    await expect(seasonsRepo(db).remove(42)).rejects.toThrow('NOT_FOUND');
    await expect(seasonsRepo(db).deletionImpact(42)).rejects.toThrow('NOT_FOUND');
  });

  it('EX-01 refuse des dates qui laisseraient des séances hors de la saison', async () => {
    const s = await seed(db);
    const repo = seasonsRepo(db);
    // La séance du jeu fictif a lieu le 2026-11-25.
    await expect(
      repo.update(s.seasonId, input('2026-2027', '2026-12-01', '2027-07-31')),
    ).rejects.toMatchObject({
      code: 'SESSIONS_OUTSIDE_SEASON',
    });
    await expect(
      repo.update(s.seasonId, input('2026-2027', '2026-09-01', '2026-11-24')),
    ).rejects.toThrow('SESSIONS_OUTSIDE_SEASON');
    await repo.update(s.seasonId, input('2026-2027', '2026-09-01', '2026-11-25'));
    expect((await repo.list()).find((x) => x.id === s.seasonId)?.endDate).toBe('2026-11-25');
    // Sans inscription : une saison d'un jour, celui de la séance (bornes comprises).
    await db.execute('DELETE FROM enrollments');
    await repo.update(s.seasonId, input('2026-2027', '2026-11-25', '2026-11-25'));
    expect((await repo.list()).find((x) => x.id === s.seasonId)?.startDate).toBe('2026-11-25');
  });

  it('EX-01 EX-04 refuse des dates qui laisseraient une inscription commencer hors de la saison', async () => {
    const s = await seed(db);
    const repo = seasonsRepo(db);
    // Inscriptions du jeu fictif au 2026-09-01 ; une arrivée prévue au 2027-06-01.
    const { lastInsertRowId: lundi } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Benjamins lundi')",
      [s.seasonId],
    );
    await db.execute(
      "INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, '2027-06-01')",
      [s.memberId, lundi],
    );
    for (const [start, end] of [
      ['2026-09-02', '2027-07-31'],
      ['2026-09-01', '2027-05-31'],
    ]) {
      await expect(repo.update(s.seasonId, input('2026-2027', start, end))).rejects.toMatchObject({
        code: 'ENROLLMENTS_OUTSIDE_SEASON',
      });
    }
    expect((await repo.list()).find((x) => x.id === s.seasonId)?.endDate).toBe('2027-07-31');
    // Une inscription qui commence le dernier jour reste dans la saison.
    await repo.update(s.seasonId, input('2026-2027', '2026-09-01', '2027-06-01'));
    // Membre et groupe archivés : leurs inscriptions comptent aussi.
    await db.execute("UPDATE members SET archived_at = '2026-11-01'");
    await db.execute("UPDATE groups SET archived_at = '2026-11-01'");
    await expect(
      repo.update(s.seasonId, input('2026-2027', '2026-09-01', '2027-05-31')),
    ).rejects.toThrow('ENROLLMENTS_OUTSIDE_SEASON');
    // Une période vide (fin = début) ne compte pas.
    await db.execute(
      "UPDATE enrollments SET end_date = start_date WHERE start_date = '2027-06-01'",
    );
    await repo.update(s.seasonId, input('2026-2027', '2026-09-01', '2027-05-31'));
    expect((await repo.list()).find((x) => x.id === s.seasonId)?.endDate).toBe('2027-05-31');
  });

  it('renommer sans changer les dates : jamais bloqué par des données déjà hors de la saison', async () => {
    const s = await seed(db);
    await db.execute(
      "INSERT INTO enrollments (member_id, group_id, start_date) SELECT id, ?, '2026-08-25' FROM members WHERE first_name = 'Sam'",
      [s.groupId],
    );
    await seasonsRepo(db).update(s.seasonId, input('Saison 26-27', '2026-09-01', '2027-07-31'));
    expect((await seasonsRepo(db).list()).find((x) => x.id === s.seasonId)?.name).toBe(
      'Saison 26-27',
    );
  });

  it('P1 première ouverture : la saison est créée et active, une seule fois', async () => {
    const repo = seasonsRepo(db);
    const first = { name: '2026-2027', startDate: '2026-09-01', endDate: '2027-08-31' };
    expect(await repo.createFirst(first)).toBe(true);
    expect(await repo.createFirst(first)).toBe(false);
    expect(await repo.list()).toMatchObject([{ name: '2026-2027', isActive: true }]);
  });

  it('P1 une saison existe déjà (même inactive) : rien n’est créé', async () => {
    await db.execute(
      "INSERT INTO seasons (name, start_date, end_date, is_active) VALUES ('Ancienne', '2025-09-01', '2026-08-31', 0)",
    );
    expect(
      await seasonsRepo(db).createFirst({
        name: '2026-2027',
        startDate: '2026-09-01',
        endDate: '2027-08-31',
      }),
    ).toBe(false);
    expect(await count(db, 'seasons')).toBe(1);
  });

  it('P1 avancement de la mise en route : saison active, groupes, membres inscrits, créneaux', async () => {
    const repo = seasonsRepo(db);
    expect(await repo.setupProgress('2026-11-27')).toEqual({
      season: null,
      firstGroupId: null,
      groups: 0,
      members: 0,
      slots: 0,
    });
    const s = await seed(db);
    expect(await repo.setupProgress('2026-11-27')).toEqual({
      season: { id: s.seasonId, name: 'Saison 2026-2027' },
      firstGroupId: s.groupId,
      groups: 1,
      members: 2,
      slots: 1,
    });
  });
});
