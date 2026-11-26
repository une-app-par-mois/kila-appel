/**
 * @jest-environment node
 */
import type { Db } from '@/data/db';
import { openExpoDb } from '@/data/expoDb';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

// Imitation d'expo-sqlite sur une vraie base node:sqlite : on teste le code de l'adaptateur,
// pas le module natif (vérifié sur téléphone au ticket 004, ADR-008).
jest.mock('expo-sqlite', () => {
  const { DatabaseSync } = require('node:sqlite');
  const wrap = (raw: InstanceType<typeof DatabaseSync>) => {
    const api = {
      runAsync: async (sql: string, params: unknown[]) => {
        const r = raw.prepare(sql).run(...params);
        return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
      },
      getAllAsync: async (sql: string, params: unknown[]) => raw.prepare(sql).all(...params),
      withExclusiveTransactionAsync: async (task: (txn: unknown) => Promise<void>) => {
        raw.exec('BEGIN IMMEDIATE');
        try {
          await task(api);
          raw.exec('COMMIT');
        } catch (error) {
          raw.exec('ROLLBACK');
          throw error;
        }
      },
      closeAsync: async () => raw.close(),
    };
    return api;
  };
  return { openDatabaseAsync: async () => wrap(new DatabaseSync(':memory:')) };
});

describe.each([
  ['node:sqlite', async () => openNodeDb()],
  ['expo-sqlite', () => openExpoDb()],
])('Adaptateur %s (ADR-008 : mêmes requêtes)', (_name, open: () => Promise<Db>) => {
  let db: Db;
  beforeEach(async () => {
    db = await open();
    await prepareDatabase(db);
  });
  afterEach(async () => {
    await db.close();
  });

  const insertSetting = (target: Db, key: string) =>
    target.execute('INSERT INTO settings (key, value) VALUES (?, ?)', [key, 'x']);
  const keys = async () =>
    (await db.query<{ key: string }>('SELECT key FROM settings ORDER BY key')).map((r) => r.key);

  it('applique la migration 1 et active les clés étrangères', async () => {
    const rows = await db.query<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(rows).toEqual([{ foreign_keys: 1 }]);
    expect(await db.query('PRAGMA user_version')).toEqual([{ user_version: 1 }]);
  });

  it('execute renvoie le nombre de lignes touchées et le dernier identifiant', async () => {
    const r = await db.execute('INSERT INTO members (last_name, first_name) VALUES (?, ?)', [
      'Exemple',
      'Alix',
    ]);
    expect(r).toEqual({ changes: 1, lastInsertRowId: 1 });
  });

  it('une transaction réussie est validée et renvoie sa valeur', async () => {
    const value = await db.transaction(async (tx) => {
      await insertSetting(tx, 'a');
      await insertSetting(tx, 'b');
      return 42;
    });
    expect(value).toBe(42);
    expect(await keys()).toEqual(['a', 'b']);
  });

  it('une transaction qui échoue est annulée entièrement et l’erreur remonte', async () => {
    await expect(
      db.transaction(async (tx) => {
        await insertSetting(tx, 'a');
        await insertSetting(tx, 'a');
      }),
    ).rejects.toThrow();
    expect(await keys()).toEqual([]);
  });

  it('refuse une transaction imbriquée', async () => {
    await expect(db.transaction((tx) => tx.transaction(async () => 1))).rejects.toThrow(
      'Transaction imbriquée',
    );
  });
});
