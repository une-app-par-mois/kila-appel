// EX-22, EX-20 (ticket 014f ; zone sensible) : échecs de la restauration depuis l'écran de
// récupération. Effacement en échec : rien n'est modifié. Recopie en échec après l'effacement :
// base neuve vide ouverte, « Choisir un fichier… » ou « Repartir de zéro ». Même environnement
// que recoveryRestore.test.tsx.
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { env, fileBytes, unchangedSince } from '@/__fixtures__/recoveryEnv';
import { backupFile, dump, rowCounts } from '@/__fixtures__/restoreFiles';
import RootLayout from '@/app/_layout';
import { tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import { openNodeDb } from '@/data/nodeDb';
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
// « Rien n'a été effacé » (variantes du 014c) ne doit jamais suivre un effacement (SEC-11).
const NOTHING_ERASED = /Rien n’a été effacé/;
/** Ni copie du sélecteur ni copie vérifiée (SEC-10). */
const noCopyLeft = () => {
  for (const name of ['restauration', 'DocumentPicker']) {
    const path = join(env.dir, name);
    expect(existsSync(path) ? readdirSync(path) : []).toEqual([]);
  }
};
const DAMAGED = 'Ceci est un fichier texte, pas une base de données. '.repeat(40);

const openDamaged = async () => {
  writeFileSync(env.file, DAMAGED);
  const router = await renderRouter(routes, { initialUrl: '/' });
  await screen.findByText(r.damaged);
  await waitFor(() => expect(button(r.restore)).toBeEnabled());
  return router;
};

/** Choisit une sauvegarde valide et confirme ; la recopie échoue une fois. */
const restoreThatFails = async () => {
  env.picker.next = await backupFile(join(dir, 'choisi.db'));
  env.attachFails = 1;
  await fireEvent.press(button(r.restore));
  await fireEvent.press(await screen.findByRole('button', { name: t.confirm }));
  expect(await screen.findByText(r.restoreFailed)).toBeTruthy();
};

let dir: string;

describe('EX-22 échecs de la restauration depuis l’écran de récupération (ticket 014f)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
    dir = mkdtempSync(join(tmpdir(), 'kila-recuperation-echec-'));
    env.reset(dir);
    resetDatabaseForTests();
    resetStartupCleanupForTests();
    log.mockClear();
  });
  afterEach(async () => {
    await waitFor(() => expect(fileLock.holder()).toBeNull());
    jest.useRealTimers();
    rmSync(dir, { recursive: true, force: true });
  });

  it('effacement en échec : « La restauration n’a pas abouti », rien modifié, aucune recopie', async () => {
    await openDamaged();
    const before = fileBytes();
    env.deleteFails = 1;
    env.picker.next = await backupFile(join(dir, 'choisi.db'));
    await fireEvent.press(button(r.restore));
    await fireEvent.press(await screen.findByRole('button', { name: t.confirm }));
    // Réponse 3 du porteur : la carte d'échec de l'écran Restauration, au-dessus des trois boutons.
    expect(await screen.findByText(t.failed)).toBeTruthy();
    expect(screen.getByText(t.nothingChanged)).toBeTruthy();
    expect(screen.queryByText(r.resetFailed)).toBeNull();
    expect(unchangedSince(before)).toBe(true);
    expect(names()).toEqual([r.restore, r.retry, r.startOver]);
    expect(log).not.toHaveBeenCalledWith('RESTORE_DONE');
    expect(log).not.toHaveBeenCalledWith('RECOVERY_RESTORE_FAILED');
  });

  it('recopie en échec : base vide, message ; « Repartir de zéro » mène à Bienvenue sans confirmation', async () => {
    const router = await openDamaged();
    await restoreThatFails();
    expect(names()).toEqual([t.choose, r.startOver]);
    expect(screen.getByRole('header', { name: r.restoreFailedTitle })).toBeTruthy();
    expect(screen.queryByText(r.damaged)).toBeNull();
    noCopyLeft();
    // La base abîmée a été effacée : une base neuve, vide, est ouverte.
    const emptied = openNodeDb(env.file);
    expect(await rowCounts(emptied)).toMatchObject({ members: 0, groups: 0, sessions: 0 });
    await emptied.close();
    expect(log).toHaveBeenCalledWith('RECOVERY_RESTORE_FAILED');
    await fireEvent.press(button(r.startOver));
    expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
    expect(screen.queryByText(r.confirmMessage)).toBeNull();
    expect(router.getPathname()).toBe('/');
    expect(env.deletes).toBe(1);
  });

  it('recopie en échec, puis « Choisir un fichier… » : confirmation normale, sans nouvel effacement', async () => {
    await openDamaged();
    await restoreThatFails();
    const backup = await backupFile(join(dir, 'autre.db'));
    const saved = openNodeDb(backup);
    const expected = await dump(saved);
    await saved.close();
    env.picker.next = backup;
    await fireEvent.press(button(t.choose));
    expect(await screen.findByRole('button', { name: t.confirm })).toBeTruthy();
    // Confirmation de l'écran Restauration : plus de données abîmées à annoncer.
    expect(screen.queryByText(r.restoreErase)).toBeNull();
    expect(screen.getByText(t.replaceStrong)).toBeTruthy();
    await fireEvent.press(button(t.confirm));
    await waitFor(() => expect(screen.queryByText(r.title)).toBeNull());
    expect(screen.queryByRole('header', { name: labels.welcome.title })).toBeNull();
    const restored = openNodeDb(env.file);
    expect(await dump(restored)).toEqual(expected);
    await restored.close();
    expect(env.deletes).toBe(1);
  });

  it('recopie en échec, puis Annuler : la base vide et le message restent', async () => {
    await openDamaged();
    await restoreThatFails();
    env.picker.next = await backupFile(join(dir, 'autre.db'));
    await fireEvent.press(button(t.choose));
    await fireEvent.press(await screen.findByRole('button', { name: t.cancel }));
    expect(await screen.findByText(r.restoreFailed)).toBeTruthy();
    expect(names()).toEqual([t.choose, r.startOver]);
    expect(env.deletes).toBe(1);
  });

  it('restauration : base neuve qui ne s’ouvre pas après l’effacement, jamais « Rien n’a été effacé »', async () => {
    await openDamaged();
    env.picker.next = await backupFile(join(dir, 'choisi.db'));
    env.openFails = 2;
    await fireEvent.press(button(r.restore));
    await fireEvent.press(await screen.findByRole('button', { name: t.confirm }));
    expect(await screen.findByText(r.erasedOpenFailed)).toBeTruthy();
    expect(screen.getByRole('header', { name: r.restoreFailedTitle })).toBeTruthy();
    expect(screen.queryByText(NOTHING_ERASED)).toBeNull();
    expect(names()).toEqual([r.retry]);
    noCopyLeft();
    // Nouvel échec : même écran ; puis une base vide s'ouvre et mène à Bienvenue.
    await fireEvent.press(button(r.retry));
    await waitFor(() => expect(button(r.retry)).toBeEnabled());
    expect(screen.getByText(r.erasedOpenFailed)).toBeTruthy();
    expect(screen.queryByText(NOTHING_ERASED)).toBeNull();
    await fireEvent.press(button(r.retry));
    expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
    expect(env.deletes).toBe(1);
  });

  it('« Repartir de zéro » : base neuve qui ne s’ouvre pas après l’effacement, jamais « Rien n’a été effacé »', async () => {
    await openDamaged();
    env.openFails = 1;
    await fireEvent.press(button(r.startOver));
    await fireEvent.press(await screen.findByRole('button', { name: r.confirm }));
    expect(await screen.findByText(r.erasedOpenFailed)).toBeTruthy();
    // Décision automatique : le titre de l'écran reste celui de la récupération.
    expect(screen.getByRole('header', { name: r.title })).toBeTruthy();
    expect(screen.queryByText(NOTHING_ERASED)).toBeNull();
    await fireEvent.press(button(r.retry));
    expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
  });
});
