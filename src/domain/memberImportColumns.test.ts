// EX-30 : colonnes reconnues d'un import CSV (ticket 032).
import { numbered, OPTIONS } from '@/__fixtures__/importRows';
import {
  type CsvRow,
  type ImportPreview,
  membersToWrite,
  previewImport,
} from '@/domain/memberImport';

const HEADER = ['nom', 'prenom', 'date_naissance', 'telephone', 'groupe'];

const preview = (rows: CsvRow[]): ImportPreview => {
  const result = previewImport(rows, OPTIONS);
  if (!result.ok) throw new Error(`refus inattendu : ${result.reason}`);
  return result.preview;
};
const lines = (...data: string[][]) => preview(numbered(HEADER, ...data));

describe('EX-30 colonnes reconnues', () => {
  it('EX-30 en-têtes sans casse, accents, espaces, _ ni - ; dans n’importe quel ordre', () => {
    const result = preview(
      numbered(
        [' Groupe ', 'Téléphone d’urgence', 'Date de naissance', 'Prénom', 'NOM'],
        ['Adultes jeudi', '0600000001', '14/03/2015', 'Alix', 'Exemple'],
      ),
    );
    expect(membersToWrite(result)).toEqual([
      {
        lastName: 'Exemple',
        firstName: 'Alix',
        birthDate: '2015-03-14',
        phone: '0600000001',
        groupId: 3,
      },
    ]);
  });

  it.each([
    [['NOM', 'PRENOM', 'naissance', 'tel']],
    [['nom', 'pre-nom', 'date-naissance', "téléphone d'urgence"]],
    [['Nom', 'Prénom', 'DATE_NAISSANCE', 'Téléphone']],
  ])('EX-30 variantes d’en-tête %j', (header) => {
    const result = preview(numbered(header, ['Exemple', 'Alix', '14/03/2015', '0600000001']));
    expect(membersToWrite(result)[0]).toMatchObject({
      birthDate: '2015-03-14',
      phone: '0600000001',
    });
  });

  it('EX-30 colonne en double : la première est lue', () => {
    const result = preview(numbered(['nom', 'prenom', 'nom'], ['Exemple', 'Alix', 'Autre']));
    expect(membersToWrite(result)[0]?.lastName).toBe('Exemple');
  });

  it.each([
    ['sans prénom', numbered(['nom', 'groupe'], ['Exemple', 'Poussins mercredi'])],
    ['sans nom', numbered(['prenom'], ['Alix'])],
    ['aucune ligne', []],
  ])('EX-30 fichier non reconnu %s (MISSING_COLUMNS)', (_case, rows) => {
    expect(previewImport(rows, OPTIONS)).toEqual({ ok: false, reason: 'MISSING_COLUMNS' });
  });

  it('EX-30 en-tête valide sans données : aperçu à zéro', () => {
    expect(lines().counts).toEqual({ rows: 0, toImport: 0, invalid: 0, duplicates: 0 });
  });

  it('EX-30 cellules manquantes vides, en trop ignorées, lignes vides ignorées', () => {
    const result = preview([
      { line: 1, cells: HEADER },
      { line: 2, cells: ['Exemple', 'Alix'] },
      { line: 4, cells: ['', ' ', '', '', ''] },
      { line: 5, cells: ['Essai', 'Bao', '', '', '', 'en trop', 'encore'] },
    ]);
    expect(result.counts).toEqual({ rows: 2, toImport: 2, invalid: 0, duplicates: 0 });
    expect(result.valid.map((v) => v.line)).toEqual([2, 5]);
    expect(membersToWrite(result)[0]).toMatchObject({
      birthDate: null,
      phone: null,
      groupId: null,
    });
  });
});

describe('EX-30 synonymes d’en-tête (changés après contradiction)', () => {
  it.each([
    'Portable',
    'Mobile',
    'Téléphone parent',
    'Téléphone parents',
    'Tel parent',
    'Tél. urgence',
    'tel_urgence',
  ])('EX-30 %j est la colonne téléphone', (phoneHeader) => {
    const rows = numbered(['nom', 'prenom', phoneHeader], ['Exemple', 'Alix', '0600000001']);
    expect(membersToWrite(preview(rows))[0]?.phone).toBe('0600000001');
  });

  it.each(['Date naiss.', 'DDN', 'Naissance', 'date de naissance'])(
    'EX-30 %j est la colonne date de naissance',
    (dateHeader) => {
      const rows = numbered(['nom', 'prenom', dateHeader], ['Exemple', 'Alix', '14/03/2015']);
      expect(membersToWrite(preview(rows))[0]?.birthDate).toBe('2015-03-14');
    },
  );

  it('SEC-06 un en-tête « constructor » ou « __proto__ » n’est pas une colonne', () => {
    const header = ['constructor', '__proto__', 'toString', 'nom', 'prenom', 'hasOwnProperty'];
    const result = preview(numbered(header, ['x', 'y', 'z', 'Exemple', 'Alix', 'w']));
    expect(membersToWrite(result)).toEqual([
      { lastName: 'Exemple', firstName: 'Alix', birthDate: null, phone: null, groupId: null },
    ]);
    expect(previewImport(numbered(['constructor', 'prenom'], ['x', 'Alix']), OPTIONS)).toEqual({
      ok: false,
      reason: 'MISSING_COLUMNS',
    });
  });
});
