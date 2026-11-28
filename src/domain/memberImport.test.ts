// EX-30 : aperçu d'un import CSV calculé avant toute écriture (ticket 032).
import { EXISTING, GROUPS, MOCKUP_ROWS, numbered, OPTIONS } from '@/__fixtures__/importRows';
import { type ImportPreview, membersToWrite, previewImport } from '@/domain/memberImport';

const HEADER = ['nom', 'prenom', 'date_naissance', 'telephone', 'groupe'];

const preview = (rows = MOCKUP_ROWS, options = OPTIONS): ImportPreview => {
  const result = previewImport(rows, options);
  if (!result.ok) throw new Error(`refus inattendu : ${result.reason}`);
  return result.preview;
};
/** Aperçu des lignes de données données sous l'en-tête standard (lignes 2, 3…). */
const lines = (...data: string[][]) => preview(numbered(HEADER, ...data));

describe('EX-30 aperçu du fichier de la maquette', () => {
  it('EX-30 24 lignes : 21 à importer, 1 invalide (ligne 17 : prénom manquant), 2 doublons', () => {
    const result = preview();
    expect(result.counts).toEqual({ rows: 24, toImport: 21, invalid: 1, duplicates: 2 });
    expect(result.invalid).toEqual([{ line: 17, field: 'firstName', code: 'NAME_REQUIRED' }]);
    expect(result.duplicates.map((d) => [d.line, d.source])).toEqual([
      [9, 'app'],
      [23, 'app'],
    ]);
    expect(result.unknownGroups).toEqual([{ line: 12, group: 'Poussin mercredi' }]);
    expect(membersToWrite(result)).toHaveLength(21);
    expect(membersToWrite(result).filter((m) => m.groupId !== null)).toHaveLength(18);
  });

  it('EX-30 lit chaque champ : dates des trois formes, téléphone complété, groupe trouvé', () => {
    const [rose, adam, louise] = membersToWrite(preview());
    expect(rose).toEqual({
      lastName: 'André',
      firstName: 'Rose',
      birthDate: '2016-09-03',
      phone: '0600000001',
      groupId: 1,
    });
    expect(adam).toMatchObject({ birthDate: '2014-05-21', phone: '0600000002', groupId: 2 });
    expect(louise).toMatchObject({ birthDate: '2016-01-07', phone: null });
  });

  it('ABS-03 la liste à écrire ne contient que les 5 champs (colonne licence ignorée)', () => {
    for (const member of membersToWrite(preview(), [9, 23])) {
      expect(Object.keys(member).sort()).toEqual([
        'birthDate',
        'firstName',
        'groupId',
        'lastName',
        'phone',
      ]);
    }
    expect(JSON.stringify(preview())).not.toContain('L-001');
  });
});

describe('EX-30 SEC-06 lignes invalides', () => {
  const long = 'x'.repeat(101);
  it.each([
    ['nom vide', ['', 'Alix'], 'lastName', 'NAME_REQUIRED'],
    [
      'nom de 101 caractères avant une date fausse',
      [long, 'Alix', '31/02/2016'],
      'lastName',
      'NAME_TOO_LONG',
    ],
    ['tabulation dans le prénom', ['Exemple', 'Al\tix'], 'firstName', 'NAME_INVALID_CHAR'],
    ['prénom de 101 caractères', ['Exemple', long], 'firstName', 'NAME_TOO_LONG'],
    ['date et téléphone faux', ['Exemple', 'Alix', '02/05/16', '12'], 'birthDate', 'DATE_INVALID'],
    ['date future', ['Exemple', 'Alix', '01/01/2027'], 'birthDate', 'DATE_IN_FUTURE'],
    [
      'téléphone en notation scientifique',
      ['Exemple', 'Alix', '', '6,00E+08'],
      'phone',
      'PHONE_INVALID',
    ],
  ])('SEC-06 %s : un seul motif, le premier trouvé', (_case, cells, field, code) => {
    const result = lines(cells);
    expect(result.invalid).toEqual([{ line: 2, field, code }]);
    expect(result.counts).toMatchObject({ rows: 1, toImport: 0, invalid: 1 });
  });

  it('SEC-06 accepte un nom et un prénom de 100 caractères', () => {
    expect(lines(['x'.repeat(100), 'é'.repeat(100)]).counts.toImport).toBe(1);
  });

  it('ABS-04 un motif ne porte ni nom ni cellule : ligne, champ et code seulement', () => {
    const result = lines(['Exemple', 'Alix', '14.03.17']);
    expect(Object.keys(result.invalid[0] ?? {}).sort()).toEqual(['code', 'field', 'line']);
  });

  it('EX-30 une ligne invalide n’est jamais un doublon', () => {
    const result = lines(['Garcia', 'Léo', '14/03/2017', '12']);
    expect(result.counts).toMatchObject({ invalid: 1, duplicates: 0 });
  });

  it('garde un = en tête tel quel (neutralisé à l’export, ticket 036)', () => {
    expect(membersToWrite(lines(['=Exemple', 'Alix']))[0]?.lastName).toBe('=Exemple');
  });
});

describe('EX-30 doublons', () => {
  const sources = (result: ImportPreview) => result.duplicates.map((d) => [d.line, d.source]);

  it('EX-30 doublon avec date (Léo Garcia, 14/03/2017) et sans date (Zoé Blanc)', () => {
    const result = lines(['Garcia', 'Léo', '14/03/2017'], ['Blanc', 'Zoé', '02/05/2016']);
    expect(sources(result)).toEqual([
      [2, 'app'],
      [3, 'app'],
    ]);
  });

  it('EX-30 « ZOÉ blanc » est un doublon de « Zoé Blanc » ; NFD, espaces et ’ comparés', () => {
    const options = {
      ...OPTIONS,
      existingMembers: [
        ...EXISTING,
        { id: 13, lastName: "O'Brien", firstName: 'Jean Luc', birthDate: null, archivedAt: null },
      ],
    };
    const result = preview(
      numbered(HEADER, ['blanc', 'ZOÉ'], ['Blanc', 'Zoe\u0301'], ['O’Brien', ' Jean   Luc ']),
      options,
    );
    expect(result.counts).toMatchObject({ duplicates: 3, toImport: 0 });
  });

  it('EX-30 un doublon de l’appli porte l’identifiant du membre et son archivage', () => {
    const [garcia, blanc] = preview().duplicates;
    expect(garcia).toMatchObject({ source: 'app', memberId: 11, archived: false });
    expect(blanc).toMatchObject({ source: 'app', memberId: 12, archived: true });
  });

  it('EX-30 même nom, autre date : pas un doublon', () => {
    const result = lines(['Garcia', 'Léo', '15/03/2017']);
    expect(result.counts).toMatchObject({ duplicates: 0, toImport: 1 });
  });

  it('EX-30 doublon interne au fichier, contre les lignes valides précédentes seulement', () => {
    const result = lines(
      ['Exemple', 'Alix', '31/02/2016'],
      ['Exemple', 'Alix', '14/03/2015'],
      ['exemple', 'alix', ''],
    );
    expect(result.invalid.map((i) => i.line)).toEqual([2]);
    expect(result.valid.map((v) => v.line)).toEqual([3]);
    expect(sources(result)).toEqual([[4, 'file']]);
  });

  it('EX-30 doublons ignorés par défaut ; un doublon gardé est importé', () => {
    const result = preview();
    expect(membersToWrite(result).some((m) => m.lastName === 'Garcia')).toBe(false);
    const kept = membersToWrite(result, [9]);
    expect(kept).toHaveLength(22);
    expect(kept.map((m) => m.lastName).indexOf('Garcia')).toBe(7);
    expect(kept.find((m) => m.lastName === 'Garcia')).toMatchObject({ groupId: 1 });
  });
});

describe('EX-04 groupe de l’import', () => {
  const groupOf = (group: string, options = OPTIONS) => {
    const result = preview(numbered(HEADER, ['Exemple', 'Alix', '', '', group]), options);
    return { groupId: result.valid[0]?.member.groupId, unknown: result.unknownGroups };
  };

  it('EX-04 groupe trouvé sans casse ni accents', () => {
    expect(groupOf(' adultes JEUDI ')).toEqual({ groupId: 3, unknown: [] });
    expect(groupOf('benjamins lundi')).toEqual({ groupId: 2, unknown: [] });
  });

  it.each([
    ['archivé', 'Éveil samedi'],
    ['d’une autre saison', 'Minimes vendredi'],
    ['inconnu', 'Poussin mercredi'],
  ])('EX-04 groupe %s non trouvé : importé sans groupe, signalé', (_case, group) => {
    expect(groupOf(group)).toEqual({ groupId: null, unknown: [{ line: 2, group }] });
  });

  it('EX-04 sans saison active, ou deux groupes de ce nom : groupe introuvable', () => {
    expect(groupOf('Adultes jeudi', { ...OPTIONS, activeSeasonId: null }).groupId).toBeNull();
    const twice = [...GROUPS, { id: 9, seasonId: 1, name: 'ADULTES jeudi', archivedAt: null }];
    expect(groupOf('Adultes jeudi', { ...OPTIONS, groups: twice })).toEqual({
      groupId: null,
      unknown: [{ line: 2, group: 'Adultes jeudi' }],
    });
  });

  it('EX-04 cellule groupe vide : sans groupe, sans signal', () => {
    expect(groupOf('  ')).toEqual({ groupId: null, unknown: [] });
  });

  it('EX-30 doublon au groupe introuvable : pas dans la section, mais sur le doublon', () => {
    const result = lines(
      ['Garcia', 'Léo', '', '', 'Poussin mercredi'],
      ['Blanc', 'Zoé', '', '', 'Adultes jeudi'],
    );
    expect(result.unknownGroups).toEqual([]);
    expect(result.duplicates.map((d) => d.unknownGroup)).toEqual(['Poussin mercredi', null]);
    // Décision du porteur du 2026-11-28 : groupe trouvé porté par le doublon (inscription au 034).
    expect(result.duplicates.map((d) => d.member.groupId)).toEqual([null, 3]);
  });

  it("EX-04 groupe comparé comme un nom : espaces réduits, ’ ramené à '", () => {
    const groups = [...GROUPS, { id: 8, seasonId: 1, name: "Groupe d'Alix", archivedAt: null }];
    expect(groupOf(' Adultes   jeudi ').groupId).toBe(3);
    expect(groupOf('groupe d’alix', { ...OPTIONS, groups }).groupId).toBe(8);
  });
});

describe('ABS-04 jour invalide', () => {
  it('refuse un jour qui n’est pas AAAA-MM-JJ, sans la valeur', () => {
    expect(() => previewImport(MOCKUP_ROWS, { ...OPTIONS, today: '28/11/2026' })).toThrow(
      'Jour de l’import invalide (RM-04)',
    );
  });
});
