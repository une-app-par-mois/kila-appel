// Période des statistiques (EX-27) : saison, mois en cours, dates libres. Domaine pur : le jour
// est passé en paramètre (CONV-11) ; dates stockées `AAAA-MM-JJ` (RM-04), bornes comprises.
import { InputError, validateDate } from '@/domain/validation';

export type PeriodKind = 'season' | 'month' | 'custom';

/** Période résolue : du `from` au `to`, compris. */
export type StatsPeriod = { kind: PeriodKind; from: string; to: string };

/** Choix de l'écran ; la saison et le mois se résolvent avec la saison active et le jour. */
export type PeriodChoice =
  | { kind: 'season' }
  | { kind: 'month' }
  | { kind: 'custom'; from: string; to: string };

export type SeasonDates = { startDate: string; endDate: string };

/**
 * EX-27 « Saison » : du début de la saison active à aujourd'hui, borné à ses dates (saison finie :
 * jusqu'à sa fin ; saison à venir : son premier jour seul, sans séance enregistrée possible).
 */
export const seasonPeriod = (season: SeasonDates, today: string): StatsPeriod => {
  validateDate(today);
  const { startDate, endDate } = season;
  const to = today < startDate ? startDate : today > endDate ? endDate : today;
  return { kind: 'season', from: startDate, to };
};

/** EX-27 « Ce mois » : du 1er à aujourd'hui (aucune séance enregistrée n'est future). */
export const monthPeriod = (today: string): StatsPeriod => ({
  kind: 'month',
  from: `${validateDate(today).slice(0, 8)}01`,
  to: today,
});

/** EX-27 « Dates… » : deux dates valides (RM-04), « du » au plus tard « au ». */
export const customPeriod = (from: string, to: string): StatsPeriod => {
  validateDate(from);
  validateDate(to);
  if (to < from) throw new InputError('END_BEFORE_START');
  return { kind: 'custom', from, to };
};

/**
 * EX-27 : période par défaut, la saison active ; sans saison active (file du porteur, 2026-11-27),
 * « Ce mois », y compris si « Saison » est demandé.
 */
export const resolvePeriod = (
  choice: PeriodChoice | null,
  season: SeasonDates | null,
  today: string,
): StatsPeriod => {
  if (choice?.kind === 'custom') return customPeriod(choice.from, choice.to);
  if (choice?.kind === 'month' || season === null) return monthPeriod(today);
  return seasonPeriod(season, today);
};
