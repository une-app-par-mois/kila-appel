// Exports CSV et PDF (ticket 033, SEC-10, ABS-04), détachés de expoFiles.ts pour la règle des 300
// lignes (découpage autorisé par le porteur le 2026-11-28). Seul autre fichier admis à importer
// expo-file-system et expo-sharing (src/staticChecksFiles.test.ts), sans leurs fonctions réseau.
// Les fichiers vivent dans `cache/exports/<sous-dossier>/`, vidé au début de chaque export, au
// démarrage et après Tout effacer ; le sous-dossier est effacé à la fermeture du partage.
import { Directory, File, Paths } from 'expo-file-system';
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
