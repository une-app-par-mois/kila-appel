// Fichiers de la restauration pour les tests (ticket 014e). SEC-13 : aucun .db versionné, tout
// est produit à l'exécution par node:sqlite, avec le jeu fictif.
import { readFileSync, writeFileSync } from 'node:fs';
import { seed } from '@/__fixtures__/seed';
import { exportBackup } from '@/data/backup';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

/**
 * Sauvegarde datée du 22/10/2026 : le jeu fictif plus un membre (3 membres, 2 groupes, 1 séance
 * enregistrée), donc différente de la base de l'appareil. `alter` la piège avant l'export.
 */
export const backupFile = async (path: string, alter?: (db: Db) => Promise<unknown>) => {
  const db = await prepareDatabase(openNodeDb());
  await seed(db);
  await db.execute('INSERT INTO members (last_name, first_name, birth_date) VALUES (?, ?, ?)', [
    'Exemple',
    'Camille',
    '2014-05-02',
  ]);
  await alter?.(db);
  await exportBackup(db, path, '2026-10-22');
  await db.close();
  return path;
};

/** Les fichiers refusés du ticket : chacun écrit à `path`, avec sa cause attendue. */
export const refusedFiles = {
  'version 0': {
    reason: 'NOT_A_BACKUP',
    write: (path: string) => backupFile(path, (db) => db.execute('PRAGMA user_version = 0')),
  },
  'fichier texte': {
    reason: 'NOT_SQLITE',
    write: async (path: string) => writeFileSync(path, 'Nom;Prénom\nExemple;Alix\n'.repeat(100)),
  },
  'fichier tronqué': {
    reason: 'DAMAGED',
    write: async (path: string) => {
      await backupFile(path);
      const full = readFileSync(path);
      writeFileSync(path, full.subarray(0, Math.floor(full.length / 2)));
    },
  },
  'version plus récente': {
    reason: 'NEWER_VERSION',
    write: (path: string) => backupFile(path, (db) => db.execute('PRAGMA user_version = 99')),
  },
} as const;

/** Contenu de toutes les tables, trié : deux bases aux mêmes données donnent le même texte. */
export const dump = async (db: Db): Promise<Record<string, string[]>> => {
  const tables = await db.query<{ name: string }>(
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  const out: Record<string, string[]> = {};
  for (const { name } of tables) {
    const rows = await db.query(`SELECT * FROM "${name}"`);
    out[name] = rows.map((row) => JSON.stringify(row)).sort();
  }
  return out;
};

/** Nombre de lignes de chaque table. */
export const rowCounts = async (db: Db) =>
  Object.fromEntries(Object.entries(await dump(db)).map(([name, rows]) => [name, rows.length]));
