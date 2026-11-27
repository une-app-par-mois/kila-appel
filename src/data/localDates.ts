// Dates et heures locales (texte du domaine) → `Date` de l'appareil, pour la relance (ticket
// 028a, EX-28) : passages à l'heure d'été et d'hiver. Sorti de l'adaptateur expo-notifications
// au 028b (fichier de 300 lignes au plus) ; aucune dépendance native.
import { isIsoDate } from '@/domain/formats';
import { TIME } from '@/domain/occurrences';

const MINUTE_MS = 60_000;
// Au plus 3 h d'écart cherchées autour d'un changement d'heure (1 h en France).
const SHIFT_MAX_MIN = 180;

/** Heures et minutes locales de `d` égales à celles voulues (jour compris). */
const reads = (d: Date, want: Date) =>
  d.getFullYear() === want.getUTCFullYear() &&
  d.getMonth() === want.getUTCMonth() &&
  d.getDate() === want.getUTCDate() &&
  d.getHours() === want.getUTCHours() &&
  d.getMinutes() === want.getUTCMinutes();

/**
 * Heure doublée (passage à l'heure d'hiver) : la même heure locale existe une heure plus tôt ;
 * seule la première occurrence compte, quel que soit le choix du moteur JavaScript.
 */
export const firstOccurrence = (d: Date): Date => {
  for (let back = SHIFT_MAX_MIN; back > 0; back -= 30) {
    const earlier = new Date(d.getTime() - back * MINUTE_MS);
    if (earlier.getHours() === d.getHours() && earlier.getMinutes() === d.getMinutes())
      return earlier;
  }
  return d;
};

/**
 * Date et heure locales (texte du domaine) → `Date`. L'heure absente du passage à l'heure d'été
 * passe à la première minute valide qui suit ; la date construite est relue. Hors format : null.
 */
export const toLocalDate = (date: string, time: string): Date | null => {
  if (!isIsoDate(date) || !TIME.test(time)) return null;
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, mi] = time.split(':').map(Number) as [number, number];
  for (let shift = 0; shift <= SHIFT_MAX_MIN; shift += 1) {
    const built = new Date(y, m - 1, d, h, mi + shift);
    if (reads(built, new Date(Date.UTC(y, m - 1, d, h, mi + shift)))) return firstOccurrence(built);
  }
  return null;
};
