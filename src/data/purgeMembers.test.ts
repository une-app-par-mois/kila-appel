/**
 * @jest-environment node
 */
// Purge : gardes des membres (ticket 015b, revue de sécurité, SEC-11). Un membre inscrit dans la
// saison purgée reste s'il figure encore dans une saison gardée, par une inscription ou une
// présence ; une saison à venir est gardée. Saison active ancienne : gardée en plus des N.
import { addMember, addSeason, insert, oldSeason, TODAY } from '@/__fixtures__/purgeSeed';
import { type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { purge, purgeCandidates, purgeImpact } from '@/data/purge';

jest.mock('@/data/log', () => ({ log: jest.fn() }));

const groupOf = async (db: Db, seasonId: number) =>
  (await db.query<{ id: number }>('SELECT id FROM groups WHERE season_id = ?', [seasonId]))[0]
    ?.id ?? 0;

const enroll = (db: Db, memberId: number, groupId: number, start: string) =>
  db.execute('INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)', [
    memberId,
    groupId,
    start,
  ]);

describe('Purge : membres encore présents dans une saison gardée (SEC-11, EX-24)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
  });
  afterEach(async () => {
    await db.close();
  });

  it('SEC-11 inscrit ailleurs, présent dans la saison active ou inscrit dans une saison à venir : gardé', async () => {
    const old = await oldSeason(db, s);
    const oldGroup = await groupOf(db, old.seasonId);
    const keptGroup = await groupOf(db, s.otherSeasonId);
    const next = await addSeason(db, '2027-2028', '2027-09-01', '2028-07-31');
    const nextGroup = await insert(db, 'INSERT INTO groups (season_id, name) VALUES (?, ?)', [
      next,
      'Benjamins',
    ]);
    const enrolledKept = await addMember(db, 'Zzinscritgardezz');
    const attendedActive = await addMember(db, 'Zzpresentactivezz');
    const enrolledNext = await addMember(db, 'Zzinscritavenirzz');
    for (const id of [enrolledKept, attendedActive, enrolledNext]) {
      await enroll(db, id, oldGroup, '2023-09-01');
    }
    await enroll(db, enrolledKept, keptGroup, '2025-09-01');
    await db.execute(
      "INSERT INTO attendances (session_id, member_id, status) VALUES (?, ?, 'present')",
      [s.sessionId, attendedActive],
    );
    await enroll(db, enrolledNext, nextGroup, '2027-09-01');

    // Seuls les deux membres de l'ancienne saison sont comptés.
    expect((await purgeImpact(db, [old.seasonId])).members).toBe(2);
    await purge(db, [old.seasonId], 2, TODAY);
    const remaining = (await db.query<{ id: number }>('SELECT id FROM members')).map((m) => m.id);
    expect(remaining).toEqual(expect.arrayContaining([enrolledKept, attendedActive, enrolledNext]));
    expect(remaining).not.toContain(old.onlyOld);
  });

  it('EX-24 une saison active ancienne est gardée en plus des N plus récentes (N+1 commencées)', async () => {
    const old = await addSeason(db, '2024-2025', '2024-09-01', '2025-07-31');
    const oldest = await addSeason(db, '2020-2021', '2020-09-01', '2021-07-31');
    await db.execute('UPDATE seasons SET is_active = 0');
    await db.execute('UPDATE seasons SET is_active = 1 WHERE id = ?', [oldest]);
    // Gardées : 2026-2027 et 2025-2026 (les 2 plus récentes), plus l'active, jamais candidate.
    expect((await purgeCandidates(db, 2, TODAY)).map((x) => x.id)).toEqual([old]);
  });
});
