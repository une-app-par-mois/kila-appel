// Base fictive de l'import (ticket 034, EX-30) : mêmes groupes et membres que la maquette
// (src/__fixtures__/importRows.ts), sur node:sqlite. Données fictives seulement (SEC-13).
import type { Db } from '@/data/db';
import { importContext } from '@/data/memberImportRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import type { CsvRow } from '@/domain/csvParse';
import { previewImport } from '@/domain/memberImport';

export type ImportDb = {
  db: Db;
  seasonId: number;
  poussins: number;
  benjamins: number;
  adultes: number;
  eveil: number;
  garcia: number;
  blanc: number;
};

const insert = async (db: Db, sql: string, params: (string | number | null)[]) =>
  (await db.execute(sql, params)).lastInsertRowId;

/**
 * Saison active du 01/09/2026 au 31/07/2027 ; groupes Poussins mercredi, Benjamins lundi, Adultes
 * jeudi et Éveil samedi (archivé) ; Léo Garcia (14/03/2017) et Zoé Blanc (archivée, sans date).
 */
export const importDb = async (): Promise<ImportDb> => {
  const db = await prepareDatabase(openNodeDb());
  const seasonId = await insert(
    db,
    'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES (?, ?, ?, 1)',
    ['Saison 2026-2027', '2026-09-01', '2027-07-31'],
  );
  const group = (name: string) =>
    insert(db, 'INSERT INTO groups (season_id, name) VALUES (?, ?)', [seasonId, name]);
  const poussins = await group('Poussins mercredi');
  const benjamins = await group('Benjamins lundi');
  const adultes = await group('Adultes jeudi');
  const eveil = await group('Éveil samedi');
  await db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', ['2026-10-01', eveil]);
  const garcia = await insert(
    db,
    'INSERT INTO members (last_name, first_name, birth_date) VALUES (?, ?, ?)',
    ['Garcia', 'Léo', '2017-03-14'],
  );
  const blanc = await insert(
    db,
    'INSERT INTO members (last_name, first_name, archived_at) VALUES (?, ?, ?)',
    ['Blanc', 'Zoé', '2026-06-30'],
  );
  return { db, seasonId, poussins, benjamins, adultes, eveil, garcia, blanc };
};

/** Aperçu calculé sur la base, comme à l'écran de choix (ticket 034). */
export const previewOn = async (db: Db, rows: CsvRow[], today: string) => {
  const result = previewImport(rows, { ...(await importContext(db)), today });
  if (!result.ok) throw new Error('Aperçu refusé');
  return result.preview;
};
