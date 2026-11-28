/**
 * @jest-environment node
 */
// Rapport PDF, grille séance par séance (ticket 039b ; EX-32, RM-03, NF-08) sur le jeu fictif du
// ticket 023 (`statsSeed.ts`). Oracle : « Statistiques d'un membre » (`statsRepo.member`), jamais
// des valeurs écrites en dur ; les comptes d'une ligne égalent ceux du rapport (039).
import { STATS_TODAY, type StatsSeeded, statsSeed, volumeSeed } from '@/__fixtures__/statsSeed';
import { rapport } from '@/config/libelles/rapport';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { reportGridRepo } from '@/data/reportGridRepo';
import { reportRepo } from '@/data/reportRepo';
import { statsRepo } from '@/data/statsRepo';
import { SHARE_ORDER } from '@/domain/attendanceRate';
import { type ReportGrid, reportGrids } from '@/domain/reportGrid';
import type { Report } from '@/domain/reportHtml';
import { safeHtmlText } from '@/domain/safeHtml';
import { customPeriod, type StatsPeriod, seasonPeriod } from '@/domain/statsPeriod';

const LIMIT_MS = 2000;
const letters = rapport.report.letters;

/** Compte les requêtes envoyées à la base (NF-08 : une seule pour toute la grille). */
const counting = (db: Db) => {
  const counter = { queries: 0, db };
  counter.db = {
    ...db,
    query: (sql, params) => {
      counter.queries += 1;
      return db.query(sql, params);
    },
  };
  return counter;
};

/** Lettres de chaque ligne d'un groupe, blocs mis bout à bout, lues dans le HTML rendu. */
const renderedRows = (pages: readonly string[]) => {
  const rows: string[][] = [];
  for (const page of pages) {
    const body = page.split('<tbody>')[1]?.split('</tbody>')[0] ?? '';
    [...body.matchAll(/<tr>(.*?)<\/tr>/g)].forEach((tr, i) => {
      const cells = [...(tr[1] ?? '').matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((m) => m[1] ?? '');
      rows[i] = [...(rows[i] ?? []), ...cells.slice(2)];
    });
  }
  return rows;
};

/** EX-32 : chaque case égale le statut de « Statistiques d'un membre » ; comptes égaux au 039. */
const expectSameAsStats = async (db: Db, period: StatsPeriod, report: Report, grid: ReportGrid) => {
  const pages = reportGrids(report, grid, rapport.report);
  let checked = 0;
  for (const g of report.groups) {
    if (g.sessions === 0) {
      expect(grid.has(g.groupId)).toBe(false);
      continue;
    }
    expect(grid.get(g.groupId)?.sessions).toHaveLength(g.sessions);
    const rows = renderedRows((pages.get(g.groupId) ?? []).map(safeHtmlText));
    for (const [i, m] of g.members.entries()) {
      const screen = await statsRepo(db).member(m.memberId, g.groupId, period);
      expect(grid.get(g.groupId)?.sessions.map((x) => x.sessionId)).toEqual(
        screen?.sessions.map((x) => x.sessionId),
      );
      const expected = screen?.sessions.map((x) => (x.status ? letters[x.status] : '')) ?? [];
      expect(rows[i]).toEqual(expected);
      for (const s of SHARE_ORDER)
        expect(rows[i]?.filter((l) => l === letters[s])).toHaveLength(m.counts[s]);
      checked += 1;
    }
  }
  return checked;
};

describe('Rapport PDF : grille, données (EX-32, RM-03)', () => {
  let db: Db;
  let s: StatsSeeded;
  let SEASON: StatsPeriod;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await statsSeed(db);
    SEASON = seasonPeriod(
      { id: s.seasonId, startDate: '2026-09-01', endDate: '2027-07-31' },
      STATS_TODAY,
    );
  });
  afterEach(async () => {
    await db.close();
  });

  const both = async (period: StatsPeriod, groupId: number | null) => {
    const counter = counting(db);
    const grid = await reportGridRepo(counter.db).grid(period, groupId);
    expect(counter.queries).toBe(1);
    const report = await reportRepo(db).report(period, groupId, STATS_TODAY);
    return { grid, report: report as Report };
  };

  it('EX-32 saison : chaque case égale « Statistiques d’un membre », en une requête', async () => {
    const { grid, report } = await both(SEASON, null);
    expect(await expectSameAsStats(db, SEASON, report, grid)).toBeGreaterThan(5);
  });

  it('EX-32 filtre sur un groupe, « Ce mois » et ancienne saison : mêmes cases', async () => {
    for (const [period, groupId] of [
      [SEASON, s.groups.benjamins],
      [customPeriod('2026-11-01', STATS_TODAY), null],
      [customPeriod('2026-03-01', '2026-03-31'), null],
    ] as const) {
      const { grid, report } = await both(period, groupId);
      await expectSameAsStats(db, period, report, grid);
      if (groupId !== null) expect([...grid.keys()]).toEqual([groupId]);
    }
  });

  it('RM-03 membre changé de groupe : séances sous chaque groupe selon la date, case vide sinon', async () => {
    const { grid } = await both(SEASON, null);
    const poussins = grid.get(s.groups.poussins);
    const lea = poussins?.statuses.get(s.members.lea);
    const enrolled = poussins?.sessions.filter((x) => x.date < '2026-10-15') ?? [];
    expect(enrolled.length).toBeGreaterThan(0);
    expect(enrolled.every((x) => lea?.has(x.sessionId))).toBe(true);
    expect(poussins?.sessions.filter((x) => lea?.has(x.sessionId))).toEqual(enrolled);
    const benjamins = grid.get(s.groups.benjamins);
    expect(benjamins?.statuses.get(s.members.lea)?.size).toBeGreaterThan(0);
  });

  it('EX-32 RM-03 après la suppression d’un groupe : la grille suit encore les statistiques', async () => {
    await db.execute('DELETE FROM groups WHERE id = ?', [s.groups.veterans]);
    const { grid, report } = await both(SEASON, null);
    expect(grid.has(s.groups.veterans)).toBe(false);
    await expectSameAsStats(db, SEASON, report, grid);
  });

  it('EX-32 filtre introuvable ou invalide : grille vide ; période revalidée (RM-04)', async () => {
    expect((await reportGridRepo(db).grid(SEASON, 9999)).size).toBe(0);
    expect((await reportGridRepo(db).grid(SEASON, 0)).size).toBe(0);
    await expect(
      reportGridRepo(db).grid({ ...SEASON, from: '2026-13-01' }, null),
    ).rejects.toThrow();
    await expect(reportGridRepo(db).grid({ ...SEASON, seasonId: -1 }, null)).rejects.toThrow();
  });
});

describe('NF-08 grille : 500 membres, 3 saisons', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
  });
  afterEach(async () => {
    await db.close();
  });

  it.each([
    [false, '2026-09-01', 10, 40],
    [true, '2024-09-01', 30, 80],
  ])(
    'NF-08 deux groupes : %s, une requête en moins de 2 s, taille du HTML mesurée',
    async (twoGroups, from, groups, sessions) => {
      await volumeSeed(db, { twoGroups });
      const period = customPeriod(from, '2027-07-31');
      const counter = counting(db);
      const start = performance.now();
      const grid = await reportGridRepo(counter.db).grid(period, null);
      const ms = Math.round(performance.now() - start);
      expect(counter.queries).toBe(1);
      expect(grid.size).toBe(groups);
      expect([...grid.values()].every((g) => g.sessions.length === sessions)).toBe(true);
      expect(ms).toBeLessThan(LIMIT_MS);
      const report = (await reportRepo(db).report(period, null, '2027-07-31')) as Report;
      const pages = [...reportGrids(report, grid, rapport.report).values()].flat();
      const chars = pages.reduce((n, p) => n + safeHtmlText(p).length, 0);
      // Trace de la mesure pour le compte rendu (aucune donnée personnelle, ABS-04).
      process.stdout.write(
        `NF-08 grille (${groups} groupes) : requête ${ms} ms, HTML ${Math.round(chars / 1000)} k caractères\n`,
      );
    },
  );
});
