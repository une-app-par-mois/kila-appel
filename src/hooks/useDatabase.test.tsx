import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Db } from '@/data/db';
import { UNKNOWN_VERSION } from '@/data/migrations';
import { DATABASE_DAMAGED, DATABASE_UNAVAILABLE, FOREIGN_KEYS_OFF } from '@/data/open';
import {
  resetDatabase,
  resetDatabaseForTests,
  retryDatabase,
  useDatabase,
  useDatabaseState,
} from '@/hooks/useDatabase';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('@/data/expoDb', () => ({ openExpoDb: jest.fn(), deleteAppDatabase: jest.fn() }));
// La vraie ouverture (migration, DB_READY, classement) est testée sur node:sqlite :
// src/data/open.test.ts et src/data/openRecovery.test.ts. Le classement reste le vrai.
jest.mock('@/data/open', () => ({
  ...jest.requireActual('@/data/open'),
  openAppDatabase: jest.fn(),
}));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const { openAppDatabase } = jest.requireMock('@/data/open') as { openAppDatabase: jest.Mock };
const { deleteAppDatabase } = jest.requireMock('@/data/expoDb') as {
  deleteAppDatabase: jest.Mock;
};

const fakeDb = { query: jest.fn() } as unknown as Db;
const open = async () => fakeDb;

beforeEach(() => {
  resetDatabaseForTests();
  log.mockClear();
  openAppDatabase.mockReset();
  deleteAppDatabase.mockReset();
});

describe('useDatabase : une seule base pour toute l’appli (ADR-008)', () => {
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
});

describe('EX-22 état partagé de l’ouverture (ticket 014c)', () => {
  it.each([
    [DATABASE_DAMAGED, 'damaged', 'DB_OPEN_DAMAGED'],
    [FOREIGN_KEYS_OFF, 'settings', 'DB_OPEN_SETTINGS'],
    [UNKNOWN_VERSION, 'newer', 'DB_OPEN_NEWER'],
    [DATABASE_UNAVAILABLE, 'unavailable', 'DB_OPEN_UNAVAILABLE'],
  ])('échec « %s » : cause %s, code %s seul dans le journal', async (message, cause, code) => {
    openAppDatabase.mockRejectedValueOnce(new Error(message));
    const state = await renderHook(() => useDatabaseState(open));
    const db = await renderHook(() => useDatabase(open));
    await waitFor(() =>
      expect(state.result.current).toEqual({
        status: 'failed',
        cause,
        pending: false,
        resetFailed: false,
      }),
    );
    expect(db.result.current).toBeNull();
    // ABS-04 : un code, sans détail.
    expect(log.mock.calls).toEqual([[code]]);
  });

  it('un nouveau montage après un échec ne rouvre pas : seul retryDatabase le fait', async () => {
    openAppDatabase.mockRejectedValueOnce(new Error(FOREIGN_KEYS_OFF));
    const state = await renderHook(() => useDatabaseState(open));
    await waitFor(() => expect(state.result.current.status).toBe('failed'));
    await renderHook(() => useDatabase(open));
    expect(openAppDatabase).toHaveBeenCalledTimes(1);
  });

  it('retryDatabase rouvre avec la même ouverture, une seule fois même appelé deux fois', async () => {
    openAppDatabase.mockRejectedValueOnce(new Error(FOREIGN_KEYS_OFF));
    const state = await renderHook(() => useDatabaseState(open));
    await waitFor(() => expect(state.result.current.status).toBe('failed'));
    let finish: (db: Db) => void = () => undefined;
    openAppDatabase.mockReturnValueOnce(new Promise<Db>((resolve) => (finish = resolve)));
    await act(async () => {
      retryDatabase();
      retryDatabase();
    });
    expect(state.result.current).toEqual({
      status: 'failed',
      cause: 'settings',
      pending: true,
      resetFailed: false,
    });
    await act(async () => finish(fakeDb));
    expect(state.result.current).toEqual({ status: 'ready', db: fakeDb });
    expect(openAppDatabase).toHaveBeenCalledTimes(2);
    expect(openAppDatabase).toHaveBeenLastCalledWith(open);
  });

  it('retryDatabase sans échec en cours : rien', async () => {
    openAppDatabase.mockResolvedValue(fakeDb);
    const state = await renderHook(() => useDatabaseState(open));
    await waitFor(() => expect(state.result.current.status).toBe('ready'));
    await act(async () => retryDatabase());
    expect(openAppDatabase).toHaveBeenCalledTimes(1);
  });
});

describe('EX-22 resetDatabase : suppression du fichier, puis base neuve (ticket 014c)', () => {
  const failedWith = async (message: string) => {
    openAppDatabase.mockRejectedValueOnce(new Error(message));
    const state = await renderHook(() => useDatabaseState(open));
    await waitFor(() => expect(state.result.current.status).toBe('failed'));
    log.mockClear();
    return state;
  };

  it('base abîmée : fichier supprimé avant la nouvelle ouverture, DB_RESET_DONE', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    const order: string[] = [];
    deleteAppDatabase.mockImplementation(async () => order.push('delete'));
    openAppDatabase.mockImplementation(async () => {
      order.push('open');
      return fakeDb;
    });
    await act(async () => resetDatabase());
    expect(order).toEqual(['delete', 'open']);
    expect(state.result.current).toEqual({ status: 'ready', db: fakeDb });
    expect(log.mock.calls).toEqual([['DB_RESET_DONE']]);
  });

  it.each([FOREIGN_KEYS_OFF, UNKNOWN_VERSION, DATABASE_UNAVAILABLE])(
    'cause « %s » : rien n’est supprimé (fichier sain)',
    async (message) => {
      const state = await failedWith(message);
      await act(async () => resetDatabase());
      expect(deleteAppDatabase).not.toHaveBeenCalled();
      expect(openAppDatabase).toHaveBeenCalledTimes(1);
      expect(state.result.current.status).toBe('failed');
    },
  );

  it('suppression en échec : DB_RESET_FAILED, pas de nouvelle ouverture, écran gardé', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    deleteAppDatabase.mockRejectedValueOnce(new Error('Unable to delete kila.db'));
    await act(async () => resetDatabase());
    expect(log.mock.calls).toEqual([['DB_RESET_FAILED']]);
    expect(openAppDatabase).toHaveBeenCalledTimes(1);
    expect(state.result.current).toEqual({
      status: 'failed',
      cause: 'damaged',
      pending: false,
      resetFailed: true,
    });
    // Un nouvel essai efface le message, puis l'effacement réussit : base neuve.
    deleteAppDatabase.mockResolvedValueOnce(undefined);
    openAppDatabase.mockResolvedValueOnce(fakeDb);
    await act(async () => resetDatabase());
    expect(state.result.current).toEqual({ status: 'ready', db: fakeDb });
  });

  it('base abîmée : « Réessayer » rouvre sans rien supprimer', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    openAppDatabase.mockResolvedValueOnce(fakeDb);
    await act(async () => retryDatabase());
    expect(deleteAppDatabase).not.toHaveBeenCalled();
    expect(state.result.current).toEqual({ status: 'ready', db: fakeDb });
  });

  it('deux appuis : une seule suppression', async () => {
    await failedWith(DATABASE_DAMAGED);
    deleteAppDatabase.mockResolvedValue(undefined);
    openAppDatabase.mockResolvedValue(fakeDb);
    await act(async () => {
      void resetDatabase();
      void resetDatabase();
    });
    expect(deleteAppDatabase).toHaveBeenCalledTimes(1);
  });
});
