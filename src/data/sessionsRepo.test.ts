/**
 * @jest-environment node
 */
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { type RollCall, sessionsRepo } from '@/data/sessionsRepo';

// Mercredi 2026-12-02 : jour du créneau du jeu fictif (mercredi 17:30 depuis 2025-09-01).
const TODAY = '2026-12-02';

describe('Dépôt des séances (EX-15, RM-03, RM-05)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
  });
  afterEach(async () => {
    await db.close();
  });

  const call = (overrides: Partial<RollCall> = {}): RollCall => ({
    slotId: s.slotId,
    groupId: s.groupId,
    date: '2026-12-02',
    startTime: '17:30',
    statuses: [
      { memberId: s.memberId, status: 'present' },
      { memberId: s.otherMemberId, status: 'absent' },
    ],
    comment: 'Gymnase fermé',
    ...overrides,
  });
  const sessionsOn = (date: string) => count(db, 'sessions', 'date = ?', [date]);

  it('EX-15 enregistre la séance, son groupe figé et une présence par membre, d’un bloc', async () => {
    const id = await sessionsRepo(db, TODAY).record(call());
    expect(
      await db.query(
        'SELECT season_id, slot_id, date, start_time, state, comment FROM sessions WHERE id = ?',
        [id],
      ),
    ).toEqual([
      {
        season_id: s.seasonId,
        slot_id: s.slotId,
        date: '2026-12-02',
        start_time: '17:30',
        state: 'recorded',
        comment: 'Gymnase fermé',
      },
    ]);
    expect(
      await db.query('SELECT group_id FROM session_groups WHERE session_id = ?', [id]),
    ).toEqual([{ group_id: s.groupId }]);
    expect(
      await db.query(
        'SELECT member_id, status FROM attendances WHERE session_id = ? ORDER BY member_id',
        [id],
      ),
    ).toEqual(
      [
        { member_id: s.memberId, status: 'present' },
        { member_id: s.otherMemberId, status: 'absent' },
      ].sort((a, b) => a.member_id - b.member_id),
    );
  });

  it('RM-03 fige le nombre de groupes de la séance ; supprimer le groupe ne le change pas', async () => {
    const id = await sessionsRepo(db, TODAY).record(call());
    const groupCount = () => db.query('SELECT group_count FROM sessions WHERE id = ?', [id]);
    expect(await groupCount()).toEqual([{ group_count: 1 }]);
    await db.execute('DELETE FROM groups WHERE id = ?', [s.groupId]);
    expect(await count(db, 'session_groups', 'session_id = ?', [id])).toBe(0);
    expect(await groupCount()).toEqual([{ group_count: 1 }]);
  });

  it('RM-03 F-11 group_count suit les groupes écrits pour la séance, pas une valeur fixe', async () => {
    // Écriture d'un second groupe simulée par un déclencheur de test (séances à plusieurs groupes).
    await db.execute(
      `CREATE TRIGGER test_second_group AFTER INSERT ON session_groups WHEN NEW.group_id = ${s.groupId}
       BEGIN INSERT INTO session_groups (session_id, group_id) VALUES (NEW.session_id, 2); END`,
    );
    const id = await sessionsRepo(db, TODAY).record(call());
    expect(await db.query('SELECT group_count FROM sessions WHERE id = ?', [id])).toEqual([
      { group_count: 2 },
    ]);
  });

  it('RM-05 une seule séance par créneau et par date ; sans créneau (EX-39), plusieurs possibles', async () => {
    const repo = sessionsRepo(db, TODAY);
    // La séance du jeu fictif : créneau du jeu, le 2026-11-25.
    await expect(repo.record(call({ date: '2026-11-25' }))).rejects.toMatchObject({
      code: 'ALREADY_RECORDED',
    });
    expect(await sessionsOn('2026-11-25')).toBe(1);
    expect(await repo.isRecorded(s.slotId, '2026-11-25')).toBe(true);
    expect(await repo.isRecorded(s.slotId, '2026-12-02')).toBe(false);
    await repo.record(call({ slotId: null, date: '2026-11-25', startTime: '10:05' }));
    await repo.record(call({ slotId: null, date: '2026-11-25', startTime: '18:40' }));
    expect(await sessionsOn('2026-11-25')).toBe(3);
  });

  it('RM-03 un membre qui n’est pas inscrit au groupe à la date est refusé ; rien n’est écrit', async () => {
    const { lastInsertRowId: noah } = await db.execute(
      "INSERT INTO members (first_name, last_name) VALUES ('Noah', 'Girard')",
    );
    await db.execute(
      "INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, '2027-01-05')",
      [noah, s.groupId],
    );
    await expect(
      sessionsRepo(db, TODAY).record(
        call({
          statuses: [
            { memberId: s.memberId, status: 'present' },
            { memberId: noah, status: 'present' },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'NOT_ENROLLED' });
    expect(await sessionsOn('2026-12-02')).toBe(0);
    expect(await count(db, 'attendances', 'member_id = ?', [s.memberId])).toBe(1);
  });

  it('EX-04 date hors de la saison active refusée ; groupe archivé, d’une autre saison ou inconnu refusé', async () => {
    const repo = sessionsRepo(db, TODAY);
    await expect(repo.record(call({ date: '2027-08-04' }))).rejects.toMatchObject({
      code: 'DATE_OUTSIDE_SEASON',
    });
    const [other] = await db.query<{ id: number }>('SELECT id FROM groups WHERE season_id = ?', [
      s.otherSeasonId,
    ]);
    for (const groupId of [other?.id ?? 0, 9999]) {
      await expect(repo.record(call({ groupId, slotId: null }))).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    }
    await db.execute("UPDATE groups SET archived_at = '2026-11-01' WHERE id = ?", [s.groupId]);
    await expect(repo.record(call())).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await count(db, 'sessions')).toBe(1);
  });

  it('EX-07 un créneau d’un autre groupe ou inconnu est refusé', async () => {
    const repo = sessionsRepo(db, TODAY);
    const { lastInsertRowId: lundi } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Benjamins lundi')",
      [s.seasonId],
    );
    await expect(repo.record(call({ groupId: lundi, statuses: [] }))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(repo.record(call({ slotId: 9999 }))).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await count(db, 'sessions')).toBe(1);
  });

  it('EX-15 une séance sans membre (groupe vide) s’enregistre quand même', async () => {
    const { lastInsertRowId: lundi } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Benjamins lundi')",
      [s.seasonId],
    );
    const id = await sessionsRepo(db, TODAY).record(
      call({ slotId: null, groupId: lundi, statuses: [], comment: null }),
    );
    expect(await count(db, 'attendances', 'session_id = ?', [id])).toBe(0);
  });

  it('EX-17 une séance de créneau est une vraie séance : bon jour, bonne heure, pas future (décision du 2026-11-27)', async () => {
    const repo = sessionsRepo(db, TODAY);
    for (const bad of [
      { date: '2026-11-30' }, // un lundi
      { date: '2026-12-09' }, // mercredi suivant : futur
      { startTime: '09:00' },
    ]) {
      await expect(repo.record(call(bad))).rejects.toMatchObject({ code: 'NOT_A_SLOT_SESSION' });
    }
    await db.execute("UPDATE slots SET schedule_from = '2026-11-26' WHERE id = ?", [s.slotId]);
    await expect(repo.record(call({ date: '2026-11-18' }))).rejects.toMatchObject({
      code: 'NOT_A_SLOT_SESSION',
    });
    expect(await count(db, 'sessions')).toBe(1);
    await repo.record(call({ date: '2026-11-18', slotId: null, startTime: '09:00' }));
    await repo.record(call());
    expect(await count(db, 'sessions')).toBe(3);
  });

  it('EX-39 appel sans créneau : date future refusée (décision du 2026-11-27)', async () => {
    const repo = sessionsRepo(db, TODAY);
    await expect(
      repo.record(call({ slotId: null, date: '2026-12-03', startTime: '10:05' })),
    ).rejects.toMatchObject({ code: 'DATE_IN_FUTURE' });
    await repo.record(call({ slotId: null, date: TODAY, startTime: '10:05' }));
    expect(await count(db, 'sessions', 'slot_id IS NULL')).toBe(1);
  });

  it('EX-39 savoir si un appel du groupe est déjà enregistré ce jour-là (créneau ou non)', async () => {
    const repo = sessionsRepo(db, TODAY);
    expect(await repo.isGroupRecorded(s.groupId, '2026-11-25')).toBe(true);
    expect(await repo.isGroupRecorded(s.groupId, '2026-11-24')).toBe(false);
    await repo.record(call({ slotId: null, date: '2026-11-24', startTime: '10:05' }));
    expect(await repo.isGroupRecorded(s.groupId, '2026-11-24')).toBe(true);
  });

  it('EX-17 séances des créneaux de la saison (pour les appels manquants), sans les appels sans créneau', async () => {
    const repo = sessionsRepo(db, '2026-11-25');
    await repo.record(call({ slotId: null, date: '2026-11-24', startTime: '10:05' }));
    expect(await repo.slotSessions(s.seasonId)).toEqual([{ slotId: s.slotId, date: '2026-11-25' }]);
    expect(await repo.slotSessions(s.otherSeasonId)).toEqual([]);
  });

  it('EX-28 EX-36 EX-38 séances des créneaux avec leur état, futures comprises (relances)', async () => {
    const repo = sessionsRepo(db, '2026-11-25');
    await repo.record(call({ slotId: null, date: '2026-11-24', startTime: '10:05' }));
    for (const [date, state] of [
      ['2026-12-23', 'unscheduled'],
      ['2026-12-09', 'prepared'],
      ['2026-12-16', 'cancelled'],
    ] as const)
      await db.execute(
        'INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, ?, ?, ?, ?)',
        [s.seasonId, s.slotId, date, '17:30', state],
      );
    expect(await repo.reminderSessions(s.seasonId)).toEqual([
      { slotId: s.slotId, date: '2026-11-25', state: 'recorded' },
      { slotId: s.slotId, date: '2026-12-09', state: 'prepared' },
      { slotId: s.slotId, date: '2026-12-16', state: 'cancelled' },
      { slotId: s.slotId, date: '2026-12-23', state: 'unscheduled' },
    ]);
    expect(await repo.reminderSessions(s.otherSeasonId)).toEqual([]);
  });
});
