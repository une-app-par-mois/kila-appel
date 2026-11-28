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

  it.each(['Marie-Ève', "O'Brien", 'Zoé', '', '1=1', 'a@b'])(
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
    ]);
  });
});
