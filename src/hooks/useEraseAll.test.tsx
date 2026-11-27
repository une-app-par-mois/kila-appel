/**
 * @jest-environment node
 */
// useEraseAll (ticket 015f, EX-23, SEC-10, SEC-11, ABS-04, ABS-05) : tout effacer sous le verrou
// commun, sur la base ouverte, puis vidage des copies du cache sous le même verrou. Vraie base
// node:sqlite et jeu fictif.
import { act, renderHook } from '@testing-library/react-native';
import { TABLES } from '@/__fixtures__/purgeSeed';
import { count, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { LATEST_VERSION } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { erasedCount, onDataChanged } from '@/hooks/dataChanged';
import { type FileTask, fileLock } from '@/hooks/fileLock';
import { useEraseAll } from '@/hooks/useErase';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/hooks/useLocalNow', () => ({
  useLocalNow: () => ({ date: '2026-11-27', time: '18:00' }),
}));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const schema = (db: Db) =>
  db.query("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name");

describe('useEraseAll : tout effacer (EX-23, SEC-11)', () => {
  let db: Db;
  let clearCopies: jest.Mock;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    await db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', ['retention_seasons', '1']);
    mockDb = db;
    clearCopies = jest.fn(async () => undefined);
    log.mockClear();
  });
  afterEach(async () => {
    for (const task of ['erase', 'export', 'restore', 'cleanup'] as FileTask[]) {
      fileLock.release(task);
    }
    mockDb = null;
    await db.close();
  });

  const erase = async () => {
    const { result } = await renderHook(() => useEraseAll({ clearCopies }));
    let done: boolean | null = null;
    await act(async () => {
      done = await result.current.eraseNow();
    });
    return { done, result };
  };

  it('EX-23 SEC-11 toutes les tables vides, schéma et version gardés, écrans prévenus', async () => {
    const before = await schema(db);
    const erasedBefore = erasedCount();
    const changed = jest.fn();
    const off = onDataChanged(changed);
    const { done, result } = await erase();
    off();
    expect(done).toBe(true);
    for (const table of TABLES) expect(await count(db, table)).toBe(0);
    expect(await schema(db)).toEqual(before);
    expect(await db.query('PRAGMA user_version')).toEqual([{ user_version: LATEST_VERSION }]);
    expect(changed).toHaveBeenCalled();
    // Les valeurs lues avant l'effacement deviennent périmées (accueil, revue du 015f).
    expect(erasedCount()).toBe(erasedBefore + 1);
    expect(result.current.erasing).toBe(false);
    expect(fileLock.holder()).toBeNull();
  });

  it('SEC-10 SEC-11 copies vidées une seule fois, après l’effacement, sous le même verrou', async () => {
    const seen: { holder: string | null; seasons: number }[] = [];
    clearCopies.mockImplementation(async () => {
      seen.push({ holder: fileLock.holder(), seasons: await count(db, 'seasons') });
    });
    const holders: (string | null)[] = [];
    const transaction = db.transaction.bind(db);
    jest.spyOn(db, 'transaction').mockImplementation((work) => {
      holders.push(fileLock.holder());
      return transaction(work);
    });
    await erase();
    expect(holders).toEqual(['erase']);
    expect(seen).toEqual([{ holder: 'erase', seasons: 0 }]);
  });

  it.each(['export', 'restore', 'cleanup', 'erase'] as FileTask[])(
    'SEC-11 verrou déjà pris (%s) : rien d’effacé ni vidé, ERASE_ALL_REFUSED',
    async (task) => {
      fileLock.acquire(task);
      const { done } = await erase();
      expect(done).toBe(false);
      expect(await count(db, 'members')).toBe(2);
      expect(clearCopies).not.toHaveBeenCalled();
      expect(log.mock.calls).toEqual([['ERASE_ALL_REFUSED']]);
      expect(fileLock.holder()).toBe(task);
    },
  );

  it('EX-23 échec de l’effacement : rien d’effacé, copies gardées, verrou rendu', async () => {
    jest.spyOn(db, 'transaction').mockRejectedValue(new Error('panne'));
    const changed = jest.fn();
    const off = onDataChanged(changed);
    const { done, result } = await erase();
    off();
    expect(done).toBe(false);
    expect(await count(db, 'members')).toBe(2);
    expect(clearCopies).not.toHaveBeenCalled();
    expect(log.mock.calls).toEqual([['ERASE_ALL_FAILED']]);
    expect(fileLock.holder()).toBeNull();
    expect(result.current.erasing).toBe(false);
    expect(changed).not.toHaveBeenCalled();
  });

  it('EX-23 base pas encore ouverte : rien d’effacé, ERASE_ALL_REFUSED', async () => {
    mockDb = null;
    const { done } = await erase();
    expect(done).toBe(false);
    expect(clearCopies).not.toHaveBeenCalled();
    expect(log.mock.calls).toEqual([['ERASE_ALL_REFUSED']]);
    expect(fileLock.holder()).toBeNull();
  });

  it('SEC-10 échec du vidage : ERASE_COPIES_FAILED, effacement réussi, verrou rendu', async () => {
    clearCopies.mockRejectedValue(new Error('cache'));
    const { done } = await erase();
    expect(done).toBe(true);
    expect(await count(db, 'members')).toBe(0);
    expect(log).toHaveBeenCalledWith('ERASE_COPIES_FAILED');
    expect(fileLock.holder()).toBeNull();
  });

  it('ABS-04 le journal ne reçoit que des codes, jamais un nom fictif', async () => {
    const names = await db.query<{ last_name: string; first_name: string }>(
      'SELECT last_name, first_name FROM members',
    );
    clearCopies.mockRejectedValue(new Error(names.map((m) => m.last_name).join(' ')));
    await erase();
    jest.spyOn(db, 'transaction').mockRejectedValue(new Error(names[0]?.first_name ?? ''));
    await erase();
    const written = JSON.stringify(log.mock.calls);
    for (const m of names) {
      expect(written).not.toContain(m.last_name);
      expect(written).not.toContain(m.first_name);
    }
    for (const call of log.mock.calls) expect(call[0]).toMatch(/^[A-Z_]+$/);
  });
});
