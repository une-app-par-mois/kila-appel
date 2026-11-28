// Points de code pour les tests SEC-06 (ticket 044b) : les caractères invisibles sont construits
// par leur numéro, jamais écrits bruts dans les sources.

/** Texte fait des points de code donnés. */
export const char = (...codes: number[]): string => String.fromCodePoint(...codes);

/** Pour `it.each` : chaque point de code avec son écriture « 00AD », pour le titre du test. */
export const hexCodes = (codes: number[]): [string, number][] =>
  codes.map((code) => [code.toString(16).toUpperCase().padStart(4, '0'), code]);
