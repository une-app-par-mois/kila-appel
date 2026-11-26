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
      },
      {
        enrollmentId: expect.any(Number),
        memberId: s.otherMemberId,
        firstName: 'Sam',
        lastName: 'Fictif',
        startDate: '2026-09-01',
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
});
