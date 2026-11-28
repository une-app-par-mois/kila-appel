// Écriture d'un CSV pour un tableur (F-08, EX-31). Zone sensible : données qui sortent de
// l'appareil. Format d'Excel français : séparateur « ; », UTF-8 avec BOM, fins de ligne CRLF.
// SEC-07 (décision du porteur du 2026-11-28) : toute cellule, en-tête compris, est neutralisée
// par « ' » (voir `neutralize`). Limite : un réenregistrement du fichier par Excel retire la
// protection.

/** BOM UTF-8 : Excel français ouvre le fichier sans perdre les accents. */
export const BOM = '\uFEFF';

const SEPARATOR = ';';
const EOL = '\r\n';

// Classe commune aux deux expressions : espaces (insécable compris) et caractères invisibles
// (largeur nulle, marques de sens, BOM, isolats), ignorés avant le caractère visible.

/**
 * SEC-07 : la cellule commence par une tabulation ou un CR, ou son premier caractère visible est
 * `=`, `+`, `-` ou `@`.
 */
const FORMULA_START =
  /^(?:[\t\r]|[\s\u200B-\u200F\u2060\uFEFF\u061C\u202A-\u202E\u2066-\u2069]*[=+\-@])/;

/** SEC-07 : caractère de formule après une virgule, un point-virgule ou une tabulation. */
const AFTER_SEPARATOR =
  /([,;\t][\s\u200B-\u200F\u2060\uFEFF\u061C\u202A-\u202E\u2066-\u2069]*)(?=[=+\-@])/g;

/** Cellule à mettre entre guillemets (RFC 4180, et tout séparateur qu'un tableur pourrait lire). */
const NEEDS_QUOTES = /[;,"\t\r\n]/;

/**
 * SEC-07 : « ' » inséré devant chaque caractère de formule placé après un séparateur, puis en tête
 * si la cellule ouvre une formule ; le reste est intact (« Marie-Ève », « O'Brien »).
 */
export const neutralize = (cell: string): string => {
  const inner = cell.replace(AFTER_SEPARATOR, "$1'");
  return FORMULA_START.test(inner) ? `'${inner}` : inner;
};

/** SEC-07 puis RFC 4180 : neutralisée d'abord, entre guillemets ensuite, « " » doublé. */
const field = (cell: string): string => {
  const safe = neutralize(cell);
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

const line = (cells: readonly string[]): string => cells.map(field).join(SEPARATOR) + EOL;

/**
 * EX-31 : texte du fichier, BOM puis en-tête puis lignes, CRLF après chacune. Toute cellule passe
 * par SEC-07, en-tête compris (décision du porteur du 2026-11-28).
 */
export const toCsv = (header: readonly string[], rows: readonly (readonly string[])[]): string =>
  BOM + line(header) + rows.map(line).join('');
