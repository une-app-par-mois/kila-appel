// Adaptateur expo-sqlite : la base de l'appli, dans le stockage privé de l'appareil (ADR-002).
// Transactions par createDb sur la connexion principale : pas de withExclusiveTransactionAsync,
// qui ouvre une autre connexion où les clés étrangères sont inactives (SEC-11).
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
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

const APP_DATABASE = 'kila.db';
// Texte de DatabaseNotFoundException (expo-sqlite 58 : « Database 'nom' not found » sur Android,
// « Database chemin not found » sur iOS).
const NOT_FOUND = /\bDatabase \S+ not found\b/;

export const openExpoDb = async (name = APP_DATABASE): Promise<Db> =>
  wrap(await openDatabaseAsync(name));

/**
 * EX-22 « Repartir de zéro » (ticket 014c) : supprime le fichier de la base de l'appli et ses
 * fichiers `-journal`, `-wal` et `-shm` (expo-sqlite). La connexion doit être fermée avant
 * (openAppDatabase la ferme en cas d'échec). SEC-11 : les octets ne sont pas écrasés ; ils restent
 * dans le stockage privé de l'appli, chiffré par le système.
 */
export const deleteAppDatabase = async (): Promise<void> => {
  try {
    await deleteDatabaseAsync(APP_DATABASE);
  } catch (error) {
    // Fichier déjà absent (DatabaseNotFoundException d'expo-sqlite, Android et iOS) : rien à
    // effacer, c'est une réussite (réponse du porteur du 2026-11-27).
    const message = (error as { message?: unknown } | null)?.message;
    if (typeof message === 'string' && NOT_FOUND.test(message)) return;
    throw error;
  }
};

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

// Chaque copie a sa propre connexion : expo-sqlite ne la confond pas avec celle de la base de
// l'appli, même à nom égal (revue de sécurité du 014b).
const OWN_CONNECTION = { useNewConnection: true };

/**
 * Ouvre une copie de sauvegarde par son chemin **telle quelle** (contrat de verifyBackup, ticket
 * 014) : ni prepareDatabase ni migrations, sinon une base en version 0 serait migrée puis acceptée.
 * ':memory:' ouvre une base vide en mémoire (schéma attendu).
 */
export const openExpoCopy = async (path: string): Promise<Db> => {
  if (path === ':memory:') return wrap(await openDatabaseAsync(path, OWN_CONNECTION));
  checkSystemPath(path);
  const cut = path.lastIndexOf('/');
  return wrap(await openDatabaseAsync(path.slice(cut + 1), OWN_CONNECTION, path.slice(0, cut)));
};
