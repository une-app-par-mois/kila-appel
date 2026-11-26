// Module de journal unique (SEC-12, CONV-17) : le seul endroit où console.* est permis.
// ABS-04 : un code et des identifiants seulement ; jamais un nom, un téléphone, une date de naissance.
// Une donnée refusée n'est jamais écrite, et le journal ne lève jamais d'erreur : appelé dans un
// catch, il ne doit pas masquer l'erreur réelle (décision du porteur du 2026-11-26).

export type LogDetails = Readonly<Record<string, number | boolean>>;

const CODE = /^[A-Z][A-Z0-9_]*$/;
// Liste blanche : identifiants (…Id), compteurs (…Count) et quelques clés fixes. Ajouter une clé ici
// se voit en revue.
const ALLOWED_KEY = /^[a-z][a-zA-Z0-9]*(Id|Count)$/;
const ALLOWED_KEYS = new Set(['version', 'changes', 'durationMs', 'ok']);

const isAllowed = ([key, value]: [string, unknown]) =>
  (ALLOWED_KEY.test(key) || ALLOWED_KEYS.has(key)) &&
  (typeof value === 'number' || typeof value === 'boolean');

/** Écrit `[kila] CODE` et ses détails ; sinon `[kila] LOG_REFUSED`, sans la donnée refusée. */
export const log = (code: string, details: LogDetails = {}): void => {
  if (!CODE.test(code)) {
    console.log('[kila] LOG_REFUSED');
  } else if (!Object.entries(details).every(isAllowed)) {
    console.log(`[kila] LOG_REFUSED ${code}`);
  } else {
    console.log(`[kila] ${code}`, details);
  }
};
