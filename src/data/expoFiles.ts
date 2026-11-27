// Adaptateur expo-file-system, expo-sharing et expo-document-picker de la sauvegarde et de la
// restauration (tickets 014b et 014e, EX-19, EX-20). Seul fichier qui importe ces modules
// (src/staticChecksFiles.test.ts) ; leurs fonctions réseau et leurs sous-chemins y sont refusés
// comme partout (ABS-01, décisions du porteur du 2026-11-27).
// Les fichiers vivent dans des sous-dossiers dédiés du cache, exclu de la sauvegarde du système :
// `sauvegardes` (export) et `restauration` (copie vérifiée), jamais vidés l'un par l'autre ; le
// sélecteur copie le fichier choisi dans `DocumentPicker`. ABS-06 : copies en clair.
import { getDocumentAsync } from 'expo-document-picker';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import type { BackupFiles, OpenDb } from '@/data/backupCheck';
import { checkSystemPath, openExpoCopy } from '@/data/expoDb';

const FILE_SCHEME = 'file://';
// Dossier où expo-document-picker copie le fichier choisi (Android et iOS).
const PICKER_DIR = 'DocumentPicker';
// Type générique : sur iOS, un type connu ajouterait son extension (« .db.sqlite »).
const SHARE_MIME_TYPE = 'application/octet-stream';

/** URI d'expo-file-system (`file:///…`) → chemin du système, attendu par SQLite. */
export const uriToPath = (uri: string): string => {
  if (!uri.startsWith(FILE_SCHEME)) throw new Error('Chemin de fichier refusé');
  const path = decodeURIComponent(uri.slice(FILE_SCHEME.length)).replace(/\/+$/, '');
  return checkSystemPath(path);
};

/** Chemin du système → URI d'expo-file-system, chaque segment encodé. */
export const pathToUri = (path: string): string =>
  FILE_SCHEME + checkSystemPath(path).split('/').map(encodeURIComponent).join('/');

/** Accès aux fichiers d'un dossier dédié ; node:fs dans les tests (`src/__fixtures__`). */
export type BackupStorage = BackupFiles & {
  /** Vide le dossier dédié (à chaque ouverture de l'écran). */
  clear(): Promise<void>;
  /** Crée un sous-dossier neuf du dossier dédié ; rend son chemin du système. */
  newDir(): Promise<string>;
  /** Efface un sous-dossier du dossier dédié et tout ce qu'il contient (-wal, -shm, -journal). */
  removeDir(path: string): Promise<void>;
};

/** Ce dont l'export a besoin : fichiers, partage du système, ouverture brute d'une copie. */
export type BackupDeps = {
  files: BackupStorage;
  share(path: string): Promise<void>;
  open: OpenDb;
};

/** Ce dont la restauration a besoin : sélecteur et sa copie, dossier dédié, ouverture brute. */
export type RestoreDeps = {
  files: BackupStorage;
  open: OpenDb;
  /** Chemin du système de la copie du fichier choisi, ou null si l'encadrant annule. */
  pick(): Promise<string | null>;
  /** Efface une copie du sélecteur. */
  removePicked(path: string): Promise<void>;
  /** Vide le dossier des copies du sélecteur. */
  clearPicked(): Promise<void>;
};

const fileAt = (path: string) => new File(pathToUri(path));
const pickerDir = () => new Directory(Paths.cache, PICKER_DIR);

/** `path` doit être un enfant direct du dossier `parent` ; sinon erreur, sans le chemin (ABS-04). */
const checkChild = (parent: Directory, path: string) => {
  const root = uriToPath(parent.uri);
  const name = checkSystemPath(path).slice(root.length + 1);
  if (!path.startsWith(`${root}/`) || name === '' || name.includes('/')) {
    throw new Error('Chemin de fichier refusé');
  }
};

let created = 0;

/** Fichiers du dossier dédié `cache/<name>/` : `sauvegardes` (export) ou `restauration`. */
export const expoStorage = (name: 'sauvegardes' | 'restauration'): BackupStorage => {
  const dedicated = () => new Directory(Paths.cache, name);
  return {
    size: async (path) => fileAt(path).size,
    readHead: async (path, length) => {
      const handle = fileAt(path).open(FileMode.ReadOnly);
      try {
        return await handle.readBytes(length);
      } finally {
        handle.close();
      }
    },
    copy: (from, to) => fileAt(from).copy(fileAt(to)),
    clear: async () => {
      const dir = dedicated();
      if (dir.exists) dir.delete();
    },
    newDir: async () => {
      created += 1;
      const dir = new Directory(dedicated(), `${Date.now()}-${created}`);
      dir.create({ intermediates: true });
      return uriToPath(dir.uri);
    },
    removeDir: async (path) => {
      // Seul un sous-dossier direct du dossier dédié peut être effacé.
      checkChild(dedicated(), path);
      const dir = new Directory(pathToUri(path));
      if (dir.exists) dir.delete();
    },
  };
};

/** Ouvre la feuille de partage du système ; se termine quand elle se ferme. */
export const shareBackup = (path: string): Promise<void> =>
  shareAsync(pathToUri(path), { mimeType: SHARE_MIME_TYPE });

/**
 * Sélecteur de fichiers du système (EX-20) : le fichier choisi est copié dans
 * `cache/DocumentPicker/` ; rend le chemin de cette copie, ou null si l'encadrant annule.
 */
export const pickBackupFile = async (): Promise<string | null> => {
  const result = await getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const [asset] = result.assets;
  if (asset === undefined) throw new Error('Aucun fichier choisi');
  const path = uriToPath(asset.uri);
  checkChild(pickerDir(), path);
  return path;
};

/** Efface une copie du sélecteur ; rien hors de `cache/DocumentPicker/`. */
export const removePickedFile = async (path: string): Promise<void> => {
  checkChild(pickerDir(), path);
  const file = fileAt(path);
  if (file.exists) file.delete();
};

/** Vide `cache/DocumentPicker/` : copies restées d'un arrêt brutal. */
export const clearPicked = async (): Promise<void> => {
  const dir = pickerDir();
  if (dir.exists) dir.delete();
};

export const expoBackupDeps: BackupDeps = {
  files: expoStorage('sauvegardes'),
  share: shareBackup,
  open: openExpoCopy,
};

export const expoRestoreDeps: RestoreDeps = {
  files: expoStorage('restauration'),
  open: openExpoCopy,
  pick: pickBackupFile,
  removePicked: removePickedFile,
  clearPicked,
};
