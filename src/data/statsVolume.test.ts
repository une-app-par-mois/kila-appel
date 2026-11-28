/**
 * @jest-environment node
 */
// NF-08 (ticket 023) : 500 membres et 3 saisons ; chaque écran de statistiques en une requête,
// durée mesurée avec une limite large (machines de CI lentes). Durées réelles dans la fiche.
import { fillGroupCount, volumeSeed } from '@/__fixtures__/statsSeed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { statsRepo } from '@/data/statsRepo';
import { customPeriod } from '@/domain/statsPeriod';

const LIMIT_MS = 2000;

/** Lance les trois écrans ; rend la synthèse et les durées (ms). */
const measure = async (db: Db, groupId: number, memberId: number, from: string, to: string) => {
  let queries = 0;
  const counted: Db = {
    ...db,
    query: (sql, params) => {
      queries += 1;
      return db.query(sql, params);
    },
  };
  const period = customPeriod(from, to);
  const repo = statsRepo(counted);
  const durations: Record<string, number> = {};
  const timed = async <T>(name: string, read: () => Promise<T>): Promise<T> => {
    queries = 0;
    const start = performance.now();
    const value = await read();
    durations[name] = Math.round(performance.now() - start);
    expect(queries).toBe(1);
    expect(durations[name]).toBeLessThan(LIMIT_MS);
    return value;
  };
  const overview = await timed('overview', () => repo.overview(period));
  const group = await timed('group', () => repo.group(groupId, period));
  const member = await timed('member', () => repo.member(memberId, groupId, period));
  return { overview, group, member, durations };
};

describe('NF-08 volume : 500 membres, 3 saisons', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
  });
  afterEach(async () => {
    await db.close();
  });

  it('NF-08 un groupe par séance, période d’une saison : chaque écran en une requête', async () => {
    const { groupId, memberId } = await volumeSeed(db);
    await fillGroupCount(db);
    const r = await measure(db, groupId, memberId, '2026-09-01', '2027-07-31');
    expect(r.overview.sessions).toBe(400);
    expect(r.overview.groups).toHaveLength(10);
    expect(r.group?.members).toHaveLength(50);
    expect(r.member?.sessions).toHaveLength(40);
  });

  it('NF-08 toutes les séances communes à deux groupes, période sur 3 saisons', async () => {
    const { groupId, memberId } = await volumeSeed(db, { twoGroups: true });
    await fillGroupCount(db);
    const r = await measure(db, groupId, memberId, '2024-09-01', '2027-07-31');
    expect(r.overview.sessions).toBe(1200);
    expect(r.overview.groups).toHaveLength(30);
    expect(r.group?.sessions).toBe(80);
    expect(r.member?.sessions).toHaveLength(80);
  });
});
