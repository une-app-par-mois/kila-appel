// EX-30, EX-03, RM-04, SEC-06 : lecture d'une cellule d'un CSV d'import (ticket 032).
import { parseImportDate, parseImportPhone, readImportName } from '@/domain/importFields';

const TODAY = '2026-11-28';
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return 'aucune erreur';
};

describe('EX-30 RM-04 date de naissance d’un import', () => {
  it.each([
    ['14/03/2017', '2017-03-14'],
    ['4/3/2017', '2017-03-04'],
    ['04/3/2017', '2017-03-04'],
    ['2017-03-14', '2017-03-14'],
    ['  14/03/2017  ', '2017-03-14'],
    ['29/02/2016', '2016-02-29'],
    // Contradiction du 032 : points et tirets d'Excel ou de LibreOffice, heure nulle.
    ['14.03.2017', '2017-03-14'],
    ['4.3.2017', '2017-03-04'],
    ['14-03-2017', '2017-03-14'],
    ['4-3-2017', '2017-03-04'],
    ['2017-03-14 00:00', '2017-03-14'],
    ['2017-03-14 00:00:00', '2017-03-14'],
    [TODAY, TODAY],
  ])('RM-04 lit %j en %s', (cell, iso) => {
    expect(parseImportDate(cell, TODAY)).toBe(iso);
  });

  it.each(['', '   '])('cellule vide %j : aucune date', (cell) => {
    expect(parseImportDate(cell, TODAY)).toBeNull();
  });

  it.each([
    '31/02/2016',
    '02/05/16',
    '14.03.17',
    '14.03-2017',
    '14/03-2017',
    '14/03/2017 00:00',
    '2017-03-14T00:00',
    '2017-03-14 08:30',
    '2017-03-14 00:00:01',
    '2017-03-14  00:00',
    '2017-3-14',
    '31/12/1899',
    '14/13/2017',
    '42809',
    'mars 2017',
  ])('RM-04 refuse %j (DATE_INVALID)', (cell) => {
    expect(code(() => parseImportDate(cell, TODAY))).toBe('DATE_INVALID');
  });

  it('EX-03 refuse une date de naissance future (DATE_IN_FUTURE)', () => {
    expect(code(() => parseImportDate('29/11/2026', TODAY))).toBe('DATE_IN_FUTURE');
  });

  it('ABS-04 l’erreur ne contient pas la cellule', () => {
    try {
      parseImportDate('14.03.17', TODAY);
    } catch (error) {
      expect(String(error)).not.toContain('14.03');
    }
    expect.assertions(1);
  });
});

describe('EX-30 EX-05 téléphone d’un import', () => {
  it.each([
    ['0600000001', '0600000001'],
    ['600000001', '0600000001'],
    ['6 00 00 00 01', '0600000001'],
    ['6.00.00.00.01', '0600000001'],
    ['06-00-00-00-01', '0600000001'],
    ['+33600000001', '0600000001'],
    ['33600000001', '0600000001'],
    ['33 6 00 00 00 01', '0600000001'],
    [' 0600000001 ', '0600000001'],
  ])('lit %j en %s (zéro d’Excel remis devant 9 chiffres)', (cell, phone) => {
    expect(parseImportPhone(cell)).toBe(phone);
  });

  it.each(['', '  '])('cellule vide %j : aucun téléphone', (cell) => {
    expect(parseImportPhone(cell)).toBeNull();
  });

  it.each([
    '6,00E+08',
    '0033600000001',
    '33060000000',
    '336000000011',
    '060000000',
    '012345678',
    '06000000011',
    '+3360000000',
    '12',
  ])('refuse %j (PHONE_INVALID)', (cell) => {
    expect(code(() => parseImportPhone(cell))).toBe('PHONE_INVALID');
  });
});

describe('EX-30 nom et prénom d’un import', () => {
  it('retire les espaces autour et écrit le nom en NFC', () => {
    const decomposed = 'Zoe\u0301';
    expect(readImportName(`  ${decomposed} `)).toBe('Zoé');
    expect(readImportName(` ${decomposed} `)).toHaveLength(3);
  });

  it('garde un = en tête tel quel (neutralisé à l’export, ticket 036)', () => {
    expect(readImportName('=Exemple')).toBe('=Exemple');
  });
});
