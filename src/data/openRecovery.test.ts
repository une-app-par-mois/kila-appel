/**
 * @jest-environment node
 */
// EX-22 (ticket 014c) : une base illisible au démarrage est reconnue et classée, jamais prise pour
// un réglage refusé ; la connexion est fermée et le fichier laissé tel quel. Vraie base node:sqlite.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Db } from '@/data/db';
import { membersRepo } from '@/data/membersRepo';
import { UNKNOWN_VERSION } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import {
  classifyOpenError,
  DATABASE_DAMAGED,
  DATABASE_UNAVAILABLE,
  FOREIGN_KEYS_OFF,
  isCorruption,
  JOURNAL_MODE_OFF,
  openAppDatabase,
  prepareDatabase,
  SECURE_DELETE_OFF,
} from '@/data/open';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const PAGE = 4096;

/** Mêmes octets. */
const same = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((byte, i) => byte === b[i]);
const NAMES = ['Zzprenomzz', 'Zznomzz'];

/** Ouvre `db` en relevant chaque instruction et la fermeture. */
const recording = (db: Db) => {
  const sql: string[] = [];
  const close = jest.fn(() => db.close());
  const spied: Db = {
    execute: (s, p) => {
      sql.push(s);
      return db.execute(s, p);
    },
    query: (s, p) => {
      sql.push(s);
      return db.query(s, p);
    },
    transaction: (fn) => db.transaction(fn),
    close,
  };
  return { spied, sql, close };
};

/** Message de l'erreur levée par l'ouverture. */
const failure = async (open: () => Promise<Db>): Promise<string> => {
  const error = await openAppDatabase(open).then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(Error);
  return (error as Error).message;
};

describe('EX-22 base illisible au démarrage (ticket 014c)', () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kila-illisible-'));
    file = join(dir, 'kila.db');
    log.mockClear();
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  /** Base de l'appli migrée, avec beaucoup de membres fictifs : plusieurs pages. */
  const appFile = async () => {
    const db = await prepareDatabase(openNodeDb(file));
    for (let i = 0; i < 300; i += 1) {
      await membersRepo(db).create(
        { firstName: NAMES[0] as string, lastName: `${NAMES[1]}${i}`, birthDate: null },
        { today: '2026-11-27' },
      );
    }
    await db.close();
    return readFileSync(file).length;
  };

  /** Écrit `length` octets de bruit à partir de `offset`. */
  const scribble = (offset: number, length: number) => {
    const bytes = readFileSync(file);
    bytes.fill(0xa5, offset, offset + length);
    writeFileSync(file, bytes);
  };

  it('EX-22 fichier texte : DATABASE_DAMAGED, pas JOURNAL_MODE_OFF, aucun réglage tenté', async () => {
    writeFileSync(file, 'Ceci est un fichier texte, pas une base de données. '.repeat(40));
    const before = readFileSync(file);
    const { spied, sql, close } = recording(openNodeDb(file));
    expect(await failure(async () => spied)).toBe(DATABASE_DAMAGED);
    expect(sql.some((s) => s.includes('journal_mode') || s.includes('foreign_keys'))).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
    // Rien n'a été effacé ni réécrit.
    expect(same(readFileSync(file), before)).toBe(true);
  });

  it('EX-22 fichier tronqué : DATABASE_DAMAGED, connexion fermée', async () => {
    const size = await appFile();
    writeFileSync(file, readFileSync(file).slice(0, Math.floor(size / 2)));
    const { spied, close } = recording(openNodeDb(file));
    expect(await failure(async () => spied)).toBe(DATABASE_DAMAGED);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('EX-22 page d’index corrompue (schéma lisible) : vue par quick_check, DATABASE_DAMAGED', async () => {
    await appFile();
    // Page 3 : racine de l'index seasons_one_active (ordre fixe de la migration 1). Une page
    // d'index abîmée ne gêne ni sqlite_schema ni la lecture des tables : seul quick_check la voit.
    scribble(2 * PAGE, PAGE);
    const probe = openNodeDb(file);
    expect((await probe.query('SELECT count(*) AS n FROM sqlite_schema')).length).toBe(1);
    const check = await probe.query<{ quick_check: string }>('PRAGMA main.quick_check');
    expect(check[0]?.quick_check).not.toBe('ok');
    await probe.close();
    const { spied, sql, close } = recording(openNodeDb(file));
    expect(await failure(async () => spied)).toBe(DATABASE_DAMAGED);
    expect(sql).toContain('PRAGMA main.quick_check');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('EX-22 page de données corrompue (quick_check en erreur) : DATABASE_DAMAGED', async () => {
    const size = await appFile();
    scribble(size - PAGE, PAGE);
    expect(await failure(async () => openNodeDb(file))).toBe(DATABASE_DAMAGED);
  });

  it('EX-22 lecture d’essai et quick_check passent avant le premier réglage', async () => {
    const { spied, sql } = recording(openNodeDb(file));
    const db = await openAppDatabase(async () => spied);
    const schema = sql.findIndex((s) => s.includes('sqlite_schema'));
    const check = sql.indexOf('PRAGMA main.quick_check');
    const settings = sql.indexOf('PRAGMA foreign_keys = ON');
    expect(schema).toBeGreaterThanOrEqual(0);
    expect(schema).toBeLessThan(check);
    expect(check).toBeLessThan(settings);
    await db.close();
  });

  it('EX-22 version future : UNKNOWN_VERSION (newer), fichier intact', async () => {
    const plain = openNodeDb(file);
    await plain.execute('PRAGMA user_version = 99');
    await plain.close();
    const before = readFileSync(file);
    const message = await failure(async () => openNodeDb(file));
    expect(message).toBe(UNKNOWN_VERSION);
    expect(classifyOpenError(new Error(message))).toBe('newer');
    expect(same(readFileSync(file), before)).toBe(true);
  });

  it.each([
    ['PRAGMA foreign_keys', { foreign_keys: 0 }, FOREIGN_KEYS_OFF],
    ['PRAGMA secure_delete', { secure_delete: 0 }, SECURE_DELETE_OFF],
    ['PRAGMA main.journal_mode', { journal_mode: 'wal' }, JOURNAL_MODE_OFF],
  ])('EX-22 réglage refusé simulé (%s) : cause settings', async (pragma, row, expected) => {
    const db = openNodeDb(file);
    const refusing: Db = {
      ...db,
      query: async <T>(s: string, p: (string | number | null)[] = []) =>
        s === pragma ? ([row] as T[]) : db.query<T>(s, p),
    };
    const message = await failure(async () => refusing);
    expect(message).toBe(expected);
    expect(classifyOpenError(new Error(message))).toBe('settings');
  });

  // Réponse du porteur du 2026-11-27 : « abîmée » seulement si le fichier est illisible ; toute
  // autre erreur mène à « Réessayer », sans effacement.
  it('EX-22 erreur inconnue pendant les migrations : DATABASE_UNAVAILABLE, texte fixe', async () => {
    const db = openNodeDb(file);
    const failing: Db = {
      ...db,
      transaction: async () => {
        throw new Error('disk I/O error near Zznomzz');
      },
    };
    const message = await failure(async () => failing);
    expect(message).toBe(DATABASE_UNAVAILABLE);
    expect(classifyOpenError(new Error(message))).toBe('unavailable');
  });

  it('EX-22 ouverture du fichier impossible : DATABASE_UNAVAILABLE', async () => {
    expect(
      await failure(async () => {
        throw new Error('unable to open database file');
      }),
    ).toBe(DATABASE_UNAVAILABLE);
  });

  it('EX-22 réglage qui lève une exception : DATABASE_UNAVAILABLE', async () => {
    const db = openNodeDb(file);
    const throwing: Db = {
      ...db,
      execute: async (s, p = []) => {
        if (s === 'PRAGMA foreign_keys = ON') throw new Error('database is locked');
        return db.execute(s, p);
      },
    };
    expect(await failure(async () => throwing)).toBe(DATABASE_UNAVAILABLE);
  });

  it.each([
    ['database is locked', DATABASE_UNAVAILABLE],
    ['Error code 5: database is locked', DATABASE_UNAVAILABLE],
    ['Error code 11: database disk image is malformed', DATABASE_DAMAGED],
    ['Error code 26: file is not a database', DATABASE_DAMAGED],
  ])('EX-22 lecture d’essai en erreur « %s » : %s', async (raw, expected) => {
    const db = openNodeDb(file);
    const failing: Db = {
      ...db,
      query: async <T>(s: string, p: (string | number | null)[] = []) => {
        if (s.includes('sqlite_schema')) throw new Error(raw);
        return db.query<T>(s, p);
      },
    };
    expect(await failure(async () => failing)).toBe(expected);
  });

  it('ABS-04 aucun nom dans l’erreur ni dans le journal (base abîmée pleine de noms)', async () => {
    const size = await appFile();
    scribble(PAGE, size - 2 * PAGE);
    const message = await failure(async () => openNodeDb(file));
    expect(message).toBe(DATABASE_DAMAGED);
    const written = JSON.stringify(log.mock.calls) + message;
    for (const name of NAMES) expect(written).not.toContain(name);
  });
});

describe('EX-22 classifyOpenError : réglage, version plus récente ou base abîmée', () => {
  it.each([
    [FOREIGN_KEYS_OFF, 'settings'],
    [SECURE_DELETE_OFF, 'settings'],
    [JOURNAL_MODE_OFF, 'settings'],
    [UNKNOWN_VERSION, 'newer'],
    [DATABASE_DAMAGED, 'damaged'],
    [DATABASE_UNAVAILABLE, 'unavailable'],
    ['file is not a database', 'unavailable'],
  ])('%s → %s', (message, cause) => {
    expect(classifyOpenError(new Error(message))).toBe(cause);
  });

  it('ce qui n’est pas une Error : unavailable (rien n’est effacé)', () => {
    expect(classifyOpenError(DATABASE_DAMAGED)).toBe('unavailable');
    expect(classifyOpenError(undefined)).toBe('unavailable');
  });
});

describe('EX-22 isCorruption : SQLITE_CORRUPT ou SQLITE_NOTADB seulement', () => {
  const withCode = (errcode: number) => Object.assign(new Error('x'), { errcode });
  it.each([
    ['node:sqlite errcode 11', withCode(11), true],
    ['node:sqlite errcode 26', withCode(26), true],
    ['code étendu 779 (SQLITE_CORRUPT_INDEX)', withCode(779), true],
    ['node:sqlite errcode 5 (BUSY)', withCode(5), false],
    ['expo-sqlite « Error code 11 »', new Error('→ Caused by: Error code 11: malformed'), true],
    ['expo-sqlite « Error code 267 »', new Error('Error code 267: vtab'), true],
    ['expo-sqlite « Error code 10 »', new Error('Error code 10: disk I/O error'), false],
    ['texte de SQLite', new Error('database disk image is malformed'), true],
    ['texte de SQLite', new Error('file is not a database'), true],
    ['autre', new Error('unable to open database file'), false],
    ['pas une Error', 'file is not a database', false],
  ])('%s → %s', (_cas, error, expected) => {
    expect(isCorruption(error)).toBe(expected);
  });
});
