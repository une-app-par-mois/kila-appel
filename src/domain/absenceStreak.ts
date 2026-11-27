// Série d'absences (RM-02) et alerte d'assiduité (EX-25, EX-26). Zone sensible : calcul affiché.
// Domaine pur : les statuts arrivent dans l'ordre des séances enregistrées (date, heure).
import type { AttendanceStatus } from '@/domain/validation';

export type StatusOnDate = { status: AttendanceStatus; date: string };

/** Série en cours : longueur, date de la première et de la dernière absence (null si aucune). */
export type Streak = { length: number; start: string | null; end: string | null };

/** Traitement enregistré (`alert_acks`) : longueur traitée et date du traitement. */
export type AlertAck = { streakLength: number; ackedAt: string };

/**
 * RM-02 : en partant de la séance la plus récente, Absent allonge la série, Excusé est ignoré
 * sans la remettre à zéro, Présent ou Retard l'arrête.
 */
export const currentStreak = (entries: readonly StatusOnDate[]): Streak => {
  let length = 0;
  let start: string | null = null;
  let end: string | null = null;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const { status, date } = entries[i] as StatusOnDate;
    if (status === 'present' || status === 'late') break;
    if (status === 'absent') {
      length += 1;
      start = date;
      end ??= date;
    }
  }
  return { length, start, end };
};

/** RM-02 : longueur de la série d'absences en cours. */
export const absenceStreak = (statuses: readonly AttendanceStatus[]): number =>
  currentStreak(statuses.map((status) => ({ status, date: '' }))).length;

/**
 * EX-25, EX-26 : alerte montrée si la série atteint le seuil, sauf si un traitement la couvre :
 * longueur traitée au moins égale à la série, et traitement daté du début de la série ou après.
 * Une série retombée à zéro puis revenue commence après l'ancien traitement : elle réapparaît.
 */
export const isAlertShown = ({
  streak,
  threshold,
  acks,
}: {
  streak: Streak;
  threshold: number;
  acks: readonly AlertAck[];
}): boolean => {
  if (streak.length < threshold || streak.start === null) return false;
  const start = streak.start;
  return !acks.some((ack) => ack.streakLength >= streak.length && ack.ackedAt >= start);
};
