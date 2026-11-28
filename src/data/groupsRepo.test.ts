/**
 * @jest-environment node
 */
import { char, hexCodes } from '@/__fixtures__/codePoints';
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

  it('SEC-06 refuse un caractère invisible (U+202E) à la création et au renommage', async () => {
    const repo = groupsRepo(db);
    const reversed = `Pous${String.fromCodePoint(0x202e)}sins`;
    await expect(repo.create(seasonId, reversed)).rejects.toThrow(
      expect.objectContaining({ code: 'NAME_INVALID_CHAR' }),
    );
    expect(await count(db, 'groups')).toBe(0);
    const id = await repo.create(seasonId, 'Poussins');
    await expect(repo.rename(id, reversed)).rejects.toThrow(
      expect.objectContaining({ code: 'NAME_INVALID_CHAR' }),
    );
    expect((await repo.get(id))?.name).toBe('Poussins');
  });

  // Ticket 044b : points de code en clair, au milieu du nom, sans importer la liste du code.
  it.each(hexCodes([0x00ad, 0x2060, 0x2064, 0xfff9, 0xfffb, 0xe0000, 0xe0061, 0xe007f]))(
    'SEC-06 refuse U+%s à la création et au renommage, rien n’est écrit',
    async (_hex, code) => {
      const repo = groupsRepo(db);
      const name = `Pous${char(code)}sins`;
      await expect(repo.create(seasonId, name)).rejects.toMatchObject({
        code: 'NAME_INVALID_CHAR',
      });
      expect(await count(db, 'groups')).toBe(0);
      const id = await repo.create(seasonId, 'Poussins');
      await expect(repo.rename(id, name)).rejects.toMatchObject({ code: 'NAME_INVALID_CHAR' });
      expect((await repo.get(id))?.name).toBe('Poussins');
    },
  );

  it('SEC-06 refuse le drapeau d’Écosse fait de tags', async () => {
    const scotland = char(0x1f3f4, 0xe0067, 0xe0062, 0xe0073, 0xe0063, 0xe0074, 0xe007f);
    await expect(groupsRepo(db).create(seasonId, `Poussins ${scotland}`)).rejects.toMatchObject({
      code: 'NAME_INVALID_CHAR',
    });
  });

  it('SEC-06 accepte le cœur rouge (U+FE0F), à la création et au renommage', async () => {
    const repo = groupsRepo(db);
    const heart = `Poussins ${char(0x2764, 0xfe0f)}`;
    const id = await repo.create(seasonId, heart);
    expect((await repo.get(id))?.name).toBe(heart);
    await repo.rename(id, `${heart} mercredi`);
    expect((await repo.get(id))?.name).toBe(`${heart} mercredi`);
  });

  it('SEC-06 accepte un émoji composé avec U+200D, à la création et au renommage', async () => {
    const repo = groupsRepo(db);
    const team = `Poussins ${String.fromCodePoint(0x1f469, 0x200d, 0x1f467)}`;
    const id = await repo.create(seasonId, team);
    expect((await repo.get(id))?.name).toBe(team);
    await repo.rename(id, `${team} mercredi`);
    expect((await repo.get(id))?.name).toBe(`${team} mercredi`);
  });

  it('lit un groupe par son identifiant (ses inscrits viennent du dépôt des inscriptions, ticket 007c)', async () => {
    const s = await seed(db);
    const repo = groupsRepo(db);
    expect(await repo.get(s.groupId)).toEqual({
      id: s.groupId,
      seasonId: s.seasonId,
      name: 'Poussins',
      archivedAt: null,
    });
    expect(await repo.get(9999)).toBeNull();
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
    expect(await repo.deletionImpact(s.groupId)).toEqual({
      enrollments: 2,
      slots: 1,
      sessions: 1,
      rollCallDraft: true,
    });
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

  it('EX-14 ABS-05 supprimer le groupe de l’appel en cours efface ce brouillon (décision du 2026-11-27)', async () => {
    const s = await seed(db);
    await groupsRepo(db).remove(s.groupId);
    expect(await count(db, 'roll_call_drafts')).toBe(0);
    expect(await count(db, 'roll_call_draft_statuses')).toBe(0);
  });

  it('EX-14 un autre groupe ne touche pas à l’appel en cours', async () => {
    const s = await seed(db);
    const { lastInsertRowId: other } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Seul')",
      [s.seasonId],
    );
    const repo = groupsRepo(db);
    expect(await repo.deletionImpact(other)).toMatchObject({ rollCallDraft: false });
    await repo.remove(other);
    expect(await count(db, 'roll_call_drafts')).toBe(1);
  });

  it('EX-02 supprimer un groupe inconnu, ou demander ce qu’il effacerait, est refusé', async () => {
    await expect(groupsRepo(db).remove(42)).rejects.toThrow('NOT_FOUND');
    await expect(groupsRepo(db).deletionImpact(42)).rejects.toThrow('NOT_FOUND');
  });
});
