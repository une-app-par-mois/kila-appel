// Fichiers CSV fictifs et piégés, en octets (ticket 031, SEC-06). Réutilisés par 032, 034 et la
// campagne Maestro (042). Noms fictifs. Les fichiers Windows-1252 sont écrits en hexadécimal ; le
// TextDecoder de Node sert seulement à les vérifier dans les tests. Gros fichiers fabriqués ici.
import { MAX_CSV_BYTES } from '@/domain/csvDecode';

/** Octets d'un texte hexadécimal (« 4e 6f 6d »), espaces et retours à la ligne ignorés. */
export const fromHex = (hex: string): Uint8Array => {
  const digits = hex.replace(/\s+/g, '');
  const bytes = new Uint8Array(digits.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(digits.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

/** Tableau fictif attendu, avec les lettres qui changent d'un encodage à l'autre (Œ, ’, é, ë, ç). */
export const MEMBERS_TABLE: readonly (readonly string[])[] = [
  ['Nom', 'Prénom', 'Date de naissance', 'Téléphone', 'Groupe'],
  ['Martin', 'Zoé', '12/03/2012', '06 00 00 00 01', 'U13'],
  ['Lefèvre', 'Léo', '', '', 'U11'],
  ['Noël', 'Françoise', '', '', ''],
  ['Œillet', 'Maël', '', '', 'U13'],
  ['L’Hôte', 'Chloé', '', '07 00 00 00 02', 'U11'],
];

/** Noms fictifs du tableau : aucun ne doit apparaître dans un refus (ABS-04, SEC-12). */
export const FICTIVE_NAMES: readonly string[] = MEMBERS_TABLE.slice(1).flatMap((row) =>
  row.slice(0, 2),
);

/** Le tableau tel qu'Excel l'enregistre : `;` et CRLF. */
export const MEMBERS_TEXT = `${MEMBERS_TABLE.map((row) => row.join(';')).join('\r\n')}\r\n`;

const UTF8_BOM = fromHex('ef bb bf');

/** « CSV UTF-8 » d'Excel : BOM puis UTF-8. */
export const membersUtf8Bom = (): Uint8Array => concat(UTF8_BOM, utf8(MEMBERS_TEXT));

/** LibreOffice, Google Sheets : UTF-8 sans BOM. */
export const membersUtf8 = (): Uint8Array => utf8(MEMBERS_TEXT);

/** « CSV (séparateur : point-virgule) » d'Excel français : Windows-1252, une ligne par ligne. */
export const membersWindows1252 = (): Uint8Array =>
  fromHex(`
    4e 6f 6d 3b 50 72 e9 6e 6f 6d 3b 44 61 74 65 20 64 65 20 6e 61 69 73 73 61 6e 63 65 3b 54 e9
    6c e9 70 68 6f 6e 65 3b 47 72 6f 75 70 65 0d 0a
    4d 61 72 74 69 6e 3b 5a 6f e9 3b 31 32 2f 30 33 2f 32 30 31 32 3b 30 36 20 30 30 20 30 30 20
    30 30 20 30 31 3b 55 31 33 0d 0a
    4c 65 66 e8 76 72 65 3b 4c e9 6f 3b 3b 3b 55 31 31 0d 0a
    4e 6f eb 6c 3b 46 72 61 6e e7 6f 69 73 65 3b 3b 3b 0d 0a
    8c 69 6c 6c 65 74 3b 4d 61 eb 6c 3b 3b 3b 55 31 33 0d 0a
    4c 92 48 f4 74 65 3b 43 68 6c 6f e9 3b 3b 30 37 20 30 30 20 30 30 20 30 30 20 30 32 3b 55 31
    31 0d 0a
  `);

/** Texte du fichier MacRoman ci-dessous. */
export const MAC_ROMAN_TEXT =
  'Nom;Prénom\r\nMartin;Zoé\r\nNoël;Françoise\r\nLefèvre;Léo\r\nL’Hôte;Zoé\r\n';

/** « CSV (Macintosh) » d'Excel : MacRoman (é 8E, ë 91, ç 8D, è 8F, ô 99, ’ D5). Refusé (SEC-06). */
export const membersMacRoman = (): Uint8Array =>
  fromHex(`
    4e 6f 6d 3b 50 72 8e 6e 6f 6d 0d 0a
    4d 61 72 74 69 6e 3b 5a 6f 8e 0d 0a
    4e 6f 91 6c 3b 46 72 61 6e 8d 6f 69 73 65 0d 0a
    4c 65 66 8f 76 72 65 3b 4c 8e 6f 0d 0a
    4c d5 48 99 74 65 3b 5a 6f 8e 0d 0a
  `);

/** Windows-1252 avec Ž et ž (8E, 9E) mais plus de lettres accentuées en C0–FF : « Žižek;Hélène ». */
export const slavicWindows1252 = (): Uint8Array =>
  fromHex('4e 6f 6d 3b 50 72 e9 6e 6f 6d 0d 0a 8e 69 9e 65 6b 3b 48 e9 6c e8 6e 65 0d 0a');

/** « Texte Unicode » d'Excel : BOM UTF-16 LE, puis « Nom » sur deux octets par lettre. */
export const utf16LeFile = (): Uint8Array => fromHex('ff fe 4e 00 6f 00 6d 00');

/** UTF-16 BE avec BOM. */
export const utf16BeFile = (): Uint8Array => fromHex('fe ff 00 4e 00 6f 00 6d');

/** Début d'un classeur `.xlsx` (archive zip : « PK », version, octets nuls). */
export const xlsxHeader = (): Uint8Array =>
  fromHex('50 4b 03 04 14 00 06 00 08 00 00 00 21 00 5b 43 6f 6e 74 65 6e 74 5f 54 79 70 65 73');

/** BOM UTF-8 suivi d'un « é » Windows-1252 (octet invalide en UTF-8). */
export const bomThenInvalid = (): Uint8Array => concat(UTF8_BOM, fromHex('4e 6f e9 6c'));

/** BOM UTF-8 seul. */
export const bomOnly = (): Uint8Array => UTF8_BOM;

/** Fichier de 1 Mo et un octet : refusé avant toute lecture (SEC-06). */
export const oversizeFile = (): Uint8Array => new Uint8Array(MAX_CSV_BYTES + 1).fill(0x41);

/** Texte d'un en-tête et de `dataRows` lignes de données fictives, séparées par `;` et CRLF. */
export const manyRowsText = (dataRows: number): string => {
  const lines = ['Nom;Prénom'];
  for (let i = 1; i <= dataRows; i += 1) lines.push(`Membre${i};Fictif`);
  return `${lines.join('\r\n')}\r\n`;
};
