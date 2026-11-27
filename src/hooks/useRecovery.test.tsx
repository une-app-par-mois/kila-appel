// useRecovery seul (ticket 014f, EX-22, EX-20 ; zone sensible) : garde du double appui, attente du
// nettoyage du démarrage, issue `ignored`, carte du refus effacée quand la base change, phrase des
// données abîmées décidée à l'entrée dans la confirmation. Même environnement que les tests de
// l'écran (src/__fixtures__/recoveryEnv.ts) ; horloge figée au 27/11/2026. B2 (ticket 028c) :
// relances affichées retirées après une restauration réussie, jamais après un échec.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { env, gate } from '@/__fixtures__/recoveryEnv';
import { backupFile, refusedFiles } from '@/__fixtures__/restoreFiles';
import type { RestoreDeps } from '@/data/expoFiles';
import { onDataChanged } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { resetDatabaseForTests, useDatabaseState } from '@/hooks/useDatabase';
import { type RecoveryStatus, useRecovery } from '@/hooks/useRecovery';
import { resetStartupCleanupForTests } from '@/hooks/useStartupCleanup';

jest.mock('@/data/expoDb', () => require('@/__fixtures__/recoveryEnv').fakeExpoDb());
jest.mock('@/data/expoFiles', () => require('@/__fixtures__/recoveryEnv').fakeExpoFiles());
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('@/data/expoNotifications', () => ({ dismissAllReminders: jest.fn(async () => {}) }));
const { dismissAllReminders: dismiss } = jest.requireMock('@/data/expoNotifications') as {
  dismissAllReminders: jest.Mock;
};

const deps = (): RestoreDeps => ({ ...jest.requireMock('@/data/expoFiles').expoRestoreDeps });
const start = (status: RecoveryStatus, base = deps()) =>
  renderHook(({ s }: { s: RecoveryStatus }) => useRecovery(base, s), {
    initialProps: { s: status },
  });

describe('useRecovery (ticket 014f)', () => {
  let dir: string;
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
    dir = mkdtempSync(join(tmpdir(), 'kila-use-recovery-'));
    env.reset(dir);
    // Aucune base ouverte : replaceDamagedDatabase ne fait rien (`ignored`).
    resetDatabaseForTests();
    resetStartupCleanupForTests();
    dismiss.mockReset();
  });
  afterEach(async () => {
    await waitFor(() => expect(fileLock.holder()).toBeNull());
    jest.useRealTimers();
    rmSync(dir, { recursive: true, force: true });
  });

  it('double appui : un seul sélecteur (verrou commun pris par le premier)', async () => {
    const pick = jest.fn(async () => null);
    const { result } = await start('failed', { ...deps(), pick });
    await act(async () => {
      void result.current.choose();
      void result.current.choose();
    });
    await waitFor(() => expect(result.current.state).toEqual({ step: 'idle' }));
    expect(pick).toHaveBeenCalledTimes(1);
  });

  it('un appel pendant le nettoyage du démarrage attend sa fin, puis ouvre le sélecteur', async () => {
    const cleaning = gate();
    env.clearGate = cleaning.wait;
    const pick = jest.fn(async () => null);
    const { result } = await start('failed', { ...deps(), pick });
    let done: Promise<void> = Promise.resolve();
    // Le nettoyage n'est lancé ici que par useRecovery (pas de layout monté).
    await act(async () => {
      done = result.current.choose();
    });
    expect(fileLock.holder()).toBe('cleanup');
    expect(pick).not.toHaveBeenCalled();
    await act(async () => {
      cleaning.release();
      await done;
    });
    expect(pick).toHaveBeenCalledTimes(1);
  });

  it('base qui n’est plus abîmée au moment de remplacer (`ignored`) : échec affiché, rien effacé', async () => {
    env.picker.next = await backupFile(join(dir, 'choisi.db'));
    const { result } = await start('failed');
    await act(async () => {
      void result.current.choose();
    });
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    await act(async () => result.current.confirm());
    await waitFor(() => expect(result.current.state).toEqual({ step: 'failed' }));
    expect(env.deletes).toBe(0);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('B2 restauration réussie : relances affichées retirées, verrou rendu, avant la relecture', async () => {
    writeFileSync(env.file, 'Ceci est un fichier texte, pas une base de données. '.repeat(40));
    env.picker.next = await backupFile(join(dir, 'choisi.db'));
    const order: string[] = [];
    dismiss.mockImplementation(async () => {
      order.push(`retrait ${fileLock.holder()}`);
    });
    const off = onDataChanged(() => order.push('relecture'));
    const { result } = await renderHook(() => {
      const database = useDatabaseState();
      return { database, recovery: useRecovery(deps(), database.status) };
    });
    await waitFor(() => expect(result.current.database.status).toBe('failed'));
    await act(async () => {
      void result.current.recovery.choose();
    });
    await waitFor(() => expect(result.current.recovery.state.step).toBe('confirm'));
    await act(async () => result.current.recovery.confirm());
    await waitFor(() => expect(result.current.database.status).toBe('ready'));
    await waitFor(() => expect(order).toEqual(['retrait null', 'relecture']));
    off();
  });

  it('la carte du refus disparaît quand le statut de la base change', async () => {
    env.picker.next = join(dir, 'texte.db');
    await refusedFiles['fichier texte'].write(env.picker.next);
    const hook = await start('failed');
    await act(async () => hook.result.current.choose());
    expect(hook.result.current.state).toEqual({ step: 'rejected', reason: 'NOT_SQLITE' });
    await hook.rerender({ s: 'failed' });
    expect(hook.result.current.state.step).toBe('rejected');
    await hook.rerender({ s: 'restoreFailed' });
    expect(hook.result.current.state).toEqual({ step: 'idle' });
  });

  it('dismiss efface un refus, jamais une séquence en cours', async () => {
    env.picker.next = join(dir, 'texte.db');
    await refusedFiles['fichier texte'].write(env.picker.next);
    const { result } = await start('failed');
    await act(async () => result.current.choose());
    await act(async () => result.current.dismiss());
    expect(result.current.state).toEqual({ step: 'idle' });
    env.picker.next = await backupFile(join(dir, 'choisi.db'));
    await act(async () => {
      void result.current.choose();
    });
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    await act(async () => result.current.dismiss());
    expect(result.current.state.step).toBe('confirm');
    await act(async () => result.current.cancel());
  });

  it('phrase des données abîmées décidée à l’entrée dans la confirmation', async () => {
    env.picker.next = await backupFile(join(dir, 'choisi.db'));
    const hook = await start('failed');
    await act(async () => {
      void hook.result.current.choose();
    });
    await waitFor(() => expect(hook.result.current.state.step).toBe('confirm'));
    expect(hook.result.current.state).toMatchObject({ erase: true });
    // Le statut change pendant la confirmation : la phrase annoncée ne change pas.
    await hook.rerender({ s: 'restoreFailed' });
    expect(hook.result.current.state).toMatchObject({ step: 'confirm', erase: true });
    await act(async () => hook.result.current.cancel());
    await waitFor(() => expect(hook.result.current.state).toEqual({ step: 'idle' }));
    env.picker.next = await backupFile(join(dir, 'autre.db'));
    await act(async () => {
      void hook.result.current.choose();
    });
    await waitFor(() => expect(hook.result.current.state.step).toBe('confirm'));
    expect(hook.result.current.state).toMatchObject({ erase: false });
    await act(async () => hook.result.current.cancel());
  });
});
