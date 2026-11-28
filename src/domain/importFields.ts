// EX-30 : lecture d'une cellule d'un CSV d'import (ticket 032). Une cellule refusée lève une
// InputError qui porte un code, jamais la cellule (ABS-04). Les règles de nom (longueur,
// caractères) sont celles de la saisie : validateMember (SEC-06).
import { isIsoDate } from '@/domain/formats';
import { parsePhone } from '@/domain/phone';
import { InputError } from '@/domain/validation';

// Même séparateur entre jour, mois et année : `/`, `.` ou `-` (Excel, LibreOffice).
const DAY_MONTH_YEAR = /^(\d{1,2})([/.-])(\d{1,2})\2(\d{4})$/;
// Une date d'Excel peut porter une heure nulle : `AAAA-MM-JJ 00:00` ou `AAAA-MM-JJ 00:00:00`.
const YEAR_MONTH_DAY = /^(\d{4}-\d{2}-\d{2})(?: 00:00(?::00)?)?$/;
// Excel retire le zéro d'un numéro lu comme un nombre : 9 chiffres commençant par 1 à 9.
const WITHOUT_ZERO = /^[1-9]\d{8}$/;
// … et le `+` d'un numéro international : 33 suivi de 9 chiffres commençant par 1 à 9.
const WITHOUT_PLUS = /^33[1-9]\d{8}$/;

/** Nom ou prénom : espaces autour retirés, écrit en NFC (un fichier venu d'un Mac peut être en NFD). */
export const readImportName = (cell: string): string => cell.trim().normalize('NFC');

/**
 * RM-04, EX-03 : `J/M/AAAA`, `J.M.AAAA` ou `J-M-AAAA` (jour et mois sur 1 ou 2 chiffres), ou
 * `AAAA-MM-JJ` avec au plus une heure nulle → `AAAA-MM-JJ` ; cellule vide → aucune date. Année à
 * deux chiffres, autre heure, numéro de série d'Excel : DATE_INVALID ; après `today` :
 * DATE_IN_FUTURE.
 */
export const parseImportDate = (cell: string, today: string): string | null => {
  const text = cell.trim();
  if (text === '') return null;
  const dayFirst = DAY_MONTH_YEAR.exec(text);
  const iso = dayFirst
    ? `${dayFirst[4]}-${dayFirst[3]?.padStart(2, '0')}-${dayFirst[1]?.padStart(2, '0')}`
    : (YEAR_MONTH_DAY.exec(text)?.[1] ?? '');
  if (!isIsoDate(iso)) throw new InputError('DATE_INVALID');
  if (iso > today) throw new InputError('DATE_IN_FUTURE');
  return iso;
};

/**
 * EX-05 : téléphone français (parsePhone) ; 9 chiffres commençant par 1 à 9, après retrait des
 * espaces, points et tirets, reçoivent le zéro retiré par Excel, et 33 suivi de 9 chiffres le `+`
 * retiré par Excel. Cellule vide → aucun téléphone. `0033…` reste refusé.
 */
export const parseImportPhone = (cell: string): string | null => {
  const text = cell.trim();
  if (text === '') return null;
  const compact = text.replace(/[\s.-]/g, '');
  const restored = WITHOUT_ZERO.test(compact)
    ? `0${compact}`
    : WITHOUT_PLUS.test(compact)
      ? `+${compact}`
      : compact;
  const phone = parsePhone(restored);
  if (phone === null) throw new InputError('PHONE_INVALID');
  return phone;
};
