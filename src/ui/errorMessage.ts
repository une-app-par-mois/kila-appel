// Erreur à code (saisie ou données) → message sans terme technique (CONV-15).
import { labels } from '@/config/libelles';
import { validateMemberName } from '@/domain/validation';

type Code = keyof typeof labels.errors;

export const errorMessage = (error: unknown): string => {
  const code = (error as { code?: unknown })?.code;
  // Object.hasOwn : un code hérité du prototype (« constructor ») n'est pas un message.
  return typeof code === 'string' && Object.hasOwn(labels.errors, code) && code !== 'unknown'
    ? labels.errors[code as Code]
    : labels.errors.unknown;
};

/** SEC-06 : message d'un nom ou prénom de membre hors de la règle (vide, trop long, invisible). */
export const memberNameError = (text: string): string | undefined => {
  try {
    validateMemberName(text);
    return undefined;
  } catch (e) {
    return errorMessage(e);
  }
};
