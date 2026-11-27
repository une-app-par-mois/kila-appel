// Tout effacer, cas limites (ticket 015f, EX-23 ; revues de code et de sécurité) : double appui
// et accueil déjà monté. Vraie base node:sqlite et jeu fictif ; copies du cache imitées (le vidage
// est vérifié dans `eraseAll.test.tsx`). Horloge figée au vendredi 27/11/2026.
import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { seed } from '@/__fixtures__/seed';
import Backup from '@/app/donnees';
import EraseAll from '@/app/tout-effacer';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('@/data/expoFiles', () => ({
  expoBackupDeps: { files: { clear: async () => {} } },
  expoStorage: () => ({ clear: async () => {} }),
  expoPicker: () => ({ clearPicked: async () => {} }),
}));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const Stub = () => null;
const routes = {
  _layout: RootStack,
  ...tabRoutes,
  donnees: Backup,
  'tout-effacer': EraseAll,
  'groupes/nouveau': Stub,
  'saisons/index': Stub,
  urgence: Stub,
};
const t = labels.eraseAll;
const button = (name: string | RegExp) => screen.getByRole('button', { name });

describe('EX-23 Tout effacer : cas limites', () => {
  let db: Db;
  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    log.mockClear();
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('EX-23 double appui avant que l’écran ne se redessine : un seul effacement, Bienvenue', async () => {
    const router = await renderRouter(routes, { initialUrl: '/donnees' });
    await fireEvent.press(await screen.findByRole('button', { name: t.open }));
    await fireEvent.changeText(await screen.findByLabelText(t.field), 'EFFACER');
    const red = button('Tout effacer');
    await act(async () => {
      fireEvent.press(red);
      fireEvent.press(red);
    });
    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(log).not.toHaveBeenCalledWith('ERASE_ALL_REFUSED');
    expect(log).not.toHaveBeenCalledWith('ERASE_ALL_FAILED');
    expect(screen.queryByText(t.failed)).toBeNull();
  });

  it('EX-23 l’accueil déjà monté ne montre jamais l’ancien état après l’effacement', async () => {
    // Lectures lentes après l'effacement (comme sur un téléphone) : l'accueil ne doit pas montrer
    // l'ancien écran « mise en route faite » le temps de relire (revue de code du 015f).
    let slow = false;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const query = db.query.bind(db);
    jest
      .spyOn(db, 'query')
      .mockImplementation((sql, params) =>
        slow ? gate.then(() => query(sql, params)) : query(sql, params),
      );
    const transaction = db.transaction.bind(db);
    jest.spyOn(db, 'transaction').mockImplementation(async (work) => {
      const result = await transaction(work);
      slow = true;
      return result;
    });
    const router = await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByRole('button', { name: labels.emergency.entry })).toBeTruthy();
    await act(async () => {
      appRouter.push('/tout-effacer');
    });
    await fireEvent.changeText(await screen.findByLabelText(t.field), 'EFFACER');
    await fireEvent.press(button('Tout effacer'));
    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(screen.queryByRole('button', { name: labels.emergency.entry })).toBeNull();
    release();
    expect(await screen.findByText(labels.welcome.seasonCreated('2026-2027'))).toBeTruthy();
  });
});
