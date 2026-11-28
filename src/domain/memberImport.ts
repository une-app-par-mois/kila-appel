// EX-30 : aperçu d'un import CSV, calculé avant toute écriture (ticket 032). Domaine pur : les
// membres et les groupes existants sont passés en paramètres, l'écriture vient au ticket 034.
// ABS-03 : seuls nom, prénom, date de naissance, téléphone et groupe sont gardés.
// ABS-04 : un motif de refus porte une ligne, un champ et un code, jamais une cellule.
import { foldText, isIsoDate } from '@/domain/formats';
import { parseImportDate, parseImportPhone, readImportName } from '@/domain/importFields';
import { InputError, validateMember, validateMemberName } from '@/domain/validation';

/** Ligne lue d'un CSV (ticket 031) : `line` est le numéro de ligne du tableur, en-tête = 1. */
export type CsvRow = { line: number; cells: string[] };
export type ImportGroup = { id: number; seasonId: number; name: string; archivedAt: string | null };
export type ExistingMember = {
  id: number;
  lastName: string;
  firstName: string;
  birthDate: string | null;
  archivedAt: string | null;
};
export type ImportOptions = {
  /** Tous les membres de l'appli, archivés compris. */
  existingMembers: ExistingMember[];
  groups: ImportGroup[];
  activeSeasonId: number | null;
  today: string;
};

export type ImportField = 'lastName' | 'firstName' | 'birthDate' | 'phone';
export type ImportErrorCode =
  | 'NAME_REQUIRED'
  | 'NAME_TOO_LONG'
  | 'NAME_INVALID_CHAR'
  | 'DATE_INVALID'
  | 'DATE_IN_FUTURE'
  | 'PHONE_INVALID';
/** ABS-03 : les cinq champs d'un membre importé ; groupe introuvable ou vide → `null`. */
export type ImportMember = {
  lastName: string;
  firstName: string;
  birthDate: string | null;
  phone: string | null;
  groupId: number | null;
};
export type ImportLine = { line: number; member: ImportMember };
export type InvalidLine = { line: number; field: ImportField; code: ImportErrorCode };
/**
 * Doublon de l'appli (avec le membre existant) ou d'une ligne valide précédente du fichier.
 * `unknownGroup` : cellule groupe sans groupe trouvé, pour prévenir si le doublon est gardé.
 */
export type DuplicateLine = ImportLine & { unknownGroup: string | null } & (
    | { source: 'app'; memberId: number; archived: boolean }
    | { source: 'file' }
  );
/** Groupe introuvable : la cellule est montrée à l'écran (« Poussin mercredi »), jamais journalisée. */
export type UnknownGroupLine = { line: number; group: string };
export type ImportPreview = {
  counts: { rows: number; toImport: number; invalid: number; duplicates: number };
  valid: ImportLine[];
  invalid: InvalidLine[];
  duplicates: DuplicateLine[];
  unknownGroups: UnknownGroupLine[];
};
export type PreviewResult =
  | { ok: true; preview: ImportPreview }
  | { ok: false; reason: 'MISSING_COLUMNS' };

type Column = 'lastName' | 'firstName' | 'birthDate' | 'phone' | 'group';

/** En-tête replié : sans casse, accents, espaces, `_`, `-`, `.` ni apostrophe. */
const headerKey = (cell: string) => foldText(cell).replace(/[\s_.'’-]/g, '');
// Map, pas objet : un en-tête « constructor » ou « __proto__ » n'est pas une colonne.
const HEADERS = new Map<string, Column>([
  ['nom', 'lastName'],
  ['prenom', 'firstName'],
  ...['datenaissance', 'datedenaissance', 'naissance', 'datenaiss', 'ddn'].map(
    (key): [string, Column] => [key, 'birthDate'],
  ),
  ...[
    'telephone',
    'tel',
    'telephonedurgence',
    'telephoneurgence',
    'telurgence',
    'portable',
    'mobile',
    'telephoneparent',
    'telephoneparents',
    'telparent',
    'telparents',
  ].map((key): [string, Column] => [key, 'phone']),
  ['groupe', 'group'],
]);

/** Index de chaque colonne reconnue ; colonne en double : la première. */
const readHeader = (cells: string[]) => {
  const index: Partial<Record<Column, number>> = {};
  cells.forEach((cell, i) => {
    const column = HEADERS.get(headerKey(cell));
    if (column !== undefined && index[column] === undefined) index[column] = i;
  });
  return index;
};

/** Nom comparé (doublons, groupes) : replié, espaces réduits, apostrophe ’ → '. */
const nameKey = (name: string) =>
  foldText(name.normalize('NFC')).trim().replace(/\s+/g, ' ').replace(/’/g, "'");
/** Clé d'un membre, calculée une fois : nom et prénom séparés par U+0000 (refusé dans un nom). */
const memberKey = (m: { lastName: string; firstName: string }) =>
  `${nameKey(m.lastName)}\u0000${nameKey(m.firstName)}`;
/** Même date, ou date absente d'un côté. */
const sameDate = (a: string | null, b: string | null) => a === null || b === null || a === b;
const push = <T>(index: Map<string, T[]>, key: string, value: T) => {
  const list = index.get(key);
  if (list === undefined) index.set(key, [value]);
  else list.push(value);
};

type FieldError = { field: ImportField; code: ImportErrorCode };
type Fields = Omit<ImportMember, 'groupId'>;

class FieldFailure extends Error {
  constructor(readonly reason: FieldError) {
    super('Champ refusé');
  }
}
/** Lit un champ ; une InputError devient le motif de ce champ (code seul, ABS-04). */
const read = <T>(field: ImportField, fn: () => T): T => {
  try {
    return fn();
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    throw new FieldFailure({ field, code: error.code as ImportErrorCode });
  }
};

/** Le premier motif trouvé, dans l'ordre nom, prénom, date, téléphone. */
const readFields = (cell: (c: Column) => string, today: string): Fields | FieldError => {
  try {
    const lastName = read('lastName', () => validateMemberName(readImportName(cell('lastName'))));
    const firstName = read('firstName', () =>
      validateMemberName(readImportName(cell('firstName'))),
    );
    const birthDate = read('birthDate', () => parseImportDate(cell('birthDate'), today));
    const phone = read('phone', () => parseImportPhone(cell('phone')));
    // Même règle qu'à la saisie (SEC-06, EX-03) : rejouée sur le membre entier.
    return { ...validateMember({ lastName, firstName, birthDate }, today), phone };
  } catch (error) {
    if (error instanceof FieldFailure) return error.reason;
    throw error;
  }
};

/** EX-04 : groupes non archivés de la saison active, rangés par nom comparé. */
const groupIndex = ({ groups, activeSeasonId }: ImportOptions) => {
  const index = new Map<string, number[]>();
  for (const g of groups)
    if (g.seasonId === activeSeasonId && g.archivedAt === null) push(index, nameKey(g.name), g.id);
  return index;
};

/**
 * EX-30 : aperçu des lignes lues (en-tête en premier). Sans colonne `nom` ou `prenom` :
 * MISSING_COLUMNS. Chaque ligne est invalide, doublon (de l'appli, ou d'une ligne valide
 * précédente du fichier) ou valide ; une ligne valide au groupe introuvable est signalée.
 */
export const previewImport = (rows: CsvRow[], options: ImportOptions): PreviewResult => {
  if (!isIsoDate(options.today)) throw new Error('Jour de l’import invalide (RM-04)');
  const [header, ...data] = rows;
  const index = readHeader(header?.cells ?? []);
  if (index.lastName === undefined || index.firstName === undefined)
    return { ok: false, reason: 'MISSING_COLUMNS' };

  const groups = groupIndex(options);
  // Doublons en temps linéaire : une clé par membre existant et par ligne valide.
  const inApp = new Map<string, ExistingMember[]>();
  for (const m of options.existingMembers) push(inApp, memberKey(m), m);
  const inFile = new Map<string, (string | null)[]>();
  const result: ImportPreview = {
    counts: { rows: 0, toImport: 0, invalid: 0, duplicates: 0 },
    valid: [],
    invalid: [],
    duplicates: [],
    unknownGroups: [],
  };
  for (const { line, cells } of data) {
    if (cells.every((c) => c.trim() === '')) continue;
    result.counts.rows += 1;
    const cell = (column: Column) => {
      const i = index[column];
      return i === undefined ? '' : (cells[i] ?? '');
    };
    const fields = readFields(cell, options.today);
    if ('code' in fields) {
      result.invalid.push({ line, ...fields });
      continue;
    }
    const groupName = cell('group').trim();
    const found = groupName === '' ? [] : (groups.get(nameKey(groupName)) ?? []);
    const groupId = found.length === 1 ? (found[0] ?? null) : null;
    const unknownGroup = groupName !== '' && groupId === null ? groupName : null;
    const member: ImportMember = { ...fields, groupId };
    const key = memberKey(member);
    const existing = inApp.get(key)?.find((m) => sameDate(m.birthDate, member.birthDate));
    if (existing !== undefined) {
      const archived = existing.archivedAt !== null;
      result.duplicates.push({
        line,
        member,
        unknownGroup,
        source: 'app',
        memberId: existing.id,
        archived,
      });
      continue;
    }
    if (inFile.get(key)?.some((date) => sameDate(date, member.birthDate))) {
      result.duplicates.push({ line, member, unknownGroup, source: 'file' });
      continue;
    }
    push(inFile, key, member.birthDate);
    result.valid.push({ line, member });
    if (unknownGroup !== null) result.unknownGroups.push({ line, group: unknownGroup });
  }
  result.counts.toImport = result.valid.length;
  result.counts.invalid = result.invalid.length;
  result.counts.duplicates = result.duplicates.length;
  return { ok: true, preview: result };
};

/** EX-30 : membres à écrire, dans l'ordre du fichier ; doublons ignorés sauf ceux de `kept`. */
export const membersToWrite = (
  preview: ImportPreview,
  kept: readonly number[] = [],
): ImportMember[] =>
  [...preview.valid, ...preview.duplicates.filter((d) => kept.includes(d.line))]
    .sort((a, b) => a.line - b.line)
    .map(({ member }) => ({ ...member }));
