// Validation des saisies avant la base (CLAUDE.md : toute entrée est validée). Les contraintes
// de la base restent le dernier rempart. Une erreur porte un code, jamais la saisie (ABS-04).
import { isIsoDate } from '@/domain/formats';

export type InputErrorCode = 'NAME_REQUIRED' | 'DATE_INVALID' | 'END_BEFORE_START';

export class InputError extends Error {
  constructor(readonly code: InputErrorCode) {
    super(`Saisie invalide : ${code}`);
    this.name = 'InputError';
  }
}

/** Nom sans espaces autour ; vide refusé. */
export const validateName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed === '') throw new InputError('NAME_REQUIRED');
  return trimmed;
};

/** Date stockée AAAA-MM-JJ (RM-04). */
export const validateDate = (date: string): string => {
  if (!isIsoDate(date)) throw new InputError('DATE_INVALID');
  return date;
};

export type SeasonInput = { name: string; startDate: string; endDate: string };

/** EX-01 : nom non vide, dates RM-04, fin le jour du début ou après. */
export const validateSeason = (input: SeasonInput): SeasonInput => {
  const name = validateName(input.name);
  const startDate = validateDate(input.startDate);
  const endDate = validateDate(input.endDate);
  if (endDate < startDate) throw new InputError('END_BEFORE_START');
  return { name, startDate, endDate };
};
