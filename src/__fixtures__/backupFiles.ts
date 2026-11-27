// Fichiers temporaires des tests de sauvegarde (ticket 014). SEC-13 : aucun .db versionné, chaque
// fichier piégé est produit à l'exécution par node:sqlite dans un dossier temporaire.
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BackupFiles } from '@/data/backupCheck';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';

/** Lecture des fichiers par node:fs : ce que 014b fera avec expo-file-system. */
export const nodeFiles: BackupFiles = {
  size: async (path) => readFileSync(path).length,
  readHead: async (path, length) => readFileSync(path).slice(0, length),
  copy: async (from, to) => copyFileSync(from, to),
};

/** Ouvre une copie à vérifier, ou une base vide en mémoire (':memory:'). */
export const openNode = async (path: string): Promise<Db> => openNodeDb(path);

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
