// RM-04 : les dates sont stockées en AAAA-MM-JJ et affichées en JJ/MM/AAAA.
// Seul module qui convertit une date pour l'affichage (docs/ARCHITECTURE.md §4).

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

const isRealDate = (year: number, month: number, day: number): boolean =>
  month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);

/** Vrai si `value` est une date stockée valide (AAAA-MM-JJ, jour existant). */
export const isIsoDate = (value: string): boolean => {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return false;
  }
  const [, year, month, day] = match;
  return isRealDate(Number(year), Number(month), Number(day));
};

/**
 * Date stockée → texte affiché (JJ/MM/AAAA).
 * Une date stockée invalide est un défaut du programme : erreur levée, sans la valeur (ABS-04).
 */
export const toDisplayDate = (iso: string): string => {
  if (!isIsoDate(iso)) {
    throw new Error('Date stockée invalide (RM-04)');
  }
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

/** Saisie JJ/MM/AAAA → date stockée, ou `null` si la saisie n'est pas une date réelle. */
export const parseDisplayDate = (input: string): string | null => {
  const match = DISPLAY_DATE.exec(input.trim());
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  return isIsoDate(iso) ? iso : null;
};
