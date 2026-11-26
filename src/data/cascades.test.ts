/**
 * @jest-environment node
 */
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

describe('Suppressions en cascade (SEC-11, ABS-05)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = openNodeDb();
    await prepareDatabase(db);
    s = await seed(db);
  });
  afterEach(async () => {
    await db.close();
  });

  it('SEC-11 supprimer un membre efface ses présences (brouillon compris), contacts, inscriptions et alertes traitées', async () => {
    const own = 'member_id = ?';
    expect(await count(db, 'attendances', own, [s.memberId])).toBe(1);
    expect(await count(db, 'emergency_contacts', own, [s.memberId])).toBe(1);
    expect(await count(db, 'enrollments', own, [s.memberId])).toBe(2);
    expect(await count(db, 'alert_acks', own, [s.memberId])).toBe(1);

    await db.execute('DELETE FROM members WHERE id = ?', [s.memberId]);

    for (const table of [
      'attendances',
      'emergency_contacts',
      'enrollments',
      'alert_acks',
      'roll_call_draft_statuses',
    ] as const) {
      expect(await count(db, table, own, [s.memberId])).toBe(0);
      expect(await count(db, table, own, [s.otherMemberId])).toBeGreaterThan(0);
    }
    expect(await count(db, 'sessions')).toBe(1);
  });

  it('EX-01 supprimer une saison efface ses groupes, créneaux, séances et présences, pas les membres', async () => {
    await db.execute('DELETE FROM seasons WHERE id = ?', [s.seasonId]);

    expect(await count(db, 'groups', 'season_id = ?', [s.seasonId])).toBe(0);
    expect(await count(db, 'slots')).toBe(0);
    expect(await count(db, 'slot_groups')).toBe(0);
    expect(await count(db, 'slot_dates')).toBe(0);
    expect(await count(db, 'sessions')).toBe(0);
    expect(await count(db, 'session_groups')).toBe(0);
    expect(await count(db, 'attendances')).toBe(0);
    expect(await count(db, 'roll_call_drafts')).toBe(0);
    expect(await count(db, 'roll_call_draft_groups')).toBe(0);
    expect(await count(db, 'roll_call_draft_statuses')).toBe(0);
    expect(await count(db, 'enrollments', 'group_id = ?', [s.groupId])).toBe(0);
    // L'autre saison et les membres restent.
    expect(await count(db, 'members')).toBe(2);
    expect(await count(db, 'groups', 'season_id = ?', [s.otherSeasonId])).toBe(1);
    expect(await count(db, 'enrollments')).toBe(2);
  });

  it('EX-07 supprimer un créneau garde ses séances et leurs présences, sans lien vers le créneau', async () => {
    await db.execute('DELETE FROM slots WHERE id = ?', [s.slotId]);

    expect(await count(db, 'sessions', 'id = ? AND slot_id IS NULL', [s.sessionId])).toBe(1);
    expect(await count(db, 'attendances', 'session_id = ?', [s.sessionId])).toBe(2);
    expect(await count(db, 'session_groups', 'session_id = ?', [s.sessionId])).toBe(1);
    expect(await count(db, 'slot_groups')).toBe(0);
    expect(await count(db, 'slot_dates')).toBe(0);
    expect(await count(db, 'roll_call_drafts')).toBe(0);
    expect(await count(db, 'roll_call_draft_statuses')).toBe(0);
  });

  it('EX-02 supprimer un groupe le retire des séances passées et garde les présences', async () => {
    await db.execute('DELETE FROM groups WHERE id = ?', [s.groupId]);

    expect(await count(db, 'sessions', 'id = ?', [s.sessionId])).toBe(1);
    expect(await count(db, 'session_groups')).toBe(0);
    expect(await count(db, 'attendances', 'session_id = ?', [s.sessionId])).toBe(2);
    expect(await count(db, 'enrollments', 'group_id = ?', [s.groupId])).toBe(0);
    expect(await count(db, 'slot_groups')).toBe(0);
    expect(await count(db, 'roll_call_draft_groups')).toBe(0);
    expect(await count(db, 'roll_call_draft_statuses')).toBe(2);
    expect(await count(db, 'members')).toBe(2);
  });

  it('EX-18 supprimer une séance efface ses présences et ses groupes figés', async () => {
    await db.execute('DELETE FROM sessions WHERE id = ?', [s.sessionId]);

    expect(await count(db, 'attendances')).toBe(0);
    expect(await count(db, 'session_groups')).toBe(0);
    expect(await count(db, 'members')).toBe(2);
    expect(await count(db, 'slots')).toBe(1);
  });
});
