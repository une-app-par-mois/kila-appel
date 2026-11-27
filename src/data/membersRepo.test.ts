/**
 * @jest-environment node
 */
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { membersRepo } from '@/data/membersRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

const TODAY = '2026-11-26';

describe('Dépôt des membres (EX-03)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
  });
  afterEach(async () => {
    await db.close();
  });

  it('EX-03 liste les membres courants triés par nom, avec leurs groupes en cours de la saison active', async () => {
    const repo = membersRepo(db);
    await repo.create({ firstName: 'Mila', lastName: 'Ébène', birthDate: null }, { today: TODAY });
    expect(await repo.list({ today: TODAY })).toEqual([
      {
        id: expect.any(Number),
        firstName: 'Mila',
        lastName: 'Ébène',
        archivedAt: null,
        groups: [],
      },
      {
        id: s.memberId,
        firstName: 'Alix',
        lastName: 'Exemple',
        archivedAt: null,
        groups: ['Poussins'],
      },
      {
        id: s.otherMemberId,
        firstName: 'Sam',
        lastName: 'Fictif',
        archivedAt: null,
        groups: ['Poussins'],
      },
    ]);
  });

  it('EX-04 un groupe dont l’inscription est finie (fin exclue) ou archivé n’apparaît pas', async () => {
    await db.execute('UPDATE enrollments SET end_date = ? WHERE member_id = ? AND group_id = ?', [
      TODAY,
      s.memberId,
      s.groupId,
    ]);
    await db.execute('UPDATE enrollments SET end_date = ? WHERE member_id = ? AND group_id = ?', [
      '2026-11-27',
      s.otherMemberId,
      s.groupId,
    ]);
    const groups = async () => (await membersRepo(db).list({ today: TODAY })).map((m) => m.groups);
    expect(await groups()).toEqual([[], ['Poussins']]);
    await db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', [TODAY, s.groupId]);
    expect(await groups()).toEqual([[], []]);
  });

  it('filtre par recherche (nom ou prénom, sans accents ni casse), par groupe et par archivés', async () => {
    const repo = membersRepo(db);
    const names = async (filter: Parameters<typeof repo.list>[0]) =>
      (await repo.list(filter)).map((m) => m.firstName);
    const zoe = await repo.create(
      { firstName: 'Zoé', lastName: 'Blanc', birthDate: null },
      { today: TODAY },
    );
    expect(await names({ today: TODAY, query: ' zoe ' })).toEqual(['Zoé']);
    expect(await names({ today: TODAY, query: 'FICT' })).toEqual(['Sam']);
    expect(await names({ today: TODAY, query: 'xyz' })).toEqual([]);
    expect(await names({ today: TODAY, groupId: s.groupId })).toEqual(['Alix', 'Sam']);
    await repo.archive(zoe, TODAY);
    expect(await names({ today: TODAY })).toEqual(['Alix', 'Sam']);
    expect(await names({ today: TODAY, archived: true })).toEqual(['Zoé']);
  });

  it('EX-03 crée un membre, avec un groupe facultatif inscrit à la date du jour', async () => {
    const repo = membersRepo(db);
    const id = await repo.create(
      { firstName: ' Yanis ', lastName: 'Colin', birthDate: '2017-03-14' },
      { groupId: s.groupId, today: TODAY },
    );
    expect(await repo.get(id)).toEqual({
      id,
      firstName: 'Yanis',
      lastName: 'Colin',
      birthDate: '2017-03-14',
      archivedAt: null,
    });
    expect(
      await count(db, 'enrollments', 'member_id = ? AND group_id = ? AND start_date = ?', [
        id,
        s.groupId,
        TODAY,
      ]),
    ).toBe(1);
  });

  it('EX-04 crée un membre inscrit à une date choisie (écran d’ajout à un groupe)', async () => {
    const id = await membersRepo(db).create(
      { firstName: 'Léa', lastName: 'Morel', birthDate: null },
      { groupId: s.groupId, today: TODAY, startDate: '2027-01-05' },
    );
    expect(
      await count(db, 'enrollments', 'member_id = ? AND start_date = ?', [id, '2027-01-05']),
    ).toBe(1);
    await expect(
      membersRepo(db).create(
        { firstName: 'Léa', lastName: 'Morel', birthDate: null },
        { groupId: s.groupId, today: TODAY, startDate: '05/01/2027' },
      ),
    ).rejects.toMatchObject({ code: 'DATE_INVALID' });
  });

  it('création refusée : rien n’est écrit (saisie invalide ou groupe inexistant)', async () => {
    const repo = membersRepo(db);
    await expect(
      repo.create({ firstName: '', lastName: 'Colin', birthDate: null }, { today: TODAY }),
    ).rejects.toMatchObject({
      code: 'NAME_REQUIRED',
    });
    await expect(
      repo.create(
        { firstName: 'Yanis', lastName: 'Colin', birthDate: null },
        { groupId: 9999, today: TODAY },
      ),
    ).rejects.toThrow();
    await db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', [TODAY, s.groupId]);
    await expect(
      repo.create(
        { firstName: 'Yanis', lastName: 'Colin', birthDate: null },
        { groupId: s.groupId, today: TODAY },
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await count(db, 'members')).toBe(2);
  });

  it('modifie un membre ; refuse une date de naissance future ; introuvable', async () => {
    const repo = membersRepo(db);
    await repo.update(
      s.memberId,
      { firstName: 'Alix', lastName: 'Exemple-Test', birthDate: null },
      TODAY,
    );
    expect(await repo.get(s.memberId)).toMatchObject({ lastName: 'Exemple-Test', birthDate: null });
    await expect(
      repo.update(s.memberId, { firstName: 'Alix', lastName: 'E', birthDate: '2030-01-01' }, TODAY),
    ).rejects.toMatchObject({ code: 'DATE_IN_FUTURE' });
    await expect(
      repo.update(9999, { firstName: 'A', lastName: 'B', birthDate: null }, TODAY),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(await repo.get(9999)).toBeNull();
  });

  it('archive et désarchive sans toucher aux inscriptions ni aux présences', async () => {
    const repo = membersRepo(db);
    await repo.archive(s.memberId, TODAY);
    expect(await repo.get(s.memberId)).toMatchObject({ archivedAt: TODAY });
    expect(await count(db, 'enrollments', 'member_id = ?', [s.memberId])).toBe(2);
    expect(await count(db, 'attendances', 'member_id = ?', [s.memberId])).toBe(1);
    await repo.unarchive(s.memberId);
    expect(await repo.get(s.memberId)).toMatchObject({ archivedAt: null });
    await expect(repo.archive(9999, TODAY)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    // Archiver deux fois garde la première date.
    await repo.archive(s.memberId, '2026-09-01');
    await repo.archive(s.memberId, TODAY);
    expect(await repo.get(s.memberId)).toMatchObject({ archivedAt: '2026-09-01' });
  });

  it('EX-14 sans statut dans l’appel en cours, la suppression ne l’annonce pas', async () => {
    await db.execute('DELETE FROM roll_call_draft_statuses WHERE member_id = ?', [s.memberId]);
    expect(await membersRepo(db).deletionImpact(s.memberId)).toMatchObject({
      rollCallDraft: false,
    });
  });

  it('ABS-05 dit ce que la suppression effacera, puis efface vraiment (contacts, présences, inscriptions)', async () => {
    const repo = membersRepo(db);
    expect(await repo.deletionImpact(s.memberId)).toEqual({
      contacts: 1,
      attendances: 1,
      enrollments: 2,
      rollCallDraft: true,
    });
    await repo.remove(s.memberId);
    expect(await repo.get(s.memberId)).toBeNull();
    for (const table of [
      'emergency_contacts',
      'attendances',
      'enrollments',
      'roll_call_draft_statuses',
      'alert_acks',
    ] as const) {
      expect(await count(db, table, 'member_id = ?', [s.memberId])).toBe(0);
    }
    expect(await count(db, 'attendances', 'member_id = ?', [s.otherMemberId])).toBe(1);
    await expect(repo.deletionImpact(s.memberId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(repo.remove(s.memberId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('EX-04 nouveau membre inscrit hors des dates de la saison active : refusé, rien n’est écrit', async () => {
    const repo = membersRepo(db);
    for (const startDate of ['2026-08-31', '2027-08-01']) {
      await expect(
        repo.create(
          { firstName: 'Yanis', lastName: 'Colin', birthDate: null },
          { groupId: s.groupId, today: TODAY, startDate },
        ),
      ).rejects.toMatchObject({ code: 'DATE_OUTSIDE_SEASON' });
    }
    expect(await count(db, 'members', "first_name = 'Yanis'")).toBe(0);
    // Sans groupe, aucune date d'inscription à contrôler.
    await repo.create(
      { firstName: 'Yanis', lastName: 'Colin', birthDate: null },
      { today: TODAY, startDate: '2099-01-01' },
    );
  });
});
