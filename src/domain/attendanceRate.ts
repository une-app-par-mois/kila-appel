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
  if (!Number.isInteger(attended) || !Number.isInteger(counted) || counted <= 0)
    throw new Error('Taux invalide (RM-01)');
  if (attended < 0 || attended > counted) throw new Error('Taux invalide (RM-01)');
  const rounded = Math.floor((200 * attended + counted) / (2 * counted));
  if (rounded === 100 && attended < counted) return 99;
  if (rounded === 0 && attended > 0) return 1;
  return rounded;
};

/** Espace insécable avant « % » : le taux ne se coupe jamais en fin de ligne. */
export const NBSP = '\u00a0';

/** RM-01 : « 64 % » (espace insécable `NBSP`), « — » sans taux. */
export const formatRate = (rate: Rate | null): string =>
  rate === null ? '—' : `${ratePercent(rate)}${NBSP}%`;

/** Ordre de préférence à égalité : le statut le plus nombreux, puis l'ordre de la barre. */
const tieBreak = (counts: StatusCounts) => (a: AttendanceStatus, b: AttendanceStatus) =>
  counts[b] - counts[a] || SHARE_ORDER.indexOf(a) - SHARE_ORDER.indexOf(b);

/**
 * EX-27 : parts entières de la barre sur les 4 statuts, total 100 (plus forts restes, égalité
 * départagée par `tieBreak`). Tout statut non nul garde au moins 1 point, pris sur la plus grande
 * part (un absent sur 300 se voit). Aucune présence : toutes à 0.
 */
export const statusShares = (counts: StatusCounts): StatusCounts => {
  checkCounts(counts);
  const total = SHARE_ORDER.reduce((sum, status) => sum + counts[status], 0);
  const shares: StatusCounts = { present: 0, late: 0, excused: 0, absent: 0 };
  if (total === 0) return shares;
  for (const status of SHARE_ORDER) shares[status] = Math.floor((100 * counts[status]) / total);
  const remainder = (status: AttendanceStatus) => (100 * counts[status]) % total;
  const ties = tieBreak(counts);
  const byRemainder = [...SHARE_ORDER].sort((a, b) => remainder(b) - remainder(a) || ties(a, b));
  let missing = 100 - SHARE_ORDER.reduce((sum, status) => sum + shares[status], 0);
  for (const status of byRemainder) {
    if (missing === 0) break;
    shares[status] += 1;
    missing -= 1;
  }
  for (const status of SHARE_ORDER) {
    if (counts[status] === 0 || shares[status] > 0) continue;
    const [largest] = [...SHARE_ORDER].sort((a, b) => shares[b] - shares[a] || ties(a, b));
    if (largest) shares[largest] -= 1;
    shares[status] = 1;
  }
  return shares;
};
