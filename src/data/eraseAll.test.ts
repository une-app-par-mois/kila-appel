/**
 * @jest-environment node
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { count, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { ERASE_STATEMENTS, eraseAll } from '@/data/eraseAll';
import { LATEST_VERSION } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

type Table = Parameters<typeof count>[1];

const tableNames = async (db: Db) =>
  (
    await db.query<{ name: Table }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).map((row) => row.name);

const erasedTables = () =>
  ERASE_STATEMENTS.map((sql) => /^DELETE FROM ([a-z_]+)$/.exec(sql)?.[1] ?? sql);

describe('Tout effacer : données (EX-23, SEC-11, ABS-05)', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    await db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', ['retention', '2']);
    log.mockClear();
  });
  afterEach(async () => {
    await db.close();
  });

  it('EX-23 la liste fixe couvre exactement les tables de la migration, une fois chacune', async () => {
    const tables = erasedTables();
    expect(new Set(tables).size).toBe(tables.length);
    expect([...tables].sort()).toEqual(await tableNames(db));
  });

  it('EX-23 SEC-11 vide chaque table (réglages et appel en cours compris), garde schéma et version', async () => {
    const tables = await tableNames(db);
    for (const table of tables) {
      // Le jeu fictif remplit toutes les tables : le test prouve bien un effacement.
      expect(await count(db, table)).toBeGreaterThan(0);
    }
    await eraseAll(db);
    for (const table of tables) {
      expect(await count(db, table)).toBe(0);
    }
    expect(await tableNames(db)).toEqual(tables);
    expect(await db.query('PRAGMA user_version')).toEqual([{ user_version: LATEST_VERSION }]);
    expect(log).toHaveBeenCalledWith('ERASE_ALL_DONE');
  });

  it('EX-23 tout ou rien : un échec en cours d’effacement annule tout', async () => {
    const failing: Db = {
      ...db,
      transaction: (fn) =>
        db.transaction((tx) =>
          fn({
            ...tx,
            execute: (sql, params) =>
              sql === 'DELETE FROM seasons'
                ? Promise.reject(new Error('panne'))
                : tx.execute(sql, params),
          }),
        ),
    };
    await expect(eraseAll(failing)).rejects.toThrow('panne');
    expect(await count(db, 'members')).toBe(2);
    expect(await count(db, 'attendances')).toBe(2);
    expect(await count(db, 'roll_call_drafts')).toBe(1);
    expect(await count(db, 'settings')).toBe(1);
  });

  it('ABS-05 après tout effacer, aucun nom fictif ne reste dans le fichier', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kila-tout-effacer-'));
    const file = join(dir, 'kila.db');
    try {
      const fileDb = await prepareDatabase(openNodeDb(file));
      await seed(fileDb);
      await fileDb.execute('INSERT INTO members (last_name, first_name) VALUES (?, ?)', [
        'Zzeffacezz',
        'Zzprenomtoutzz',
      ]);
      await fileDb.execute('INSERT INTO settings (key, value) VALUES (?, ?)', ['zzreglagezz', '1']);
      await eraseAll(fileDb);
      await fileDb.close();
      // Octets décodés en UTF-8 : une valeur ASCII se lirait telle quelle si elle restait.
      const bytes = new TextDecoder().decode(readFileSync(file));
      for (const value of [
        'Zzeffacezz',
        'Zzprenomtoutzz',
        'zzreglagezz',
        'Exemple',
        '0600000000',
      ]) {
        expect(bytes.includes(value)).toBe(false);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
