/**
 * @jest-environment node
 */
// Rapport PDF, données (ticket 039 ; EX-32, RM-01, RM-03, ABS-03, NF-08) sur le jeu fictif vérifié
// à la main du ticket 023 (`statsSeed.ts`) : mêmes nombres que les écrans de statistiques.
import { STATS_TODAY, type StatsSeeded, statsSeed, volumeSeed } from '@/__fixtures__/statsSeed';
import { rapport, rapportPalette } from '@/config/libelles/rapport';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { reportRepo } from '@/data/reportRepo';
import { statsRepo } from '@/data/statsRepo';
import { attendanceRate, formatRate, NBSP, type StatusCounts } from '@/domain/attendanceRate';
import { reportHtml } from '@/domain/reportHtml';
import { customPeriod, monthPeriod, type StatsPeriod, seasonPeriod } from '@/domain/statsPeriod';

const c = (present: number, late: number, excused: number, absent: number): StatusCounts => ({
  present,
  late,
  excused,
  absent,
});
const rate = (counts: StatusCounts) => formatRate(attendanceRate(counts));

/** Compte les requêtes envoyées à la base (NF-08 : une seule par rapport). */
const counting = (db: Db) => {
  const counter = { queries: 0, db: db };
  counter.db = {
    ...db,
    query: (sql, params) => {
      counter.queries += 1;
      return db.query(sql, params);
    },
  };
  return counter;
};

describe('Rapport PDF : données (EX-32, RM-01, RM-03)', () => {
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
  const repo = () => reportRepo(db);

  it('EX-32 RM-01 synthèse et groupes de la saison : taux vérifiés à la main, en une requête', async () => {
    const counter = counting(db);
    const r = await reportRepo(counter.db).report(SEASON, null, STATS_TODAY);
    expect(counter.queries).toBe(1);
    expect(r).toMatchObject({ from: '2026-09-01', to: STATS_TODAY, createdOn: STATS_TODAY });
    expect(r?.sessions).toBe(21);
    expect(r?.counts).toEqual(c(45, 2, 3, 7));
    expect(r?.groups.map((g) => [g.name, g.archived, g.sessions, rate(g.counts)])).toEqual([
      ['Adultes', false, 0, '—'],
      ['Benjamins', false, 7, `78${NBSP}%`],
      ['Poussins', false, 13, `88${NBSP}%`],
      ['Vétérans', true, 1, `100${NBSP}%`],
    ]);
  });

  it('EX-32 RM-01 membres de chaque groupe : mêmes listes et mêmes comptes que les statistiques', async () => {
    const r = await repo().report(SEASON, null, STATS_TODAY);
    const stats = statsRepo(db);
    for (const g of r?.groups ?? []) {
      const screen = await stats.group(g.groupId, SEASON);
      if (g.sessions === 0) continue;
      expect(g.members).toEqual(screen?.members);
    }
    const poussins = r?.groups.find((g) => g.groupId === s.groups.poussins);
    expect(poussins?.members.map((m) => [m.lastName, m.archived, rate(m.counts)])).toEqual([
      ['Blanc', false, `100${NBSP}%`],
      ['Durand', false, '—'],
      ['Lefebvre', true, `92${NBSP}%`],
      ['Michel', false, `100${NBSP}%`],
      ['Moreau', false, `64${NBSP}%`],
    ]);
    expect(poussins?.members.find((m) => m.memberId === s.members.hugo)?.counts).toEqual(
      c(6, 1, 1, 4),
    );
  });

  it('EX-32 mêmes nombres que les écrans sur « Ce mois » et sur l’ancienne saison', async () => {
    for (const period of [monthPeriod(STATS_TODAY), customPeriod('2026-03-01', '2026-03-31')]) {
      const r = await repo().report(period, null, STATS_TODAY);
      const o = await statsRepo(db).overview(period);
      expect(r?.sessions).toBe(o.sessions);
      expect(r?.counts).toEqual(o.counts);
      expect(r?.groups.map(({ members: _, ...g }) => g)).toEqual(o.groups);
    }
  });

  it('EX-32 filtre sur un groupe : synthèse et page de ce groupe seulement', async () => {
    const r = await repo().report(SEASON, s.groups.benjamins, STATS_TODAY);
    expect(r?.sessions).toBe(7);
    expect(r?.counts).toEqual(c(7, 0, 0, 2));
    expect(r?.groups.map((g) => g.name)).toEqual(['Benjamins']);
    expect(r?.groups[0]?.members.map((m) => [m.firstName, m.counts])).toEqual([
      ['Nour', c(1, 0, 0, 1)],
      ['Léa', c(6, 0, 0, 1)],
    ]);
    const doc = reportHtml(r as NonNullable<typeof r>, rapport.report, rapportPalette);
    expect(doc).toContain('<h2>Benjamins');
    expect(doc).not.toContain('Poussins');
    expect(doc).toContain(`78${NBSP}%`);
  });

  it('EX-32 filtre sur un groupe archivé sans séance, introuvable ou invalide', async () => {
    const anciens = await repo().report(SEASON, s.groups.anciens, STATS_TODAY);
    expect(anciens).toMatchObject({ sessions: 0, counts: c(0, 0, 0, 0) });
    expect(anciens?.groups.map((g) => [g.name, g.archived, g.members])).toEqual([
      ['Anciens', true, []],
    ]);
    expect(await repo().report(SEASON, 9999, STATS_TODAY)).toBeNull();
    expect(await repo().report(SEASON, 0, STATS_TODAY)).toBeNull();
  });

  it('EX-32 période et date de création revalidées (RM-04)', async () => {
    await expect(repo().report(SEASON, null, '27/11/2026')).rejects.toThrow();
    await expect(
      repo().report({ ...SEASON, from: '2026-13-01' }, null, STATS_TODAY),
    ).rejects.toThrow();
    await expect(repo().report({ ...SEASON, seasonId: -1 }, null, STATS_TODAY)).rejects.toThrow();
  });

  it('EX-32 période sans séance : rapport valide, « — », groupes sans membres', async () => {
    const r = await repo().report(customPeriod('2026-09-03', '2026-09-08'), null, STATS_TODAY);
    expect(r).toMatchObject({ sessions: 0, counts: c(0, 0, 0, 0) });
    expect(r?.groups.every((g) => g.sessions === 0 && g.members.length === 0)).toBe(true);
  });

  // Fiche 043 : ce test fixe le comportement actuel de RM-03 (repli « un seul groupe » après la
  // suppression d'un groupe de la séance) ; il sera inversé par le ticket 043.
  it('RM-03 Q2 séance à deux groupes dont l’un est supprimé : la présence passe au groupe restant (actuel)', async () => {
    await db.execute('DELETE FROM groups WHERE id = ?', [s.groups.veterans]);
    const r = await repo().report(SEASON, null, STATS_TODAY);
    const benjamins = r?.groups.find((g) => g.groupId === s.groups.benjamins);
    expect(benjamins?.counts).toEqual(c(7, 1, 0, 2));
    expect(benjamins?.members.map((m) => m.lastName)).toContain('Roux');
  });

  it('ABS-03 ni date de naissance, ni contact, ni commentaire de séance dans le HTML', async () => {
    await db.execute('UPDATE members SET birth_date = ? WHERE id = ?', [
      '2016-05-02',
      s.members.hugo,
    ]);
    await db.execute('INSERT INTO emergency_contacts (member_id, label, phone) VALUES (?, ?, ?)', [
      s.members.hugo,
      'Parent fictif',
      '0600000003',
    ]);
    await db.execute('UPDATE sessions SET comment = ? WHERE id = ?', [
      'Commentaire fictif de séance',
      s.poussinsSessions[0] ?? 0,
    ]);
    const r = await repo().report(SEASON, null, STATS_TODAY);
    const doc = reportHtml(r as NonNullable<typeof r>, rapport.report, rapportPalette);
    expect(doc).toContain('Moreau');
    for (const value of ['2016', '02/05', '0600000003', 'Parent fictif', 'Commentaire fictif']) {
      expect(doc).not.toContain(value);
    }
  });
});

describe('NF-08 rapport : 500 membres, 3 saisons', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
  });
  afterEach(async () => {
    await db.close();
  });

  it.each([
    [false, '2026-09-01', 400, 10],
    [true, '2024-09-01', 1200, 30],
  ])(
    'NF-08 deux groupes : %s, une requête et le HTML en moins de 2 s',
    async (twoGroups, from, sessions, groups) => {
      await volumeSeed(db, { twoGroups });
      const counter = counting(db);
      const start = performance.now();
      const r = await reportRepo(counter.db).report(
        customPeriod(from, '2027-07-31'),
        null,
        '2027-07-31',
      );
      const doc = reportHtml(r as NonNullable<typeof r>, rapport.report, rapportPalette);
      const ms = Math.round(performance.now() - start);
      expect(counter.queries).toBe(1);
      expect(r?.sessions).toBe(sessions);
      expect(r?.groups).toHaveLength(groups);
      expect(r?.groups.every((g) => g.members.length === 50)).toBe(true);
      expect(doc.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(2000);
    },
  );
});
