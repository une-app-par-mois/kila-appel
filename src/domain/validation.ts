// Validation des saisies avant la base (CLAUDE.md : toute entrée est validée). Les contraintes
// de la base restent le dernier rempart. Une erreur porte un code, jamais la saisie (ABS-04).
import { isIsoDate } from '@/domain/formats';

export type InputErrorCode =
  | 'NAME_REQUIRED'
  | 'DATE_INVALID'
  | 'DATE_IN_FUTURE'
  | 'END_BEFORE_START';

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

/** EX-03, ABS-03 : nom, prénom et date de naissance facultative ; aucun autre champ. */
export type MemberInput = { firstName: string; lastName: string; birthDate: string | null };

/** EX-03 : nom et prénom non vides ; date de naissance facultative, RM-04, pas après `today`. */
export const validateMember = (input: MemberInput, today: string): MemberInput => {
  const firstName = validateName(input.firstName);
  const lastName = validateName(input.lastName);
  if (input.birthDate === null) return { firstName, lastName, birthDate: null };
  const birthDate = validateDate(input.birthDate);
  if (birthDate > today) throw new InputError('DATE_IN_FUTURE');
  return { firstName, lastName, birthDate };
};
