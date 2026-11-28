// Écriture d'un CSV (ticket 036, F-08, EX-31, SEC-07) : format pour Excel français et
// neutralisation des formules. Aller-retour avec la lecture du 031 (decodeCsv puis parseCsv).
import { decodeCsv } from '@/domain/csvDecode';
import { parseCsv } from '@/domain/csvParse';
import { BOM, neutralize, toCsv } from '@/domain/csvWrite';

const HEADER = ['Nom', 'Prénom'];
const bytes = (text: string) => new TextEncoder().encode(text);

describe('toCsv (EX-31)', () => {
  it('EX-31 BOM UTF-8, séparateur « ; », CRLF après chaque ligne', () => {
    expect(BOM).toBe('\uFEFF');
    expect(toCsv(HEADER, [['Blanc', 'Zoé']])).toBe('\uFEFFNom;Prénom\r\nBlanc;Zoé\r\n');
  });

  it('EX-31 période vide : BOM, en-tête et un CRLF', () => {
    expect(toCsv(HEADER, [])).toBe('\uFEFFNom;Prénom\r\n');
  });

  it('EX-31 « ; », « " », CR ou LF : champ entre guillemets, « " » doublé', () => {
    expect(toCsv(HEADER, [['Dupont;Martin', 'Zoé "Zaza"']])).toBe(
      '\uFEFFNom;Prénom\r\n"Dupont;Martin";"Zoé ""Zaza"""\r\n',
    );
    expect(toCsv(HEADER, [['A\nB', 'C\rD']])).toBe('\uFEFFNom;Prénom\r\n"A\nB";"C\rD"\r\n');
  });

  it('SEC-07 virgule ou tabulation dans la cellule : entre guillemets', () => {
    expect(toCsv(HEADER, [['A, B', 'a\tb']])).toBe('\uFEFFNom;Prénom\r\n"A, B";"a\tb"\r\n');
  });
});

describe('neutralize (SEC-07)', () => {
  it.each([
    ['=1+1', "'=1+1"],
    ['+33612345678', "'+33612345678"],
    ['-Marie', "'-Marie"],
    ['@SOMME(A1)', "'@SOMME(A1)"],
    ['\tTab', "'\tTab"],
    ['\rRetour', "'\rRetour"],
  ])('SEC-07 « %j » en tête neutralisé', (input, expected) => {
    expect(neutralize(input)).toBe(expected);
  });

  it.each([
    [' =1+1', "' =1+1"],
    ['\u00A0=1', "'\u00A0=1"],
    ['\u200B=1', "'\u200B=1"],
    ['\u2066\u202E\uFEFF\u061C\u2060@SOMME', "'\u2066\u202E\uFEFF\u061C\u2060@SOMME"],
    ['\u200F  -2', "'\u200F  -2"],
  ])(
    'SEC-07 « %j » : premier caractère visible après espaces et invisibles neutralisé',
    (input, expected) => {
      expect(neutralize(input)).toBe(expected);
    },
  );

  it.each([
    ['Dupont,=HYPERLINK("x")', 'Dupont,\'=HYPERLINK("x")'],
    ['a\t=1', "a\t'=1"],
    ['a;+1', "a;'+1"],
    ['A, -B, @C', "A, '-B, '@C"],
    ['a,\u200B=1', "a,\u200B'=1"],
  ])('SEC-07 « %j » : caractère de formule après un séparateur neutralisé', (input, expected) => {
    expect(neutralize(input)).toBe(expected);
  });

  it('SEC-07 cellule DDE neutralisée', () => {
    expect(neutralize("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
    expect(neutralize("@SUM(1+1)*cmd|' /C calc'!A0")).toBe("'@SUM(1+1)*cmd|' /C calc'!A0");
  });

  it.each(['Marie-Ève', "O'Brien", 'Zoé', '', '1=1', 'a@b', 'Benjamins, Vétérans', '  '])(
    'SEC-07 « %s » intact (premier caractère seulement)',
    (input) => {
      expect(neutralize(input)).toBe(input);
    },
  );

  it('SEC-07 neutralisé d’abord, puis mis entre guillemets', () => {
    expect(toCsv(['A'], [['=HYPERLINK("x";"y")'], ['\rX']])).toBe(
      '\uFEFFA\r\n"\'=HYPERLINK(""x"";""y"")"\r\n"\'\rX"\r\n',
    );
  });

  it('SEC-07 l’en-tête est neutralisé comme les autres cellules', () => {
    expect(toCsv(['=A'], [])).toBe("\uFEFF'=A\r\n");
  });
});

describe('Aller-retour avec la lecture du 031', () => {
  it('EX-31 SEC-07 decodeCsv puis parseCsv rend les cellules écrites, neutralisées', () => {
    const rows = [
      ['=1+1', '-Marie'],
      ['@SOMME', "O'Brien"],
      ['Dupont;Martin', 'Zoé "Zaza"'],
      ['Marie-Ève', 'Ligne\r\ncoupée'],
      [' =1+1', '\u200B=1'],
      ['Dupont,=HYPERLINK("x")', 'a\t=1'],
      ["=cmd|' /C calc'!A0", 'A, B'],
    ];
    const decoded = decodeCsv(bytes(toCsv(HEADER, rows)));
    if (!('text' in decoded)) throw new Error('décodage refusé');
    expect(decoded.encoding).toBe('utf-8');
    const parsed = parseCsv(decoded.text);
    if (!('rows' in parsed)) throw new Error('lecture refusée');
    expect(parsed.separator).toBe(';');
    expect(parsed.rows.map((r) => r.cells)).toEqual([
      HEADER,
      ["'=1+1", "'-Marie"],
      ["'@SOMME", "O'Brien"],
      ['Dupont;Martin', 'Zoé "Zaza"'],
      ['Marie-Ève', 'Ligne\r\ncoupée'],
      ["' =1+1", "'\u200B=1"],
      ['Dupont,\'=HYPERLINK("x")', "a\t'=1"],
      ["'=cmd|' /C calc'!A0", 'A, B'],
    ]);
  });
});
