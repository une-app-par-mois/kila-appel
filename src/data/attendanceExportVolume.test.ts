/**
 * @jest-environment node
 */
// NF-08 (ticket 036) : export des présences sur le jeu de volume du 023 (500 membres, 3 saisons) ;
// chaque lecture en une requête, durée mesurée avec la même limite large que les statistiques.
import { fillGroupCount, volumeSeed } from '@/__fixtures__/statsSeed';
import { attendanceExportRepo } from '@/data/attendanceExportRepo';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { customPeriod } from '@/domain/statsPeriod';

const LIMIT_MS = 2000;

/** Lance `rows`, `count` et `groups` ; chacune doit tenir en une requête et sous la limite. */
const measure = async (db: Db, groupId: number | null, from: string, to: string) => {
  let queries = 0;
  const counted: Db = {
    ...db,
    query: (sql, params) => {
      queries += 1;
      return db.query(sql, params);
    },
  };
  const period = customPeriod(from, to);
  const repo = attendanceExportRepo(counted);
  const timed = async <T>(read: () => Promise<T>): Promise<T> => {
    queries = 0;
    const start = performance.now();
    const value = await read();
    expect(queries).toBe(1);
    expect(performance.now() - start).toBeLessThan(LIMIT_MS);
    return value;
  };
  return {
    rows: await timed(() => repo.rows(period, groupId)),
    count: await timed(() => repo.count(period, groupId)),
    groups: await timed(() => repo.groups(period)),
  };
};

describe('NF-08 export : 500 membres, 3 saisons', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
  });
  afterEach(async () => {
    await db.close();
  });

  it('NF-08 saison entière, tous les groupes : 20 000 lignes, une requête par lecture', async () => {
    await volumeSeed(db);
    await fillGroupCount(db);
    const r = await measure(db, null, '2026-09-01', '2027-07-31');
    expect(r.rows).toHaveLength(20000);
    expect(r.count).toBe(20000);
    expect(r.groups).toHaveLength(10);
  });

  it('NF-08 séances à deux groupes sur 3 saisons, un groupe filtré : 80 séances × 100 présences', async () => {
    const { groupId } = await volumeSeed(db, { twoGroups: true });
    await fillGroupCount(db);
    const r = await measure(db, groupId, '2024-09-01', '2027-07-31');
    // Groupe 1 : ses 40 séances et les 40 de Groupe 10 ; seules ses 50 inscrites comptent pour lui.
    expect(r.rows).toHaveLength(80 * 50);
    expect(r.count).toBe(80 * 50);
    expect(r.groups).toHaveLength(30);
  });

  it('NF-08 séances à deux groupes sur 3 saisons, tous les groupes : 120 000 lignes', async () => {
    await volumeSeed(db, { twoGroups: true });
    await fillGroupCount(db);
    const r = await measure(db, null, '2024-09-01', '2027-07-31');
    expect(r.rows).toHaveLength(120000);
    expect(r.count).toBe(120000);
  });
});
