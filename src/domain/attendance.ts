// Présences de l'appel (EX-10, EX-11) : cycle des statuts, compteur, recherche d'un membre.
import { foldText } from '@/domain/formats';
import type { AttendanceStatus } from '@/domain/validation';

/** EX-10 : Présent → Absent → Retard → Excusé → Présent (Absent en 1 appui, Retard en 2). */
export const STATUS_CYCLE: readonly AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

export const nextStatus = (status: AttendanceStatus): AttendanceStatus =>
  STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length] ?? 'present';

/** EX-10 : nombre de membres par statut, zéro compris. */
export const countStatuses = (statuses: AttendanceStatus[]): Record<AttendanceStatus, number> => {
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const status of statuses) counts[status] += 1;
  return counts;
};

/** EX-11 : la recherche apparaît « au-delà de 20 membres ». */
export const SEARCH_FROM = 21;

/** EX-11 : prénom puis nom, ou nom puis prénom, contient la saisie, sans accent ni casse. */
export const matchesName = (
  query: string,
  member: { firstName: string; lastName: string },
): boolean => {
  const wanted = foldText(query.trim());
  return (
    foldText(`${member.firstName} ${member.lastName}`).includes(wanted) ||
    foldText(`${member.lastName} ${member.firstName}`).includes(wanted)
  );
};
