// Erreur à code (saisie ou données) → message sans terme technique (CONV-15).
import { labels } from '@/config/libelles';

type Code = keyof typeof labels.errors;

export const errorMessage = (error: unknown): string => {
  const code = (error as { code?: unknown })?.code;
  // Object.hasOwn : un code hérité du prototype (« constructor ») n'est pas un message.
  return typeof code === 'string' && Object.hasOwn(labels.errors, code) && code !== 'unknown'
    ? labels.errors[code as Code]
    : labels.errors.unknown;
};
