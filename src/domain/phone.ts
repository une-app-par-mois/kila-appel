// Téléphone d'un contact d'urgence (EX-05) : français seulement (décision du porteur du
// 2026-11-26). Stocké sur 10 chiffres, affiché par paires. Jamais écrit dans une erreur (ABS-04).

const NATIONAL = /^0[1-9]\d{8}$/;
const INTERNATIONAL = /^\+33[1-9]\d{8}$/;

/** Saisie → 10 chiffres commençant par 0, ou `null`. Espaces, points et tirets ignorés. */
export const parsePhone = (input: string): string | null => {
  const compact = input.replace(/[\s.-]/g, '');
  if (NATIONAL.test(compact)) return compact;
  if (INTERNATIONAL.test(compact)) return `0${compact.slice(3)}`;
  return null;
};

/**
 * 10 chiffres stockés → « 06 00 00 00 01 ». Un numéro hors format (sauvegarde, import : la base
 * ne vérifie que le non-vide) s'affiche tel quel : une fiche ne doit pas devenir illisible.
 */
export const formatPhone = (phone: string): string =>
  NATIONAL.test(phone) ? phone.replace(/(\d{2})(?=\d)/g, '$1 ') : phone;
