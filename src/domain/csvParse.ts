// Lecture d'un CSV décodé (F-07, EX-30, SEC-06). Zone sensible : fichier extérieur lu.
// Domaine pur : texte en lignes de cellules, sans rien savoir des membres (032). Guillemets
// RFC 4180. Aucun refus ne contient un morceau du fichier : code et numéro de ligne (ABS-04).

export type CsvSeparator = ';' | '\t' | ',';

/** Ligne lue : `line` est le numéro de ligne du tableur (en-tête = 1, lignes vides comptées). */
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

/** Directive d'Excel en première ligne (`sep=;`), suivie d'une fin de ligne ou du texte. */
const DIRECTIVE = /^sep=([;,\t])(?:\r\n|\r|\n|$)/i;

/** Cellule « vide » : rien que des espaces et des séparateurs (Excel écrit `;;;;`). */
const BLANK_CELL = /^[\s;,]*$/;

/** Longueur de la fin de ligne à `pos` (2 pour CRLF, 1 pour LF ou CR seul), 0 sinon. */
const eolLength = (text: string, pos: number): number => {
  if (text[pos] === '\r') return text[pos + 1] === '\n' ? 2 : 1;
  return text[pos] === '\n' ? 1 : 0;
};

/** Position dans le texte et numéro de la ligne physique (une ligne vide compte). */
type Cursor = { pos: number; line: number };

/**
 * Première ligne non vide, hors guillemets : le séparateur le plus fréquent, `;` en cas
 * d'égalité ou d'absence. Une ligne faite seulement d'espaces et de séparateurs est sautée.
 */
const detectSeparator = (text: string): CsvSeparator => {
  let start = 0;
  while (start < text.length) {
    const counts = new Map<string, number>(SEPARATORS.map((sep) => [sep, 0]));
    let inQuotes = false;
    let meaningful = false;
    let i = start;
    for (; i < text.length; i += 1) {
      const ch = text[i] as string;
      if (ch === '"') inQuotes = !inQuotes;
      else if (!inQuotes && eolLength(text, i) > 0) break;
      else if (!inQuotes && counts.has(ch)) counts.set(ch, (counts.get(ch) as number) + 1);
      else if (!BLANK_CELL.test(ch)) meaningful = true;
    }
    if (meaningful) {
      let best: CsvSeparator = ';';
      for (const sep of SEPARATORS) {
        if ((counts.get(sep) as number) > (counts.get(best) as number)) best = sep;
      }
      return best;
    }
    start = i + eolLength(text, i);
  }
  return ';';
};

/** Champ entre guillemets, `cur.pos` sur le guillemet ouvrant ; null s'il n'est jamais fermé. */
const readQuoted = (text: string, cur: Cursor): string | null => {
  let value = '';
  let i = cur.pos + 1;
  let from = i;
  while (i < text.length) {
    if (text[i] === '"') {
      if (text[i + 1] === '"') {
        value += text.slice(from, i + 1);
        i += 2;
        from = i;
        continue;
      }
      cur.pos = i + 1;
      return value + text.slice(from, i);
    }
    const eol = eolLength(text, i);
    if (eol > 0) cur.line += 1;
    i += eol > 0 ? eol : 1;
  }
  return null;
};

/** Une ligne du tableur (elle peut couvrir plusieurs lignes physiques), ou la ligne fautive. */
const readRecord = (
  text: string,
  cur: Cursor,
  sep: CsvSeparator,
): { cells: string[] } | { malformedLine: number } => {
  const cells: string[] = [];
  for (;;) {
    if (text[cur.pos] === '"') {
      const openLine = cur.line;
      const value = readQuoted(text, cur);
      if (value === null) return { malformedLine: openLine };
      const atEnd = cur.pos >= text.length || text[cur.pos] === sep;
      if (!atEnd && eolLength(text, cur.pos) === 0) return { malformedLine: cur.line };
      cells.push(value);
    } else {
      // Sans guillemet ouvrant, un guillemet dans le champ est gardé tel quel (O"Brien).
      let end = cur.pos;
      while (end < text.length && text[end] !== sep && eolLength(text, end) === 0) end += 1;
      cells.push(text.slice(cur.pos, end));
      cur.pos = end;
    }
    if (text[cur.pos] === sep) {
      cur.pos += 1;
      continue;
    }
    cur.pos += eolLength(text, cur.pos);
    cur.line += 1;
    return { cells };
  }
};

/**
 * F-07, SEC-06 : texte d'un CSV en lignes de cellules, l'en-tête en `rows[0]`. Champs rendus
 * tels quels (ni `trim()` ni complétion : 032). Plus de 2 000 lignes de données : refus sans
 * lire la suite.
 */
export const parseCsv = (input: string): ParseResult => {
  let text = input.startsWith('﻿') ? input.slice(1) : input;
  const directive = DIRECTIVE.exec(text);
  if (directive) text = text.slice(directive[0].length);
  const separator = directive ? (directive[1] as CsvSeparator) : detectSeparator(text);
  const rows: CsvRow[] = [];
  const cur: Cursor = { pos: 0, line: 1 };
  while (cur.pos < text.length) {
    const line = cur.line;
    const record = readRecord(text, cur, separator);
    if ('malformedLine' in record) return { reason: 'MALFORMED', line: record.malformedLine };
    if (record.cells.every((cell) => BLANK_CELL.test(cell))) continue;
    if (rows.length > MAX_CSV_DATA_ROWS) return { reason: 'TOO_MANY_ROWS' };
    rows.push({ line, cells: record.cells });
  }
  if (rows.length === 0) return { reason: 'EMPTY' };
  return { separator, rows };
};
