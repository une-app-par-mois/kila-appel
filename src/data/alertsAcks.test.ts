/**
 * @jest-environment node
 */
// Alertes traitées (EX-26) sur vraie base (ADR-008) : masquage, retour, retraitement, cascade.
import { alertsWorld } from '@/__fixtures__/alertsSeed';
import { alertsRepo } from '@/data/alertsRepo';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import type { AttendanceStatus } from '@/domain/validation';

describe('alertsRepo : alertes traitées (EX-26)', () => {
  let db: Db;
  let w: ReturnType<typeof alertsWorld>;
  let season: number;
  let group: number;
  let alix: number;
  let next: number;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    w = alertsWorld(db);
    season = await w.season('Saison 2026-2027', '2026-09-01', '2027-07-31', true);
    group = await w.group(season, 'Poussins');
    alix = await w.member('Exemple', 'Alix');
    await w.enroll(alix, group, '2026-09-01');
    next = 1;
  });
  afterEach(async () => {
    await db.close();
  });

  /** Séances suivantes d'Alix, une par jour de novembre. */
  const record = async (...statuses: AttendanceStatus[]) => {
    for (const status of statuses) {
      await w.session(season, [group], `2026-11-${String(next).padStart(2, '0')}`, '18:00', [
        [alix, status],
      ]);
      next += 1;
    }
  };
  const streaks = async (today: string) =>
    (await alertsRepo(db).list(today, 3)).map((a) => a.streak);
  const acks = () =>
    db.query('SELECT member_id, streak_length, acked_at FROM alert_acks ORDER BY streak_length');

  it('EX-26 traitée à 3 : disparaît ; une 4e absence la fait réapparaître', async () => {
    await record('absent', 'absent', 'absent');
    await alertsRepo(db).acknowledge(alix, 3, '2026-11-05');
    expect(await streaks('2026-11-05')).toEqual([]);
    await record('excused');
    expect(await streaks('2026-11-06')).toEqual([]);
    await record('absent');
    expect(await streaks('2026-11-06')).toEqual([4]);
  });

  it('EX-26 un Présent puis 3 nouvelles absences : l’alerte réapparaît', async () => {
    await record('absent', 'absent', 'absent');
    await alertsRepo(db).acknowledge(alix, 3, '2026-11-03');
    await record('present', 'absent', 'absent', 'absent');
    expect(await streaks('2026-11-08')).toEqual([3]);
  });

  it('EX-26 traitée, revenue, retraitée → masquée (traitement mis à jour sur place)', async () => {
    await record('absent', 'absent', 'absent');
    await alertsRepo(db).acknowledge(alix, 3, '2026-11-03');
    await record('present', 'absent', 'absent', 'absent');
    expect(await streaks('2026-11-08')).toEqual([3]);
    await alertsRepo(db).acknowledge(alix, 3, '2026-11-08');
    expect(await streaks('2026-11-08')).toEqual([]);
    expect(await acks()).toEqual([{ member_id: alix, streak_length: 3, acked_at: '2026-11-08' }]);
  });

  it('EX-26 retraiter avec une date plus ancienne ne recule pas la date de traitement', async () => {
    await record('absent', 'absent', 'absent');
    await alertsRepo(db).acknowledge(alix, 3, '2026-11-20');
    await alertsRepo(db).acknowledge(alix, 3, '2026-11-04');
    expect(await acks()).toEqual([{ member_id: alix, streak_length: 3, acked_at: '2026-11-20' }]);
  });

  it('EX-26 date de traitement : la dernière absence de la série si elle est après aujourd’hui', async () => {
    await record('absent', 'absent', 'absent');
    await alertsRepo(db).acknowledge(alix, 3, '2026-10-30');
    expect(await acks()).toEqual([{ member_id: alix, streak_length: 3, acked_at: '2026-11-03' }]);
    expect(await streaks('2026-10-30')).toEqual([]);
  });

  it('EX-18 une correction d’appel passé recalcule la série au chargement suivant', async () => {
    await record('absent', 'absent', 'absent', 'absent');
    await alertsRepo(db).acknowledge(alix, 4, '2026-11-04');
    await db.execute(
      "UPDATE attendances SET status = 'present' WHERE member_id = ? AND session_id = (SELECT id FROM sessions WHERE date = '2026-11-02')",
      [alix],
    );
    expect(await streaks('2026-11-04')).toEqual([]);
    // La série 3, 4… a commencé avant le traitement : couverte jusqu'à la longueur traitée.
    await record('absent', 'absent');
    expect(await streaks('2026-11-06')).toEqual([]);
    await record('absent');
    expect(await streaks('2026-11-07')).toEqual([5]);
  });

  it('EX-26 risque connu : traité le jour même où commence une nouvelle série, elle reste masquée', async () => {
    // Plusieurs séances le même jour : le traitement est daté du jour, sans heure. Une nouvelle
    // série qui commence ce jour-là, après un Présent, est vue comme couverte tant qu'elle ne
    // dépasse pas la longueur traitée. Limite acceptée (plan point 5 : comparaison de dates).
    await record('absent', 'absent', 'absent');
    await alertsRepo(db).acknowledge(alix, 3, '2026-11-04');
    for (const status of ['present', 'absent', 'absent', 'absent'] as const)
      await w.session(season, [group], '2026-11-04', '18:00', [[alix, status]]);
    expect(await streaks('2026-11-04')).toEqual([]);
    await w.session(season, [group], '2026-11-05', '18:00', [[alix, 'absent']]);
    expect(await streaks('2026-11-05')).toEqual([4]);
  });

  it.each([0, -1, 2.5, Number.NaN])('EX-26 refuse une longueur traitée de %p', async (n) => {
    await record('absent', 'absent', 'absent');
    await expect(alertsRepo(db).acknowledge(alix, n, '2026-11-03')).rejects.toThrow(RangeError);
    expect(await acks()).toEqual([]);
  });

  it('EX-26 refuse une date invalide et un membre inconnu', async () => {
    await expect(alertsRepo(db).acknowledge(alix, 3, '03/11/2026')).rejects.toMatchObject({
      code: 'DATE_INVALID',
    });
    await expect(alertsRepo(db).acknowledge(9999, 3, '2026-11-03')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(await acks()).toEqual([]);
  });

  it('SEC-11 supprimer le membre efface ses alertes traitées', async () => {
    await record('absent', 'absent', 'absent');
    await alertsRepo(db).acknowledge(alix, 3, '2026-11-03');
    await db.execute('DELETE FROM members WHERE id = ?', [alix]);
    expect(await acks()).toEqual([]);
  });
});
