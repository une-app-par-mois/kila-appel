/**
 * @jest-environment node
 */
// Ticket 030 : sauvegardes fictives de la campagne du jalon 2, une par parcours, écrites par
// `scripts/e2e.sh` à chaque lancement (SEC-13 : aucun .db dans le dépôt ; données fictives).
// Chacune doit passer verifyBackup (EX-20, SEC-10), avec le résumé et les chiffres que les
// parcours Maestro vérifient à l'écran : série de l'alerte (EX-25), taux du 023 (EX-27, RM-01),
// volume de NF-08.
import { readdirSync } from 'node:fs';
import { nodeFiles, openNode, tempDir } from '@/__fixtures__/backupFiles';
import {
  ALERTS_BACKUP,
  E2E_FILES,
  STATS_DAYS,
  writeAlertsBackup,
  writeE2eBackups,
  writeStatsBackup,
  writeVolumeBackup,
} from '@/__fixtures__/e2eBackup';
import { alertsRepo } from '@/data/alertsRepo';
import { verifyBackup } from '@/data/backupCheck';
import { openNodeDb } from '@/data/nodeDb';
import { ALERT_THRESHOLD_DEFAULT } from '@/data/settingsRepo';
import { statsRepo } from '@/data/statsRepo';
import { attendanceRate, formatRate, NBSP } from '@/domain/attendanceRate';
import { seasonPeriod } from '@/domain/statsPeriod';

jest.mock('@/data/log', () => ({ log: jest.fn() }));

const pct = (n: number) => `${n}${NBSP}%`;

describe('030 sauvegardes fictives de la campagne du jalon 2', () => {
  let dir: ReturnType<typeof tempDir>;
  beforeEach(() => {
    dir = tempDir();
  });
  afterEach(() => dir.remove());

  const verify = (path: string, today: string) =>
    verifyBackup(path, dir.path('verif.db'), { files: nodeFiles, open: openNode, today });

  describe('EX-25 alerte : un membre à 3 absences de suite', () => {
    it('passe verifyBackup, avec un groupe, deux membres et trois séances', async () => {
      const path = dir.path('alertes.db');
      await writeAlertsBackup(path, '2026-11-27');
      const result = await verify(path, '2026-11-27');
      expect(result.ok && result.backup.summary).toEqual({
        members: 2,
        groups: 1,
        recordedSessions: 3,
        backupDate: '2026-11-27',
      });
    });

    it('EX-25 au seuil par défaut, le membre a une alerte de 3 absences, et lui seul', async () => {
      const path = dir.path('alertes.db');
      await writeAlertsBackup(path, '2026-11-27');
      const db = openNodeDb(path);
      const alerts = await alertsRepo(db).list('2026-11-27', ALERT_THRESHOLD_DEFAULT);
      const dates = await db.query<{ date: string }>('SELECT date FROM sessions ORDER BY date');
      await db.close();
      expect(ALERT_THRESHOLD_DEFAULT).toBe(3);
      expect(alerts.map((a) => [a.firstName, a.lastName, a.groupName, a.streak])).toEqual([
        ['Rémi', 'Exemple', ALERTS_BACKUP.groups[0]?.name, 3],
      ]);
      // J-14, J-10, J-7 par rapport au jour de l'appareil.
      expect(dates.map((d) => d.date)).toEqual(['2026-11-13', '2026-11-17', '2026-11-20']);
    });
  });

  describe('EX-27 RM-01 statistiques : le jeu du 023 tel quel', () => {
    it.each([STATS_DAYS.first, '2026-11-27', STATS_DAYS.last])(
      'le %s, taux de la saison 87 %%, Poussins 88 %%, Benjamins 78 %%, Hugo Moreau 64 %%',
      async (today) => {
        const path = dir.path('stats.db');
        await writeStatsBackup(path, today);
        const result = await verify(path, today);
        expect(result.ok && result.backup.summary).toEqual({
          members: 8,
          groups: 5,
          recordedSessions: 22,
          backupDate: today,
        });
        const db = openNodeDb(path);
        const [season] = await db.query<{ id: number; startDate: string; endDate: string }>(
          'SELECT id, start_date AS startDate, end_date AS endDate FROM seasons WHERE is_active = 1',
        );
        if (!season) throw new Error('saison active absente');
        const period = seasonPeriod(season, today);
        const overview = await statsRepo(db).overview(period);
        const rate = (name: string) => {
          const found = overview.groups.find((g) => g.name === name);
          return found ? formatRate(attendanceRate(found.counts)) : null;
        };
        const poussins = overview.groups.find((g) => g.name === 'Poussins');
        const group = await statsRepo(db).group(poussins?.groupId ?? 0, period);
        const hugo = group?.members.find((m) => m.firstName === 'Hugo');
        await db.close();
        expect(formatRate(attendanceRate(overview.counts))).toBe(pct(87));
        expect(rate('Poussins')).toBe(pct(88));
        expect(rate('Benjamins')).toBe(pct(78));
        expect(hugo && [hugo.lastName, formatRate(attendanceRate(hugo.counts))]).toEqual([
          'Moreau',
          pct(64),
        ]);
      },
    );

    it.each(['2026-11-24', '2027-08-01'])(
      'le %s, hors du jeu du 023 : refus clair, aucun fichier',
      async (today) => {
        const path = dir.path('stats.db');
        await expect(writeStatsBackup(path, today)).rejects.toThrow(
          `Jour de l'appareil ${today} hors du jeu des statistiques (du 2026-11-25 au 2027-07-31)`,
        );
        expect(readdirSync(dir.path('.'))).toEqual([]);
      },
    );
  });

  it('NF-08 volume : 500 membres, 30 groupes (3 saisons), 1 200 séances, accepté', async () => {
    const path = dir.path('volume.db');
    await writeVolumeBackup(path, '2026-11-27');
    const result = await verify(path, '2026-11-27');
    expect(result.ok && result.backup.summary).toEqual({
      members: 500,
      groups: 30,
      recordedSessions: 1200,
      backupDate: '2026-11-27',
    });
  });

  it('écrit les quatre sauvegardes de la campagne, jalon 1 compris, sous leurs noms', async () => {
    await writeE2eBackups(dir.path('.'), '2026-11-27');
    expect(readdirSync(dir.path('.')).sort()).toEqual(Object.values(E2E_FILES).sort());
    expect(E2E_FILES.milestone1).toBe('kila-e2e-sauvegarde-fictive.db');
  });

  it('hors du jeu du 023, n’écrit aucune des quatre sauvegardes', async () => {
    await expect(writeE2eBackups(dir.path('.'), '2026-11-20')).rejects.toThrow(/hors du jeu/);
    expect(readdirSync(dir.path('.'))).toEqual([]);
  });
});
