import {
  FICTIVE_NAMES,
  MEMBERS_TABLE,
  manyRowsText,
  membersUtf8,
  membersUtf8Bom,
  membersWindows1252,
} from '@/__fixtures__/csvFiles';
import { decodeCsv } from '@/domain/csvDecode';
import { MAX_CSV_DATA_ROWS, parseCsv } from '@/domain/csvParse';

describe('F-07 EX-30 SEC-06 un même tableau dans les trois encodages d’Excel', () => {
  it.each([
    ['UTF-8 avec BOM', membersUtf8Bom],
    ['UTF-8 sans BOM', membersUtf8],
    ['Windows-1252', membersWindows1252],
  ])('%s : exactement les mêmes lignes', (_label, file) => {
    const decoded = decodeCsv(file());
    if ('reason' in decoded) throw new Error(decoded.reason);
    expect(parseCsv(decoded.text)).toEqual({
      separator: ';',
      rows: MEMBERS_TABLE.map((cells, i) => ({ line: i + 1, cells })),
    });
  });
});

describe('SEC-06 limite de 2 000 lignes de données', () => {
  it('MAX_CSV_DATA_ROWS vaut 2 000', () => {
    expect(MAX_CSV_DATA_ROWS).toBe(2000);
  });

  it('2 000 lignes de données acceptées (en-tête non compté)', () => {
    const result = parseCsv(manyRowsText(2000));
    if ('reason' in result) throw new Error(result.reason);
    expect(result.rows).toHaveLength(2001);
    expect(result.rows[2000]).toEqual({ line: 2001, cells: ['Membre2000', 'Fictif'] });
  });

  it('2 001 lignes de données refusées : TOO_MANY_ROWS', () => {
    expect(parseCsv(manyRowsText(2001))).toEqual({ reason: 'TOO_MANY_ROWS' });
  });

  it('lignes vides non comptées : 2 000 lignes et des lignes vides restent acceptées', () => {
    const text = manyRowsText(2000).replace(/\r\n/g, '\r\n;;\r\n\r\n');
    const result = parseCsv(text);
    if ('reason' in result) throw new Error(result.reason);
    expect(result.rows).toHaveLength(2001);
  });

  it('refus dès la 2 001e ligne, sans lire la suite (guillemet non fermé plus loin ignoré)', () => {
    expect(parseCsv(`${manyRowsText(2001)}"non fermé\n`)).toEqual({ reason: 'TOO_MANY_ROWS' });
  });

  it('en-tête sans données : pas un refus', () => {
    expect(parseCsv('Nom;Prénom\r\n')).toEqual({
      separator: ';',
      rows: [{ line: 1, cells: ['Nom', 'Prénom'] }],
    });
  });
});

describe('SEC-06 texte vide', () => {
  it.each([
    ['vide', ''],
    ['blancs seuls', ' \r\n\t\n'],
    ['séparateurs seuls', ';;;\r\n,,\r\n'],
    ['directive seule', 'sep=;\r\n'],
    ['BOM seul', '﻿'],
  ])('%s : EMPTY', (_label, text) => {
    expect(parseCsv(text)).toEqual({ reason: 'EMPTY' });
  });

  it('BOM en tête d’un texte reçu tel quel : retiré', () => {
    expect(parseCsv('﻿Nom;Prénom\n')).toMatchObject({
      rows: [{ line: 1, cells: ['Nom', 'Prénom'] }],
    });
  });
});

describe('ABS-04 SEC-12 aucun refus ne contient un texte du fichier', () => {
  it.each([
    ['guillemet non fermé', 'Nom;Prénom\n"Martin;Zoé\nLefèvre;Léo\n'],
    ['texte après guillemet', 'Nom;Prénom\n"Noël"Françoise;Œillet\n'],
    ['trop de lignes', `${manyRowsText(2001)}Martin;Zoé\n`],
    ['séparateurs seuls', ';;;\n'],
  ])('%s', (_label, text) => {
    const result = parseCsv(text);
    expect(result).toHaveProperty('reason');
    const serialized = JSON.stringify(result);
    for (const name of FICTIVE_NAMES) expect(serialized).not.toContain(name);
    expect(Object.keys(result).every((key) => key === 'reason' || key === 'line')).toBe(true);
  });
});
