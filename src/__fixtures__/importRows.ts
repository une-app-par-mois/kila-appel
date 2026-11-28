// Lignes lues d'un CSV d'import (ticket 032, EX-30) : données fictives seulement (SEC-13).
// Même forme que la sortie de la lecture (031) : en-tête en premier, `line` = ligne du tableur.
import type { CsvRow, ExistingMember, ImportGroup, ImportOptions } from '@/domain/memberImport';

/** Lignes numérotées à partir de 1 (l'en-tête), sans ligne vide. */
export const numbered = (...lines: string[][]): CsvRow[] =>
  lines.map((cells, index) => ({ line: index + 1, cells }));

export const TODAY = '2026-11-28';
export const ACTIVE_SEASON = 1;

export const GROUPS: ImportGroup[] = [
  { id: 1, seasonId: ACTIVE_SEASON, name: 'Poussins mercredi', archivedAt: null },
  { id: 2, seasonId: ACTIVE_SEASON, name: 'Benjamins lundi', archivedAt: null },
  { id: 3, seasonId: ACTIVE_SEASON, name: 'Adultes jeudi', archivedAt: null },
  { id: 4, seasonId: ACTIVE_SEASON, name: 'Éveil samedi', archivedAt: '2026-10-01' },
  { id: 5, seasonId: 2, name: 'Minimes vendredi', archivedAt: null },
];

/** Membres déjà dans l'appli : Léo Garcia (avec date), Zoé Blanc (archivée, sans date). */
export const EXISTING: ExistingMember[] = [
  { id: 11, lastName: 'Garcia', firstName: 'Léo', birthDate: '2017-03-14', archivedAt: null },
  { id: 12, lastName: 'Blanc', firstName: 'Zoé', birthDate: null, archivedAt: '2026-06-30' },
];

export const OPTIONS: ImportOptions = {
  existingMembers: EXISTING,
  groups: GROUPS,
  activeSeasonId: ACTIVE_SEASON,
  today: TODAY,
};

const HEADER = ['nom', 'prenom', 'date_naissance', 'telephone', 'groupe', 'licence'];

/**
 * Fichier de la maquette « Import CSV : aperçu » : en-tête et 24 lignes. Ligne 12 : groupe mal
 * écrit ; ligne 17 : prénom manquant ; Léo Garcia et Zoé Blanc déjà dans l'appli ; deux lignes
 * sans groupe ; une colonne inconnue (licence) ignorée.
 */
export const MOCKUP_ROWS: CsvRow[] = numbered(
  HEADER,
  ['André', 'Rose', '03/09/2016', '0600000001', 'Poussins mercredi', 'L-001'],
  ['Bernard', 'Adam', '2014-05-21', '600000002', 'Benjamins lundi', 'L-002'],
  ['Bertrand', 'Louise', '7/1/2016', '', 'Poussins mercredi', ''],
  ['Colin', 'Yanis', '02/05/2016', '0600000003', 'poussins MERCREDI'],
  ['David', 'Louis', '', '06 00 00 00 04', 'Poussins mercredi'],
  ['Durand', 'Emma', '12/12/2014', '06.00.00.00.05', 'Benjamins lundi'],
  ['Fournier', 'Mila', '', '', ''],
  ['Garcia', 'Léo', '14/03/2017', '0600000006', 'Poussins mercredi'],
  ['Girard', 'Noah', '01/02/2015', '', 'Benjamins lundi'],
  ['Laurent', 'Jade', '', '+33600000007', 'Adultes jeudi'],
  ['Lefebvre', 'Jules', '15/06/2016', '', 'Poussin mercredi'],
  ['Leroy', 'Gabriel', '', '', 'Adultes jeudi'],
  ['Mercier', 'Sacha', '09/09/2015', '0600000008', 'Benjamins lundi'],
  ['Michel', 'Léa', '', '', 'Adultes jeudi'],
  ['Moreau', 'Hugo', '22/04/2016', '', 'Poussins mercredi'],
  ['Morel', '', '30/03/2015', '', 'Benjamins lundi'],
  ['Petit', 'Alice', '', '0600000009', 'Adultes jeudi'],
  ['Richard', 'Chloé', '18/08/2014', '', 'Benjamins lundi'],
  ['Robert', 'Arthur', '', '', ''],
  ['Roux', 'Lucas', '11/11/2015', '0600000010', 'Poussins mercredi'],
  ['Simon', 'Inès', '', '', 'Adultes jeudi'],
  ['Blanc', 'Zoé', '', '', 'Adultes jeudi'],
  ['Vincent', 'Manon', '05/05/2016', '', 'Poussins mercredi'],
  ['Thomas', 'Lina', '', '', 'Benjamins lundi'],
);
