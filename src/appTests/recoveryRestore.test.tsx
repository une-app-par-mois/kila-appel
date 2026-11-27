// EX-22, EX-20 (ticket 014f ; zone sensible) : « Restaurer une sauvegarde » depuis l'écran de
// récupération. Vrai layout racine, vraie ouverture, vraie vérification et vraie restauration sur
// node:sqlite ; seuls les modules expo sont imités (src/__fixtures__/recoveryEnv.ts). Horloge
// figée au 27/11/2026.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  act,
  fireEvent,
  renderHook,
  renderRouter,
  screen,
  waitFor,
  within,
} from 'expo-router/testing-library';
import { BackHandler } from 'react-native';
import { env, fileBytes, gate, unchangedSince } from '@/__fixtures__/recoveryEnv';
import { backupFile, dump, refusedFiles } from '@/__fixtures__/restoreFiles';
import RootLayout from '@/app/_layout';
import { tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import { openNodeDb } from '@/data/nodeDb';
import { fileLock } from '@/hooks/fileLock';
import { resetDatabaseForTests } from '@/hooks/useDatabase';
import { useRecovery } from '@/hooks/useRecovery';
import { resetStartupCleanupForTests } from '@/hooks/useStartupCleanup';

jest.mock('@/data/expoDb', () => require('@/__fixtures__/recoveryEnv').fakeExpoDb());
jest.mock('@/data/expoFiles', () => require('@/__fixtures__/recoveryEnv').fakeExpoFiles());
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const Stub = () => null;
const routes = {
  _layout: RootLayout,
  ...tabRoutes,
  'groupes/nouveau': Stub,
  'saisons/index': Stub,
};
const r = labels.recovery;
const t = labels.restore;
const button = (name: string) => screen.getByRole('button', { name });
/** Libellés des boutons, dans l'ordre de l'écran. */
const names = () =>
  screen.getAllByRole('button').map((b) => within(b).getByText(/./).props.children as string);
const DAMAGED = 'Ceci est un fichier texte, pas une base de données. '.repeat(40);

/** Écran « abîmée » affiché, nettoyage du démarrage fini. */
const openDamaged = async () => {
  writeFileSync(env.file, DAMAGED);
  const router = await renderRouter(routes, { initialUrl: '/' });
  await screen.findByText(r.damaged);
  await waitFor(() => expect(button(r.restore)).toBeEnabled());
  return router;
};
const sameBytes = (before: Uint8Array) => expect(unchangedSince(before)).toBe(true);
const expectIdle = () => {
  expect(screen.getByText(r.damaged)).toBeTruthy();
  expect(button(r.restore)).toBeEnabled();
  expect(screen.queryByText(t.failed)).toBeNull();
  expect(screen.queryByText(t.nothingChanged)).toBeNull();
  expect(fileLock.holder()).toBeNull();
};

describe('EX-22 restaurer depuis l’écran de récupération (ticket 014f)', () => {
  let dir: string;
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
    dir = mkdtempSync(join(tmpdir(), 'kila-recuperation-restaurer-'));
    env.reset(dir);
    resetDatabaseForTests();
    resetStartupCleanupForTests();
    log.mockClear();
  });
  afterEach(async () => {
    await waitFor(() => expect(fileLock.holder()).toBeNull());
    jest.useRealTimers();
    jest.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it('« Restaurer une sauvegarde » en premier, désactivé pendant le nettoyage du démarrage', async () => {
    const cleaning = gate();
    env.clearGate = cleaning.wait;
    const pick = jest.fn(async () => null);
    env.pick = pick;
    writeFileSync(env.file, DAMAGED);
    await renderRouter(routes, { initialUrl: '/' });
    await screen.findByText(r.damaged);
    expect(names()).toEqual([r.restore, r.retry, r.startOver]);
    expect(button(r.restore)).toBeDisabled();
    await fireEvent.press(button(r.restore));
    await act(async () => cleaning.release());
    await waitFor(() => expect(button(r.restore)).toBeEnabled());
    expect(pick).not.toHaveBeenCalled();
  });

  it('sélecteur fermé : retour à la variante abîmée sans message, fichier intact', async () => {
    await openDamaged();
    const before = fileBytes();
    await fireEvent.press(button(r.restore));
    await waitFor(() => expect(log).toHaveBeenCalledWith('RESTORE_CANCELLED'));
    await waitFor(expectIdle);
    sameBytes(before);
    expect(env.deletes).toBe(0);
  });

  it('refus : message de l’écran Restauration, fichier intact, rien d’effacé', async () => {
    await openDamaged();
    const before = fileBytes();
    env.picker.next = join(dir, 'texte.db');
    await refusedFiles['fichier texte'].write(env.picker.next);
    await fireEvent.press(button(r.restore));
    expect(await screen.findByText(t.notABackup)).toBeTruthy();
    expect(screen.getByText(t.nothingChanged)).toBeTruthy();
    expect(button(r.restore)).toBeEnabled();
    sameBytes(before);
    expect(env.deletes).toBe(0);
  });

  it('Annuler à la confirmation : retour sans message, fichier intact', async () => {
    await openDamaged();
    const before = fileBytes();
    env.picker.next = await backupFile(join(dir, 'choisi.db'));
    await fireEvent.press(button(r.restore));
    expect(await screen.findByText(r.restoreErase)).toBeTruthy();
    expect(screen.getByText(t.backupOf('22/10/2026'))).toBeTruthy();
    // Base abîmée : aucun appel en cours ne peut être lu, donc aucune ligne pour lui.
    expect(screen.queryByText(/L’appel en cours/)).toBeNull();
    expect(names()).toEqual([t.cancel, t.confirm]);
    expect(fileLock.holder()).toBe('restore');
    await fireEvent.press(button(t.cancel));
    await waitFor(expectIdle);
    sameBytes(before);
    expect(env.deletes).toBe(0);
  });

  it('réussite : données de la sauvegarde, puis l’accueil ; verrou et retour bloqué jusqu’au bout', async () => {
    const backHandlers: (() => boolean | null | undefined)[] = [];
    const removed = jest.fn();
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, handler) => {
      backHandlers.push(handler as () => boolean);
      return { remove: removed };
    });
    const router = await openDamaged();
    const backup = await backupFile(join(dir, 'choisi.db'));
    const saved = openNodeDb(backup);
    const expected = await dump(saved);
    await saved.close();
    env.picker.next = backup;
    const copying = gate();
    env.attachGate = copying.wait;
    await fireEvent.press(button(r.restore));
    const confirm = await screen.findByRole('button', { name: t.confirm });
    const already = backHandlers.length;
    await fireEvent.press(confirm);
    await waitFor(() => expect(env.deletes).toBe(1));
    // Pendant la recopie : verrou tenu, boutons désactivés, retour Android sans effet.
    expect(fileLock.holder()).toBe('restore');
    expect(button(t.confirm)).toBeDisabled();
    expect(button(t.cancel)).toBeDisabled();
    expect(backHandlers).toHaveLength(already + 1);
    expect(backHandlers.at(-1)?.()).toBe(true);
    await act(async () => copying.release());
    await waitFor(() => expect(screen.queryByText(r.title)).toBeNull());
    expect(screen.queryByRole('header', { name: labels.welcome.title })).toBeNull();
    expect(router.getPathname()).toBe('/');
    expect(removed).toHaveBeenCalled();
    const restored = openNodeDb(env.file);
    expect(await dump(restored)).toEqual(expected);
    await restored.close();
    expect(log).toHaveBeenCalledWith('RECOVERY_RESTORE_DONE');
    // ABS-04 : des codes seuls ; aucun nom du jeu fictif dans le journal.
    for (const call of log.mock.calls) {
      expect(call[0]).toMatch(/^[A-Z_]+$/);
      expect(JSON.stringify(call)).not.toMatch(/Exemple|Camille|Poussins/);
    }
  });

  it('double appui : un seul sélecteur (verrou commun pris par le premier)', async () => {
    const pick = jest.fn(async () => null);
    const deps = { ...jest.requireMock('@/data/expoFiles').expoRestoreDeps, pick };
    const { result } = await renderHook(() => useRecovery(deps));
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
    const deps = { ...jest.requireMock('@/data/expoFiles').expoRestoreDeps, pick };
    const { result } = await renderHook(() => useRecovery(deps));
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

  it('pendant le sélecteur, tous les boutons sont désactivés', async () => {
    await openDamaged();
    let close: () => void = () => undefined;
    env.pick = () => new Promise((resolve) => (close = () => resolve(null)));
    await fireEvent.press(button(r.restore));
    await waitFor(() => expect(fileLock.holder()).toBe('restore'));
    for (const name of [r.restore, r.retry, r.startOver]) expect(button(name)).toBeDisabled();
    await fireEvent.press(button(r.startOver));
    expect(screen.queryByText(r.confirmMessage)).toBeNull();
    await act(async () => close());
    await waitFor(expectIdle);
  });
});
