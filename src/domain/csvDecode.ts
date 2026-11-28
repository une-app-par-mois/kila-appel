// Décodage d'un fichier CSV importé (F-07, EX-30, SEC-06). Zone sensible : fichier extérieur lu.
// Domaine pur, décodé à la main (UTF-8 strict, table Windows-1252) : indépendant du moteur
// JavaScript (décision du 2026-11-28). Aucun refus ne contient un morceau du fichier (ABS-04).

/** SEC-06 : taille maximale d'un fichier importé, vérifiée avant la lecture (034) et ici. */
export const MAX_CSV_BYTES = 1024 * 1024;

export type CsvEncoding = 'utf-8' | 'windows-1252';

/** Refus du décodage : code seul, jamais de texte du fichier (ABS-04, SEC-12). */
export type DecodeRefusal = { reason: 'EMPTY' | 'NOT_TEXT' | 'TOO_LARGE' | 'MALFORMED' };

export type DecodeResult = { text: string; encoding: CsvEncoding } | DecodeRefusal;

// Windows-1252, octets 0x80 à 0x9F selon WHATWG (les cinq trous gardent leur point de code) ;
// les autres octets valent leur point de code (Latin-1).
const CP1252_HIGH = [
  0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152,
  0x8d, 0x17d, 0x8f, 0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122,
  0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178,
];

const CHUNK = 8192;

/** Unités UTF-16 en chaîne, par morceaux (pas de pile dépassée sur 1 Mo). */
const unitsToString = (units: number[]): string => {
  let text = '';
  for (let i = 0; i < units.length; i += CHUNK) {
    text += String.fromCharCode(...units.slice(i, i + CHUNK));
  }
  return text;
};

/** Windows-1252 : toujours lisible, chaque octet donne un caractère. */
export const decodeWindows1252 = (bytes: Uint8Array): string => {
  const units: number[] = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i] as number;
    units[i] = byte >= 0x80 && byte <= 0x9f ? (CP1252_HIGH[byte - 0x80] as number) : byte;
  }
  return unitsToString(units);
};

const isContinuation = (byte: number | undefined): boolean =>
  byte !== undefined && byte >= 0x80 && byte <= 0xbf;

/**
 * Longueur et bornes du deuxième octet d'une séquence UTF-8 selon son premier octet (Unicode,
 * tableau 3-7) : refuse les sur-longues (C0, C1, E0 80–9F, F0 80–8F), les surrogates (ED A0–BF)
 * et ce qui dépasse U+10FFFF (F4 90–BF, F5–FF). null : premier octet impossible.
 */
const leadInfo = (lead: number): { length: number; min: number; max: number } | null => {
  if (lead >= 0xc2 && lead <= 0xdf) return { length: 2, min: 0x80, max: 0xbf };
  if (lead === 0xe0) return { length: 3, min: 0xa0, max: 0xbf };
  if (lead === 0xed) return { length: 3, min: 0x80, max: 0x9f };
  if (lead >= 0xe1 && lead <= 0xef) return { length: 3, min: 0x80, max: 0xbf };
  if (lead === 0xf0) return { length: 4, min: 0x90, max: 0xbf };
  if (lead === 0xf4) return { length: 4, min: 0x80, max: 0x8f };
  if (lead >= 0xf1 && lead <= 0xf3) return { length: 4, min: 0x80, max: 0xbf };
  return null;
};

/** UTF-8 strict à partir de `start` ; null à la première séquence invalide. */
const decodeUtf8Strict = (bytes: Uint8Array, start: number): string | null => {
  const units: number[] = [];
  let i = start;
  while (i < bytes.length) {
    const lead = bytes[i] as number;
    if (lead < 0x80) {
      units.push(lead);
      i += 1;
      continue;
    }
    const info = leadInfo(lead);
    const second = bytes[i + 1];
    if (info === null || second === undefined || second < info.min || second > info.max) {
      return null;
    }
    let point = lead & (0xff >> (info.length + 1));
    for (let k = 1; k < info.length; k += 1) {
      const next = bytes[i + k];
      if (!isContinuation(next)) return null;
      point = (point << 6) | ((next as number) & 0x3f);
    }
    if (point >= 0x10000) {
      const offset = point - 0x10000;
      units.push(0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff));
    } else {
      units.push(point);
    }
    i += info.length;
  }
  return unitsToString(units);
};

const hasUtf8Bom = (bytes: Uint8Array): boolean =>
  bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;

const hasUtf16Bom = (bytes: Uint8Array): boolean =>
  (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff);

/**
 * F-07, SEC-06 : octets d'un CSV en texte. BOM UTF-8 retiré ; sinon UTF-8 strict ; sinon
 * Windows-1252. UTF-16 ou octet nul : NOT_TEXT. BOM UTF-8 suivi d'octets invalides : MALFORMED.
 */
export const decodeCsv = (bytes: Uint8Array): DecodeResult => {
  if (bytes.length > MAX_CSV_BYTES) return { reason: 'TOO_LARGE' };
  if (hasUtf16Bom(bytes) || bytes.includes(0)) return { reason: 'NOT_TEXT' };
  let result: { text: string; encoding: CsvEncoding };
  if (hasUtf8Bom(bytes)) {
    const text = decodeUtf8Strict(bytes, 3);
    if (text === null) return { reason: 'MALFORMED' };
    result = { text, encoding: 'utf-8' };
  } else {
    const text = decodeUtf8Strict(bytes, 0);
    result =
      text === null
        ? { text: decodeWindows1252(bytes), encoding: 'windows-1252' }
        : { text, encoding: 'utf-8' };
  }
  if (result.text.trim() === '') return { reason: 'EMPTY' };
  return result;
};
