/**
 * @jest-environment node
 */
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { type DraftTarget, draftsRepo } from '@/data/draftsRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { sessionsRepo } from '@/data/sessionsRepo';

const NOW = '2026-11-18T10:05';

describe('Dépôt du brouillon d’appel (EX-14)', () => {
  let db: Db;
  let s: Seeded;
  let target: DraftTarget;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    // Le jeu fictif a un brouillon (créneau, 02/12) : chaque test part sans.
    await db.execute('DELETE FROM roll_call_drafts');
    target = { slotId: s.slotId, groupId: s.groupId, date: '2026-11-18', startedAt: '17:32' };
  });
  afterEach(async () => {
    await db.close();
  });

  it('EX-14 sans brouillon : rien ; le premier changement le crée, dans la saison du groupe', async () => {
    const repo = draftsRepo(db);
    expect(await repo.get()).toBeNull();
    await repo.setStatus(target, s.memberId, 'absent', NOW);
    expect(await repo.get()).toEqual({
      slotId: s.slotId,
      groupId: s.groupId,
      groupName: 'Poussins',
      date: '2026-11-18',
      startedAt: '17:32',
      comment: null,
      statuses: { [s.memberId]: 'absent' },
    });
    expect(await db.query('SELECT season_id, updated_at FROM roll_call_drafts')).toEqual([
      { season_id: s.seasonId, updated_at: NOW },
    ]);
  });

  it('EX-14 chaque changement est écrit aussitôt : statut remplacé, commentaire nettoyé', async () => {
    const repo = draftsRepo(db);
    await repo.setStatus(target, s.memberId, 'absent', NOW);
    await repo.setStatus(target, s.memberId, 'late', NOW);
    await repo.setStatus(target, s.otherMemberId, 'excused', NOW);
    await repo.setComment(target, '  Gymnase froid ', '2026-11-18T10:06');
    expect(await repo.get()).toMatchObject({
      comment: 'Gymnase froid',
      statuses: { [s.memberId]: 'late', [s.otherMemberId]: 'excused' },
      // L'heure de début ne bouge pas.
      startedAt: '17:32',
    });
    await repo.setComment(target, '   ', NOW);
    expect((await repo.get())?.comment).toBeNull();
  });

  it('EX-14 le commentaire seul crée aussi le brouillon ; appel sans créneau (EX-39)', async () => {
    const free = { slotId: null, groupId: s.groupId, date: '2026-11-17', startedAt: '10:05' };
    await draftsRepo(db).setComment(free, 'Stage', NOW);
    expect(await draftsRepo(db).get()).toMatchObject({ slotId: null, startedAt: '10:05' });
  });

  it('EX-14 un seul brouillon : un autre appel est refusé tant qu’il existe (décision du 2026-11-27)', async () => {
    const repo = draftsRepo(db);
    await repo.setStatus(target, s.memberId, 'absent', NOW);
    for (const other of [
      { ...target, date: '2026-11-11' },
      { ...target, slotId: null },
    ]) {
      await expect(repo.setStatus(other, s.memberId, 'late', NOW)).rejects.toMatchObject({
        code: 'DRAFT_IN_PROGRESS',
      });
      await expect(repo.setComment(other, 'x', NOW)).rejects.toMatchObject({
        code: 'DRAFT_IN_PROGRESS',
      });
    }
    expect((await repo.get())?.statuses).toEqual({ [s.memberId]: 'absent' });
  });

  it('EX-14 statut inconnu, identifiants invalides, commentaire trop long ou groupe inconnu refusés', async () => {
    const repo = draftsRepo(db);
    await expect(
      repo.setStatus(target, s.memberId, 'unknown' as unknown as 'absent', NOW),
    ).rejects.toMatchObject({ code: 'STATUS_INVALID' });
    await expect(repo.setStatus(target, 0, 'absent', NOW)).rejects.toMatchObject({
      code: 'STATUS_INVALID',
    });
    await expect(repo.setComment(target, 'a'.repeat(501), NOW)).rejects.toMatchObject({
      code: 'COMMENT_TOO_LONG',
    });
    await expect(
      repo.setStatus({ ...target, groupId: 9999 }, s.memberId, 'absent', NOW),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      repo.setStatus({ ...target, startedAt: '9:05' }, s.memberId, 'absent', NOW),
    ).rejects.toMatchObject({ code: 'TIME_INVALID' });
    expect(await count(db, 'roll_call_drafts')).toBe(0);
  });

  it('EX-14 abandonner efface le brouillon, ses groupes et ses statuts (ABS-05)', async () => {
    const repo = draftsRepo(db);
    await repo.setStatus(target, s.memberId, 'absent', NOW);
    await repo.discard();
    expect(await repo.get()).toBeNull();
    expect(await count(db, 'roll_call_draft_groups')).toBe(0);
    expect(await count(db, 'roll_call_draft_statuses')).toBe(0);
  });

  it('EX-14 EX-15 enregistrer l’appel efface son brouillon dans la même écriture, pas un autre', async () => {
    const repo = draftsRepo(db);
    await repo.setStatus(target, s.memberId, 'absent', NOW);
    const call = {
      slotId: s.slotId,
      groupId: s.groupId,
      date: '2026-11-18',
      startTime: '17:30',
      statuses: [{ memberId: s.memberId, status: 'absent' as const }],
      comment: null,
    };
    // Un autre appel (sans créneau) ne touche pas au brouillon.
    await sessionsRepo(db, '2026-11-18').record({ ...call, slotId: null });
    expect(await repo.get()).not.toBeNull();
    await sessionsRepo(db, '2026-11-18').record(call);
    expect(await repo.get()).toBeNull();
  });

  it('EX-14 un brouillon dont le groupe a été supprimé reste lisible, pour pouvoir l’abandonner', async () => {
    const repo = draftsRepo(db);
    await repo.setStatus(target, s.memberId, 'absent', NOW);
    await db.execute('DELETE FROM groups WHERE id = ?', [s.groupId]);
    expect(await repo.get()).toMatchObject({ groupId: null, groupName: null });
  });
});
