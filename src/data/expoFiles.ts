// Adaptateur expo-file-system, expo-sharing et expo-document-picker de la sauvegarde et de la
// restauration (tickets 014b et 014e, EX-19, EX-20). Seul fichier qui importe ces modules
// (src/staticChecksFiles.test.ts) ; leurs fonctions réseau et leurs sous-chemins y sont refusés
// comme partout (ABS-01, décisions du porteur du 2026-11-27).
// Les fichiers vivent dans des sous-dossiers dédiés du cache, exclu de la sauvegarde du système :
// `sauvegardes` (export) et `restauration` (copie vérifiée), jamais vidés l'un par l'autre. Le
// fichier choisi est copié par le sélecteur dans `cache/DocumentPicker/` (Android) ou dans
// `tmp/<identifiant>-Inbox/` (iOS). ABS-06 : copies en clair. Ticket 033 : l'import lit un fichier
// choisi (lecture bornée, SEC-06) ; l'export CSV et le rapport PDF écrivent dans `exports/`.
import { getDocumentAsync } from 'expo-document-picker';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';
import { type BackupFiles, MAX_BACKUP_BYTES, type OpenDb } from '@/data/backupCheck';
import { checkSystemPath, openExpoCopy } from '@/data/expoDb';
import { log } from '@/data/log';

const FILE_SCHEME = 'file://';
// Dossier où expo-document-picker copie le fichier choisi avec `copyToCacheDirectory`.
const PICKER_DIR = 'DocumentPicker';
/** iOS : dossier où le sélecteur (`asCopy`) dépose sa copie ; identifiant de app.json (testé). */
export const IOS_INBOX = 'com.jitavision.kila-Inbox';
const IOS_CACHES = '/Library/Caches';
// Type générique : sur iOS, un type connu ajouterait son extension (« .db.sqlite »).
const SHARE_MIME_TYPE = 'application/octet-stream';
const refused = () => new Error('Chemin de fichier refusé');
// Erreurs du module natif remplacées : elles peuvent citer le chemin, donc le nom du fichier (ABS-04).
const unreadable = () => new Error('Lecture du fichier impossible');
const unwritable = () => new Error('Écriture du fichier impossible');
// Fichiers des exports : nom fixe en minuscules, extension du type partagé (ticket 033).
const EXPORT_NAME = /^[a-z0-9-]+\.(csv|pdf)$/;
/** Types de partage, liste fermée : MIME pour Android, UTI pour iOS. */
const EXCHANGE_TYPES = {
  csv: { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' },
  pdf: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
} as const;
export type ExchangeKind = keyof typeof EXCHANGE_TYPES;
/** Usage du sélecteur : il choisit les codes de journal (ticket 033). */
export type PickUsage = 'restore' | 'import';
const PICK_CODES = {
  restore: { path: 'RESTORE_PICK_PATH_REFUSED', tooLarge: 'RESTORE_REJECTED_TOO_LARGE' },
  import: { path: 'IMPORT_PICK_PATH_REFUSED', tooLarge: 'IMPORT_REJECTED_TOO_LARGE' },
} as const;

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
/** Au plus `length` octets du début d'un fichier. */
const readHead = async (path: string, length: number) => {
  const handle = fileAt(path).open(FileMode.ReadOnly);
  try {
    return await handle.readBytes(length);
  } finally {
    handle.close();
  }
};
const deleteFile = (path: string) => {
  const file = fileAt(path);
  if (file.exists) file.delete();
};

/** Dossier dédié `cache/<name>/` : `sauvegardes`, `restauration` ou `exports` (CSV, PDF). */
export const expoStorage = (name: 'sauvegardes' | 'restauration' | 'exports'): BackupStorage => {
  const dedicated = () => new Directory(Paths.cache, name);
  return {
    size: async (path) => fileAt(path).size,
    readHead,
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
const pickedRoot = (os: string) => (os === 'ios' ? iosInbox() : uriToPath(pickerDir().uri));
const clearPickedDirs = async (os: string) => {
  const dirs = os === 'ios' ? [pickerDir(), new Directory(pathToUri(iosInbox()))] : [pickerDir()];
  for (const dir of dirs) if (dir.exists) dir.delete();
};
/** Efface une copie du sélecteur ; si elle résiste, vide les dossiers du sélecteur. */
const dropPicked = async (os: string, path: string) => {
  try {
    deleteFile(path);
  } catch {
    await clearPickedDirs(os);
  }
};

/**
 * Sélecteur de fichiers du système (EX-20). Android : copie dans `cache/DocumentPicker/`
 * (`copyToCacheDirectory`, l'URI d'origine est un `content://`). iOS : le sélecteur a déjà copié
 * le fichier dans l'Inbox (`asCopy`) ; une seconde copie dans le cache laisserait celle-ci derrière
 * nous, donc l'adaptateur la prend telle quelle (revue du 014e). Une copie à un endroit inattendu
 * vide les dossiers du sélecteur avant l'erreur ; une taille annoncée au-delà de la limite est
 * refusée tout de suite, copie effacée. Limite et codes de journal selon l'usage (ticket 033) :
 * la restauration garde `MAX_BACKUP_BYTES` et ses codes.
 */
export const expoPicker = (
  os: string,
  maxBytes: number = MAX_BACKUP_BYTES,
  usage: PickUsage = 'restore',
): PickerAccess => {
  const ios = os === 'ios';
  const codes = PICK_CODES[usage];
  const clearPicked = () => clearPickedDirs(os);
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
        checkChild(pickedRoot(os), path);
      } catch (error) {
        // Code à part : un chemin inattendu n'est pas une panne du sélecteur (revue du 014e).
        log(codes.path);
        await clearPicked();
        throw error;
      }
      if (asset.size !== undefined && asset.size > maxBytes) {
        log(codes.tooLarge);
        await dropPicked(os, path);
        return { reason: 'TOO_LARGE' };
      }
      return { path };
    },
    removePicked: async (path) => {
      checkChild(pickedRoot(os), path);
      deleteFile(path);
    },
    clearPicked,
  };
};

/** Octets d'un fichier choisi, ou refus : plus de `maxBytes` octets. */
export type ReadResult = { bytes: Uint8Array } | { reason: 'TOO_LARGE' };

/**
 * Lit la copie du sélecteur d'un fichier choisi pour l'import (SEC-06, ticket 033) : seulement un
 * enfant direct d'un dossier du sélecteur ; taille réelle vérifiée avant la lecture (la taille
 * annoncée peut manquer), lecture bornée à `maxBytes + 1`. La copie est effacée par la lecture
 * elle-même, en réussite comme en refus (SEC-10). Erreurs sans chemin (ABS-04).
 */
export const readFileBytes = async (
  path: string,
  maxBytes: number,
  os: string = Platform.OS,
): Promise<ReadResult> => {
  try {
    checkChild(pickedRoot(os), path);
  } catch (error) {
    log(PICK_CODES.import.path);
    await clearPickedDirs(os);
    throw error;
  }
  try {
    let bytes: Uint8Array | null;
    try {
      // Taille réelle au-delà de la limite : refus sans lecture.
      bytes = fileAt(path).size > maxBytes ? null : await readHead(path, maxBytes + 1);
    } catch {
      throw unreadable();
    }
    if (bytes === null || bytes.length > maxBytes) {
      log(PICK_CODES.import.tooLarge);
      return { reason: 'TOO_LARGE' };
    }
    return { bytes };
  } finally {
    await dropPicked(os, path);
  }
};

/** `path` : `<cache/exports>/<sous-dossier>/<nom>`, nom de `EXPORT_NAME` ; rend l'extension. */
const checkExportPath = (path: string): string => {
  const file = checkSystemPath(path);
  const cut = file.lastIndexOf('/');
  const name = file.slice(cut + 1);
  const match = EXPORT_NAME.exec(name);
  if (match === null) throw refused();
  checkChild(uriToPath(new Directory(Paths.cache, 'exports').uri), file.slice(0, cut));
  return match[1] ?? '';
};

/** Écrit un export (texte, BOM compris, ou octets) dans `cache/exports/` ; jamais par-dessus. */
export const writeFile = async (path: string, content: string | Uint8Array): Promise<void> => {
  checkExportPath(path);
  try {
    const file = fileAt(path);
    file.create();
    await file.write(content);
  } catch {
    throw unwritable();
  }
};

/** Partage un export de `cache/exports/` ; se termine quand la feuille de partage se ferme. */
export const shareFile = async (path: string, kind: ExchangeKind): Promise<void> => {
  // L'extension (csv ou pdf, EXPORT_NAME) doit être celle du type partagé.
  if (checkExportPath(path) !== kind) throw refused();
  await shareAsync(pathToUri(path), { ...EXCHANGE_TYPES[kind] });
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
