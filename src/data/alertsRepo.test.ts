/**
 * @jest-environment node
 */
// Alertes d'assiduité sur vraie base (ADR-008) : périmètre de la série (RM-02), seuil (EX-25),
// membres concernés (plan point 2), groupe affiché, tri, dernières séances. Zone sensible.
import { alertsWorld } from '@/__fixtures__/alertsSeed';
import { alertsRepo } from '@/data/alertsRepo';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import type { AttendanceStatus } from '@/domain/validation';

const TODAY = '2026-11-27';

describe('alertsRepo : liste des alertes (RM-02, EX-25)', () => {
  let db: Db;
  let w: ReturnType<typeof alertsWorld>;
  let season: number;
  let group: number;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    w = alertsWorld(db);
    season = await w.season('Saison 2026-2027', '2026-09-01', '2027-07-31', true);
    group = await w.group(season, 'Poussins');
  });
  afterEach(async () => {
    await db.close();
  });

  /** Membre inscrit au groupe depuis la rentrée. */
  const enrolled = async (last: string, first: string, g = group) => {
    const id = await w.member(last, first);
    await w.enroll(id, g, '2026-09-01');
    return id;
  };
  /** Une séance par jour de novembre, à partir du 1er, pour un seul membre. */
  const days = async (memberId: number, statuses: AttendanceStatus[], g = group, s = season) => {
    for (const [i, status] of statuses.entries())
      await w.session(s, [g], `2026-11-${String(i + 1).padStart(2, '0')}`, '18:00', [
        [memberId, status],
      ]);
  };
  const list = (threshold = 3) => alertsRepo(db).list(TODAY, threshold);

  it('EX-25 trois absences de suite : alerte ; deux : aucune ; seuil à 5 : aucune', async () => {
    const alix = await enrolled('Exemple', 'Alix');
    const sam = await enrolled('Fictif', 'Sam');
    await days(alix, ['present', 'absent', 'excused', 'absent', 'absent']);
    await days(sam, ['absent', 'present', 'absent', 'absent']);
    expect(await list()).toEqual([
      {
        memberId: alix,
        firstName: 'Alix',
        lastName: 'Exemple',
        groupName: 'Poussins',
        streak: 3,
        start: '2026-11-02',
        end: '2026-11-05',
      },
    ]);
    expect(await list(5)).toEqual([]);
  });

  it('RM-02 deux séances le même jour : ordre de l’heure, puis de l’identifiant', async () => {
    const alix = await enrolled('Exemple', 'Alix');
    await w.session(season, [group], '2026-11-10', '19:00', [[alix, 'present']]);
    await w.session(season, [group], '2026-11-10', '09:00', [[alix, 'absent']]);
    await w.session(season, [group], '2026-11-12', '18:00', [[alix, 'absent']]);
    expect(await list(2)).toEqual([]);
    const sam = await enrolled('Fictif', 'Sam');
    for (const status of ['absent', 'absent', 'present'] as const)
      await w.session(season, [group], '2026-11-20', '18:00', [[sam, status]]);
    expect(await list(2)).toEqual([]);
  });

  it('RM-02 seules les séances enregistrées de la saison active comptent', async () => {
    const old = await w.season('Saison 2025-2026', '2025-09-01', '2026-07-31', false);
    const oldGroup = await w.group(old, 'Benjamins');
    const alix = await enrolled('Exemple', 'Alix');
    await w.enroll(alix, oldGroup, '2025-09-01');
    await w.session(old, [oldGroup], '2026-05-01', '18:00', [[alix, 'absent']]);
    await w.session(old, [oldGroup], '2026-05-02', '18:00', [[alix, 'absent']]);
    await days(alix, ['absent']);
    for (const state of ['prepared', 'cancelled', 'unscheduled'] as const)
      await w.session(season, [group], '2026-11-03', '18:00', [[alix, 'present']], state);
    await w.session(season, [], '2026-11-04', '18:00', [[alix, 'absent']]);
    expect((await list(2)).map((a) => a.streak)).toEqual([2]);
    expect(await list()).toEqual([]);
  });

  it('RM-02 une séance sans présence du membre ne change rien ; séance de groupe archivé comptée', async () => {
    const archived = await w.group(season, 'Ancien groupe', '2026-11-15');
    const alix = await enrolled('Exemple', 'Alix');
    const sam = await enrolled('Fictif', 'Sam');
    await w.enroll(alix, archived, '2026-09-01');
    await w.session(season, [archived], '2026-11-01', '18:00', [[alix, 'absent']]);
    await w.session(season, [group], '2026-11-02', '18:00', [[sam, 'present']]);
    await w.session(season, [group], '2026-11-03', '18:00', [[alix, 'absent']]);
    await w.session(season, [group], '2026-11-04', '18:00', [[alix, 'absent']]);
    expect((await list()).map((a) => [a.memberId, a.streak])).toEqual([[alix, 3]]);
  });

  it('plan point 2 : membre archivé, sans inscription courante ou au seul groupe archivé : aucune alerte', async () => {
    const archivedMember = await w.member('Archivé', 'Lou', '2026-11-20');
    await w.enroll(archivedMember, group, '2026-09-01');
    const ended = await w.member('Parti', 'Noa');
    await w.enroll(ended, group, '2026-09-01', TODAY);
    const future = await w.member('Futur', 'Eli');
    await w.enroll(future, group, '2026-11-28');
    const archivedGroup = await w.group(season, 'Archivé', '2026-11-20');
    const inArchived = await w.member('Groupe', 'Max');
    await w.enroll(inArchived, archivedGroup, '2026-09-01');
    for (const m of [archivedMember, ended, future, inArchived])
      await days(m, ['absent', 'absent', 'absent']);
    expect(await list()).toEqual([]);
  });

  it('aucune saison active : liste vide', async () => {
    const alix = await enrolled('Exemple', 'Alix');
    await days(alix, ['absent', 'absent', 'absent']);
    await db.execute('UPDATE seasons SET is_active = 0');
    expect(await list()).toEqual([]);
  });

  it('tri : série la plus longue, puis nom et prénom sans accent ni casse', async () => {
    const ids = [
      await enrolled('éclair', 'Zoé'),
      await enrolled('Eclair', 'Anna'),
      await enrolled('Durand', 'Léo'),
      await enrolled('Zola', 'Max'),
    ];
    for (const [i, id] of ids.entries())
      await days(
        id,
        i === 3 ? ['absent', 'absent', 'absent', 'absent'] : ['absent', 'absent', 'absent'],
      );
    expect((await list()).map((a) => `${a.lastName} ${a.firstName}`)).toEqual([
      'Zola Max',
      'Durand Léo',
      'Eclair Anna',
      'éclair Zoé',
    ]);
  });

  it('groupe affiché : celui de la séance la plus récente où le membre était inscrit', async () => {
    const benjamins = await w.group(season, 'Benjamins');
    const alix = await enrolled('Exemple', 'Alix');
    await w.enroll(alix, benjamins, '2026-11-01', '2026-11-20');
    await w.session(season, [group], '2026-11-01', '18:00', [[alix, 'absent']]);
    await w.session(season, [benjamins], '2026-11-02', '18:00', [[alix, 'absent']]);
    await w.session(season, [group, benjamins], '2026-11-03', '18:00', [[alix, 'absent']]);
    expect((await list()).map((a) => a.groupName)).toEqual(['Poussins']);
    await w.session(season, [benjamins], '2026-11-04', '18:00', [[alix, 'absent']]);
    expect((await list()).map((a) => a.groupName)).toEqual(['Benjamins']);
  });

  it('groupe affiché : sinon l’unique groupe de la séance, sinon l’inscription courante', async () => {
    const other = await w.group(season, 'Benjamins');
    const third = await w.group(season, 'Minimes');
    const alix = await enrolled('Exemple', 'Alix');
    await days(alix, ['absent', 'absent']);
    await w.session(season, [other], '2026-11-03', '18:00', [[alix, 'absent']]);
    expect((await list()).map((a) => a.groupName)).toEqual(['Benjamins']);
    await w.session(season, [other, third], '2026-11-04', '18:00', [[alix, 'absent']]);
    expect((await list()).map((a) => a.groupName)).toEqual(['Poussins']);
  });

  it('SEC-05 nom avec apostrophe et point-virgule : lu tel quel, rien d’exécuté', async () => {
    const id = await enrolled("O'Brien; DROP TABLE members;--", "Ana'; --");
    await days(id, ['absent', 'absent', 'absent']);
    const [alert] = await list();
    expect(alert).toMatchObject({
      lastName: "O'Brien; DROP TABLE members;--",
      firstName: "Ana'; --",
    });
    expect(await db.query('SELECT count(*) AS n FROM members')).toEqual([{ n: 1 }]);
  });

  it('get : l’alerte d’un membre, ou null s’il n’en a pas', async () => {
    const alix = await enrolled('Exemple', 'Alix');
    const sam = await enrolled('Fictif', 'Sam');
    await days(alix, ['absent', 'absent', 'absent']);
    await days(sam, ['absent', 'absent', 'absent']);
    expect(await alertsRepo(db).get(alix, TODAY, 3)).toMatchObject({ memberId: alix, streak: 3 });
    expect(await alertsRepo(db).get(sam, TODAY, 4)).toBeNull();
    expect(await alertsRepo(db).get(9999, TODAY, 3)).toBeNull();
  });

  it('dernières séances : même périmètre que la série, 6 au plus, la plus récente d’abord', async () => {
    const old = await w.season('Saison 2025-2026', '2025-09-01', '2026-07-31', false);
    const oldGroup = await w.group(old, 'Benjamins');
    const alix = await enrolled('Exemple', 'Alix');
    await w.session(old, [oldGroup], '2026-05-01', '18:00', [[alix, 'absent']]);
    await days(alix, ['present', 'late', 'absent', 'excused', 'absent', 'absent', 'absent']);
    await w.session(season, [group], '2026-11-08', '18:00', [[alix, 'present']], 'prepared');
    const recent = await alertsRepo(db).recentStatuses(alix);
    expect(recent.map((r) => [r.date, r.status])).toEqual([
      ['2026-11-07', 'absent'],
      ['2026-11-06', 'absent'],
      ['2026-11-05', 'absent'],
      ['2026-11-04', 'excused'],
      ['2026-11-03', 'absent'],
      ['2026-11-02', 'late'],
    ]);
    expect(recent[0]).toEqual({
      sessionId: expect.any(Number),
      date: '2026-11-07',
      startTime: '18:00',
      status: 'absent',
    });
  });
});
