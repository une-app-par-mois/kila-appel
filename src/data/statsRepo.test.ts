/**
 * @jest-environment node
 */
// Statistiques (ticket 023, EX-27, RM-01, RM-03) sur le jeu fictif vérifié à la main
// (`statsSeed.ts`, tableaux en tête du fichier). Taux attendus écrits en clair.
import { STATS_TODAY, type StatsSeeded, statsSeed, volumeSeed } from '@/__fixtures__/statsSeed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { statsRepo } from '@/data/statsRepo';
import { attendanceRate, formatRate, type StatusCounts } from '@/domain/attendanceRate';
import { customPeriod, monthPeriod, seasonPeriod } from '@/domain/statsPeriod';

const SEASON = seasonPeriod({ startDate: '2026-09-01', endDate: '2027-07-31' }, STATS_TODAY);
const MONTH = monthPeriod(STATS_TODAY);
const MARCH = customPeriod('2026-03-01', '2026-03-31');
const c = (present: number, late: number, excused: number, absent: number): StatusCounts => ({
  present,
  late,
  excused,
  absent,
});
const rate = (counts: StatusCounts) => formatRate(attendanceRate(counts));

describe('Statistiques (EX-27, RM-01, RM-03)', () => {
  let db: Db;
  let s: StatsSeeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await statsSeed(db);
  });
  afterEach(async () => {
    await db.close();
  });
  const repo = () => statsRepo(db);

  it('EX-27 RM-01 synthèse de la saison : 21 séances, 45 P, 2 R, 3 E, 7 A → 47/54 = « 87 % »', async () => {
    const o = await repo().overview(SEASON);
    expect(o.anyRecorded).toBe(true);
    expect(o.sessions).toBe(21);
    expect(o.counts).toEqual(c(45, 2, 3, 7));
    expect(rate(o.counts)).toBe('87 %');
  });

  it('EX-27 RM-01 par groupe sur la saison : actifs triés par nom, puis archivés ; « — » sans séance', async () => {
    const { groups } = await repo().overview(SEASON);
    expect(groups).toEqual([
      {
        groupId: s.groups.adultes,
        name: 'Adultes',
        archived: false,
        sessions: 0,
        counts: c(0, 0, 0, 0),
      },
      {
        groupId: s.groups.benjamins,
        name: 'Benjamins',
        archived: false,
        sessions: 7,
        counts: c(7, 0, 0, 2),
      },
      {
        groupId: s.groups.poussins,
        name: 'Poussins',
        archived: false,
        sessions: 13,
        counts: c(37, 1, 3, 5),
      },
      {
        groupId: s.groups.veterans,
        name: 'Vétérans',
        archived: true,
        sessions: 1,
        counts: c(0, 1, 0, 0),
      },
    ]);
    expect(groups.map((g) => rate(g.counts))).toEqual(['—', '78 %', '88 %', '100 %']);
  });

  it('EX-27 RM-01 « Ce mois » : synthèse 9 séances, 11/15 = « 73 % » ; groupe archivé sans séance absent', async () => {
    const o = await repo().overview(MONTH);
    expect(o.sessions).toBe(9);
    expect(o.counts).toEqual(c(11, 0, 2, 4));
    expect(rate(o.counts)).toBe('73 %');
    expect(o.groups.map((g) => [g.name, g.sessions, rate(g.counts)])).toEqual([
      ['Adultes', 0, '—'],
      ['Benjamins', 4, '75 %'],
      ['Poussins', 4, '70 %'],
    ]);
  });

  it('EX-27 EX-02 dates libres sur l’ancienne saison : son groupe listé « Archivé »', async () => {
    const o = await repo().overview(MARCH);
    expect(o.sessions).toBe(1);
    expect(o.counts).toEqual(c(1, 0, 0, 1));
    expect(o.groups.map((g) => [g.name, g.archived, g.sessions])).toEqual([
      ['Adultes', false, 0],
      ['Benjamins', false, 0],
      ['Poussins', false, 0],
      ['Anciens', true, 1],
    ]);
  });

  it('EX-27 bornes comprises : séance du premier et du dernier jour de la période', async () => {
    expect((await repo().overview(customPeriod('2026-09-02', '2026-09-02'))).sessions).toBe(1);
    expect((await repo().overview(customPeriod('2026-11-25', '2026-11-25'))).sessions).toBe(1);
    expect((await repo().overview(customPeriod('2026-09-03', '2026-09-08'))).sessions).toBe(0);
  });

  it('EX-27 seules les séances enregistrées comptent (préparée, annulée, non planifiée : jamais)', async () => {
    await db.execute("UPDATE sessions SET state = 'unscheduled' WHERE date = '2026-11-06'");
    const o = await repo().overview(customPeriod('2026-11-06', '2026-11-20'));
    // Poussins 11/11 et 18/11, Benjamins 09/11 et 16/11 ; ni le 06/11, ni le 13/11, ni le 20/11.
    expect(o.sessions).toBe(4);
    expect(o.counts).toEqual(c(6, 0, 1, 2));
  });

  it('EX-27 état vide : aucune séance enregistrée, toutes périodes confondues', async () => {
    await db.execute("UPDATE sessions SET state = 'cancelled'");
    const o = await repo().overview(SEASON);
    expect(o).toMatchObject({ anyRecorded: false, sessions: 0, counts: c(0, 0, 0, 0) });
    expect(rate(o.counts)).toBe('—');
  });

  it('EX-27 RM-01 membres de Poussins sur la saison : triés par nom, archivé avec présence listé', async () => {
    const g = await repo().group(s.groups.poussins, SEASON);
    expect(g).toMatchObject({
      groupId: s.groups.poussins,
      name: 'Poussins',
      archived: false,
      sessions: 13,
    });
    expect(g?.members.map((m) => [m.lastName, m.firstName, m.archived, rate(m.counts)])).toEqual([
      ['Blanc', 'Zoé', false, '100 %'],
      ['Durand', 'Emma', false, '—'],
      ['Lefebvre', 'Jules', true, '92 %'],
      ['Michel', 'Léa', false, '100 %'],
      ['Moreau', 'Hugo', false, '64 %'],
    ]);
    expect(g?.members.find((m) => m.memberId === s.members.hugo)?.counts).toEqual(c(6, 1, 1, 4));
  });

  it('EX-27 membres sur « Ce mois » : inscription qui recoupe la période seulement', async () => {
    const g = await repo().group(s.groups.poussins, MONTH);
    expect(g?.members.map((m) => m.firstName)).toEqual(['Zoé', 'Emma', 'Jules', 'Hugo']);
  });

  it('RM-03 cas de secours : présence sans inscription, séance d’un seul groupe → membre listé', async () => {
    const g = await repo().group(s.groups.benjamins, SEASON);
    expect(g?.sessions).toBe(7);
    expect(g?.members.map((m) => [m.firstName, m.counts])).toEqual([
      ['Nour', c(1, 0, 0, 1)],
      ['Léa', c(6, 0, 0, 1)],
    ]);
  });

  it('RM-03 séance de deux groupes : la présence compte pour le groupe d’inscription seulement', async () => {
    const v = await repo().group(s.groups.veterans, SEASON);
    expect(v?.archived).toBe(true);
    expect(v?.members.map((m) => [m.firstName, m.counts])).toEqual([['Paul', c(0, 1, 0, 0)]]);
  });

  it('EX-27 groupe sans membre ni séance, groupe introuvable', async () => {
    expect(await repo().group(s.groups.adultes, SEASON)).toEqual({
      groupId: s.groups.adultes,
      name: 'Adultes',
      archived: false,
      sessions: 0,
      members: [],
    });
    expect(await repo().group(9999, SEASON)).toBeNull();
    expect(await repo().group(0, SEASON)).toBeNull();
  });

  it('EX-27 RM-01 séance par séance de Hugo : 13 cases, de la plus ancienne à la plus récente', async () => {
    const m = await repo().member(s.members.hugo, s.groups.poussins, SEASON);
    expect(m).toMatchObject({
      memberId: s.members.hugo,
      firstName: 'Hugo',
      lastName: 'Moreau',
      archived: false,
      groupName: 'Poussins',
      groupArchived: false,
      counts: c(6, 1, 1, 4),
    });
    expect(m?.sessions.map((x) => x.status ?? (x.enrolled ? 'vide' : 'hors'))).toEqual([
      ...['present', 'present', 'late', 'present', 'excused', 'present', 'present', 'present'],
      ...['absent', 'absent', 'absent', 'absent', 'hors'],
    ]);
    const dates = m?.sessions.map((x) => x.date) ?? [];
    expect(dates).toEqual([...dates].sort());
  });

  it('RM-03 Léa passe de Poussins à Benjamins : chaque groupe selon la date de la séance', async () => {
    const p = await repo().member(s.members.lea, s.groups.poussins, SEASON);
    expect(p?.counts).toEqual(c(7, 0, 0, 0));
    expect(p?.sessions.filter((x) => x.enrolled)).toHaveLength(7);
    const b = await repo().member(s.members.lea, s.groups.benjamins, SEASON);
    expect(b?.counts).toEqual(c(6, 0, 0, 1));
    expect(b?.sessions.every((x) => x.enrolled)).toBe(true);
  });

  it('EX-27 inscrite sans statut (`status` nul, `enrolled`) ; cas de secours (statut, hors inscription)', async () => {
    const emma = await repo().member(s.members.emma, s.groups.poussins, SEASON);
    expect(emma?.sessions.slice(9).map((x) => [x.date, x.status, x.enrolled])).toEqual([
      ['2026-11-04', null, false],
      ['2026-11-11', null, true],
      ['2026-11-18', 'excused', true],
      ['2026-11-25', 'excused', true],
    ]);
    const nour = await repo().member(s.members.nour, s.groups.benjamins, SEASON);
    expect(nour?.sessions.slice(0, 3).map((x) => [x.startTime, x.status, x.enrolled])).toEqual([
      ['17:00', 'absent', true],
      ['10:00', null, false],
      ['17:00', 'present', false],
    ]);
    const paul = await repo().member(s.members.paul, s.groups.benjamins, SEASON);
    expect(paul?.sessions[1]).toMatchObject({ status: null, enrolled: false });
  });

  it('EX-27 membre ou groupe introuvable', async () => {
    expect(await repo().member(9999, s.groups.poussins, SEASON)).toBeNull();
    expect(await repo().member(s.members.hugo, 9999, SEASON)).toBeNull();
    expect(await repo().member(-1, s.groups.poussins, SEASON)).toBeNull();
  });

  it('SEC-05 RM-04 période invalide refusée avant toute requête', async () => {
    const bad = { kind: 'custom' as const, from: '2026-12-01', to: '2026-11-01' };
    await expect(repo().overview(bad)).rejects.toMatchObject({ code: 'END_BEFORE_START' });
    const injected = { kind: 'custom' as const, from: "2026-01-01' OR 1=1 --", to: '2026-12-31' };
    await expect(repo().group(s.groups.poussins, injected)).rejects.toMatchObject({
      code: 'DATE_INVALID',
    });
  });
});

describe('NF-08 volume : 500 membres, 3 saisons', () => {
  it('NF-08 chaque écran en une requête, durée mesurée', async () => {
    const db = await prepareDatabase(openNodeDb());
    const { groupId, memberId } = await volumeSeed(db);
    let queries = 0;
    const counted: Db = {
      ...db,
      query: (sql, params) => {
        queries += 1;
        return db.query(sql, params);
      },
    };
    const period = customPeriod('2026-09-01', '2027-07-31');
    const screens = [
      () => statsRepo(counted).overview(period),
      () => statsRepo(counted).group(groupId, period),
      () => statsRepo(counted).member(memberId, groupId, period),
    ];
    const results = [];
    for (const screen of screens) {
      queries = 0;
      const start = Date.now();
      results.push(await screen());
      expect(Date.now() - start).toBeLessThan(2000);
      expect(queries).toBe(1);
    }
    const [overview] = results as [Awaited<ReturnType<ReturnType<typeof statsRepo>['overview']>>];
    expect(overview.sessions).toBe(400);
    expect(overview.groups).toHaveLength(10);
    await db.close();
  });
});
