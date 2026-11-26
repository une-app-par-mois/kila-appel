// Erreur à code (saisie ou données) → message sans terme technique (CONV-15).
import { labels } from '@/config/libelles';

type Code = keyof typeof labels.errors;

export const errorMessage = (error: unknown): string => {
  const code = (error as { code?: unknown })?.code;
  return typeof code === 'string' && code in labels.errors && code !== 'unknown'
    ? labels.errors[code as Code]
    : labels.errors.unknown;
};
