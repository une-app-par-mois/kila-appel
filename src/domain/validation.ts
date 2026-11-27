// Validation des saisies avant la base (CLAUDE.md : toute entrée est validée). Les contraintes
// de la base restent le dernier rempart. Une erreur porte un code, jamais la saisie (ABS-04).
import { isIsoDate } from '@/domain/formats';
import { parsePhone } from '@/domain/phone';

export type InputErrorCode =
  | 'NAME_REQUIRED'
  | 'DATE_INVALID'
  | 'DATE_IN_FUTURE'
  | 'END_BEFORE_START'
  | 'DATE_OUTSIDE_SEASON'
  | 'PHONE_INVALID'
  | 'WEEKDAY_INVALID'
  | 'TIME_INVALID'
  | 'DURATION_INVALID'
  | 'GROUP_REQUIRED'
  | 'STATUS_INVALID'
  | 'SLOT_INVALID'
  | 'COMMENT_TOO_LONG';

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

/** EX-05, ABS-03 : qui est-ce (« Sa mère ») et téléphone ; aucun autre champ. */
export type ContactInput = { label: string; phone: string };

/** EX-05 : nom non vide ; téléphone français, rendu sur 10 chiffres (décision du 2026-11-26). */
export const validateContact = (input: ContactInput): ContactInput => {
  const label = validateName(input.label);
  const phone = parsePhone(input.phone);
  if (phone === null) throw new InputError('PHONE_INVALID');
  return { label, phone };
};

/** EX-07 : créneau hebdomadaire ; un groupe (lot 1) ; lieu et nom facultatifs. */
export type SlotInput = {
  weekday: number; // 1 = lundi … 7 = dimanche
  startTime: string; // HH:MM
  durationMin: number;
  place: string | null;
  name: string | null;
  groupId: number;
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** RM-04 : heure HH:MM de 00:00 à 23:59. */
export const isTime = (text: string) => HHMM.test(text);
const optional = (text: string | null) =>
  text === null || text.trim() === '' ? null : text.trim();

/** EX-07 : jour 1 à 7, heure HH:MM, durée de 1 min à 24 h, un groupe ; lieu et nom vides → aucun. */
export const validateSlot = (input: SlotInput): SlotInput => {
  if (!Number.isInteger(input.weekday) || input.weekday < 1 || input.weekday > 7)
    throw new InputError('WEEKDAY_INVALID');
  if (!HHMM.test(input.startTime)) throw new InputError('TIME_INVALID');
  if (!Number.isInteger(input.durationMin) || input.durationMin < 1 || input.durationMin > 1440)
    throw new InputError('DURATION_INVALID');
  if (!Number.isInteger(input.groupId) || input.groupId < 1) throw new InputError('GROUP_REQUIRED');
  return {
    weekday: input.weekday,
    startTime: input.startTime,
    durationMin: input.durationMin,
    place: optional(input.place),
    name: optional(input.name),
    groupId: input.groupId,
  };
};

/** EX-10 : statuts d'une présence enregistrée. */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
const STATUSES: readonly string[] = ['present', 'absent', 'late', 'excused'];

/** EX-10 : statut de présence connu (brouillon et enregistrement). */
export const isAttendanceStatus = (status: string): status is AttendanceStatus =>
  STATUSES.includes(status);
/** EX-13 : 500 caractères au plus (décision du porteur du 2026-11-27). */
export const COMMENT_MAX = 500;

export const isId = (n: number) => Number.isInteger(n) && n >= 1;

/** EX-13 : commentaire nettoyé, vide → aucun ; 500 caractères vus au plus (un émoji compte pour un). */
export const validateComment = (text: string | null): string | null => {
  const comment = optional(text);
  if (comment !== null && [...comment].length > COMMENT_MAX)
    throw new InputError('COMMENT_TOO_LONG');
  return comment;
};

/** EX-15 : un appel à enregistrer ; `slotId` nul : appel sans créneau (EX-39). */
export type RollCallInput = {
  slotId: number | null;
  groupId: number;
  date: string;
  startTime: string;
  statuses: { memberId: number; status: AttendanceStatus }[];
  comment: string | null;
};

/** EX-15 : date RM-04, heure HH:MM, un groupe, statuts connus sans membre en double, commentaire borné. */
export const validateRollCall = (input: RollCallInput): RollCallInput => {
  validateDate(input.date);
  if (!HHMM.test(input.startTime)) throw new InputError('TIME_INVALID');
  if (!isId(input.groupId)) throw new InputError('GROUP_REQUIRED');
  if (input.slotId !== null && !isId(input.slotId)) throw new InputError('SLOT_INVALID');
  const seen = new Set<number>();
  for (const { memberId, status } of input.statuses) {
    if (!isId(memberId) || !STATUSES.includes(status) || seen.has(memberId))
      throw new InputError('STATUS_INVALID');
    seen.add(memberId);
  }
  const comment = validateComment(input.comment);
  return {
    slotId: input.slotId,
    groupId: input.groupId,
    date: input.date,
    startTime: input.startTime,
    statuses: input.statuses.map(({ memberId, status }) => ({ memberId, status })),
    comment,
  };
};
