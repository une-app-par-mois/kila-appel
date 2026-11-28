// Lecture d'un CSV décodé (F-07, EX-30, SEC-06). Zone sensible : fichier extérieur lu.
// Domaine pur : texte en lignes de cellules, sans rien savoir des membres (032). Guillemets
// RFC 4180. Aucun refus ne contient un morceau du fichier : code et numéro de ligne (ABS-04).
// À appeler après decodeCsv, qui borne la taille (1 Mo) : le coût reste linéaire.

export type CsvSeparator = ';' | '\t' | ',';

/**
 * Ligne lue : `line` est le numéro de ligne du tableur (en-tête = 1, lignes vides comptées, un
 * retour à la ligne entre guillemets ne compte pas).
 */
export type CsvRow = { line: number; cells: string[] };

/** Refus de la lecture, liste fermée (contrat 031 ↔ 032). */
export type ParseRefusal =
  | { reason: 'EMPTY' | 'TOO_MANY_ROWS' }
  | { reason: 'MALFORMED'; line: number };

export type ParseResult = { separator: CsvSeparator; rows: CsvRow[] } | ParseRefusal;

/** SEC-06 : lignes de données au plus (en-tête et lignes vides non comptés). */
export const MAX_CSV_DATA_ROWS = 2000;

/** Ordre de préférence en cas d'égalité : Excel français écrit `;`. */
const SEPARATORS: readonly CsvSeparator[] = [';', '\t', ','];

/** Directive d'Excel en première ligne (`sep=;`), suivie au plus de séparateurs et d'espaces. */
const DIRECTIVE = /^sep=([;,\t])[;,\t ]*(?:\r\n|\r|\n|$)/i;

/** Cellule « vide » : rien que des espaces et des séparateurs (Excel écrit `;;;;`). */
const BLANK_CELL = /^[\s;,]*$/;

/** Longueur de la fin de ligne à `pos` (2 pour CRLF, 1 pour LF ou CR seul), 0 sinon. */
const eolLength = (text: string, pos: number): number => {
  if (text[pos] === '\r') return text[pos + 1] === '\n' ? 2 : 1;
  return text[pos] === '\n' ? 1 : 0;
};

const skipSpaces = (text: string, pos: number): number => {
  let i = pos;
  while (text[i] === ' ') i += 1;
  return i;
};

type IsSeparator = (ch: string | undefined) => boolean;

/** Un guillemet à `i` ferme le champ s'il est suivi d'espaces puis d'un séparateur, d'une fin de ligne ou du texte. */
const closesAt = (text: string, i: number, isSep: IsSeparator): boolean => {
  const next = skipSpaces(text, i + 1);
  return next >= text.length || isSep(text[next]) || eolLength(text, next) > 0;
};

/**
 * Guillemet fermant d'un champ ouvert à `from - 1` : `""` est un guillemet du champ. Un guillemet
 * suivi d'un autre texte rend `'stray'` en lecture stricte, et reste dans le champ sinon (détection).
 * -1 : jamais fermé.
 */
const findClosing = (
  text: string,
  from: number,
  isSep: IsSeparator,
  strict: boolean,
): number | 'stray' => {
  let i = text.indexOf('"', from);
  while (i >= 0) {
    if (text[i + 1] === '"') i = text.indexOf('"', i + 2);
    else if (closesAt(text, i, isSep)) return i;
    else if (strict) return 'stray';
    else i = text.indexOf('"', i + 1);
  }
  return -1;
};

type Scanned = { cells: string[]; separators: string[]; next: number } | 'malformed';

/**
 * Une ligne du tableur à partir de `start` (elle peut couvrir plusieurs lignes physiques).
 * Un guillemet n'ouvre un champ qu'en tête de champ, après d'éventuels espaces ; ces espaces et
 * ceux qui suivent le guillemet fermant sont ignorés. Sans guillemet ouvrant, le champ est gardé
 * tel quel (O"Brien, espaces compris). Même règle pour la détection du séparateur et la lecture.
 */
const scanRecord = (text: string, start: number, isSep: IsSeparator, strict: boolean): Scanned => {
  const cells: string[] = [];
  const separators: string[] = [];
  let pos = start;
  for (;;) {
    const quote = skipSpaces(text, pos);
    if (text[quote] === '"') {
      const close = findClosing(text, quote + 1, isSep, strict);
      if (close === 'stray' || (close === -1 && strict)) return 'malformed';
      const end = close === -1 ? text.length : close;
      cells.push(text.slice(quote + 1, end).replace(/""/g, '"'));
      pos = close === -1 ? end : skipSpaces(text, close + 1);
    } else {
      let end = pos;
      while (end < text.length && !isSep(text[end]) && eolLength(text, end) === 0) end += 1;
      cells.push(text.slice(pos, end));
      pos = end;
    }
    if (pos < text.length && isSep(text[pos])) {
      separators.push(text[pos] as string);
      pos += 1;
      continue;
    }
    return { cells, separators, next: pos + eolLength(text, pos) };
  }
};

const isAnySeparator: IsSeparator = (ch) => ch === ';' || ch === '\t' || ch === ',';

const isBlank = (cells: readonly string[]): boolean => cells.every((cell) => BLANK_CELL.test(cell));

/**
 * Première ligne non vide, guillemets lus comme à la lecture : le séparateur le plus fréquent,
 * `;` en cas d'égalité ou d'absence. Une ligne faite seulement d'espaces et de séparateurs est sautée.
 */
const detectSeparator = (text: string): CsvSeparator => {
  let pos = 0;
  while (pos < text.length) {
    // Lecture non stricte : jamais « malformed ».
    const scanned = scanRecord(text, pos, isAnySeparator, false) as Exclude<Scanned, 'malformed'>;
    if (!isBlank(scanned.cells)) {
      const count = (sep: string) => scanned.separators.filter((found) => found === sep).length;
      let best: CsvSeparator = ';';
      for (const sep of SEPARATORS) if (count(sep) > count(best)) best = sep;
      return best;
    }
    pos = scanned.next;
  }
  return ';';
};

/**
 * F-07, SEC-06 : texte d'un CSV en lignes de cellules, l'en-tête en `rows[0]`. Champs rendus
 * tels quels (ni `trim()` ni complétion : 032). Plus de 2 000 lignes de données : refus sans
 * lire la suite. MALFORMED porte le numéro de la ligne du tableur du champ fautif.
 */
export const parseCsv = (input: string): ParseResult => {
  let text = input.startsWith('﻿') ? input.slice(1) : input;
  const directive = DIRECTIVE.exec(text);
  if (directive) text = text.slice(directive[0].length);
  const separator = directive ? (directive[1] as CsvSeparator) : detectSeparator(text);
  const isSep: IsSeparator = (ch) => ch === separator;
  const rows: CsvRow[] = [];
  let pos = 0;
  for (let line = 1; pos < text.length; line += 1) {
    const scanned = scanRecord(text, pos, isSep, true);
    if (scanned === 'malformed') return { reason: 'MALFORMED', line };
    pos = scanned.next;
    if (isBlank(scanned.cells)) continue;
    if (rows.length > MAX_CSV_DATA_ROWS) return { reason: 'TOO_MANY_ROWS' };
    rows.push({ line, cells: scanned.cells });
  }
  if (rows.length === 0) return { reason: 'EMPTY' };
  return { separator, rows };
};
