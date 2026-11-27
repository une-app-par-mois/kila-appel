/**
 * @jest-environment node
 */
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { enrollmentsRepo } from '@/data/enrollmentsRepo';
import { membersRepo } from '@/data/membersRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

const TODAY = '2026-11-26';

describe('Dépôt des inscriptions (EX-04)', () => {
  let db: Db;
  let s: Seeded;
  let newcomer: number;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    newcomer = await membersRepo(db).create(
      { firstName: 'Noah', lastName: 'Girard', birthDate: null },
      { today: TODAY },
    );
  });
  afterEach(async () => {
    await db.close();
  });

  const enrollmentOf = async (memberId: number) =>
    (await enrollmentsRepo(db).listByGroup(s.groupId, TODAY)).find((e) => e.memberId === memberId);

  it('EX-04 liste les inscriptions en cours d’un groupe, membres archivés exclus', async () => {
    const repo = enrollmentsRepo(db);
    expect(await repo.listByGroup(s.groupId, TODAY)).toEqual([
      {
        enrollmentId: expect.any(Number),
        memberId: s.memberId,
        firstName: 'Alix',
        lastName: 'Exemple',
        startDate: '2026-09-01',
        endDate: null,
      },
      {
        enrollmentId: expect.any(Number),
        memberId: s.otherMemberId,
        firstName: 'Sam',
        lastName: 'Fictif',
        startDate: '2026-09-01',
        endDate: null,
      },
    ]);
    await membersRepo(db).archive(s.otherMemberId, TODAY);
    expect((await repo.listByGroup(s.groupId, TODAY)).map((e) => e.memberId)).toEqual([s.memberId]);
  });

  it('EX-04 groupes en cours d’un membre, dans la saison active seulement', async () => {
    expect(await enrollmentsRepo(db).listByMember(s.memberId, TODAY)).toEqual([
      {
        enrollmentId: expect.any(Number),
        groupId: s.groupId,
        groupName: 'Poussins',
        startDate: '2026-09-01',
        endDate: null,
      },
    ]);
  });

  it('inscriptions à venir d’un groupe ; date de fin prévue lue avec les inscrits du jour', async () => {
    const repo = enrollmentsRepo(db);
    await repo.enroll(s.groupId, [newcomer], '2027-01-05');
    await repo.withdraw((await enrollmentOf(s.memberId))?.enrollmentId ?? 0, '2026-12-01');
    expect(await repo.listUpcomingByGroup(s.groupId, TODAY)).toEqual([
      {
        enrollmentId: expect.any(Number),
        memberId: newcomer,
        firstName: 'Noah',
        lastName: 'Girard',
        startDate: '2027-01-05',
        endDate: null,
      },
    ]);
    expect(await enrollmentOf(s.memberId)).toMatchObject({ endDate: '2026-12-01' });
    await membersRepo(db).archive(newcomer, TODAY);
    expect(await repo.listUpcomingByGroup(s.groupId, TODAY)).toEqual([]);
  });

  it('groupes d’un membre : en cours et à venir, avec leurs dates', async () => {
    const repo = enrollmentsRepo(db);
    const { lastInsertRowId: other } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Benjamins lundi')",
      [s.seasonId],
    );
    await repo.enroll(other, [s.memberId], '2027-01-05');
    expect(await repo.listByMember(s.memberId, TODAY)).toEqual([
      {
        enrollmentId: expect.any(Number),
        groupId: other,
        groupName: 'Benjamins lundi',
        startDate: '2027-01-05',
        endDate: null,
      },
      {
        enrollmentId: expect.any(Number),
        groupId: s.groupId,
        groupName: 'Poussins',
        startDate: '2026-09-01',
        endDate: null,
      },
    ]);
  });

  it('candidats : membres courants qui ne sont pas inscrits au groupe', async () => {
    expect((await enrollmentsRepo(db).candidates(s.groupId, TODAY)).map((m) => m.id)).toEqual([
      newcomer,
    ]);
  });

  it('EX-04 inscrit plusieurs membres à une date, d’un bloc', async () => {
    const other = await membersRepo(db).create(
      { firstName: 'Jade', lastName: 'Laurent', birthDate: null },
      { today: TODAY },
    );
    await enrollmentsRepo(db).enroll(s.groupId, [newcomer, other], TODAY);
    expect(
      await count(db, 'enrollments', 'group_id = ? AND start_date = ?', [s.groupId, TODAY]),
    ).toBe(2);
  });

  it('EX-04 refuse un membre déjà inscrit : aucun des membres n’est inscrit', async () => {
    await expect(
      enrollmentsRepo(db).enroll(s.groupId, [newcomer, s.memberId], TODAY),
    ).rejects.toMatchObject({
      code: 'ALREADY_ENROLLED',
    });
    expect(await count(db, 'enrollments', 'member_id = ?', [newcomer])).toBe(0);
    await expect(
      enrollmentsRepo(db).enroll(s.groupId, [newcomer], '26/11/2026'),
    ).rejects.toMatchObject({
      code: 'DATE_INVALID',
    });
  });

  it('EX-04 retirer pose la date de fin (premier jour sans lui) sans effacer les présences', async () => {
    const repo = enrollmentsRepo(db);
    const enrollment = await enrollmentOf(s.memberId);
    await repo.withdraw(enrollment?.enrollmentId ?? 0, TODAY);
    expect(await enrollmentOf(s.memberId)).toBeUndefined();
    expect(await count(db, 'attendances', 'member_id = ?', [s.memberId])).toBe(1);
    // Réinscription possible dès la date de fin.
    await repo.enroll(s.groupId, [s.memberId], TODAY);
    expect(await enrollmentOf(s.memberId)).toMatchObject({ startDate: TODAY });
  });

  it('retrait à une date future : encore inscrit jusque-là', async () => {
    const enrollment = await enrollmentOf(s.memberId);
    await enrollmentsRepo(db).withdraw(enrollment?.enrollmentId ?? 0, '2026-12-01');
    expect(await enrollmentOf(s.memberId)).toBeDefined();
    await expect(enrollmentsRepo(db).enroll(s.groupId, [s.memberId], TODAY)).rejects.toMatchObject({
      code: 'ALREADY_ENROLLED',
    });
  });

  it('une inscription future n’est pas en cours, mais le membre n’est plus candidat', async () => {
    const repo = enrollmentsRepo(db);
    await repo.enroll(s.groupId, [newcomer], '2027-01-15');
    expect(await enrollmentOf(newcomer)).toBeUndefined();
    expect(await repo.candidates(s.groupId, TODAY)).toEqual([]);
    expect((await membersRepo(db).list({ today: TODAY, query: 'noah' }))[0]?.groups).toEqual([]);
    expect(await membersRepo(db).list({ today: TODAY, groupId: s.groupId, query: 'noah' })).toEqual(
      [],
    );
    expect((await repo.listByGroup(s.groupId, '2027-01-15')).map((e) => e.memberId)).toContain(
      newcomer,
    );
  });

  it('réinscription au jour d’un retrait futur : jamais deux fois dans le groupe', async () => {
    const repo = enrollmentsRepo(db);
    await repo.withdraw((await enrollmentOf(s.memberId))?.enrollmentId ?? 0, '2026-12-15');
    await repo.enroll(s.groupId, [s.memberId], '2026-12-15');
    for (const day of [TODAY, '2026-12-14', '2026-12-15', '2027-01-10']) {
      const ids = (await repo.listByGroup(s.groupId, day)).map((e) => e.memberId);
      expect(ids.filter((id) => id === s.memberId)).toHaveLength(1);
    }
    expect((await membersRepo(db).list({ today: TODAY }))[0]?.groups).toEqual(['Poussins']);
  });

  it('refuse d’inscrire dans un groupe archivé ou d’une autre saison, ou un membre archivé', async () => {
    const repo = enrollmentsRepo(db);
    await db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', [TODAY, s.groupId]);
    await expect(repo.enroll(s.groupId, [newcomer], TODAY)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await db.execute('UPDATE groups SET archived_at = NULL WHERE id = ?', [s.groupId]);
    const [other] = await db.query<{ id: number }>('SELECT id FROM groups WHERE season_id = ?', [
      s.otherSeasonId,
    ]);
    await expect(repo.enroll(other?.id ?? 0, [newcomer], TODAY)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await membersRepo(db).archive(newcomer, TODAY);
    await expect(repo.enroll(s.groupId, [newcomer], TODAY)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(await count(db, 'enrollments', 'member_id = ?', [newcomer])).toBe(0);
  });

  it('annuler une inscription à venir l’efface ; une inscription commencée ne s’annule pas', async () => {
    const repo = enrollmentsRepo(db);
    await repo.enroll(s.groupId, [newcomer], '2026-12-10');
    const [upcoming] = await repo.listUpcomingByGroup(s.groupId, TODAY);
    await repo.cancel(upcoming?.enrollmentId ?? 0, TODAY);
    expect(await count(db, 'enrollments', 'member_id = ?', [newcomer])).toBe(0);
    expect((await repo.candidates(s.groupId, TODAY)).map((m) => m.id)).toContain(newcomer);
    const started = (await enrollmentOf(s.memberId))?.enrollmentId ?? 0;
    await expect(repo.cancel(started, TODAY)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(repo.cancel(9999, TODAY)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await count(db, 'enrollments', 'id = ?', [started])).toBe(1);
  });

  it('une période vide (fin = début) ne compte nulle part : ni à venir, ni dans ses groupes, ni comme blocage', async () => {
    const repo = enrollmentsRepo(db);
    await repo.enroll(s.groupId, [newcomer], '2026-12-10');
    const [upcoming] = await repo.listUpcomingByGroup(s.groupId, TODAY);
    await repo.withdraw(upcoming?.enrollmentId ?? 0, '2026-12-10');
    expect(await repo.listUpcomingByGroup(s.groupId, TODAY)).toEqual([]);
    expect(await repo.listByMember(newcomer, TODAY)).toEqual([]);
    expect((await repo.candidates(s.groupId, TODAY)).map((m) => m.id)).toContain(newcomer);
    await repo.enroll(s.groupId, [newcomer], TODAY);
  });

  it('retrait refusé avant le début, sur une inscription déjà close ou introuvable', async () => {
    const repo = enrollmentsRepo(db);
    const id = (await enrollmentOf(s.memberId))?.enrollmentId ?? 0;
    await expect(repo.withdraw(id, '2026-08-31')).rejects.toMatchObject({
      code: 'END_BEFORE_START',
    });
    await repo.withdraw(id, TODAY);
    await expect(repo.withdraw(id, TODAY)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(repo.withdraw(9999, TODAY)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('EX-04 date de début hors de la saison active refusée, rien n’est écrit ; dernier jour accepté', async () => {
    const repo = enrollmentsRepo(db);
    for (const day of ['2026-08-31', '2027-08-01']) {
      await expect(repo.enroll(s.groupId, [newcomer], day)).rejects.toMatchObject({
        code: 'DATE_OUTSIDE_SEASON',
      });
    }
    expect(await count(db, 'enrollments', 'member_id = ?', [newcomer])).toBe(0);
    await repo.enroll(s.groupId, [newcomer], '2027-07-31');
    const other = await membersRepo(db).create(
      { firstName: 'Jade', lastName: 'Laurent', birthDate: null },
      { today: TODAY },
    );
    await repo.enroll(s.groupId, [other], '2026-09-01');
  });
});
