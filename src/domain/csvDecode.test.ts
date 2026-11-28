import {
  bomOnly,
  bomThenInvalid,
  FICTIVE_NAMES,
  fromHex,
  MEMBERS_TEXT,
  membersUtf8,
  membersUtf8Bom,
  membersWindows1252,
  oversizeFile,
  utf16BeFile,
  utf16LeFile,
  xlsxHeader,
} from '@/__fixtures__/csvFiles';
import { decodeCsv, decodeWindows1252, MAX_CSV_BYTES } from '@/domain/csvDecode';

// Oracle des tests seulement : l'appli décode à la main, sans TextDecoder (décision du 2026-11-28).
const oracle1252 = new TextDecoder('windows-1252');

describe('F-07 EX-30 SEC-06 décodage d’un CSV : UTF-8 avec ou sans BOM, sinon Windows-1252', () => {
  it('les fixtures Windows-1252 écrites en hexadécimal disent bien le tableau fictif', () => {
    expect(oracle1252.decode(membersWindows1252())).toBe(MEMBERS_TEXT);
  });

  it('un même tableau en UTF-8 avec BOM, sans BOM et en Windows-1252 donne le même texte', () => {
    expect(decodeCsv(membersUtf8Bom())).toEqual({ text: MEMBERS_TEXT, encoding: 'utf-8' });
    expect(decodeCsv(membersUtf8())).toEqual({ text: MEMBERS_TEXT, encoding: 'utf-8' });
    expect(decodeCsv(membersWindows1252())).toEqual({
      text: MEMBERS_TEXT,
      encoding: 'windows-1252',
    });
  });

  it('les 256 octets de Windows-1252 sont lus comme le TextDecoder de Node (WHATWG)', () => {
    for (let byte = 0; byte < 256; byte += 1) {
      const one = Uint8Array.of(byte);
      expect([byte, decodeWindows1252(one)]).toEqual([byte, oracle1252.decode(one)]);
    }
  });

  it('les octets 0x01 à 0xFF à la suite (UTF-8 invalide) passent par Windows-1252', () => {
    const bytes = new Uint8Array(255).map((_, i) => i + 1);
    expect(decodeCsv(bytes)).toEqual({
      text: oracle1252.decode(bytes),
      encoding: 'windows-1252',
    });
  });

  it('UTF-8 strict : séquences de 2, 3 et 4 octets aux bornes acceptées', () => {
    const text = 'A\u0080߿ࠀ퟿�\u{10000}\u{10FFFF}é€😀';
    expect(decodeCsv(new TextEncoder().encode(text))).toEqual({ text, encoding: 'utf-8' });
  });

  it.each([
    ['octet de suite isolé', '41 80 42'],
    ['séquence tronquée en fin de fichier', '41 c3'],
    ['séquence tronquée par un octet ASCII', '41 e2 82 41'],
    ['sur-longue sur 2 octets', '41 c0 af'],
    ['sur-longue C1', '41 c1 bf'],
    ['sur-longue sur 3 octets', '41 e0 80 af'],
    ['sur-longue sur 4 octets', '41 f0 80 80 af'],
    ['surrogate encodé', '41 ed a0 80'],
    ['au-delà de U+10FFFF', '41 f4 90 80 80'],
    ['octet F5', '41 f5 80 80 80'],
    ['octet FF', '41 ff'],
  ])('UTF-8 invalide (%s) : lu en Windows-1252', (_label, hex) => {
    const bytes = fromHex(hex);
    expect(decodeCsv(bytes)).toEqual({
      text: oracle1252.decode(bytes),
      encoding: 'windows-1252',
    });
  });
});

describe('SEC-06 refus du décodage, en valeur de retour', () => {
  it('MAX_CSV_BYTES vaut 1 Mo', () => {
    expect(MAX_CSV_BYTES).toBe(1024 * 1024);
  });

  it('1 Mo accepté, 1 Mo et un octet refusé (TOO_LARGE)', () => {
    expect(decodeCsv(new Uint8Array(MAX_CSV_BYTES).fill(0x41))).toMatchObject({
      encoding: 'utf-8',
    });
    expect(decodeCsv(oversizeFile())).toEqual({ reason: 'TOO_LARGE' });
  });

  it('UTF-16 (« Texte Unicode » d’Excel) et .xlsx refusés : NOT_TEXT', () => {
    expect(decodeCsv(utf16LeFile())).toEqual({ reason: 'NOT_TEXT' });
    expect(decodeCsv(utf16BeFile())).toEqual({ reason: 'NOT_TEXT' });
    expect(decodeCsv(xlsxHeader())).toEqual({ reason: 'NOT_TEXT' });
  });

  it('un octet nul, même dans un fichier sinon lisible, donne NOT_TEXT', () => {
    expect(decodeCsv(fromHex('4e 6f 6d 00 3b'))).toEqual({ reason: 'NOT_TEXT' });
    expect(decodeCsv(fromHex('ef bb bf 4e 00'))).toEqual({ reason: 'NOT_TEXT' });
  });

  it('0 octet, BOM seul ou blancs seuls : EMPTY', () => {
    expect(decodeCsv(new Uint8Array(0))).toEqual({ reason: 'EMPTY' });
    expect(decodeCsv(bomOnly())).toEqual({ reason: 'EMPTY' });
    expect(decodeCsv(fromHex('20 0d 0a 09 0a 0d'))).toEqual({ reason: 'EMPTY' });
    expect(decodeCsv(fromHex('ef bb bf 20 0d 0a'))).toEqual({ reason: 'EMPTY' });
  });

  it('BOM UTF-8 suivi d’octets invalides : NOT_TEXT, sans repli sur Windows-1252', () => {
    expect(decodeCsv(bomThenInvalid())).toEqual({ reason: 'NOT_TEXT' });
  });

  it('les noms fictifs à chercher couvrent tous les noms et prénoms du tableau', () => {
    expect(FICTIVE_NAMES).toEqual(expect.arrayContaining(['Maël', 'L’Hôte', 'Chloé', 'Zoé']));
    expect(FICTIVE_NAMES).toHaveLength(10);
  });

  it('ABS-04 SEC-12 : aucun refus ne contient un texte du fichier', () => {
    const named = new TextEncoder().encode(MEMBERS_TEXT);
    const trapped = [
      Uint8Array.of(0xef, 0xbb, 0xbf, ...named, 0xff),
      Uint8Array.of(...named, 0x00),
      Uint8Array.of(0xff, 0xfe, ...named),
    ];
    for (const bytes of trapped) {
      const result = JSON.stringify(decodeCsv(bytes));
      expect(result).toMatch(/"reason"/);
      for (const name of FICTIVE_NAMES) expect(result).not.toContain(name);
    }
  });
});
