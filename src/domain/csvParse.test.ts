import { parseCsv } from '@/domain/csvParse';

const cellsOf = (text: string) => {
  const result = parseCsv(text);
  if ('reason' in result) throw new Error(result.reason);
  return result.rows.map((row) => row.cells);
};

const linesOf = (text: string) => {
  const result = parseCsv(text);
  if ('reason' in result) throw new Error(result.reason);
  return result.rows.map((row) => row.line);
};

describe('F-07 EX-30 lecture d’un CSV : guillemets RFC 4180', () => {
  it('séparateur, virgule et retour à la ligne dans un champ entre guillemets : un seul champ', () => {
    expect(
      cellsOf('Nom;Note\r\n"Martin; Zoé";"a, b"\r\n"Lefèvre";"ligne 1\r\nligne 2"\r\n'),
    ).toEqual([
      ['Nom', 'Note'],
      ['Martin; Zoé', 'a, b'],
      ['Lefèvre', 'ligne 1\r\nligne 2'],
    ]);
  });

  it('"" dans un champ entre guillemets donne un guillemet', () => {
    expect(cellsOf('Nom;Surnom\n"Noël";"dit ""Nono"""\n')).toEqual([
      ['Nom', 'Surnom'],
      ['Noël', 'dit "Nono"'],
    ]);
  });

  it('champ vide entre guillemets, et champ réduit à ""', () => {
    expect(cellsOf('Nom;Prénom;Groupe\n"";Léo;""""\n')).toEqual([
      ['Nom', 'Prénom', 'Groupe'],
      ['', 'Léo', '"'],
    ]);
  });

  it('guillemet au milieu d’un champ sans guillemets gardé tel quel (O"Brien)', () => {
    expect(cellsOf('Nom;Prénom\nO"Brien;Zoé\nAb"c"d;"e"\n')).toEqual([
      ['Nom', 'Prénom'],
      ['O"Brien', 'Zoé'],
      ['Ab"c"d', 'e'],
    ]);
  });

  it('espaces autour d’un champ entre guillemets ignorés (Martin, "Dupont, Léa" )', () => {
    expect(cellsOf('Nom,Prénom\nMartin, "Dupont, Léa" \n "Noël"  ,Zoé\n')).toEqual([
      ['Nom', 'Prénom'],
      ['Martin', 'Dupont, Léa'],
      ['Noël', 'Zoé'],
    ]);
  });

  it('guillemet suivi d’espaces puis d’un autre texte : MALFORMED', () => {
    expect(parseCsv('Nom;Prénom\n"Martin" x;Zoé\n')).toEqual({ reason: 'MALFORMED', line: 2 });
  });

  it('guillemet non fermé : MALFORMED avec la ligne du tableur où il s’ouvre', () => {
    expect(parseCsv('Nom;Prénom\nMartin;Zoé\n"Léo;Lefèvre\nNoël;Françoise\n')).toEqual({
      reason: 'MALFORMED',
      line: 3,
    });
  });

  it('texte après un guillemet fermant : MALFORMED avec la ligne du tableur', () => {
    expect(parseCsv('Nom;Prénom\n"Martin"x;Zoé\n')).toEqual({ reason: 'MALFORMED', line: 2 });
    expect(parseCsv('Nom;Prénom\n"a\nb"\n\n"c\nd"x;Zoé\n')).toEqual({
      reason: 'MALFORMED',
      line: 4,
    });
  });
});

describe('F-07 numéros de ligne du tableur', () => {
  it('en-tête = 1, lignes vides comptées, un champ sur deux lignes compte pour une', () => {
    const text = 'Nom;Note\n"Martin";"deux\nlignes"\n\nNoël;x\r\n"a\r\n\r\nb";y\nZoé;z';
    expect(linesOf(text)).toEqual([1, 2, 4, 5, 6]);
  });

  it('lignes faites seulement de séparateurs ou d’espaces : ignorées mais comptées', () => {
    const text = 'Nom;Prénom\n;;;;\n  ; \nMartin;Zoé\n"";""\nNoël;Léo\n';
    expect(parseCsv(text)).toEqual({
      separator: ';',
      rows: [
        { line: 1, cells: ['Nom', 'Prénom'] },
        { line: 4, cells: ['Martin', 'Zoé'] },
        { line: 6, cells: ['Noël', 'Léo'] },
      ],
    });
  });

  it('lignes vides avant l’en-tête : l’en-tête garde son numéro', () => {
    expect(linesOf('\n;;\nNom;Prénom\nMartin;Zoé\n')).toEqual([3, 4]);
  });

  it('champs rendus tels quels : ni trim() ni complétion des cellules manquantes', () => {
    expect(cellsOf('Nom;Prénom;Groupe\n Martin ; Zoé\nNoël\n')).toEqual([
      ['Nom', 'Prénom', 'Groupe'],
      [' Martin ', ' Zoé'],
      ['Noël'],
    ]);
  });

  it('dernier champ vide gardé (Excel écrit « Noël;; »)', () => {
    expect(cellsOf('A;B;C\nNoël;;\n')).toEqual([
      ['A', 'B', 'C'],
      ['Noël', '', ''],
    ]);
  });
});

describe('F-07 fins de ligne CRLF, LF et CR seul', () => {
  it.each([
    ['CRLF', '\r\n'],
    ['LF', '\n'],
    ['CR', '\r'],
  ])('%s', (_label, eol) => {
    const text = ['Nom;Prénom', 'Martin;Zoé', '', 'Noël;Léo'].join(eol);
    expect(parseCsv(`${text}${eol}`)).toEqual({
      separator: ';',
      rows: [
        { line: 1, cells: ['Nom', 'Prénom'] },
        { line: 2, cells: ['Martin', 'Zoé'] },
        { line: 4, cells: ['Noël', 'Léo'] },
      ],
    });
  });

  it('sans fin de ligne finale, la dernière ligne est lue', () => {
    expect(cellsOf('Nom;Prénom\nMartin;Zoé')).toEqual([
      ['Nom', 'Prénom'],
      ['Martin', 'Zoé'],
    ]);
  });
});

describe('F-07 détection du séparateur', () => {
  it.each([
    [';', 'Nom;Prénom;Groupe\nMartin;Zoé;U13\n'],
    [',', 'Nom,Prénom,Groupe\nMartin,Zoé,U13\n'],
    ['\t', 'Nom\tPrénom\tGroupe\nMartin\tZoé\tU13\n'],
  ])('« %s » reconnu', (separator, text) => {
    const result = parseCsv(text);
    expect(result).toMatchObject({ separator });
    expect(cellsOf(text)[1]).toEqual(['Martin', 'Zoé', 'U13']);
  });

  it('le plus fréquent sur la première ligne non vide, hors guillemets', () => {
    expect(parseCsv('Nom,Prénom;Groupe,Note\nx\n')).toMatchObject({ separator: ',' });
    expect(parseCsv('"a;b;c",Nom,x\n')).toMatchObject({ separator: ',' });
    expect(parseCsv('\n  \n;;\nNom,Prénom\n')).toMatchObject({ separator: ',' });
    expect(parseCsv('\n\t\t\nNom,Prénom\n')).toMatchObject({ separator: ',' });
  });

  it('mêmes règles de guillemets que la lecture : un guillemet en milieu de champ n’ouvre rien', () => {
    expect(parseCsv('Taille 5",Nom,Prénom\n1,Martin,Zoé\n')).toMatchObject({ separator: ',' });
    expect(parseCsv(' "a;b;c" ,Nom,x\n')).toMatchObject({ separator: ',' });
    // Guillemet suivi d'un autre texte : gardé dans le champ pour la détection, refusé à la lecture.
    expect(parseCsv('"a"b;c",Nom,x\n')).toEqual({ reason: 'MALFORMED', line: 1 });
  });

  it('égalité : « ; » puis tabulation puis « , »', () => {
    expect(parseCsv('a;b,c\n')).toMatchObject({ separator: ';' });
    expect(parseCsv('a\tb,c\n')).toMatchObject({ separator: '\t' });
    expect(parseCsv('a;b\tc\n')).toMatchObject({ separator: ';' });
  });

  it('aucun séparateur (une seule colonne) : « ; »', () => {
    expect(parseCsv('Nom\nMartin\nZoé, Léo\n')).toEqual({
      separator: ';',
      rows: [
        { line: 1, cells: ['Nom'] },
        { line: 2, cells: ['Martin'] },
        { line: 3, cells: ['Zoé, Léo'] },
      ],
    });
  });

  it('directive sep= d’Excel respectée et non lue comme en-tête ; en-tête = 1', () => {
    expect(parseCsv('sep=,\r\nNom;x,Prénom\r\nMartin;y,Zoé\r\n')).toEqual({
      separator: ',',
      rows: [
        { line: 1, cells: ['Nom;x', 'Prénom'] },
        { line: 2, cells: ['Martin;y', 'Zoé'] },
      ],
    });
    expect(parseCsv('SEP=\t\nNom\tPrénom\n')).toMatchObject({ separator: '\t' });
  });

  it('directive suivie seulement de séparateurs ou d’espaces (sep=;;;; ou sep=; )', () => {
    for (const directive of ['sep=;;;;', 'sep=; ', 'sep=;, \t']) {
      expect(parseCsv(`${directive}\r\nNom,x;Prénom\r\n`)).toEqual({
        separator: ';',
        rows: [{ line: 1, cells: ['Nom,x', 'Prénom'] }],
      });
    }
  });

  it('une ligne « sep=… » qui n’est pas la directive reste une ligne de données', () => {
    expect(cellsOf('sep=;Nom\nMartin;Zoé\n')).toEqual([
      ['sep=', 'Nom'],
      ['Martin', 'Zoé'],
    ]);
  });
});
