// SEC-06 (ticket 044b) : liste élargie des caractères invisibles refusés dans un nom de membre et
// de groupe (décision du porteur du 2026-11-28). Les points de code sont écrits en clair, sans
// importer la liste du code, et placés au milieu du nom (aucun trim() ne les retire).
import { char } from '@/__fixtures__/codePoints';
import { validateGroupName, validateMemberName } from '@/domain/validation';

/** Caractères ajoutés par le 044b : chaque point isolé, les bornes des plages, et U+E0061. */
const ADDED: [string, number][] = [
  ['U+00AD trait d’union conditionnel', 0x00ad],
  ['U+034F graphème combinant invisible', 0x034f],
  ['U+115F remplissage hangul de début', 0x115f],
  ['U+1160 remplissage hangul de voyelle', 0x1160],
  ['U+180E séparateur de voyelles mongol', 0x180e],
  ['U+2060 gluon de mots (borne basse)', 0x2060],
  ['U+2061 application de fonction', 0x2061],
  ['U+2062 multiplication invisible', 0x2062],
  ['U+2063 séparateur invisible', 0x2063],
  ['U+2064 plus invisible (borne haute)', 0x2064],
  ['U+3164 remplissage hangul', 0x3164],
  ['U+FFA0 remplissage hangul demi-chasse', 0xffa0],
  ['U+FFF9 ancre d’annotation (borne basse)', 0xfff9],
  ['U+FFFA séparateur d’annotation', 0xfffa],
  ['U+FFFB fin d’annotation (borne haute)', 0xfffb],
  ['U+E0000 étiquette (borne basse)', 0xe0000],
  ['U+E0061 étiquette « a »', 0xe0061],
  ['U+E007F fin d’étiquette (borne haute)', 0xe007f],
];

/** Voisins non listés et émojis qui restent acceptés. */
const ACCEPTED: [string, string][] = [
  ['U+00AC signe négation', char(0x00ac)],
  ['U+00AE marque déposée', char(0x00ae)],
  ['U+205F espace moyenne mathématique', char(0x205f)],
  ['U+FFFC caractère de remplacement d’objet', char(0xfffc)],
  ['U+1F600 visage souriant', char(0x1f600)],
  ['nom coréen', '김민준'],
  ['drapeau de la France', char(0x1f1eb, 0x1f1f7)],
  ['pouce avec teinte de peau', char(0x1f44d, 0x1f3fd)],
  ['cœur rouge avec U+FE0F', char(0x2764, 0xfe0f)],
  ['touche 1 avec U+FE0F', char(0x31, 0xfe0f, 0x20e3)],
  ['famille avec U+200D', char(0x1f469, 0x200d, 0x1f467)],
  ['drapeau arc-en-ciel avec U+FE0F et U+200D', char(0x1f3f3, 0xfe0f, 0x200d, 0x1f308)],
];

/** Drapeaux faits de tags : U+1F3F4 puis des étiquettes U+E0020 à U+E007F. */
const TAG_FLAGS: [string, string][] = [
  ['Écosse', char(0x1f3f4, 0xe0067, 0xe0062, 0xe0073, 0xe0063, 0xe0074, 0xe007f)],
  ['Angleterre', char(0x1f3f4, 0xe0067, 0xe0062, 0xe0065, 0xe006e, 0xe0067, 0xe007f)],
  ['Pays de Galles', char(0x1f3f4, 0xe0067, 0xe0062, 0xe0077, 0xe006c, 0xe0073, 0xe007f)],
];

const validators: [string, (text: string) => string][] = [
  ['membre', validateMemberName],
  ['groupe', validateGroupName],
];

describe.each(validators)('SEC-06 liste élargie : nom de %s', (_kind, validate) => {
  it.each(ADDED)('SEC-06 refuse %s au milieu du nom', (_label, code) => {
    expect(() => validate(`Al${char(code)}ix`)).toThrow(
      expect.objectContaining({ code: 'NAME_INVALID_CHAR' }),
    );
  });

  it.each(ACCEPTED)('SEC-06 accepte %s au milieu du nom', (_label, text) => {
    expect(validate(`Al${text}ix`)).toBe(`Al${text}ix`);
  });

  it.each(TAG_FLAGS)('SEC-06 refuse le drapeau fait de tags : %s', (_label, flag) => {
    expect(() => validate(`Poussins ${flag}`)).toThrow(
      expect.objectContaining({ code: 'NAME_INVALID_CHAR' }),
    );
  });

  it('ABS-04 le message d’erreur ne contient pas la saisie', () => {
    expect(() => validate(`Alix${char(0x2060)}Exemple`)).toThrow(
      expect.objectContaining({ message: 'Saisie invalide : NAME_INVALID_CHAR' }),
    );
  });
});
