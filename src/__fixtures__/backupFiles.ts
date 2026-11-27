// Fichiers temporaires des tests de sauvegarde (ticket 014). SEC-13 : aucun .db versionné, chaque
// fichier piégé est produit à l'exécution par node:sqlite dans un dossier temporaire.
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BackupFiles } from '@/data/backupCheck';
import type { Db } from '@/data/db';
import type { BackupStorage } from '@/data/expoFiles';
import { openNodeDb } from '@/data/nodeDb';

/** Lecture des fichiers par node:fs : ce que 014b fera avec expo-file-system. */
export const nodeFiles: BackupFiles = {
  size: async (path) => readFileSync(path).length,
  readHead: async (path, length) => readFileSync(path).slice(0, length),
  copy: async (from, to) => copyFileSync(from, to),
};

/** Ouvre une copie à vérifier, ou une base vide en mémoire (':memory:'). */
export const openNode = async (path: string): Promise<Db> => openNodeDb(path);

/**
 * Dossier dédié de la sauvegarde sur node:fs (ticket 014b) : ce que fait expoFiles.ts dans le cache
 * de l'appareil. `dir` est le dossier dédié, vidé par `clear`.
 */
export const nodeStorage = (dir: string): BackupStorage => {
  let next = 0;
  return {
    ...nodeFiles,
    clear: async () => rmSync(dir, { recursive: true, force: true }),
    newDir: async () => {
      next += 1;
      const path = join(dir, `export-${next}`);
      mkdirSync(path, { recursive: true });
      return path;
    },
    removeDir: async (path) => rmSync(path, { recursive: true, force: true }),
  };
};

/**
 * Sélecteur de fichiers sur node:fs (ticket 014e) : ce que fait expo-document-picker, une copie du
 * fichier choisi dans `dir` (cache/DocumentPicker/). `next` : prochain choix ; null : annulé.
 */
export const nodePicker = (dir: string) => {
  let n = 0;
  const picker = {
    next: null as string | null,
    pick: async (): Promise<{ path: string } | null> => {
      if (picker.next === null) return null;
      mkdirSync(dir, { recursive: true });
      n += 1;
      const path = join(dir, `${n}-choisi.db`);
      copyFileSync(picker.next, path);
      return { path };
    },
    removePicked: async (path: string) => rmSync(path, { recursive: true, force: true }),
    clearPicked: async () => rmSync(dir, { recursive: true, force: true }),
  };
  return picker;
};

/** Dossier temporaire effacé à la fin du test. */
export const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'kila-sauvegarde-'));
  return {
    path: (name: string) => join(dir, name),
    remove: () => rmSync(dir, { recursive: true, force: true }),
  };
};

/** Une base dont le DETACH échoue sans rien faire : la copie reste attachée. */
export const failingDetach = (db: Db): Db => ({
  ...db,
  execute: (sql, params) =>
    /^DETACH/.test(sql) ? Promise.reject(new Error('detach')) : db.execute(sql, params),
});
