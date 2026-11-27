// Sauvegardes fictives des parcours de bout en bout (tickets 016 et 030) : produites à chaque
// lancement de `scripts/e2e.sh` par `scripts/e2e/sauvegarde-fictive.mjs`, jamais versionnées
// (SEC-13). Toutes passent par l'export (EX-19) : ce sont de vraies sauvegardes de l'appli. Une par
// parcours : jalon 1 (`sauvegarde-restauration.yaml`), alerte (`alerte-traitee.yaml`), statistiques
// du 023 (`statistiques.yaml`) et volume de NF-08 (`volume-nf08.yaml`). Données fictives seulement.

import { join } from 'node:path';
import { statsSeed, volumeSeed } from '@/__fixtures__/statsSeed';
import { exportBackup } from '@/data/backup';
import type { Db } from '@/data/db';
import { groupsRepo } from '@/data/groupsRepo';
import { membersRepo } from '@/data/membersRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { seasonsRepo } from '@/data/seasonsRepo';
import { sessionsRepo } from '@/data/sessionsRepo';
import { previousDay, startInSeason } from '@/domain/formats';
import { firstSeason } from '@/domain/seasons';
import type { AttendanceStatus } from '@/domain/validation';

/** Noms des fichiers déposés dans Téléchargements, un par parcours. */
export const E2E_FILES = {
  milestone1: 'kila-e2e-sauvegarde-fictive.db',
  alerts: 'kila-e2e-alertes.db',
  stats: 'kila-e2e-statistiques.db',
  volume: 'kila-e2e-volume.db',
} as const;

type SmallBackup = {
  groups: { name: string; members: string[] }[];
  /** Groupe (indice), jours avant aujourd'hui, statuts dans l'ordre des membres du groupe. */
  sessions: { group: number; daysAgo: number; statuses: AttendanceStatus[] }[];
};

/** Ce que le parcours du jalon 1 retrouve à l'écran après la restauration. */
export const E2E_BACKUP: SmallBackup = {
  groups: [
    { name: 'Poussins mercredi', members: ['Alix Exemple', 'Sam Fictif', 'Lou Modèle'] },
    { name: 'Benjamins samedi', members: ['Noa Essai', 'Eden Témoin'] },
  ],
  sessions: [
    { group: 0, daysAgo: 7, statuses: ['present', 'present', 'late'] },
    { group: 1, daysAgo: 10, statuses: ['present', 'absent'] },
    { group: 0, daysAgo: 14, statuses: ['present', 'excused', 'absent'] },
  ],
};

/**
 * Alerte (ticket 030, EX-25) : Rémi Exemple absent à J-14, J-10 et J-7, soit 3 absences non
 * excusées de suite, le seuil par défaut ; Inès Fictif toujours présente.
 */
export const ALERTS_BACKUP: SmallBackup = {
  groups: [{ name: 'Minimes jeudi', members: ['Rémi Exemple', 'Inès Fictif'] }],
  sessions: [14, 10, 7].map((daysAgo) => ({
    group: 0,
    daysAgo,
    statuses: ['absent', 'present'] as AttendanceStatus[],
  })),
};

/**
 * Jours de l'appareil où le jeu du 023 garde ses taux sur la période « Saison » : de sa dernière
 * séance (25/11/2026) à la fin de sa saison (31/07/2027).
 */
export const STATS_DAYS = { first: '2026-11-25', last: '2027-07-31' } as const;

/** Jour de l'appareil où les taux du jeu du 023 tiennent (période « Saison »). */
export const isStatsDay = (today: string) => today >= STATS_DAYS.first && today <= STATS_DAYS.last;

const checkStatsDay = (today: string) => {
  if (!isStatsDay(today))
    throw new Error(
      `Jour de l'appareil ${today} hors du jeu des statistiques (du ${STATS_DAYS.first} au ${STATS_DAYS.last}) : ` +
        'régler la date de l’émulateur.',
    );
};

const daysBefore = (iso: string, n: number) =>
  Array.from({ length: n }).reduce<string>((day) => previousDay(day), iso);

/**
 * Saison qui contient `today`. En juillet et en août, Bienvenue prépare déjà la saison de
 * septembre : la sauvegarde prend alors celle qui se termine, pour que ses appels soient passés.
 */
export const seasonContaining = (today: string) => {
  const next = firstSeason(today);
  if (next.startDate <= today) return next;
  const start = Number(next.startDate.slice(0, 4)) - 1;
  return {
    name: `${start}-${start + 1}`,
    startDate: `${start}-09-01`,
    endDate: `${start + 1}-08-31`,
  };
};

/** Base neuve remplie par `fill`, exportée dans `path` (fichier neuf), datée de `today`. */
const writeBackup = async (path: string, today: string, fill: (db: Db) => Promise<unknown>) => {
  const db = await prepareDatabase(openNodeDb());
  try {
    await fill(db);
    await exportBackup(db, path, today);
  } finally {
    await db.close();
  }
};

/** Petit jeu passé par les dépôts de l'appli, dans la saison qui contient `today`. */
const fillSmall = (data: SmallBackup, today: string) => async (db: Db) => {
  const season = seasonContaining(today);
  await seasonsRepo(db).createFirst(season);
  const active = await seasonsRepo(db).getActive();
  if (active === null) throw new Error('Saison fictive absente');
  const groups = [];
  for (const group of data.groups) {
    const id = await groupsRepo(db).create(active.id, group.name);
    const members = [];
    for (const fullName of group.members) {
      const [firstName = '', lastName = ''] = fullName.split(' ');
      members.push(
        await membersRepo(db).create(
          { firstName, lastName, birthDate: null },
          { groupId: id, today, startDate: season.startDate },
        ),
      );
    }
    groups.push({ id, members });
  }
  for (const session of data.sessions) {
    const group = groups[session.group];
    if (!group) throw new Error('Groupe fictif absent');
    await sessionsRepo(db, today).record({
      slotId: null,
      groupId: group.id,
      // Jamais avant le début de la saison (lancement en tout début de saison).
      date: startInSeason(daysBefore(today, session.daysAgo), season),
      startTime: '18:00',
      statuses: group.members.map((memberId, i) => ({
        memberId,
        status: session.statuses[i] ?? 'present',
      })),
      comment: null,
    });
  }
};

/** Sauvegarde du jalon 1 dans `path` (fichier neuf), datée de `today` (AAAA-MM-JJ). */
export const writeE2eBackup = (path: string, today: string) =>
  writeBackup(path, today, fillSmall(E2E_BACKUP, today));

/** Sauvegarde de l'alerte (ticket 030). */
export const writeAlertsBackup = (path: string, today: string) =>
  writeBackup(path, today, fillSmall(ALERTS_BACKUP, today));

/** Sauvegarde du jeu du 023 tel quel ; refusée hors de `STATS_DAYS`. */
export const writeStatsBackup = async (path: string, today: string) => {
  checkStatsDay(today);
  await writeBackup(path, today, statsSeed);
};

/**
 * Sauvegarde de NF-08 : `volumeSeed` (500 membres, 3 saisons), sans aucune séance après `today`
 * (l'appli n'en enregistre jamais) : la mesure ne dépend pas de la date au-delà du volume réel.
 */
export const writeVolumeBackup = (path: string, today: string) =>
  writeBackup(path, today, async (db) => {
    await volumeSeed(db);
    const later = 'SELECT id FROM sessions WHERE date > ?';
    await db.execute(`DELETE FROM attendances WHERE session_id IN (${later})`, [today]);
    await db.execute(`DELETE FROM session_groups WHERE session_id IN (${later})`, [today]);
    await db.execute('DELETE FROM sessions WHERE date > ?', [today]);
  });

/**
 * Les sauvegardes de la campagne dans `dir`, rend les noms écrits. Hors de `STATS_DAYS`, celle
 * des statistiques n'est pas écrite (scripts/e2e.sh ne joue alors pas `statistiques.yaml`) ; les
 * autres le sont à n'importe quelle date.
 */
export const writeE2eBackups = async (dir: string, today: string): Promise<string[]> => {
  const written: string[] = [];
  const write = async (name: string, writer: (path: string, today: string) => Promise<void>) => {
    await writer(join(dir, name), today);
    written.push(name);
  };
  await write(E2E_FILES.milestone1, writeE2eBackup);
  await write(E2E_FILES.alerts, writeAlertsBackup);
  if (isStatsDay(today)) await write(E2E_FILES.stats, writeStatsBackup);
  await write(E2E_FILES.volume, writeVolumeBackup);
  return written;
};
