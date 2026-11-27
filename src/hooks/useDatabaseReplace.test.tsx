// EX-22, EX-20 (ticket 014f ; zone sensible) : restauration depuis l'écran de récupération.
// `replaceDamagedDatabase` efface la base abîmée, ouvre une base neuve sans la publier, la remplit,
// puis la publie ; `acceptEmptyDatabase` garde la base vide après une recopie en échec.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Db } from '@/data/db';
import { UNKNOWN_VERSION } from '@/data/migrations';
import { DATABASE_DAMAGED, DATABASE_UNAVAILABLE, FOREIGN_KEYS_OFF } from '@/data/open';
import {
  acceptEmptyDatabase,
  replaceDamagedDatabase,
  resetDatabase,
  resetDatabaseForTests,
  retryDatabase,
  useDatabase,
  useDatabaseState,
} from '@/hooks/useDatabase';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('@/data/expoDb', () => ({ openExpoDb: jest.fn(), deleteAppDatabase: jest.fn() }));
jest.mock('@/data/open', () => ({
  ...jest.requireActual('@/data/open'),
  openAppDatabase: jest.fn(),
}));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const { openAppDatabase } = jest.requireMock('@/data/open') as { openAppDatabase: jest.Mock };
const { deleteAppDatabase } = jest.requireMock('@/data/expoDb') as {
  deleteAppDatabase: jest.Mock;
};

const fresh = { query: jest.fn() } as unknown as Db;
const open = async () => fresh;
const gate = () => {
  let release: () => void = () => undefined;
  const wait = new Promise<void>((resolve) => (release = resolve));
  return { wait, release: () => release() };
};

const failedWith = async (message: string) => {
  openAppDatabase.mockRejectedValueOnce(new Error(message));
  const state = await renderHook(() => useDatabaseState(open));
  await waitFor(() => expect(state.result.current.status).toBe('failed'));
  log.mockClear();
  return state;
};

beforeEach(() => {
  resetDatabaseForTests();
  log.mockClear();
  openAppDatabase.mockReset();
  deleteAppDatabase.mockReset();
  deleteAppDatabase.mockResolvedValue(undefined);
});

describe('EX-22 replaceDamagedDatabase (ticket 014f)', () => {
  it('efface, ouvre une base neuve, la remplit, puis seulement la publie', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    const db = await renderHook(() => useDatabase(open));
    const order: string[] = [];
    deleteAppDatabase.mockImplementation(async () => order.push('delete'));
    openAppDatabase.mockImplementation(async () => {
      order.push('open');
      return fresh;
    });
    const filling = gate();
    const fill = jest.fn(async (target: Db) => {
      order.push('fill');
      expect(target).toBe(fresh);
      await filling.wait;
    });
    let result: Promise<string> = Promise.resolve('');
    await act(async () => {
      result = replaceDamagedDatabase(fill);
    });
    // Base neuve non publiée pendant la recopie : l'écran de récupération reste, boutons désactivés.
    expect(state.result.current).toEqual({
      status: 'failed',
      cause: 'damaged',
      pending: true,
      resetFailed: false,
    });
    expect(db.result.current).toBeNull();
    await act(async () => filling.release());
    expect(await result).toBe('ready');
    expect(order).toEqual(['delete', 'open', 'fill']);
    expect(state.result.current).toEqual({ status: 'ready', db: fresh });
    expect(db.result.current).toBe(fresh);
    expect(log.mock.calls).toEqual([['DB_RESET_DONE'], ['RECOVERY_RESTORE_DONE']]);
  });

  it('effacement en échec : resetFailed, ni ouverture ni recopie', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    deleteAppDatabase.mockRejectedValueOnce(new Error('Unable to delete kila.db'));
    const fill = jest.fn(async () => undefined);
    let result = '';
    await act(async () => {
      result = await replaceDamagedDatabase(fill);
    });
    expect(result).toBe('resetFailed');
    expect(fill).not.toHaveBeenCalled();
    expect(openAppDatabase).toHaveBeenCalledTimes(1);
    expect(state.result.current).toEqual({
      status: 'failed',
      cause: 'damaged',
      pending: false,
      resetFailed: true,
    });
    expect(log.mock.calls).toEqual([['DB_RESET_FAILED']]);
  });

  it('recopie en échec : base vide gardée ouverte (restoreFailed), puis acceptEmptyDatabase', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    openAppDatabase.mockResolvedValueOnce(fresh);
    let result = '';
    await act(async () => {
      result = await replaceDamagedDatabase(() => Promise.reject(new Error('disque plein')));
    });
    expect(result).toBe('restoreFailed');
    expect(state.result.current).toEqual({ status: 'restoreFailed', db: fresh, pending: false });
    // ABS-04 : codes seuls, sans le message de l'erreur.
    expect(log.mock.calls).toEqual([['DB_RESET_DONE'], ['RECOVERY_RESTORE_FAILED']]);
    // « Réessayer » et « Repartir de zéro » de la variante abîmée ne font plus rien.
    await act(async () => {
      retryDatabase();
      await resetDatabase();
    });
    expect(deleteAppDatabase).toHaveBeenCalledTimes(1);
    await act(async () => acceptEmptyDatabase());
    expect(state.result.current).toEqual({ status: 'ready', db: fresh });
  });

  it('après un échec, une nouvelle recopie remplit la même base, sans nouvel effacement', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    openAppDatabase.mockResolvedValueOnce(fresh);
    await act(async () => {
      await replaceDamagedDatabase(() => Promise.reject(new Error('disque plein')));
    });
    const filling = gate();
    const fill = jest.fn(() => filling.wait);
    let result: Promise<string> = Promise.resolve('');
    await act(async () => {
      result = replaceDamagedDatabase(fill);
    });
    expect(state.result.current).toEqual({ status: 'restoreFailed', db: fresh, pending: true });
    // Pendant la recopie : ni base vide acceptée, ni seconde recopie.
    await act(async () => {
      acceptEmptyDatabase();
      await replaceDamagedDatabase(fill);
    });
    expect(fill).toHaveBeenCalledTimes(1);
    expect(state.result.current.status).toBe('restoreFailed');
    await act(async () => filling.release());
    expect(await result).toBe('ready');
    expect(fill).toHaveBeenCalledWith(fresh);
    expect(deleteAppDatabase).toHaveBeenCalledTimes(1);
    expect(openAppDatabase).toHaveBeenCalledTimes(2);
    expect(state.result.current).toEqual({ status: 'ready', db: fresh });
  });

  it('ouverture de la base neuve en échec : cause classée, pas de recopie', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    openAppDatabase.mockRejectedValueOnce(new Error(FOREIGN_KEYS_OFF));
    const fill = jest.fn(async () => undefined);
    let result = '';
    await act(async () => {
      result = await replaceDamagedDatabase(fill);
    });
    expect(result).toBe('openFailed');
    expect(fill).not.toHaveBeenCalled();
    expect(state.result.current).toEqual({
      status: 'failed',
      cause: 'settings',
      pending: false,
      resetFailed: false,
    });
    expect(log.mock.calls).toEqual([['DB_RESET_DONE'], ['DB_OPEN_SETTINGS']]);
  });

  it.each([FOREIGN_KEYS_OFF, UNKNOWN_VERSION, DATABASE_UNAVAILABLE])(
    'cause « %s » : rien n’est effacé ni rempli (fichier sain)',
    async (message) => {
      const state = await failedWith(message);
      const fill = jest.fn(async () => undefined);
      let result = '';
      await act(async () => {
        result = await replaceDamagedDatabase(fill);
      });
      expect(result).toBe('ignored');
      expect(deleteAppDatabase).not.toHaveBeenCalled();
      expect(fill).not.toHaveBeenCalled();
      expect(state.result.current.status).toBe('failed');
    },
  );

  it('pendant la séquence : second appel, « Réessayer » et « Repartir de zéro » sans effet', async () => {
    await failedWith(DATABASE_DAMAGED);
    const deleting = gate();
    deleteAppDatabase.mockImplementation(() => deleting.wait);
    openAppDatabase.mockResolvedValue(fresh);
    const fill = jest.fn(async () => undefined);
    let first: Promise<string> = Promise.resolve('');
    let second = '';
    await act(async () => {
      first = replaceDamagedDatabase(fill);
      retryDatabase();
      void resetDatabase();
      second = await replaceDamagedDatabase(fill);
    });
    expect(second).toBe('ignored');
    await act(async () => deleting.release());
    expect(await first).toBe('ready');
    expect(deleteAppDatabase).toHaveBeenCalledTimes(1);
    expect(openAppDatabase).toHaveBeenCalledTimes(2);
    expect(fill).toHaveBeenCalledTimes(1);
  });

  it('acceptEmptyDatabase hors d’une recopie en échec : rien', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    await act(async () => acceptEmptyDatabase());
    expect(state.result.current.status).toBe('failed');
  });
});
