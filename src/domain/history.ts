// Historique (EX-16, EX-17) : période des filtres et ordre des lignes. Domaine pur : le jour est
// passé en paramètre (CONV-11) ; le calcul porte sur des dates de calendrier.
import { toIsoDate } from '@/domain/formats';

/** Période du filtre (décision du porteur du 2026-11-27) : 30 derniers jours, saison, toutes. */
export type HistoryPeriod = 'last30Days' | 'season' | 'allSeasons';

const DAYS = 30;

/** EX-16 : premier jour des « 30 derniers jours » : aujourd'hui et les 29 jours d'avant. */
export const periodStart = (today: string): string => {
  const [year, month, day] = today.split('-').map(Number);
  // Midi : à l'abri des changements d'heure.
  return toIsoDate(new Date(year ?? 0, (month ?? 1) - 1, (day ?? 1) - (DAYS - 1), 12));
};

/** EX-16 : la plus récente en haut, date puis heure décroissantes ; ordre d'origine à égalité. */
export const newestFirst = <T extends { date: string; startTime: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
