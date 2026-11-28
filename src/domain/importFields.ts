// EX-30 : lecture d'une cellule d'un CSV d'import (ticket 032). Une cellule refusée lève une
// InputError qui porte un code, jamais la cellule (ABS-04). Les règles de nom (longueur,
// caractères) sont celles de la saisie : validateMember (SEC-06).
import { isIsoDate } from '@/domain/formats';
import { parsePhone } from '@/domain/phone';
import { InputError } from '@/domain/validation';

const DAY_MONTH_YEAR = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const YEAR_MONTH_DAY = /^\d{4}-\d{2}-\d{2}$/;
// Excel retire le zéro d'un numéro lu comme un nombre : 9 chiffres commençant par 1 à 9.
const WITHOUT_ZERO = /^[1-9]\d{8}$/;

/** Nom ou prénom : espaces autour retirés, écrit en NFC (un fichier venu d'un Mac peut être en NFD). */
export const readImportName = (cell: string): string => cell.trim().normalize('NFC');

/**
 * RM-04, EX-03 : `JJ/MM/AAAA`, `J/M/AAAA` ou `AAAA-MM-JJ` → `AAAA-MM-JJ` ; cellule vide → aucune
 * date. Année à deux chiffres, heure, points ou tirets entre jour et mois : DATE_INVALID (formes
 * ambiguës) ; date après `today` : DATE_IN_FUTURE.
 */
export const parseImportDate = (cell: string, today: string): string | null => {
  const text = cell.trim();
  if (text === '') return null;
  const match = DAY_MONTH_YEAR.exec(text);
  const iso = match
    ? `${match[3]}-${match[2]?.padStart(2, '0')}-${match[1]?.padStart(2, '0')}`
    : YEAR_MONTH_DAY.test(text)
      ? text
      : '';
  if (!isIsoDate(iso)) throw new InputError('DATE_INVALID');
  if (iso > today) throw new InputError('DATE_IN_FUTURE');
  return iso;
};

/**
 * EX-05 : téléphone français (parsePhone) ; 9 chiffres commençant par 1 à 9, après retrait des
 * espaces, points et tirets, reçoivent le zéro retiré par Excel. Cellule vide → aucun téléphone.
 */
export const parseImportPhone = (cell: string): string | null => {
  const text = cell.trim();
  if (text === '') return null;
  const compact = text.replace(/[\s.-]/g, '');
  const phone = parsePhone(WITHOUT_ZERO.test(compact) ? `0${compact}` : compact);
  if (phone === null) throw new InputError('PHONE_INVALID');
  return phone;
};
