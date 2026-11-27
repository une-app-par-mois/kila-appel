/**
 * @jest-environment node
 */
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { type RollCall, sessionsRepo } from '@/data/sessionsRepo';

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
    const id = await sessionsRepo(db).record(call());
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

  it('RM-05 une seule séance par créneau et par date ; sans créneau (EX-39), plusieurs possibles', async () => {
    const repo = sessionsRepo(db);
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
      sessionsRepo(db).record(
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
    const repo = sessionsRepo(db);
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
    const repo = sessionsRepo(db);
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
    const id = await sessionsRepo(db).record(
      call({ slotId: null, groupId: lundi, statuses: [], comment: null }),
    );
    expect(await count(db, 'attendances', 'session_id = ?', [id])).toBe(0);
  });
});
