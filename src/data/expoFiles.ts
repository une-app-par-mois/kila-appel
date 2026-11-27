// Adaptateur expo-file-system, expo-sharing et expo-document-picker de la sauvegarde et de la
// restauration (tickets 014b et 014e, EX-19, EX-20). Seul fichier qui importe ces modules
// (src/staticChecksFiles.test.ts) ; leurs fonctions réseau et leurs sous-chemins y sont refusés
// comme partout (ABS-01, décisions du porteur du 2026-11-27).
// Les fichiers vivent dans des sous-dossiers dédiés du cache, exclu de la sauvegarde du système :
// `sauvegardes` (export) et `restauration` (copie vérifiée), jamais vidés l'un par l'autre. Le
// fichier choisi est copié par le sélecteur dans `cache/DocumentPicker/` (Android) ou dans
// `tmp/<identifiant>-Inbox/` (iOS). ABS-06 : copies en clair.
import { getDocumentAsync } from 'expo-document-picker';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';
import { type BackupFiles, MAX_BACKUP_BYTES, type OpenDb } from '@/data/backupCheck';
import { checkSystemPath, openExpoCopy } from '@/data/expoDb';

const FILE_SCHEME = 'file://';
// Dossier où expo-document-picker copie le fichier choisi avec `copyToCacheDirectory`.
const PICKER_DIR = 'DocumentPicker';
/** iOS : dossier où le sélecteur (`asCopy`) dépose sa copie ; identifiant de app.json (testé). */
export const IOS_INBOX = 'com.jitavision.kila-Inbox';
const IOS_CACHES = '/Library/Caches';
// Type générique : sur iOS, un type connu ajouterait son extension (« .db.sqlite »).
const SHARE_MIME_TYPE = 'application/octet-stream';
const refused = () => new Error('Chemin de fichier refusé');

/** URI d'expo-file-system (`file:///…`) → chemin du système, attendu par SQLite. */
export const uriToPath = (uri: string): string => {
  if (!uri.startsWith(FILE_SCHEME)) throw refused();
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

/** Fichier choisi : chemin du système de sa copie, ou refus d'emblée (taille annoncée). */
export type PickResult = { path: string } | { reason: 'TOO_LARGE' };

/** Sélecteur de fichiers et copies qu'il dépose. */
export type PickerAccess = {
  /** null si l'encadrant annule. */
  pick(): Promise<PickResult | null>;
  /** Efface une copie du sélecteur. */
  removePicked(path: string): Promise<void>;
  /** Vide les dossiers des copies du sélecteur. */
  clearPicked(): Promise<void>;
};

/** Ce dont la restauration a besoin : sélecteur et sa copie, dossier dédié, ouverture brute. */
export type RestoreDeps = PickerAccess & { files: BackupStorage; open: OpenDb };

const fileAt = (path: string) => new File(pathToUri(path));
const pickerDir = () => new Directory(Paths.cache, PICKER_DIR);
// iOS rend parfois le même chemin sous `/private/var` : comparé sans ce préfixe.
const canonical = (path: string) =>
  path.startsWith('/private/') ? path.slice('/private'.length) : path;

/** `path` doit être un enfant direct du dossier `root` ; sinon erreur, sans le chemin (ABS-04). */
const checkChild = (root: string, path: string) => {
  const parent = canonical(root);
  const child = canonical(checkSystemPath(path));
  const name = child.slice(parent.length + 1);
  if (!child.startsWith(`${parent}/`) || name === '' || name.includes('/')) throw refused();
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
      checkChild(uriToPath(dedicated().uri), path);
      const dir = new Directory(pathToUri(path));
      if (dir.exists) dir.delete();
    },
  };
};

/** Ouvre la feuille de partage du système ; se termine quand elle se ferme. */
export const shareBackup = (path: string): Promise<void> =>
  shareAsync(pathToUri(path), { mimeType: SHARE_MIME_TYPE });

/** iOS : `tmp/<identifiant>-Inbox/` du conteneur, à côté de `Library/Caches/`. */
const iosInbox = (): string => {
  const caches = uriToPath(Paths.cache.uri);
  if (!caches.endsWith(IOS_CACHES)) throw refused();
  return `${caches.slice(0, -IOS_CACHES.length)}/tmp/${IOS_INBOX}`;
};

/**
 * Sélecteur de fichiers du système (EX-20). Android : copie dans `cache/DocumentPicker/`
 * (`copyToCacheDirectory`, l'URI d'origine est un `content://`). iOS : le sélecteur a déjà copié
 * le fichier dans l'Inbox (`asCopy`) ; une seconde copie dans le cache laisserait celle-ci derrière
 * nous, donc l'adaptateur la prend telle quelle (revue du 014e). Une copie à un endroit inattendu
 * vide les dossiers du sélecteur avant l'erreur ; une taille annoncée au-delà de la limite est
 * refusée tout de suite, copie effacée.
 */
export const expoPicker = (os: string): PickerAccess => {
  const ios = os === 'ios';
  const pickedRoot = () => (ios ? iosInbox() : uriToPath(pickerDir().uri));
  const deleteFile = (path: string) => {
    const file = fileAt(path);
    if (file.exists) file.delete();
  };
  const clearPicked = async () => {
    const dirs = ios ? [pickerDir(), new Directory(pathToUri(iosInbox()))] : [pickerDir()];
    for (const dir of dirs) if (dir.exists) dir.delete();
  };
  return {
    pick: async () => {
      const result = await getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: !ios,
        multiple: false,
      });
      if (result.canceled) return null;
      const [asset] = result.assets;
      let path: string;
      try {
        if (asset === undefined) throw refused();
        path = uriToPath(asset.uri);
        checkChild(pickedRoot(), path);
      } catch (error) {
        await clearPicked();
        throw error;
      }
      if (asset.size !== undefined && asset.size > MAX_BACKUP_BYTES) {
        deleteFile(path);
        return { reason: 'TOO_LARGE' };
      }
      return { path };
    },
    removePicked: async (path) => {
      checkChild(pickedRoot(), path);
      deleteFile(path);
    },
    clearPicked,
  };
};

export const expoBackupDeps: BackupDeps = {
  files: expoStorage('sauvegardes'),
  share: shareBackup,
  open: openExpoCopy,
};

export const expoRestoreDeps: RestoreDeps = {
  files: expoStorage('restauration'),
  open: openExpoCopy,
  ...expoPicker(Platform.OS),
};
