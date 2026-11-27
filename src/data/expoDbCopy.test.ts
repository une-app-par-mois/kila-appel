/**
 * @jest-environment node
 */
// Ouverture brute d'une copie par expo-sqlite (ticket 014b, contrat de l'appelant du ticket 014) :
// par son chemin du système, sans prepareDatabase ni migrations. expo-sqlite est imité sur
// node:sqlite, avec le paramètre `directory` (ADR-008 : on teste l'adaptateur, pas le module natif).
import { nodeFiles, tempDir } from '@/__fixtures__/backupFiles';
import { seed } from '@/__fixtures__/seed';
import { exportBackup } from '@/data/backup';
import { verifyBackup } from '@/data/backupCheck';
import { openExpoCopy } from '@/data/expoDb';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('expo-sqlite', () => {
  const { DatabaseSync } = require('node:sqlite');
  const { join } = require('node:path');
  return {
    openDatabaseAsync: jest.fn(async (name: string, _options?: object, directory?: string) => {
      const raw = new DatabaseSync(name === ':memory:' ? name : join(directory ?? '', name));
      return {
        runAsync: async (sql: string, params: unknown[]) => {
          const r = raw.prepare(sql).run(...params);
          return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
        },
        getAllAsync: async (sql: string, params: unknown[]) => raw.prepare(sql).all(...params),
        execAsync: async (sql: string) => raw.exec(sql),
        closeAsync: async () => raw.close(),
      };
    }),
  };
});
const { openDatabaseAsync } = jest.requireMock('expo-sqlite') as { openDatabaseAsync: jest.Mock };

describe('EX-19 EX-20 ouverture brute d’une copie (openExpoCopy)', () => {
  let dir: ReturnType<typeof tempDir>;
  beforeEach(() => {
    dir = tempDir();
    openDatabaseAsync.mockClear();
  });
  afterEach(() => dir.remove());

  it('ouvre le fichier par son dossier et son nom, sans migration', async () => {
    const path = dir.path('copie.db');
    const plain = openNodeDb(path);
    await plain.execute('CREATE TABLE autre (x INTEGER)');
    await plain.close();
    const copy = await openExpoCopy(path);
    expect(openDatabaseAsync).toHaveBeenCalledWith('copie.db', undefined, path.slice(0, -9));
    expect(await copy.query('PRAGMA user_version')).toEqual([{ user_version: 0 }]);
    expect(await copy.query("SELECT name FROM sqlite_schema WHERE type = 'table'")).toEqual([
      { name: 'autre' },
    ]);
    await copy.close();
  });

  it('ouvre une base vide en mémoire', async () => {
    const memory = await openExpoCopy(':memory:');
    expect(openDatabaseAsync).toHaveBeenCalledWith(':memory:');
    expect(await memory.query('PRAGMA user_version')).toEqual([{ user_version: 0 }]);
    await memory.close();
  });

  it.each(['file:///data/copie.db', 'relatif/copie.db', '/data/../copie.db', '/'])(
    'refuse le chemin %s',
    async (path) => {
      await expect(openExpoCopy(path)).rejects.toThrow('Chemin de fichier refusé');
      expect(openDatabaseAsync).not.toHaveBeenCalled();
    },
  );

  it('contrat du 014 : un fichier en version 0 est refusé (NOT_A_BACKUP), pas migré', async () => {
    const source = dir.path('version-0.db');
    const plain = openNodeDb(source);
    await plain.execute('CREATE TABLE members (id INTEGER PRIMARY KEY)');
    await plain.execute('INSERT INTO members (id) VALUES (1)');
    await plain.close();
    const result = await verifyBackup(source, dir.path('copie.db'), {
      files: nodeFiles,
      open: openExpoCopy,
      today: '2026-11-27',
    });
    expect(result).toEqual({ ok: false, reason: 'NOT_A_BACKUP' });
  });

  it('une sauvegarde exportée est acceptée par la vérification sur expo-sqlite', async () => {
    const db = await prepareDatabase(openNodeDb());
    await seed(db);
    const source = dir.path('kila-sauvegarde-2026-11-27.db');
    await exportBackup(db, source, '2026-11-27');
    await db.close();
    const result = await verifyBackup(source, dir.path('copie.db'), {
      files: nodeFiles,
      open: openExpoCopy,
      today: '2026-11-27',
    });
    expect(result).toMatchObject({ ok: true, backup: { summary: { backupDate: '2026-11-27' } } });
  });
});
