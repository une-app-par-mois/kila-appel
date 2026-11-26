/**
 * @jest-environment node
 */
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import { contactsRepo } from '@/data/contactsRepo';
import type { Db } from '@/data/db';
import { membersRepo } from '@/data/membersRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

const TODAY = '2026-11-26';

describe('Dépôt des contacts d’urgence (EX-05, EX-06)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
  });
  afterEach(async () => {
    await db.close();
  });

  it('EX-05 crée des contacts à la suite, nom nettoyé, téléphone sur 10 chiffres ; liste dans l’ordre', async () => {
    const repo = contactsRepo(db);
    const mother = await repo.create(s.memberId, { label: ' Sa mère ', phone: '06 00 00 00 01' });
    const father = await repo.create(s.memberId, { label: 'Son père', phone: '+33600000002' });
    expect(await repo.listByMember(s.memberId)).toEqual([
      { id: expect.any(Number), memberId: s.memberId, label: 'Parent', phone: '0600000000' },
      { id: mother, memberId: s.memberId, label: 'Sa mère', phone: '0600000001' },
      { id: father, memberId: s.memberId, label: 'Son père', phone: '0600000002' },
    ]);
    expect(await repo.get(father)).toEqual({
      id: father,
      memberId: s.memberId,
      label: 'Son père',
      phone: '0600000002',
    });
    expect(await repo.get(9999)).toBeNull();
  });

  it('EX-05 zéro contact possible', async () => {
    const id = await membersRepo(db).create(
      { firstName: 'Noah', lastName: 'Girard', birthDate: null },
      { today: TODAY },
    );
    expect(await contactsRepo(db).listByMember(id)).toEqual([]);
  });

  it('EX-05 refuse un nom vide, un téléphone invalide ou un membre inconnu : rien n’est écrit', async () => {
    const repo = contactsRepo(db);
    await expect(
      repo.create(s.memberId, { label: ' ', phone: '0600000001' }),
    ).rejects.toMatchObject({
      code: 'NAME_REQUIRED',
    });
    await expect(
      repo.create(s.memberId, { label: 'Sa mère', phone: '06000' }),
    ).rejects.toMatchObject({ code: 'PHONE_INVALID' });
    await expect(
      repo.create(9999, { label: 'Sa mère', phone: '0600000001' }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(await count(db, 'emergency_contacts')).toBe(2);
  });

  it('ABS-04 une erreur ne contient jamais le téléphone ni le nom saisis', async () => {
    const error = await contactsRepo(db)
      .create(s.memberId, { label: 'Sa mère', phone: '06 12 34' })
      .catch((e: unknown) => e);
    expect(String(error)).toContain('PHONE_INVALID');
    expect(String(error)).not.toContain('12 34');
    expect(String(error)).not.toContain('Sa mère');
  });

  it('EX-05 modifie et supprime un contact ; introuvable', async () => {
    const repo = contactsRepo(db);
    const id = await repo.create(s.memberId, { label: 'Sa mère', phone: '0600000001' });
    await repo.update(id, { label: 'Sa grand-mère', phone: '01 23 45 67 89' });
    expect(await repo.get(id)).toMatchObject({ label: 'Sa grand-mère', phone: '0123456789' });
    await expect(repo.update(id, { label: 'X', phone: 'abc' })).rejects.toMatchObject({
      code: 'PHONE_INVALID',
    });
    await repo.remove(id);
    expect(await repo.get(id)).toBeNull();
    await expect(repo.remove(id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(repo.update(id, { label: 'X', phone: '0600000001' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('EX-05 réordonne d’un bloc ; refuse une liste qui n’est pas exactement ses contacts', async () => {
    const repo = contactsRepo(db);
    const [parent] = await repo.listByMember(s.memberId);
    const mother = await repo.create(s.memberId, { label: 'Sa mère', phone: '0600000001' });
    const father = await repo.create(s.memberId, { label: 'Son père', phone: '0600000002' });
    await repo.reorder(s.memberId, [father, parent?.id ?? 0, mother]);
    expect((await repo.listByMember(s.memberId)).map((c) => c.id)).toEqual([
      father,
      parent?.id,
      mother,
    ]);
    const [other] = await repo.listByMember(s.otherMemberId);
    for (const ids of [
      [father, mother],
      [father, mother, other?.id ?? 0],
      [father, father, mother],
    ]) {
      await expect(repo.reorder(s.memberId, ids)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    }
    expect((await repo.listByMember(s.memberId)).map((c) => c.id)).toEqual([
      father,
      parent?.id,
      mother,
    ]);
    await expect(repo.reorder(9999, [])).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('un membre archivé garde une fiche modifiable : on peut lui ajouter un contact', async () => {
    await membersRepo(db).archive(s.memberId, TODAY);
    await contactsRepo(db).create(s.memberId, { label: 'Sa mère', phone: '0600000001' });
    expect(await contactsRepo(db).listByMember(s.memberId)).toHaveLength(2);
  });

  it('EX-06 recherche : membres courants trouvés par nom ou prénom, avec groupes et contacts dans l’ordre', async () => {
    const repo = contactsRepo(db);
    const mother = await repo.create(s.memberId, { label: 'Sa mère', phone: '0600000001' });
    expect(await repo.search('ALIX', TODAY)).toEqual([
      {
        memberId: s.memberId,
        firstName: 'Alix',
        lastName: 'Exemple',
        groups: ['Poussins'],
        contacts: [
          { id: expect.any(Number), memberId: s.memberId, label: 'Parent', phone: '0600000000' },
          { id: mother, memberId: s.memberId, label: 'Sa mère', phone: '0600000001' },
        ],
      },
    ]);
    expect((await repo.search('exemple alix', TODAY)).map((r) => r.memberId)).toEqual([s.memberId]);
    expect(await repo.search('  ', TODAY)).toEqual([]);
    await membersRepo(db).archive(s.memberId, TODAY);
    expect(await repo.search('alix', TODAY)).toEqual([]);
  });

  it('ABS-05 supprimer le membre efface ses contacts', async () => {
    await membersRepo(db).remove(s.memberId);
    expect(await contactsRepo(db).listByMember(s.memberId)).toEqual([]);
    expect(await count(db, 'emergency_contacts', 'member_id = ?', [s.memberId])).toBe(0);
  });
});
