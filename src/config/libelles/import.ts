// Libellés de l'import CSV des membres (ticket 035, F-07, EX-30, NF-07) : textes de la maquette
// « Import CSV » et ceux validés par le porteur le 2026-11-28 (refus, résultat, cas absents).
import { joinFr, plural } from './outils';

/** Compteurs de `confirm` (ticket 034), affichés sur l'écran de résultat. */
export type ImportCounts = {
  added: number;
  enrolled: number;
  duplicatesIgnored: number;
  invalid: number;
  duplicatesEnrolled: number;
  unarchived: number;
};

/** Champ et code d'une ligne invalide (domaine, ticket 032). */
type InvalidField = 'lastName' | 'firstName' | 'birthDate' | 'phone';

const FIELDS: Record<InvalidField, string> = {
  lastName: 'Nom',
  firstName: 'Prénom',
  birthDate: 'Date de naissance',
  phone: 'Téléphone',
};
const PROBLEMS: Record<string, string> = {
  NAME_REQUIRED: 'manquant',
  NAME_TOO_LONG: 'trop long',
  NAME_INVALID_CHAR: 'avec un caractère invisible',
  DATE_INVALID: 'invalide (JJ/MM/AAAA)',
  DATE_IN_FUTURE: 'dans le futur',
  PHONE_INVALID: 'invalide',
};
/** Plafond d'affichage d'une cellule « groupe » (reporté du lot J3-1). */
const MAX_GROUP_CHARS = 100;
/** Cellule sur une seule ligne, tronquée à 100 points de code avec une ellipse. */
const shortGroup = (group: string) => {
  const oneLine = group.replace(/\s+/g, ' ');
  const chars = Array.from(oneLine);
  return chars.length > MAX_GROUP_CHARS ? `${chars.slice(0, MAX_GROUP_CHARS).join('')}…` : oneLine;
};

const NOTHING = ' Rien n’a été importé.';

export const importLabels = {
  memberImport: {
    title: 'Importer des membres',
    open: 'Importer (CSV)',
    intro:
      'Préparez un tableau (Excel, LibreOffice…) avec une ligne par membre, enregistré au format ',
    introFormat: 'CSV',
    introEnd: '.',
    exampleHeader: ['nom', 'prenom', 'date_naissance', 'telephone', 'groupe'],
    exampleRow: ['Colin', 'Yanis', '02/05/2016', '0600000003', 'Poussins mercredi'],
    exampleHint: 'Seuls nom et prénom sont obligatoires. Les autres colonnes sont ignorées.',
    choose: 'Choisir le fichier…',
    rejectedTitle: 'Fichier non reconnu',
    chooseAnother: 'Choisir un autre fichier',
    refusals: {
      MISSING_COLUMNS: `Ce fichier ne contient pas de colonnes « nom » et « prenom ».${NOTHING}`,
      NOT_TEXT: `Ce fichier n’est pas un CSV. Dans Excel : Fichier › Enregistrer sous › CSV (séparateur : point-virgule).${NOTHING}`,
      TOO_LARGE: `Ce fichier dépasse 1 Mo ou 2 000 lignes. Découpez-le en plusieurs fichiers.${NOTHING}`,
      TOO_MANY_ROWS: `Ce fichier dépasse 1 Mo ou 2 000 lignes. Découpez-le en plusieurs fichiers.${NOTHING}`,
      MALFORMED: `Ce fichier n’a pas pu être lu (guillemet non fermé ?).${NOTHING}`,
      UNSUPPORTED_ENCODING: `Ce fichier est enregistré dans un ancien format Mac. Dans Excel : Enregistrer sous › CSV UTF-8.${NOTHING}`,
      EMPTY: `Ce fichier est vide.${NOTHING}`,
      NO_MEMBERS: `Ce fichier ne contient aucun membre.${NOTHING}`,
    },
    readFailed: `Ce fichier n’a pas pu être lu.${NOTHING}`,
    writeFailed: 'L’import n’a pas abouti. Rien n’a été modifié. Réessayez.',
    stale: 'Les membres ou les groupes ont changé : recommencez l’import.',
    busy: 'Une autre opération sur les fichiers est en cours. Réessayez dans un instant.',
    previewTitle: 'Aperçu',
    noSeason: 'Aucune saison active : les membres seront importés sans groupe.',
    counts: {
      rows: (n: number) => plural(n, 'ligne', 'lignes'),
      toImport: (n: number) => `${n} à importer`,
      invalid: (n: number) => plural(n, 'invalide', 'invalides'),
      duplicates: (n: number) => plural(n, 'doublon', 'doublons'),
    },
    duplicatesSection: (n: number) => (n > 1 ? 'Doublons' : 'Doublon'),
    invalidSection: (n: number) => (n > 1 ? 'Lignes invalides' : 'Ligne invalide'),
    unknownGroupSection: (n: number) => (n > 1 ? 'Groupes introuvables' : 'Groupe introuvable'),
    ignore: 'Ignorer',
    /** Lu par le lecteur d'écran : « Ignorer Léo Garcia » (bascule annoncée « case cochée »). */
    ignoreMember: (name: string) => `Ignorer ${name}`,
    inApp: 'déjà dans l’appli',
    inAppArchived: 'déjà dans l’appli (archivé)',
    inFile: 'en double dans le fichier',
    /** « 14/03/2017 · déjà dans l'appli » ; sans date, la mention seule. */
    duplicateDetail: (date: string | null, mention: string) =>
      date === null ? mention : `${date} · ${mention}`,
    keptWithoutGroup: (group: string) =>
      `« ${shortGroup(group)} » introuvable : importé sans groupe`,
    duplicatesNote:
      'Un doublon ignoré déjà dans l’appli sera inscrit au groupe du fichier, et désarchivé s’il était archivé. Sans groupe trouvé, il reste tel quel.',
    line: (n: number) => `Ligne ${n}`,
    invalidReason: (field: InvalidField, code: string) =>
      `${FIELDS[field]} ${PROBLEMS[code] ?? 'invalide'}`,
    unknownGroup: (group: string) => `« ${shortGroup(group)} » : importé sans groupe`,
    importN: (n: number) => `Importer ${plural(n, 'membre', 'membres')}`,
    enrollM: (m: number) =>
      m > 1 ? `Inscrire ${m} membres à leur groupe` : `Inscrire ${m} membre à son groupe`,
    resultTitle: (added: number) =>
      added === 0
        ? 'Aucun membre importé'
        : `${plural(added, 'membre importé', 'membres importés')}`,
    /** Une phrase par compteur non nul ; une partie à 0 disparaît (décision du 2026-11-28). */
    resultText: (c: ImportCounts) => {
      const sentences: string[] = [];
      if (c.added > 0) {
        const enrolled =
          c.enrolled === 0
            ? ''
            : `, dont ${plural(c.enrolled, 'inscrit à son groupe', 'inscrits à leur groupe')}`;
        sentences.push(`${plural(c.added, 'membre ajouté', 'membres ajoutés')}${enrolled}.`);
      }
      if (c.duplicatesIgnored > 0) {
        const parts = [
          c.duplicatesEnrolled > 0 &&
            plural(
              c.duplicatesEnrolled,
              'inscrit au groupe du fichier',
              'inscrits au groupe du fichier',
            ),
          c.unarchived > 0 && plural(c.unarchived, 'désarchivé', 'désarchivés'),
        ].filter((part): part is string => part !== false);
        const detail = parts.length === 0 ? '' : `, dont ${joinFr(parts)}`;
        sentences.push(
          `${plural(c.duplicatesIgnored, 'doublon ignoré', 'doublons ignorés')}${detail}.`,
        );
      }
      if (c.invalid > 0)
        sentences.push(`${plural(c.invalid, 'ligne invalide', 'lignes invalides')}.`);
      return sentences.join(' ');
    },
    showMembers: 'Voir les membres',
  },
} as const;
