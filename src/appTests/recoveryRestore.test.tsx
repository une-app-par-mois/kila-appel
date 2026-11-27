// EX-22, EX-20 (ticket 014f ; zone sensible) : « Restaurer une sauvegarde » depuis l'écran de
// récupération. Vrai layout racine, vraie ouverture, vraie vérification et vraie restauration sur
// node:sqlite ; seuls les modules expo sont imités (src/__fixtures__/recoveryEnv.ts). Horloge
// figée au 27/11/2026.
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { BackHandler } from 'react-native';
import { env, fileBytes, gate, unchangedSince } from '@/__fixtures__/recoveryEnv';
import { backupFile, dump, refusedFiles } from '@/__fixtures__/restoreFiles';
import RootLayout from '@/app/_layout';
import { tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import { openNodeDb } from '@/data/nodeDb';
import { onDataChanged } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { resetDatabaseForTests } from '@/hooks/useDatabase';
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
/** Ni copie du sélecteur ni copie vérifiée (SEC-10). */
const noCopyLeft = () => {
  for (const name of ['restauration', 'DocumentPicker']) {
    const path = join(env.dir, name);
    expect(existsSync(path) ? readdirSync(path) : []).toEqual([]);
  }
};
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
    // « Réessayer » efface la carte du refus (revue du 014f) ; la base reste abîmée.
    await fireEvent.press(button(r.retry));
    await waitFor(() => expect(screen.queryByText(t.notABackup)).toBeNull());
    expect(await screen.findByText(r.damaged)).toBeTruthy();
    sameBytes(before);
  });

  it('refus, puis « Repartir de zéro » confirmé : la carte du refus disparaît', async () => {
    await openDamaged();
    env.picker.next = join(dir, 'texte.db');
    await refusedFiles['fichier texte'].write(env.picker.next);
    await fireEvent.press(button(r.restore));
    expect(await screen.findByText(t.notABackup)).toBeTruthy();
    env.deleteFails = 1;
    await fireEvent.press(button(r.startOver));
    await fireEvent.press(await screen.findByRole('button', { name: r.confirm }));
    expect(await screen.findByText(r.resetFailed)).toBeTruthy();
    expect(screen.queryByText(t.notABackup)).toBeNull();
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

  it('réussite : données de la sauvegarde, puis l’accueil ; verrou et retour rendus avant', async () => {
    const backHandlers: (() => boolean | null | undefined)[] = [];
    const removed = jest.fn();
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, handler) => {
      backHandlers.push(handler as () => boolean);
      return { remove: removed };
    });
    const release = jest.spyOn(fileLock, 'release');
    const changed = jest.fn();
    const off = onDataChanged(changed);
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
    off();
    // Copies effacées, verrou rendu et retour libéré avant la publication de la base (revue du
    // 014f) : l'accueil ne s'affiche jamais pendant l'opération.
    noCopyLeft();
    const published = log.mock.invocationCallOrder[
      log.mock.calls.findIndex(([code]) => code === 'RECOVERY_RESTORE_DONE')
    ] as number;
    const released = release.mock.calls.findIndex(([task]) => task === 'restore');
    expect(release.mock.invocationCallOrder[released]).toBeLessThan(published);
    expect(removed.mock.invocationCallOrder[0]).toBeLessThan(published);
    // Les écrans qui écoutent rechargent (notifyDataChanged, après la publication).
    expect(changed).toHaveBeenCalled();
    expect(changed.mock.invocationCallOrder[0]).toBeGreaterThan(published);
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
