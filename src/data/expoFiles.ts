// Adaptateur expo-file-system et expo-sharing de la sauvegarde (ticket 014b, EX-19). Seul fichier
// qui importe ces modules (src/staticChecksFiles.test.ts) ; leurs fonctions réseau et
// expo-file-system/legacy y sont refusées comme partout (ABS-01, décision du porteur du 2026-11-27).
// Les fichiers vivent dans un sous-dossier dédié du cache, exclu de la sauvegarde du système, et
// n'en sortent que par le partage choisi par l'encadrant. ABS-06 : copie en clair, sans chiffrement.
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import type { BackupFiles, OpenDb } from '@/data/backupCheck';
import { checkSystemPath, openExpoCopy } from '@/data/expoDb';

const FILE_SCHEME = 'file://';
const BACKUP_DIR = 'sauvegardes';
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

/** Accès aux fichiers de la sauvegarde ; node:fs dans les tests (`src/__fixtures__`). */
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

const backupDir = () => new Directory(Paths.cache, BACKUP_DIR);
const fileAt = (path: string) => new File(pathToUri(path));
let created = 0;

export const expoBackupStorage: BackupStorage = {
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
    const dir = backupDir();
    if (dir.exists) dir.delete();
  },
  newDir: async () => {
    created += 1;
    const dir = new Directory(backupDir(), `${Date.now()}-${created}`);
    dir.create({ intermediates: true });
    return uriToPath(dir.uri);
  },
  removeDir: async (path) => {
    // Seul un sous-dossier direct du dossier dédié peut être effacé.
    const parent = uriToPath(backupDir().uri);
    const name = checkSystemPath(path).slice(parent.length + 1);
    if (!path.startsWith(`${parent}/`) || name === '' || name.includes('/')) {
      throw new Error('Chemin de fichier refusé');
    }
    const dir = new Directory(pathToUri(path));
    if (dir.exists) dir.delete();
  },
};

/** Ouvre la feuille de partage du système ; se termine quand elle se ferme. */
export const shareBackup = (path: string): Promise<void> =>
  shareAsync(pathToUri(path), { mimeType: SHARE_MIME_TYPE });

export const expoBackupDeps: BackupDeps = {
  files: expoBackupStorage,
  share: shareBackup,
  open: openExpoCopy,
};
