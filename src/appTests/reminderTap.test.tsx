// Appui sur une relance (ticket 028c, F-06, EX-28, SEC-11, SEC-12, CONV-14 ; zone sensible) : vrai
// layout racine, vraie ouverture de la base sur node:sqlite, expo-notifications imité en mémoire
// (src/__fixtures__/expoModules.ts). L'écran d'appel est remplacé par un témoin qui affiche ses
// paramètres. Démarrage à froid (cible lue une seule fois, B1) et appli ouverte.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { router as appRouter, useLocalSearchParams } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { useEffect } from 'react';
import { Text } from 'react-native';
import type { fakeNotifications } from '@/__fixtures__/expoModules';
import { env, gate } from '@/__fixtures__/recoveryEnv';
import RootLayout from '@/app/_layout';
import { tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import { type FileTask, fileLock } from '@/hooks/fileLock';
import { resetDatabaseForTests } from '@/hooks/useDatabase';
import { resetReminderTapForTests } from '@/hooks/useReminderTap';
import { resetStartupCleanupForTests } from '@/hooks/useStartupCleanup';

jest.mock('@/data/expoDb', () => require('@/__fixtures__/recoveryEnv').fakeExpoDb());
jest.mock('@/data/expoFiles', () => require('@/__fixtures__/recoveryEnv').fakeExpoFiles());
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('expo-notifications', () => require('@/__fixtures__/expoModules').fakeNotifications());
const notifications = jest.requireMock('expo-notifications') as ReturnType<
  typeof fakeNotifications
>;
const { state } = notifications;
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const mounts = jest.fn();
/** Témoin de l'écran d'appel : ses paramètres, tels que reçus ; chaque montage est compté. */
const RollCallProbe = () => {
  const { creneau, date } = useLocalSearchParams<{ creneau?: string; date?: string }>();
  useEffect(() => mounts(), []);
  return <Text>{`appel ${creneau} ${date}`}</Text>;
};
const Stub = () => null;
const routes = {
  _layout: RootLayout,
  ...tabRoutes,
  appel: RollCallProbe,
  'groupes/nouveau': Stub,
  'saisons/index': Stub,
};
const r = labels.recovery;
const DAMAGED = 'Ceci est un fichier texte, pas une base de données. '.repeat(40);
const TARGET = { slotId: 3, date: '2026-11-27' };

type Request = { identifier?: string; trigger?: object };
/** Réponse du module ; identifiant d'une relance de l'appli par défaut (`relance-<id>-<date>`). */
const response = (data: Record<string, unknown>, request: Request = {}) => ({
  notification: {
    date: 0,
    request: {
      identifier: `relance-${data.slotId}-${data.date}`,
      trigger: { type: 'date' },
      content: { data },
      ...request,
    },
  },
});
/** Appui pendant que l'appli tourne : l'événement du module. */
const tap = (data: Record<string, unknown>, request: Request = {}) =>
  act(async () => {
    for (const listener of [...state.listeners]) listener(response(data, request));
  });
const back = () => act(async () => appRouter.back());
const open = () => renderRouter(routes, { initialUrl: '/' });
const home = () => screen.findByRole('header', { name: labels.welcome.title });
const rollCall = () => screen.queryByText(/^appel /);
/** Recovery « abîmée » → « Repartir de zéro » confirmé → Bienvenue. */
const startOver = async () => {
  await fireEvent.press(await screen.findByRole('button', { name: r.startOver }));
  await fireEvent.press(await screen.findByRole('button', { name: r.confirm }));
  await home();
};

describe('F-06 appui sur une relance (ticket 028c)', () => {
  let dir: string;
  let lastResponse: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
    dir = mkdtempSync(join(tmpdir(), 'kila-relance-appui-'));
    env.reset(dir);
    resetDatabaseForTests();
    resetStartupCleanupForTests();
    resetReminderTapForTests();
    state.lastResponse = null;
    state.listeners = [];
    state.fail.clear();
    lastResponse = jest.spyOn(notifications, 'getLastNotificationResponse');
    mounts.mockClear();
    log.mockClear();
  });
  afterEach(async () => {
    for (const task of ['erase', 'export', 'restore'] as FileTask[]) fileLock.release(task);
    await waitFor(() => expect(fileLock.holder()).toBeNull());
    jest.useRealTimers();
    jest.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it('F-06 à froid : l’appel du créneau s’ouvre à la bonne date, une fois la pile montée', async () => {
    state.lastResponse = response(TARGET);
    const cleaning = gate();
    env.clearGate = cleaning.wait;
    const router = await open();
    await act(async () => undefined);
    // Nettoyage du démarrage en cours : pile pas montée, aucune navigation.
    expect(rollCall()).toBeNull();
    await act(async () => cleaning.release());
    expect(await screen.findByText('appel 3 2026-11-27')).toBeTruthy();
    expect(router.getPathname()).toBe('/appel');
    expect(lastResponse).toHaveBeenCalledTimes(1);
  });

  it('B1 à froid : cible lue une seule fois, même si le layout se remonte', async () => {
    state.lastResponse = response(TARGET);
    await open();
    await screen.findByText('appel 3 2026-11-27');
    // Nouveau montage du layout : la dernière réponse, gardée par le module natif, ne rouvre pas
    // l'appel.
    await open();
    await home();
    expect(rollCall()).toBeNull();
    expect(lastResponse).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['slotId en texte', { slotId: '3', date: '2026-11-27' }],
    ['slotId négatif', { slotId: -1, date: '2026-11-27' }],
    ['date hors format', { slotId: 3, date: '27/11/2026' }],
    ['données vides', {}],
  ])('CONV-14 à froid, %s : l’accueil, aucun appel', async (_, data) => {
    state.lastResponse = response(data);
    await open();
    await home();
    await act(async () => undefined);
    expect(rollCall()).toBeNull();
  });

  it('écran de récupération à froid : cible abandonnée, même une fois la base réparée', async () => {
    writeFileSync(env.file, DAMAGED);
    state.lastResponse = response(TARGET);
    await open();
    await startOver();
    await act(async () => undefined);
    expect(rollCall()).toBeNull();
  });

  it('F-06 appli ouverte : un appui ouvre l’appel du créneau', async () => {
    const router = await open();
    await home();
    await tap(TARGET);
    expect(await screen.findByText('appel 3 2026-11-27')).toBeTruthy();
    expect(router.getPathname()).toBe('/appel');
    expect(lastResponse).toHaveBeenCalledTimes(1);
  });

  it('CONV-14 appli ouverte, données hors format : rien ne s’ouvre', async () => {
    await open();
    await home();
    await tap({ slotId: '3', date: '2026-11-27' });
    await act(async () => undefined);
    expect(rollCall()).toBeNull();
  });

  it.each(['erase', 'restore', 'export'] as FileTask[])(
    'appui pendant le verrou (%s) : ignoré, même une fois le verrou rendu',
    async (task) => {
      await open();
      await home();
      expect(fileLock.acquire(task)).toBe(true);
      await tap(TARGET);
      await act(async () => fileLock.release(task));
      await act(async () => undefined);
      expect(rollCall()).toBeNull();
    },
  );

  it('appui pendant l’écran de récupération : ignoré, même une fois la base réparée', async () => {
    writeFileSync(env.file, DAMAGED);
    await open();
    await screen.findByText(r.damaged);
    await tap(TARGET);
    await startOver();
    await act(async () => undefined);
    expect(rollCall()).toBeNull();
  });

  it('appui pendant le nettoyage du démarrage : l’appel s’ouvre une fois la pile montée', async () => {
    const cleaning = gate();
    env.clearGate = cleaning.wait;
    await open();
    await waitFor(() => expect(fileLock.holder()).toBe('cleanup'));
    await tap(TARGET);
    expect(rollCall()).toBeNull();
    await act(async () => cleaning.release());
    expect(await screen.findByText('appel 3 2026-11-27')).toBeTruthy();
  });

  it.each([
    ['déclencheur push (réponse forgée)', { trigger: { type: 'push' } }],
    ['identifiant étranger', { identifier: 'autre' }],
    ['identifiant d’une autre séance', { identifier: 'relance-4-2026-11-27' }],
  ])('SEC-12 %s : rien ne s’ouvre, à froid comme appli ouverte', async (_, request) => {
    state.lastResponse = response(TARGET, request);
    await open();
    await home();
    await tap(TARGET, request);
    await act(async () => undefined);
    expect(rollCall()).toBeNull();
  });

  it('même relance déjà traitée (à froid puis appli ouverte) : un seul écran d’appel', async () => {
    state.lastResponse = response(TARGET);
    const router = await open();
    await screen.findByText('appel 3 2026-11-27');
    await tap(TARGET);
    await tap(TARGET);
    await back();
    await home();
    expect(router.getPathname()).toBe('/');
  });

  it('relance de l’appel déjà affiché (ouvert depuis l’appli) : l’écran reste, rien n’est empilé', async () => {
    const router = await open();
    await home();
    await act(async () => appRouter.push('/appel?creneau=3&date=2026-11-27'));
    await screen.findByText('appel 3 2026-11-27');
    await tap(TARGET);
    await act(async () => undefined);
    expect(mounts).toHaveBeenCalledTimes(1);
    await back();
    await home();
    expect(router.getPathname()).toBe('/');
  });

  it('autre relance pendant un appel : l’appel est remplacé, jamais empilé', async () => {
    const router = await open();
    await home();
    await tap(TARGET);
    await screen.findByText('appel 3 2026-11-27');
    await tap({ slotId: 5, date: '2026-11-26' });
    expect(await screen.findByText('appel 5 2026-11-26')).toBeTruthy();
    expect(screen.queryByText('appel 3 2026-11-27')).toBeNull();
    await back();
    await home();
    expect(router.getPathname()).toBe('/');
  });

  it('ABS-04 SEC-12 aucun journal ne reçoit de nom, seulement des codes', async () => {
    state.lastResponse = response({ slotId: 'Martin', date: 'Léa' });
    await open();
    await home();
    await tap({ slotId: 'Martin', date: 'Léa' });
    const written = JSON.stringify(log.mock.calls);
    expect(written).not.toContain('Martin');
    expect(written).not.toContain('Léa');
  });
});
