/**
 * @jest-environment node
 */
import { count, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { openExpoDb } from '@/data/expoDb';
import { LATEST_VERSION } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

// Imitation d'expo-sqlite sur node:sqlite, base dans un fichier temporaire. Elle n'offre pas
// withExclusiveTransactionAsync : ce module ouvre une autre connexion, sans clés étrangères
// (SQLiteDatabase.ts : useNewConnection) ; l'adaptateur ne doit pas l'utiliser (SEC-11).
// On teste le code de l'adaptateur, pas le module natif (ticket 004, ADR-008).
jest.mock('expo-sqlite', () => {
  const { DatabaseSync } = require('node:sqlite');
  const { mkdtempSync, rmSync } = require('node:fs');
  const { dirname, join } = require('node:path');
  const { tmpdir } = require('node:os');
  type MockRaw = InstanceType<typeof DatabaseSync>;
  const wrap = (raw: MockRaw, path: string) => ({
    runAsync: async (sql: string, params: unknown[]) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getAllAsync: async (sql: string, params: unknown[]) => raw.prepare(sql).all(...params),
    execAsync: async (sql: string) => raw.exec(sql),
    closeAsync: async () => {
      raw.close();
      rmSync(dirname(path), { recursive: true, force: true });
    },
  });
  return {
    openDatabaseAsync: async (name: string) => {
      const path = join(mkdtempSync(join(tmpdir(), 'kila-test-')), name);
      return wrap(new DatabaseSync(path), path);
    },
  };
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
    expect(await db.query('PRAGMA user_version')).toEqual([{ user_version: LATEST_VERSION }]);
  });

  it('execute renvoie le nombre de lignes touchées et le dernier identifiant', async () => {
    const r = await db.execute('INSERT INTO members (last_name, first_name) VALUES (?, ?)', [
      'Exemple',
      'Alix',
    ]);
    expect(r).toEqual({ changes: 1, lastInsertRowId: 1 });
  });

  it('SEC-11 les suppressions en cascade fonctionnent aussi dans une transaction', async () => {
    const s = await seed(db);
    await db.transaction(async (tx) => {
      const rows = await tx.query<{ foreign_keys: number }>('PRAGMA foreign_keys');
      expect(rows).toEqual([{ foreign_keys: 1 }]);
      await tx.execute('DELETE FROM members WHERE id = ?', [s.memberId]);
    });
    expect(await count(db, 'attendances', 'member_id = ?', [s.memberId])).toBe(0);
    expect(await count(db, 'emergency_contacts', 'member_id = ?', [s.memberId])).toBe(0);
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

  it('garde l’erreur d’origine si SQLite a déjà annulé la transaction', async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.execute('ROLLBACK');
        throw new Error('cause réelle');
      }),
    ).rejects.toThrow('cause réelle');
    await insertSetting(db, 'après');
    expect(await keys()).toEqual(['après']);
  });

  it('une écriture lancée pendant une transaction attend sa fin et n’est pas annulée avec elle', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const failing = db.transaction(async (tx) => {
      await insertSetting(tx, 'dans-la-transaction');
      await gate;
      throw new Error('échec voulu');
    });
    const outside = insertSetting(db, 'hors-transaction');
    release();
    await expect(failing).rejects.toThrow('échec voulu');
    await outside;
    expect(await keys()).toEqual(['hors-transaction']);
  });

  it('refuse une transaction imbriquée et la fermeture de la base dans une transaction', async () => {
    await expect(db.transaction((tx) => tx.transaction(async () => 1))).rejects.toThrow(
      'Transaction imbriquée',
    );
    await expect(db.transaction((tx) => tx.close())).rejects.toThrow('Fermeture refusée');
    expect(await keys()).toEqual([]);
  });
});
