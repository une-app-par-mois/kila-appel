/**
 * @jest-environment node
 */

import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Db } from '@/data/db';
import { membersRepo } from '@/data/membersRepo';
import { LATEST_VERSION } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { JOURNAL_MODE_OFF, openAppDatabase, prepareDatabase, SECURE_DELETE_OFF } from '@/data/open';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

describe('openAppDatabase : ouverture au démarrage (ADR-008, vérifiée sur le téléphone)', () => {
  it('ouvre, migre et écrit DB_READY avec la version dans le journal', async () => {
    const db = await openAppDatabase(async () => openNodeDb());
    expect(await db.query('PRAGMA user_version')).toEqual([{ user_version: LATEST_VERSION }]);
    expect(log).toHaveBeenCalledWith('DB_READY', { version: LATEST_VERSION });
    await db.close();
  });

  it('ferme la connexion si la préparation échoue (base trop récente), puis relaie l’erreur', async () => {
    const raw = openNodeDb();
    await raw.execute('PRAGMA user_version = 99');
    const close = jest.spyOn(raw, 'close');
    await expect(openAppDatabase(async () => raw)).rejects.toThrow();
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('ABS-05 effacement dans le fichier (ticket 007d)', () => {
  it('active secure_delete à chaque ouverture', async () => {
    const db = await prepareDatabase(openNodeDb());
    expect(await db.query('PRAGMA secure_delete')).toEqual([{ secure_delete: 1 }]);
    await db.close();
  });

  it('refuse d’ouvrir si le réglage n’a pas pris', async () => {
    const db = openNodeDb();
    const ignored: Db = {
      ...db,
      query: async <T>(sql: string, params: (string | number | null)[] = []) =>
        sql === 'PRAGMA secure_delete' ? ([{ secure_delete: 0 }] as T[]) : db.query<T>(sql, params),
    };
    await expect(prepareDatabase(ignored)).rejects.toThrow(SECURE_DELETE_OFF);
    await db.close();
  });

  it('après la suppression d’un membre, son nom ne reste pas dans le fichier', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kila-effacement-'));
    const file = join(dir, 'kila.db');
    try {
      const db = await prepareDatabase(openNodeDb(file));
      // Suppression par le dépôt, cascade comprise : nom, prénom et téléphone d'un contact fictifs.
      const id = await membersRepo(db).create(
        { firstName: 'Zzprenomzz', lastName: 'Zznomzz', birthDate: '2015-03-14' },
        { today: '2026-11-26' },
      );
      await db.execute(
        'INSERT INTO emergency_contacts (member_id, label, phone, position) VALUES (?, ?, ?, 0)',
        [id, 'Zzcontactzz', '0699999917'],
      );
      await membersRepo(db).remove(id);
      await db.close();
      // Octets décodés en UTF-8 : une valeur ASCII se lirait telle quelle si elle restait.
      const bytes = new TextDecoder().decode(readFileSync(file));
      for (const value of ['Zzprenomzz', 'Zznomzz', 'Zzcontactzz', '0699999917']) {
        expect(bytes.includes(value)).toBe(false);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// SEC-11 (ticket 015c) : en WAL, d'anciennes trames resteraient dans le fichier `-wal`.
describe('SEC-11 mode de journal fixé à delete à chaque ouverture (ticket 015c)', () => {
  const journalMode = async (db: Db) =>
    (await db.query<{ journal_mode: string }>('PRAGMA main.journal_mode'))[0]?.journal_mode;

  /** Base dont la relecture du mode de journal rend `mode`, le reste passant à la vraie base. */
  const answering = (db: Db, mode: string): Db => ({
    ...db,
    query: async <T>(sql: string, params: (string | number | null)[] = []) =>
      sql === 'PRAGMA main.journal_mode'
        ? ([{ journal_mode: mode }] as T[])
        : db.query<T>(sql, params),
  });

  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kila-journal-'));
    file = join(dir, 'kila.db');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const files = () => readdirSync(dir, { withFileTypes: true }).map((entry) => entry.name);

  it('base sur fichier : mode delete lu après ouverture', async () => {
    const db = await prepareDatabase(openNodeDb(file));
    expect(await journalMode(db)).toBe('delete');
    await db.close();
  });

  it('base en mémoire (sans fichier) : mode memory accepté', async () => {
    const db = await prepareDatabase(openNodeDb());
    expect(await journalMode(db)).toBe('memory');
    await db.close();
  });

  it('base en WAL ramenée à delete, ligne gardée, mode gardé à la réouverture', async () => {
    // Trames gardées dans `-wal` : sans checkpoint automatique, copie de la base et de son
    // `-wal` pendant que la première connexion reste ouverte (la fermer viderait le `-wal`).
    const before = openNodeDb(join(dir, 'source.db'));
    expect(await before.query('PRAGMA journal_mode = WAL')).toEqual([{ journal_mode: 'wal' }]);
    await before.query('PRAGMA wal_autocheckpoint = 0');
    await before.execute('CREATE TABLE fictive (id INTEGER PRIMARY KEY, label TEXT)');
    await before.execute('INSERT INTO fictive (label) VALUES (?)', ['Zzfictifzz']);
    copyFileSync(join(dir, 'source.db'), file);
    copyFileSync(join(dir, 'source.db-wal'), `${file}-wal`);
    await before.close();
    expect(readFileSync(`${file}-wal`).length).toBeGreaterThan(0);

    const db = await prepareDatabase(openNodeDb(file));
    expect(await journalMode(db)).toBe('delete');
    expect(files()).not.toContain('kila.db-wal');
    expect(await db.query('SELECT label FROM fictive')).toEqual([{ label: 'Zzfictifzz' }]);
    await db.close();

    const again = openNodeDb(file);
    expect(await journalMode(again)).toBe('delete');
    await again.close();
  });

  it('PRAGMA journal_mode passe avant la première instruction de migration', async () => {
    const before = openNodeDb(file);
    await before.query('PRAGMA journal_mode = WAL');
    await before.close();
    const db = openNodeDb(file);
    const order: string[] = [];
    const recording = (base: Db): Db => ({
      execute: (sql, params) => {
        order.push(sql);
        return base.execute(sql, params);
      },
      query: (sql, params) => {
        order.push(sql);
        return base.query(sql, params);
      },
      transaction: (fn) => {
        order.push('BEGIN');
        return base.transaction((tx) => fn(recording(tx)));
      },
      close: () => base.close(),
    });
    await prepareDatabase(recording(db));
    const journal = order.indexOf('PRAGMA main.journal_mode = DELETE');
    expect(journal).toBeGreaterThanOrEqual(0);
    expect(journal).toBeLessThan(order.indexOf('BEGIN'));
    expect(journal).toBeLessThan(order.findIndex((sql) => sql.startsWith('CREATE')));
    await db.close();
  });

  it('relecture memory sans ligne main dans pragma_database_list : refusée', async () => {
    const db = openNodeDb();
    const memory = answering(db, 'memory');
    const noMain: Db = {
      ...memory,
      query: async <T>(sql: string, params: (string | number | null)[] = []) =>
        sql.includes('pragma_database_list') ? ([] as T[]) : memory.query<T>(sql, params),
    };
    await expect(prepareDatabase(noMain)).rejects.toThrow(JOURNAL_MODE_OFF);
    await db.close();
  });

  it('base sur fichier dont la relecture rend memory : refusée', async () => {
    const db = openNodeDb(file);
    await expect(prepareDatabase(answering(db, 'memory'))).rejects.toThrow(JOURNAL_MODE_OFF);
    await db.close();
  });

  it('base dont la relecture rend wal : refusée', async () => {
    const db = openNodeDb();
    await expect(prepareDatabase(answering(db, 'wal'))).rejects.toThrow(JOURNAL_MODE_OFF);
    await db.close();
  });

  it('erreur SQLite pendant le pragma : JOURNAL_MODE_OFF, sans le message de SQLite', async () => {
    const db = openNodeDb(file);
    const locked: Db = {
      ...db,
      execute: async (sql, params = []) => {
        if (sql === 'PRAGMA main.journal_mode = DELETE') throw new Error('database is locked');
        return db.execute(sql, params);
      },
    };
    log.mockClear();
    const error = await openAppDatabase(async () => locked).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(JOURNAL_MODE_OFF);
    // ABS-04 : le message de SQLite ne part pas non plus dans le journal.
    expect(JSON.stringify(log.mock.calls)).not.toContain('locked');
  });
});
