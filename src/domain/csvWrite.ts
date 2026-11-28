// Écriture d'un CSV pour un tableur (F-08, EX-31). Zone sensible : données qui sortent de
// l'appareil. Format d'Excel français : séparateur « ; », UTF-8 avec BOM, fins de ligne CRLF.
// SEC-07 : une cellule qui commence par un caractère de formule est préfixée par « ' ».

/** BOM UTF-8 : Excel français ouvre le fichier sans perdre les accents. */
export const BOM = '\uFEFF';

const SEPARATOR = ';';
const EOL = '\r\n';

/** SEC-07 : premier caractère qui ferait lire la cellule comme une formule. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Cellule à mettre entre guillemets (RFC 4180). */
const NEEDS_QUOTES = /[;"\r\n]/;

/** SEC-07 : préfixe « ' » si le premier caractère ouvre une formule ; le reste est intact. */
export const neutralize = (cell: string): string => (FORMULA_START.test(cell) ? `'${cell}` : cell);

/** SEC-07 puis RFC 4180 : neutralisée d'abord, entre guillemets ensuite, « " » doublé. */
const field = (cell: string): string => {
  const safe = neutralize(cell);
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

const line = (cells: readonly string[]): string => cells.map(field).join(SEPARATOR) + EOL;

/**
 * EX-31 : texte du fichier, BOM puis en-tête puis lignes, CRLF après chacune. Toute cellule passe
 * par SEC-07, en-tête compris : les dates et statuts produits par l'appli n'en sont pas changés.
 */
export const toCsv = (header: readonly string[], rows: readonly (readonly string[])[]): string =>
  BOM + line(header) + rows.map(line).join('');
