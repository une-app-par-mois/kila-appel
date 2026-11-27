// Taux de présence (RM-01, EX-27) : règle, arrondi affiché et parts de la barre par statut.
// Domaine pur, calcul en nombres entiers : aucun arrondi de virgule flottante ne déplace un taux.
import type { AttendanceStatus } from '@/domain/validation';

export type StatusCounts = Record<AttendanceStatus, number>;

/** RM-01 : Présent + Retard sur Présent + Retard + Absent ; gardé en fraction exacte. */
export type Rate = { attended: number; counted: number };

/** Ordre de la barre et de la légende (maquette « Statistiques ») : Présent, Retard, Excusé, Absent. */
export const SHARE_ORDER: readonly AttendanceStatus[] = ['present', 'late', 'excused', 'absent'];

const checkCounts = (counts: StatusCounts): void => {
  for (const status of SHARE_ORDER) {
    const n = counts[status];
    if (!Number.isInteger(n) || n < 0) throw new Error('Compte de présences invalide (RM-01)');
  }
};

/** RM-01 : Excusé n'entre pas dans le calcul ; `null` sans dénominateur (affiché « — », jamais 0 %). */
export const attendanceRate = (counts: StatusCounts): Rate | null => {
  checkCounts(counts);
  const attended = counts.present + counts.late;
  const counted = attended + counts.absent;
  return counted === 0 ? null : { attended, counted };
};

/**
 * RM-01 (plan validé le 2026-11-27, point 6) : pourcentage entier, la moitié vers le haut ;
 * « 100 % » et « 0 % » seulement pour des valeurs exactes (99,5 → 99, 0,4 → 1).
 */
export const ratePercent = ({ attended, counted }: Rate): number => {
  const rounded = Math.floor((200 * attended + counted) / (2 * counted));
  if (rounded === 100 && attended < counted) return 99;
  if (rounded === 0 && attended > 0) return 1;
  return rounded;
};

/** RM-01 : « 64 % » (espace insécable), « — » sans taux. */
export const formatRate = (rate: Rate | null): string =>
  rate === null ? '—' : `${ratePercent(rate)} %`;

/**
 * EX-27 : parts entières de la barre sur les 4 statuts, total 100 (plus forts restes). À reste égal,
 * le statut le plus nombreux l'emporte, puis l'ordre de la barre. Aucune présence : toutes à 0.
 */
export const statusShares = (counts: StatusCounts): StatusCounts => {
  checkCounts(counts);
  const total = SHARE_ORDER.reduce((sum, status) => sum + counts[status], 0);
  const shares: StatusCounts = { present: 0, late: 0, excused: 0, absent: 0 };
  if (total === 0) return shares;
  for (const status of SHARE_ORDER) shares[status] = Math.floor((100 * counts[status]) / total);
  const remainder = (status: AttendanceStatus) => (100 * counts[status]) % total;
  const byRemainder = [...SHARE_ORDER].sort(
    (a, b) =>
      remainder(b) - remainder(a) ||
      counts[b] - counts[a] ||
      SHARE_ORDER.indexOf(a) - SHARE_ORDER.indexOf(b),
  );
  let missing = 100 - SHARE_ORDER.reduce((sum, status) => sum + shares[status], 0);
  for (const status of byRemainder) {
    if (missing === 0) break;
    shares[status] += 1;
    missing -= 1;
  }
  return shares;
};
