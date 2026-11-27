// EX-22, EX-20 (ticket 014f ; zone sensible) : restauration depuis l'écran de récupération.
// `replaceDamagedDatabase` efface la base abîmée, ouvre une base neuve sans la publier et la
// remplit ; `publishRestoredDatabase` la publie une fois les copies effacées et le verrou rendu ;
// `acceptEmptyDatabase` garde la base vide après une recopie en échec. Base neuve qui ne s'ouvre
// pas après un effacement : état `erased` (réponse 1 du porteur du 2026-11-27).
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Db } from '@/data/db';
import { UNKNOWN_VERSION } from '@/data/migrations';
import { DATABASE_DAMAGED, DATABASE_UNAVAILABLE, FOREIGN_KEYS_OFF } from '@/data/open';
import {
  acceptEmptyDatabase,
  publishRestoredDatabase,
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
const damagedPending = { status: 'failed', cause: 'damaged', pending: true, resetFailed: false };

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
  it('efface, ouvre une base neuve, la remplit ; publiée seulement par publishRestoredDatabase', async () => {
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
    expect(state.result.current).toEqual(damagedPending);
    expect(db.result.current).toBeNull();
    await act(async () => filling.release());
    expect(await result).toBe('filled');
    expect(order).toEqual(['delete', 'open', 'fill']);
    // Remplie, pas encore publiée : l'appelant efface ses copies et rend le verrou d'abord.
    expect(state.result.current).toEqual(damagedPending);
    expect(log.mock.calls).toEqual([['DB_RESET_DONE']]);
    await act(async () => publishRestoredDatabase());
    expect(state.result.current).toEqual({ status: 'ready', db: fresh });
    expect(db.result.current).toBe(fresh);
    expect(log.mock.calls).toEqual([['DB_RESET_DONE'], ['RECOVERY_RESTORE_DONE']]);
    // Une seule publication.
    await act(async () => publishRestoredDatabase());
    expect(log.mock.calls).toHaveLength(2);
  });

  it('publishRestoredDatabase sans base remplie : rien', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    await act(async () => publishRestoredDatabase());
    expect(state.result.current.status).toBe('failed');
  });

  it('effacement en échec : rien modifié, sans le message de « Repartir de zéro »', async () => {
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
    // Réponse 3 du porteur : l'écran montre l'échec de la restauration, pas `resetFailed`.
    expect(state.result.current).toEqual({ ...damagedPending, pending: false });
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
    await act(async () => {
      retryDatabase();
      await resetDatabase();
      publishRestoredDatabase();
    });
    expect(deleteAppDatabase).toHaveBeenCalledTimes(1);
    expect(state.result.current.status).toBe('restoreFailed');
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
    await act(async () => {
      acceptEmptyDatabase();
      await replaceDamagedDatabase(fill);
    });
    expect(fill).toHaveBeenCalledTimes(1);
    expect(state.result.current.status).toBe('restoreFailed');
    await act(async () => filling.release());
    expect(await result).toBe('filled');
    // Remplie, pas publiée : la base vide n'est pas acceptable entre-temps.
    await act(async () => acceptEmptyDatabase());
    expect(state.result.current).toEqual({ status: 'restoreFailed', db: fresh, pending: true });
    await act(async () => publishRestoredDatabase());
    expect(fill).toHaveBeenCalledWith(fresh);
    expect(deleteAppDatabase).toHaveBeenCalledTimes(1);
    expect(state.result.current).toEqual({ status: 'ready', db: fresh });
  });

  it('base neuve qui ne s’ouvre pas après l’effacement : état erased, « Réessayer » ouvre une base vide', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    openAppDatabase.mockRejectedValueOnce(new Error(FOREIGN_KEYS_OFF));
    const fill = jest.fn(async () => undefined);
    let result = '';
    await act(async () => {
      result = await replaceDamagedDatabase(fill);
    });
    expect(result).toBe('openFailed');
    expect(fill).not.toHaveBeenCalled();
    expect(state.result.current).toEqual({ status: 'erased', after: 'restore', pending: false });
    expect(log.mock.calls).toEqual([['DB_RESET_DONE'], ['DB_OPEN_SETTINGS']]);
    // Nouvel échec : l'état erased reste (jamais « rien n'a été effacé »).
    openAppDatabase.mockRejectedValueOnce(new Error(DATABASE_UNAVAILABLE));
    await act(async () => retryDatabase());
    expect(state.result.current).toEqual({ status: 'erased', after: 'restore', pending: false });
    await act(async () => resetDatabase());
    expect(deleteAppDatabase).toHaveBeenCalledTimes(1);
    openAppDatabase.mockResolvedValueOnce(fresh);
    await act(async () => retryDatabase());
    expect(state.result.current).toEqual({ status: 'ready', db: fresh });
  });

  it('« Repartir de zéro » : base neuve qui ne s’ouvre pas après l’effacement, état erased', async () => {
    const state = await failedWith(DATABASE_DAMAGED);
    openAppDatabase.mockRejectedValueOnce(new Error(DATABASE_UNAVAILABLE));
    await act(async () => resetDatabase());
    expect(state.result.current).toEqual({ status: 'erased', after: 'startOver', pending: false });
    let opening: (db: Db) => void = () => undefined;
    openAppDatabase.mockReturnValueOnce(new Promise<Db>((resolve) => (opening = resolve)));
    await act(async () => {
      retryDatabase();
      retryDatabase();
    });
    expect(state.result.current).toEqual({ status: 'erased', after: 'startOver', pending: true });
    await act(async () => opening(fresh));
    expect(state.result.current).toEqual({ status: 'ready', db: fresh });
    expect(openAppDatabase).toHaveBeenCalledTimes(3);
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
    expect(await first).toBe('filled');
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
