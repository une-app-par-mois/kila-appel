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
export type ExistingMember = { lastName: string; firstName: string; birthDate: string | null };
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
export type DuplicateLine = ImportLine & { source: 'app' | 'file' };
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

/** En-tête replié : sans casse, accents, espaces, `_`, `-` ni apostrophe. */
const headerKey = (cell: string) => foldText(cell).replace(/[\s_'’-]/g, '');
const HEADERS: Record<string, Column> = {
  nom: 'lastName',
  prenom: 'firstName',
  datenaissance: 'birthDate',
  datedenaissance: 'birthDate',
  naissance: 'birthDate',
  telephone: 'phone',
  tel: 'phone',
  telephonedurgence: 'phone',
  groupe: 'group',
};

/** Index de chaque colonne reconnue ; colonne en double : la première. */
const readHeader = (cells: string[]) => {
  const index: Partial<Record<Column, number>> = {};
  cells.forEach((cell, i) => {
    const column = HEADERS[headerKey(cell)];
    if (column !== undefined && index[column] === undefined) index[column] = i;
  });
  return index;
};

/** Nom comparé pour les doublons : replié, espaces réduits, apostrophe ’ → '. */
const nameKey = (name: string) =>
  foldText(name.normalize('NFC')).trim().replace(/\s+/g, ' ').replace(/’/g, "'");
const sameMember = (a: ExistingMember, b: ExistingMember) =>
  nameKey(a.lastName) === nameKey(b.lastName) &&
  nameKey(a.firstName) === nameKey(b.firstName) &&
  (a.birthDate === null || b.birthDate === null || a.birthDate === b.birthDate);

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

/** EX-04 : groupe non archivé de la saison active, de ce nom replié, et seul de ce nom. */
const findGroup = (name: string, { groups, activeSeasonId }: ImportOptions) => {
  const key = foldText(name);
  const found = groups.filter(
    (g) =>
      g.seasonId === activeSeasonId && g.archivedAt === null && foldText(g.name.trim()) === key,
  );
  return found.length === 1 ? (found[0]?.id ?? null) : null;
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
    const groupId = groupName === '' ? null : findGroup(groupName, options);
    const member: ImportMember = { ...fields, groupId };
    const source = options.existingMembers.some((m) => sameMember(m, member))
      ? 'app'
      : result.valid.some((v) => sameMember(v.member, member))
        ? 'file'
        : null;
    if (source !== null) {
      result.duplicates.push({ line, member, source });
      continue;
    }
    result.valid.push({ line, member });
    if (groupName !== '' && groupId === null) result.unknownGroups.push({ line, group: groupName });
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
