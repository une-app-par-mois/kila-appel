// Période des statistiques (EX-27) : saison, mois en cours, dates libres. Domaine pur : le jour
// est passé en paramètre (CONV-11) ; dates stockées `AAAA-MM-JJ` (RM-04), bornes comprises.
import { InputError, type InputErrorCode, validateDate } from '@/domain/validation';

export type PeriodKind = 'season' | 'month' | 'custom';

/**
 * Période résolue : du `from` au `to`, compris. `seasonId` : séances de cette saison seulement
 * (« Saison », décision du porteur du 2026-11-27) ; `null` : toutes les saisons.
 */
export type StatsPeriod = { kind: PeriodKind; from: string; to: string; seasonId: number | null };

/** Choix de l'écran ; la saison et le mois se résolvent avec la saison active et le jour. */
export type PeriodChoice =
  | { kind: 'season' }
  | { kind: 'month' }
  | { kind: 'custom'; from: string; to: string };

export type ActiveSeason = { id: number; startDate: string; endDate: string };

/**
 * EX-27 « Saison » : séances de la saison active, de son début à aujourd'hui, borné à ses dates
 * (saison finie : jusqu'à sa fin ; saison à venir : son premier jour seul).
 */
export const seasonPeriod = (season: ActiveSeason, today: string): StatsPeriod => {
  validateDate(today);
  const { id, startDate, endDate } = season;
  const to = today < startDate ? startDate : today > endDate ? endDate : today;
  return { kind: 'season', from: startDate, to, seasonId: id };
};

/** EX-27 « Ce mois » : du 1er à aujourd'hui (aucune séance enregistrée n'est future). */
export const monthPeriod = (today: string): StatsPeriod => ({
  kind: 'month',
  from: `${validateDate(today).slice(0, 8)}01`,
  to: today,
  seasonId: null,
});

/** EX-27 « Dates… » : deux dates valides (RM-04), « du » au plus tard « au ». */
export const customPeriod = (from: string, to: string): StatsPeriod => {
  validateDate(from);
  validateDate(to);
  if (to < from) throw new InputError('END_BEFORE_START');
  return { kind: 'custom', from, to, seasonId: null };
};

/** EX-27 : code de saisie d'un choix (`DATE_INVALID`, `END_BEFORE_START`), `null` s'il est valide. */
export const choiceError = (choice: PeriodChoice | null): InputErrorCode | null => {
  if (choice?.kind !== 'custom') return null;
  try {
    customPeriod(choice.from, choice.to);
    return null;
  } catch (error) {
    if (error instanceof InputError) return error.code;
    throw error;
  }
};

/**
 * EX-27 : période par défaut, la saison active ; sans saison active (file du porteur, 2026-11-27),
 * « Ce mois », y compris si « Saison » est demandé.
 */
export const resolvePeriod = (
  choice: PeriodChoice | null,
  season: ActiveSeason | null,
  today: string,
): StatsPeriod => {
  if (choice?.kind === 'custom') return customPeriod(choice.from, choice.to);
  if (choice?.kind === 'month' || season === null) return monthPeriod(today);
  return seasonPeriod(season, today);
};
