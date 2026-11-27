// Sauvegarde fictive des parcours de bout en bout (ticket 016) : produite à chaque lancement de
// `scripts/e2e.sh` par `scripts/e2e/sauvegarde-fictive.mjs`, jamais versionnée (SEC-13). Elle passe
// par les dépôts de l'appli, puis par l'export (EX-19) : c'est une vraie sauvegarde de l'appli.
// Données fictives seulement ; le parcours `.maestro/sauvegarde-restauration.yaml` les vérifie.

import { exportBackup } from '@/data/backup';
import { groupsRepo } from '@/data/groupsRepo';
import { membersRepo } from '@/data/membersRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { seasonsRepo } from '@/data/seasonsRepo';
import { sessionsRepo } from '@/data/sessionsRepo';
import { previousDay, startInSeason } from '@/domain/formats';
import { firstSeason } from '@/domain/seasons';
import type { AttendanceStatus } from '@/domain/validation';

/** Ce que le parcours retrouve à l'écran après la restauration. */
export const E2E_BACKUP = {
  groups: [
    { name: 'Poussins mercredi', members: ['Alix Exemple', 'Sam Fictif', 'Lou Modèle'] },
    { name: 'Benjamins samedi', members: ['Noa Essai', 'Eden Témoin'] },
  ],
  /** Groupe (indice), jours avant aujourd'hui, statuts dans l'ordre des membres du groupe. */
  sessions: [
    { group: 0, daysAgo: 7, statuses: ['present', 'present', 'late'] },
    { group: 1, daysAgo: 10, statuses: ['present', 'absent'] },
    { group: 0, daysAgo: 14, statuses: ['present', 'excused', 'absent'] },
  ] as { group: number; daysAgo: number; statuses: AttendanceStatus[] }[],
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

/** Écrit la sauvegarde fictive dans `path` (fichier neuf), datée de `today` (AAAA-MM-JJ). */
export const writeE2eBackup = async (path: string, today: string): Promise<void> => {
  const db = await prepareDatabase(openNodeDb());
  try {
    const season = seasonContaining(today);
    await seasonsRepo(db).createFirst(season);
    const active = await seasonsRepo(db).getActive();
    if (active === null) throw new Error('Saison fictive absente');
    const groups = [];
    for (const group of E2E_BACKUP.groups) {
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
    for (const session of E2E_BACKUP.sessions) {
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
    await exportBackup(db, path, today);
  } finally {
    await db.close();
  }
};
