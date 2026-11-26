// Module de journal unique (SEC-12, CONV-17) : le seul endroit où console.* est permis.
// ABS-04 : un code et des identifiants seulement ; jamais un nom, un téléphone, une date de naissance.

export type LogDetails = Readonly<Record<string, number | boolean>>;

export const LOG_REFUSED = 'Journal : donnée refusée (ABS-04)';

const CODE = /^[A-Z][A-Z0-9_]*$/;
const FORBIDDEN_KEYS = new Set([
  'first_name',
  'last_name',
  'phone',
  'birth_date',
  'firstName',
  'lastName',
  'birthDate',
  'label',
]);

/** Écrit `[kila] CODE` et ses détails. Toute donnée interdite lève une erreur, sans la valeur. */
export const log = (code: string, details: LogDetails = {}): void => {
  const allowed =
    CODE.test(code) &&
    Object.entries(details).every(
      ([key, value]) =>
        !FORBIDDEN_KEYS.has(key) && (typeof value === 'number' || typeof value === 'boolean'),
    );
  if (!allowed) {
    throw new Error(LOG_REFUSED);
  }
  console.log(`[kila] ${code}`, details);
};
