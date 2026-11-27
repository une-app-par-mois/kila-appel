// Activation de la relance et demande de permission (ticket 029, EX-29), sur une vraie base
// node:sqlite et le jeu fictif ; module natif des notifications imité en mémoire. Parcours décidé
// par le porteur le 2026-11-27 : déjà accordée → activée ; `canAskAgain: false` → sans écran de
// permission, préférence active et bandeau ; sinon écran « Autoriser les notifications ? ».
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import type { fakeNotifications } from '@/__fixtures__/expoModules';
import { seed } from '@/__fixtures__/seed';
import PermissionScreen from '@/app/permission-notifications';
import ReminderSetting from '@/app/relance';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('expo-notifications', () => require('@/__fixtures__/expoModules').fakeNotifications());

const fake = jest.requireMock('expo-notifications') as ReturnType<typeof fakeNotifications>;
const { state } = fake;
type Answer = typeof state.answer;
/** Demande du système en attente : `answer` y répond. */
const pendingRequest = () => {
  let answer: (a: Answer) => void = () => undefined;
  jest.spyOn(fake, 'requestPermissionsAsync').mockImplementation(async (options: object) => {
    state.requests.push(options);
    const result = await new Promise<Answer>((resolve) => {
      answer = resolve;
    });
    state.permission = result;
    return result;
  });
  return (a: Answer) => answer(a);
};
const routes = {
  _layout: RootStack,
  ...tabRoutes,
  relance: ReminderSetting,
  'permission-notifications': PermissionScreen,
};
const r = labels.reminderSetting;
const p = labels.notificationPermission;
const IOS = { ios: { allowAlert: true, allowSound: true, allowBadge: false } };

describe('Relance : demande de permission (ticket 029)', () => {
  let db: Db;
  const enabled = async () =>
    (
      await db.query<{ value: string }>("SELECT value FROM settings WHERE key = 'reminder_enabled'")
    )[0]?.value === '1';
  const toggle = () => screen.findByRole('switch', { name: r.toggle });
  const turnOn = async () => {
    await fireEvent(await toggle(), 'valueChange', true);
    await act(async () => undefined);
  };
  const isOn = async () => (await toggle()).props.accessibilityState?.checked === true;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    state.permission = { granted: false, canAskAgain: true, status: 'undetermined' };
    state.answer = { granted: true, canAskAgain: true, status: 'granted' };
    state.requests = [];
    state.fail.clear();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    mockDb = null;
    await db.close();
  });

  it('EX-29 permission déjà accordée : activée tout de suite, sans écran ni demande', async () => {
    state.permission = { granted: true, canAskAgain: true, status: 'granted' };
    const router = await renderRouter(routes, { initialUrl: '/relance' });
    await turnOn();
    expect(router.getPathname()).toBe('/relance');
    expect(await isOn()).toBe(true);
    expect(await enabled()).toBe(true);
    expect(state.requests).toEqual([]);
  });

  it('EX-29 accordée au dialogue : écran de la maquette, demande iOS sans pastille, activée', async () => {
    const router = await renderRouter(routes, { initialUrl: '/relance' });
    await turnOn();
    expect(router.getPathname()).toBe('/permission-notifications');
    expect(await screen.findByRole('header', { name: p.title })).toBeTruthy();
    expect(screen.getByText(p.why)).toBeTruthy();
    expect(screen.getByText(p.privacy)).toBeTruthy();
    expect(state.requests).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: p.continue }));
    expect(await screen.findByRole('switch', { name: r.toggle })).toBeTruthy();
    expect(router.getPathname()).toBe('/relance');
    expect(state.requests).toEqual([IOS]);
    expect(await isOn()).toBe(true);
    expect(await enabled()).toBe(true);
    expect(screen.queryByText(r.deniedTitle)).toBeNull();
  });

  it('EX-29 refusée au dialogue : préférence active, interrupteur activé et bandeau', async () => {
    state.answer = { granted: false, canAskAgain: false, status: 'denied' };
    const router = await renderRouter(routes, { initialUrl: '/relance' });
    await turnOn();
    await fireEvent.press(await screen.findByRole('button', { name: p.continue }));
    expect(await screen.findByText(r.deniedTitle)).toBeTruthy();
    expect(router.getPathname()).toBe('/relance');
    expect(await isOn()).toBe(true);
    expect(await enabled()).toBe(true);
    expect(screen.getByRole('button', { name: r.openSettings })).toBeTruthy();
  });

  it('EX-29 déjà refusée (`canAskAgain: false`) : écran de permission sauté, bandeau', async () => {
    state.permission = { granted: false, canAskAgain: false, status: 'denied' };
    const router = await renderRouter(routes, { initialUrl: '/relance' });
    await turnOn();
    expect(await screen.findByText(r.deniedTitle)).toBeTruthy();
    expect(router.getPathname()).toBe('/relance');
    expect(await isOn()).toBe(true);
    expect(await enabled()).toBe(true);
    expect(state.requests).toEqual([]);
  });

  it('EX-29 « Pas maintenant » : retour, relance non activée, rien demandé', async () => {
    const router = await renderRouter(routes, { initialUrl: '/relance' });
    await turnOn();
    await fireEvent.press(await screen.findByRole('button', { name: p.notNow }));
    expect(await screen.findByRole('switch', { name: r.toggle })).toBeTruthy();
    expect(router.getPathname()).toBe('/relance');
    expect(await isOn()).toBe(false);
    expect(await enabled()).toBe(false);
    expect(state.requests).toEqual([]);
  });

  it('CONV-15 demande du système en échec : relance non activée, message d’échec', async () => {
    state.fail.add('requestPermissionsAsync');
    const router = await renderRouter(routes, { initialUrl: '/relance' });
    await turnOn();
    await fireEvent.press(await screen.findByRole('button', { name: p.continue }));
    expect(await screen.findByText(labels.errors.unknown)).toBeTruthy();
    expect(router.getPathname()).toBe('/permission-notifications');
    expect(await enabled()).toBe(false);
  });

  it('EX-29 dialogue fermé sans réponse (toujours `undetermined`) : retour, non activée', async () => {
    state.answer = { granted: false, canAskAgain: true, status: 'undetermined' };
    const router = await renderRouter(routes, { initialUrl: '/relance' });
    await turnOn();
    await fireEvent.press(await screen.findByRole('button', { name: p.continue }));
    expect(await screen.findByRole('switch', { name: r.toggle })).toBeTruthy();
    expect(router.getPathname()).toBe('/relance');
    expect(screen.queryByText(labels.errors.unknown)).toBeNull();
    expect(await isOn()).toBe(false);
    expect(await enabled()).toBe(false);
  });

  it('EX-29 double appui sur « Continuer » : une seule demande', async () => {
    await renderRouter(routes, { initialUrl: '/relance' });
    await turnOn();
    const button = await screen.findByRole('button', { name: p.continue });
    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    expect(await screen.findByRole('switch', { name: r.toggle })).toBeTruthy();
    expect(state.requests.length).toBe(1);
  });

  it('EX-29 demande en cours : pas de retour possible, puis un seul retour au réglage', async () => {
    const answer = pendingRequest();
    const router = await renderRouter(routes, { initialUrl: '/relance' });
    await turnOn();
    await fireEvent.press(await screen.findByRole('button', { name: p.continue }));
    expect(screen.queryByRole('button', { name: labels.common.back })).toBeNull();
    await act(async () => answer({ granted: true, canAskAgain: true, status: 'granted' }));
    expect(await screen.findByRole('switch', { name: r.toggle })).toBeTruthy();
    expect(router.getPathname()).toBe('/relance');
    expect(await isOn()).toBe(true);
  });

  it('EX-29 double bascule de l’interrupteur : un seul écran de permission poussé', async () => {
    const router = await renderRouter(routes, { initialUrl: '/relance' });
    const sw = await toggle();
    await act(async () => {
      fireEvent(sw, 'valueChange', true);
      fireEvent(sw, 'valueChange', true);
    });
    await fireEvent.press(await screen.findByRole('button', { name: p.notNow }));
    expect(await screen.findByRole('switch', { name: r.toggle })).toBeTruthy();
    expect(router.getPathname()).toBe('/relance');
  });

  it('EX-29 activation en cours : interrupteur désactivé', async () => {
    let read: () => void = () => undefined;
    jest.spyOn(fake, 'getPermissionsAsync').mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        read = resolve;
      });
      return state.permission;
    });
    await renderRouter(routes, { initialUrl: '/relance' });
    await act(async () => read());
    const sw = await toggle();
    await act(async () => {
      fireEvent(sw, 'valueChange', true);
    });
    expect((await toggle()).props.disabled).toBe(true);
    await act(async () => read());
  });
});
