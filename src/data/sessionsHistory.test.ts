/**
 * @jest-environment node
 */
// Historique, correction et suppression d'une séance (ticket 013, EX-16 à EX-18), sur le jeu
// fictif : séance du mercredi 25/11 17:30 (Poussins), Alix Présent, Sam Retard.
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { groupsRepo } from '@/data/groupsRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { sessionsRepo } from '@/data/sessionsRepo';

const TODAY = '2026-12-02';

describe('Historique des séances (EX-16 à EX-18)', () => {
  let db: Db;
  let s: Seeded;
  let otherGroupId: number;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    const [other] = await db.query<{ id: number }>('SELECT id FROM groups WHERE season_id = ?', [
      s.otherSeasonId,
    ]);
    otherGroupId = other?.id ?? 0;
  });
  afterEach(async () => {
    await db.close();
  });

  const repo = () => sessionsRepo(db, TODAY);
  /** Séance enregistrée à la main : saison, groupe (ou aucun), date, heure, statuts. */
  const addSession = async (
    seasonId: number,
    groupId: number | null,
    date: string,
    time: string,
    statuses: [number, string][],
    state = 'recorded',
  ) => {
    const { lastInsertRowId: id } = await db.execute(
      'INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, NULL, ?, ?, ?)',
      [seasonId, date, time, state],
    );
    if (groupId !== null)
      await db.execute('INSERT INTO session_groups (session_id, group_id) VALUES (?, ?)', [
        id,
        groupId,
      ]);
    for (const [memberId, status] of statuses)
      await db.execute('INSERT INTO attendances (session_id, member_id, status) VALUES (?, ?, ?)', [
        id,
        memberId,
        status,
      ]);
    return id;
  };

  it('EX-16 RM-01 liste : groupe, présents (Présent + Retard) sur le total, Excusé compris dans le total', async () => {
    const id = await addSession(s.seasonId, s.groupId, '2026-11-24', '10:05', [
      [s.memberId, 'excused'],
      [s.otherMemberId, 'absent'],
    ]);
    expect(await repo().history({ seasonId: s.seasonId, groupId: null, from: null })).toEqual([
      {
        id: s.sessionId,
        date: '2026-11-25',
        startTime: '17:30',
        groupId: s.groupId,
        groupName: 'Poussins',
        present: 2,
        total: 2,
      },
      {
        id,
        date: '2026-11-24',
        startTime: '10:05',
        groupId: s.groupId,
        groupName: 'Poussins',
        present: 0,
        total: 2,
      },
    ]);
  });

  it('EX-16 la plus récente en haut : date puis heure décroissantes', async () => {
    const early = await addSession(s.seasonId, s.groupId, '2026-11-25', '09:00', []);
    const late = await addSession(s.seasonId, s.groupId, '2026-11-25', '20:00', []);
    const rows = await repo().history({ seasonId: s.seasonId, groupId: null, from: null });
    expect(rows.map((r) => r.id)).toEqual([late, s.sessionId, early]);
  });

  it('EX-16 seules les séances enregistrées ; filtres par saison, par groupe, à partir d’une date', async () => {
    await addSession(s.seasonId, s.groupId, '2026-11-26', '17:30', [], 'cancelled');
    const old = await addSession(s.otherSeasonId, otherGroupId, '2026-03-04', '18:00', [
      [s.memberId, 'present'],
    ]);
    const before = await addSession(s.seasonId, s.groupId, '2026-10-01', '17:30', []);
    const all = await repo().history({ seasonId: null, groupId: null, from: null });
    expect(all.map((r) => r.id)).toEqual([s.sessionId, before, old]);
    const season = await repo().history({ seasonId: s.seasonId, groupId: null, from: null });
    expect(season.map((r) => r.id)).toEqual([s.sessionId, before]);
    const recent = await repo().history({
      seasonId: s.seasonId,
      groupId: null,
      from: '2026-11-03',
    });
    expect(recent.map((r) => r.id)).toEqual([s.sessionId]);
    const benjamins = await repo().history({ seasonId: null, groupId: otherGroupId, from: null });
    expect(benjamins.map((r) => r.id)).toEqual([old]);
  });

  it('EX-02 séance dont le groupe a été supprimé : sans groupe, jamais sous un filtre de groupe', async () => {
    await db.execute('DELETE FROM groups WHERE id = ?', [s.groupId]);
    expect(await repo().history({ seasonId: null, groupId: null, from: null })).toEqual([
      expect.objectContaining({ id: s.sessionId, groupId: null, groupName: null, present: 2 }),
    ]);
    expect(await repo().history({ seasonId: null, groupId: s.groupId, from: null })).toEqual([]);
  });

  it('EX-16 filtre invalide refusé (date, identifiant)', async () => {
    await expect(
      repo().history({ seasonId: null, groupId: null, from: '25/11/2026' }),
    ).rejects.toMatchObject({ code: 'DATE_INVALID' });
    await expect(repo().history({ seasonId: 0, groupId: null, from: null })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('EX-16 savoir si un appel a déjà été enregistré (état vide de l’Historique)', async () => {
    expect(await repo().hasRecorded()).toBe(true);
    await db.execute("UPDATE sessions SET state = 'cancelled'");
    expect(await repo().hasRecorded()).toBe(false);
  });

  it('EX-21 plus ancienne séance enregistrée (bandeau de sauvegarde), annulées ignorées', async () => {
    expect(await repo().firstRecordedDate()).toBe('2026-11-25');
    await db.execute(
      "INSERT INTO sessions (season_id, date, start_time, state) VALUES (?, '2025-10-01', '10:00', 'cancelled')",
      [s.otherSeasonId],
    );
    await db.execute(
      "INSERT INTO sessions (season_id, date, start_time, state) VALUES (?, '2026-09-14', '10:00', 'recorded')",
      [s.seasonId],
    );
    expect(await repo().firstRecordedDate()).toBe('2026-09-14');
    await db.execute('DELETE FROM sessions');
    expect(await repo().firstRecordedDate()).toBeNull();
  });

  it('EX-16 groupes du filtre : ceux de la saison, archivés compris ; toutes saisons, l’active d’abord', async () => {
    const { lastInsertRowId: archived } = await db.execute(
      "INSERT INTO groups (season_id, name, archived_at) VALUES (?, 'Adultes', '2026-10-01')",
      [s.seasonId],
    );
    expect(await groupsRepo(db).listForHistory({ seasonId: s.seasonId, from: null })).toEqual([
      { id: archived, name: 'Adultes', seasonName: 'Saison 2026-2027', activeSeason: true },
      { id: s.groupId, name: 'Poussins', seasonName: 'Saison 2026-2027', activeSeason: true },
    ]);
    expect(
      (await groupsRepo(db).listForHistory({ seasonId: null, from: null })).map((g) => g.id),
    ).toEqual([archived, s.groupId, otherGroupId]);
  });

  it('EX-16 groupes des « 30 derniers jours » : ceux qui ont une séance dans la période, toutes saisons, plus ceux demandés (appels manquants)', async () => {
    const { lastInsertRowId: adultes } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Adultes')",
      [s.seasonId],
    );
    await addSession(s.otherSeasonId, otherGroupId, '2026-11-10', '18:00', []);
    await addSession(s.otherSeasonId, otherGroupId, '2026-11-10', '19:00', [], 'cancelled');
    const ids = async (from: string, include?: number[]) =>
      (await groupsRepo(db).listForHistory({ seasonId: null, from, include })).map((g) => g.id);
    expect(await ids('2026-11-01')).toEqual([s.groupId, otherGroupId]);
    expect(await ids('2026-11-20')).toEqual([s.groupId]);
    expect(await ids('2026-11-26')).toEqual([]);
    expect(await ids('2026-11-26', [adultes])).toEqual([adultes]);
  });

  it('EX-18 détail : groupe, date, heure, commentaire, présences triées par nom, membres archivés compris', async () => {
    await db.execute("UPDATE members SET archived_at = '2026-11-30' WHERE id = ?", [
      s.otherMemberId,
    ]);
    await db.execute("UPDATE sessions SET comment = 'Gymnase froid' WHERE id = ?", [s.sessionId]);
    expect(await repo().get(s.sessionId)).toEqual({
      id: s.sessionId,
      seasonId: s.seasonId,
      slotId: s.slotId,
      date: '2026-11-25',
      startTime: '17:30',
      groupName: 'Poussins',
      comment: 'Gymnase froid',
      attendances: [
        { memberId: s.memberId, firstName: 'Alix', lastName: 'Exemple', status: 'present' },
        { memberId: s.otherMemberId, firstName: 'Sam', lastName: 'Fictif', status: 'late' },
      ],
    });
    expect(await repo().get(9999)).toBeNull();
    // Adresse mal formée (« /seances/abc ») : introuvable, sans requête.
    expect(await repo().get(Number.NaN)).toBeNull();
    await db.execute("UPDATE sessions SET state = 'cancelled'");
    expect(await repo().get(s.sessionId)).toBeNull();
  });

  it('EX-18 corriger : statuts et commentaire réécrits, d’un bloc', async () => {
    await repo().correct(s.sessionId, {
      statuses: [{ memberId: s.otherMemberId, status: 'absent' }],
      comment: '  Pluie  ',
    });
    const detail = await repo().get(s.sessionId);
    expect(detail?.comment).toBe('Pluie');
    expect(detail?.attendances.map((a) => a.status)).toEqual(['present', 'absent']);
    await repo().correct(s.sessionId, { statuses: [], comment: '   ' });
    expect((await repo().get(s.sessionId))?.comment).toBeNull();
  });

  it('EX-18 correction permise même saison inactive et groupe archivé (décision du 2026-11-27)', async () => {
    await db.execute("UPDATE groups SET archived_at = '2026-11-30' WHERE id = ?", [s.groupId]);
    await db.execute('UPDATE seasons SET is_active = 0');
    await repo().correct(s.sessionId, {
      statuses: [{ memberId: s.memberId, status: 'excused' }],
      comment: null,
    });
    expect(await count(db, 'attendances', "status = 'excused'")).toBe(1);
  });

  it('EX-18 sans ajout : un membre absent de la séance, un statut inconnu ou un commentaire trop long sont refusés, rien n’est écrit', async () => {
    const { lastInsertRowId: noah } = await db.execute(
      "INSERT INTO members (first_name, last_name) VALUES ('Noah', 'Girard')",
    );
    await expect(
      repo().correct(s.sessionId, {
        statuses: [
          { memberId: s.memberId, status: 'absent' },
          { memberId: noah, status: 'present' },
        ],
        comment: 'x',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      repo().correct(s.sessionId, {
        statuses: [{ memberId: s.memberId, status: 'gone' as 'absent' }],
        comment: null,
      }),
    ).rejects.toMatchObject({ code: 'STATUS_INVALID' });
    await expect(
      repo().correct(s.sessionId, { statuses: [], comment: 'x'.repeat(501) }),
    ).rejects.toMatchObject({ code: 'COMMENT_TOO_LONG' });
    await expect(repo().correct(9999, { statuses: [], comment: null })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    const detail = await repo().get(s.sessionId);
    expect(detail?.comment).toBeNull();
    expect(detail?.attendances.map((a) => a.status)).toEqual(['present', 'late']);
    expect(await count(db, 'attendances', 'member_id = ?', [noah])).toBe(0);
  });

  it('EX-18 ABS-05 SEC-11 supprimer efface vraiment la séance, son groupe figé et ses présences', async () => {
    const kept = await addSession(s.seasonId, s.groupId, '2026-11-24', '10:05', [
      [s.memberId, 'present'],
    ]);
    await repo().remove(s.sessionId);
    expect(await count(db, 'sessions', 'id = ?', [s.sessionId])).toBe(0);
    expect(await count(db, 'session_groups', 'session_id = ?', [s.sessionId])).toBe(0);
    expect(await count(db, 'attendances', 'session_id = ?', [s.sessionId])).toBe(0);
    // Le reste ne bouge pas : l'autre séance, ses présences, les membres.
    expect(await count(db, 'sessions')).toBe(1);
    expect(await count(db, 'attendances', 'session_id = ?', [kept])).toBe(1);
    expect(await count(db, 'members')).toBe(2);
    await expect(repo().remove(s.sessionId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('SEC-05 commentaire avec apostrophes et points-virgules écrit tel quel', async () => {
    const text = "L'entraîneur ; DROP TABLE sessions; --";
    await repo().correct(s.sessionId, { statuses: [], comment: text });
    expect((await repo().get(s.sessionId))?.comment).toBe(text);
  });
});
