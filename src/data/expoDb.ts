// Adaptateur expo-sqlite : la base de l'appli, dans le stockage privé de l'appareil (ADR-002).
// Transactions par createDb sur la connexion principale : pas de withExclusiveTransactionAsync,
// qui ouvre une autre connexion où les clés étrangères sont inactives (SEC-11).
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { createDb, type Db } from '@/data/db';

const wrap = (raw: SQLiteDatabase): Db =>
  createDb({
    run: async (sql, params) => {
      const r = await raw.runAsync(sql, [...params]);
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    all: (sql, params) => raw.getAllAsync(sql, [...params]),
    exec: (sql) => raw.execAsync(sql),
    close: () => raw.closeAsync(),
  });

export const openExpoDb = async (name = 'kila.db'): Promise<Db> =>
  wrap(await openDatabaseAsync(name));

/**
 * Chemin absolu du système de fichiers, sans `file://` ni segment `.` ou `..` (ticket 014b :
 * SQLite et le contrôle des fichiers attendent un chemin). L'erreur ne cite pas le chemin.
 */
export const checkSystemPath = (path: string): string => {
  const segments = path.split('/').slice(1);
  if (
    !path.startsWith('/') ||
    segments.length === 0 ||
    segments.some((s) => s === '' || s === '.' || s === '..')
  ) {
    throw new Error('Chemin de fichier refusé');
  }
  return path;
};

/**
 * Ouvre une copie de sauvegarde par son chemin **telle quelle** (contrat de verifyBackup, ticket
 * 014) : ni prepareDatabase ni migrations, sinon une base en version 0 serait migrée puis acceptée.
 * ':memory:' ouvre une base vide en mémoire (schéma attendu).
 */
export const openExpoCopy = async (path: string): Promise<Db> => {
  if (path === ':memory:') return wrap(await openDatabaseAsync(path));
  checkSystemPath(path);
  const cut = path.lastIndexOf('/');
  return wrap(await openDatabaseAsync(path.slice(cut + 1), undefined, path.slice(0, cut)));
};
