// Exports CSV et PDF (ticket 033, SEC-10, ABS-04), détachés de expoFiles.ts pour la règle des 300
// lignes (découpage autorisé par le porteur le 2026-11-28). Seul autre fichier admis à importer
// expo-file-system et expo-sharing (src/staticChecksFiles.test.ts), sans leurs fonctions réseau.
// Les fichiers vivent dans `cache/exports/<sous-dossier>/`, vidé au début de chaque export, au
// démarrage et après Tout effacer ; le sous-dossier est effacé à la fermeture du partage.
// Ticket 040a (EX-32, SEC-08, SEC-10) : le PDF rendu par expo-print dans `cache/Print/` (contrôlé
// par `printedPath`) est déplacé sous `kila-rapport-<début>-au-<fin>.pdf`, `cache/Print/` est vidé.
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { checkSystemPath } from '@/data/expoDb';
import { checkChild, pathToUri, refused, uriToPath } from '@/data/expoFiles';

// Fichiers des exports : nom fixe en minuscules, extension du type partagé.
const EXPORT_NAME = /^[a-z0-9-]+\.(csv|pdf)$/;
/** Types de partage, liste fermée : MIME pour Android, UTI pour iOS. */
const EXCHANGE_TYPES = {
  csv: { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' },
  pdf: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
} as const;
export type ExchangeKind = keyof typeof EXCHANGE_TYPES;
// Erreurs du module natif remplacées : elles peuvent citer le chemin (ABS-04).
const unwritable = () => new Error('Écriture du fichier impossible');
const unsharable = () => new Error('Partage du fichier impossible');
const unmovable = () => new Error('Déplacement du fichier impossible');
const notPdf = () => new Error('Fichier PDF invalide');
/** Dossier où expo-print écrit ses PDF (Android `cacheDir/Print`, iOS `Caches/Print`, 58.0.9). */
const printDir = () => new Directory(Paths.cache, 'Print');
const PDF_HEADER = '%PDF-';
const PRINTED_NAME = /\.pdf$/;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Période du rapport (début et fin inclus, `AAAA-MM-JJ`). */
export type ReportPeriod = { from: string; to: string };

/** Vraie date du calendrier : reconstruite, elle doit redonner le même texte (2026-02-30 refusé). */
const isRealDay = (day: string): boolean => {
  const match = DAY.exec(day);
  if (match === null) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === day;
};

/** `path` : `<cache/exports>/<sous-dossier>/<nom>`, nom de `EXPORT_NAME` ; rend l'extension. */
const checkExportPath = (path: string): string => {
  const file = checkSystemPath(path);
  const cut = file.lastIndexOf('/');
  const match = EXPORT_NAME.exec(file.slice(cut + 1));
  if (match === null) throw refused();
  checkChild(uriToPath(new Directory(Paths.cache, 'exports').uri), file.slice(0, cut));
  return match[1] ?? '';
};

/**
 * Écrit un export (texte, BOM compris, ou octets) dans `cache/exports/` ; jamais par-dessus. Une
 * écriture en échec efface le fichier créé.
 */
export const writeFile = async (path: string, content: string | Uint8Array): Promise<void> => {
  checkExportPath(path);
  const file = new File(pathToUri(path));
  try {
    file.create();
  } catch {
    throw unwritable();
  }
  try {
    await file.write(content);
  } catch {
    try {
      if (file.exists) file.delete();
    } catch {
      // Reste du fichier repris par le vidage de `exports/` (SEC-10).
    }
    throw unwritable();
  }
};

/** Partage un export de `cache/exports/` ; se termine quand la feuille de partage se ferme. */
export const shareFile = async (path: string, kind: ExchangeKind): Promise<void> => {
  // L'extension (csv ou pdf, EXPORT_NAME) doit être celle du type partagé.
  if (checkExportPath(path) !== kind) throw refused();
  try {
    await shareAsync(pathToUri(path), { ...EXCHANGE_TYPES[kind] });
  } catch {
    throw unsharable();
  }
};

/** SEC-08 : `path` doit être un PDF enfant direct de `cache/Print/` ; sinon refus, sans le chemin. */
const checkPrinted = (path: string): string => {
  checkChild(uriToPath(printDir().uri), path);
  if (!PRINTED_NAME.test(path)) throw refused();
  return path;
};

/** URI rendue par expo-print → chemin du système, contrôlé par `checkPrinted`. */
export const printedPath = (uri: string): string => checkPrinted(uriToPath(uri));

/** Efface un fichier sans lever : un reste est repris par le vidage de `cache/Print/` (SEC-10). */
const dropFile = (file: File) => {
  try {
    if (file.exists) file.delete();
  } catch {
    // Vidé au démarrage suivant et après Tout effacer.
  }
};

/** Vrai si le fichier commence par `%PDF-` (EX-32). */
const hasPdfHeader = async (file: File): Promise<boolean> => {
  const handle = file.open(FileMode.ReadOnly);
  try {
    const head = await handle.readBytes(PDF_HEADER.length);
    return String.fromCharCode(...head) === PDF_HEADER;
  } finally {
    handle.close();
  }
};

/**
 * EX-32 : déplace le PDF de `cache/Print/` vers `<dir>/kila-rapport-<début>-au-<fin>.pdf` (comme le
 * CSV du 037 : deux périodes, deux noms), `dir` étant un sous-dossier de `cache/exports/` ; rend le
 * nouveau chemin. Source contrôlée d'abord (jamais un autre fichier touché) ; ensuite, tout échec
 * (vraies dates, début après la fin, destination, en-tête, déplacement) efface l'original (SEC-10).
 * Erreurs sans chemin (ABS-04).
 */
export const moveReport = async (
  printed: string,
  dir: string,
  { from, to }: ReportPeriod,
): Promise<string> => {
  const source = new File(pathToUri(checkPrinted(printed)));
  try {
    if (!isRealDay(from) || !isRealDay(to) || from > to) throw refused();
    const target = `${dir}/kila-rapport-${from}-au-${to}.pdf`;
    checkExportPath(target);
    if (!(await hasPdfHeader(source).catch(() => false))) throw notPdf();
    // Sous-dossier neuf : rien à écraser ; un reste y est effacé avec lui (fermeture du partage).
    await source.move(new File(pathToUri(target))).catch(() => {
      throw unmovable();
    });
    return target;
  } catch (error) {
    dropFile(source);
    throw error;
  }
};

/** SEC-08, SEC-10 : vide `cache/Print/` (démarrage, Tout effacer, début de chaque rapport). */
export const clearPrint = async (): Promise<void> => {
  const dir = printDir();
  if (dir.exists) dir.delete();
};
