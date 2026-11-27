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

/**
 * EX-25, EX-26 : alerte montrée si la série atteint le seuil, sauf si un traitement la couvre :
 * longueur traitée au moins égale à la série, et traitement daté de sa dernière absence ou après
 * (décision du porteur du 2026-11-27). Toute absence placée après le traitement la fait revenir.
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
  if (streak.length < threshold || streak.end === null) return false;
  const end = streak.end;
  return !acks.some((ack) => ack.streakLength >= streak.length && ack.ackedAt >= end);
};
