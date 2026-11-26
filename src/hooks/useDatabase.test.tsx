import { renderHook, waitFor } from '@testing-library/react-native';
import type { Db } from '@/data/db';
import { resetDatabaseForTests, useDatabase } from '@/hooks/useDatabase';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('@/data/expoDb', () => ({ openExpoDb: jest.fn() }));
// La vraie ouverture (migration, DB_READY) est testée sur node:sqlite : src/data/open.test.ts.
jest.mock('@/data/open', () => ({ openAppDatabase: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const { openAppDatabase } = jest.requireMock('@/data/open') as { openAppDatabase: jest.Mock };

const fakeDb = { query: jest.fn() } as unknown as Db;
const open = async () => fakeDb;

describe('useDatabase : une seule base pour toute l’appli (ADR-008)', () => {
  beforeEach(() => {
    resetDatabaseForTests();
    log.mockClear();
    openAppDatabase.mockReset();
  });

  it('rend la base une fois prête', async () => {
    openAppDatabase.mockResolvedValue(fakeDb);
    const { result } = await renderHook(() => useDatabase(open));
    await waitFor(() => expect(result.current).toBe(fakeDb));
    expect(openAppDatabase).toHaveBeenCalledWith(open);
  });

  it('ouvre et migre une seule fois, quel que soit le nombre d’appels ou de montages', async () => {
    openAppDatabase.mockResolvedValue(fakeDb);
    const first = await renderHook(() => useDatabase(open));
    const second = await renderHook(() => useDatabase(async () => fakeDb));
    await waitFor(() => expect(second.result.current).toBe(fakeDb));
    await first.unmount();
    const third = await renderHook(() => useDatabase(open));
    await waitFor(() => expect(third.result.current).toBe(fakeDb));
    expect(openAppDatabase).toHaveBeenCalledTimes(1);
  });

  it('écrit DB_OPEN_FAILED, sans détail, et permet un nouvel essai', async () => {
    openAppDatabase.mockRejectedValueOnce(new Error('fichier illisible'));
    const failed = await renderHook(() => useDatabase(open));
    await waitFor(() => expect(log).toHaveBeenCalledWith('DB_OPEN_FAILED'));
    expect(failed.result.current).toBeNull();
    await failed.unmount();
    openAppDatabase.mockResolvedValue(fakeDb);
    const retry = await renderHook(() => useDatabase(open));
    await waitFor(() => expect(retry.result.current).toBe(fakeDb));
  });
});
