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

/** 10 chiffres stockés → « 06 00 00 00 01 ». Un numéro mal stocké est un défaut du programme. */
export const formatPhone = (phone: string): string => {
  if (!NATIONAL.test(phone)) throw new Error('Téléphone stocké invalide (EX-05)');
  return phone.replace(/(\d{2})(?=\d)/g, '$1 ');
};
