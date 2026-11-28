// Réglage de la relance (ticket 029, EX-28, EX-29) : écran Relance et ligne de Paramètres, sur une
// vraie base node:sqlite et le jeu fictif. Le module natif des notifications est imité en mémoire
// (src/__fixtures__/expoModules.ts) : lire la permission est permis, la demander ne l'est qu'à
// l'activation (notificationPermission.test.tsx).
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AppState, type AppStateStatus, Linking } from 'react-native';
import type { fakeNotifications } from '@/__fixtures__/expoModules';
import { seed } from '@/__fixtures__/seed';
import PermissionScreen from '@/app/permission-notifications';
import ReminderSetting from '@/app/relance';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { onDataChanged } from '@/hooks/dataChanged';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('expo-notifications', () => require('@/__fixtures__/expoModules').fakeNotifications());

const { state } = jest.requireMock('expo-notifications') as ReturnType<typeof fakeNotifications>;
const routes = {
  _layout: RootStack,
  ...tabRoutes,
  relance: ReminderSetting,
  'permission-notifications': PermissionScreen,
};
const open = (initialUrl = '/') => renderRouter(routes, { initialUrl });
const r = labels.reminderSetting;
const GRANTED = { granted: true, canAskAgain: true, status: 'granted' };
const DENIED = { granted: false, canAskAgain: true, status: 'denied' };
const settingsRow = (subtitle: string) => labels.rowAccessibility(r.title, subtitle);

describe('Relance : réglage (ticket 029)', () => {
  let db: Db;
  const setting = async (key: string, value: string) =>
    db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
  const stored = async (key: string) =>
    (await db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]))[0]
      ?.value;
  const toggle = () => screen.findByRole('switch', { name: r.toggle });
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    state.permission = { granted: false, canAskAgain: true, status: 'undetermined' };
    state.requests = [];
    state.fail.clear();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    mockDb = null;
    await db.close();
  });

  it('EX-29 aucune demande de permission à l’ouverture de l’appli ni de Paramètres', async () => {
    await open('/');
    await fireEvent.press(await screen.findByRole('button', { name: labels.tabs.settings }));
    expect(await screen.findByRole('button', { name: settingsRow(r.rowDisabled) })).toBeTruthy();
    expect(state.requests).toEqual([]);
  });

  it('F-06 Paramètres : « Relance » au-dessus des alertes, dans « Réglages », ouvre le réglage', async () => {
    const router = await open('/parametres');
    expect(await screen.findByText(labels.settings.preferences)).toBeTruthy();
    const rows = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel);
    const relance = rows.indexOf(settingsRow(r.rowDisabled));
    expect(relance).toBeGreaterThan(-1);
    expect(rows[relance + 1]).toBe(
      labels.rowAccessibility(labels.alerts.settingTitle, labels.alerts.settingsRow(3)),
    );
    await fireEvent.press(screen.getByRole('button', { name: settingsRow(r.rowDisabled) }));
    expect(router.getPathname()).toBe('/relance');
    expect((await toggle()).props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByText(r.onDevice)).toBeTruthy();
    expect(screen.getByText(r.lockScreen)).toBeTruthy();
    expect(state.requests).toEqual([]);
  });

  it('EX-28 délai modifié : enregistré, données signalées, ligne de Paramètres à jour', async () => {
    await setting('reminder_enabled', '1');
    state.permission = GRANTED;
    await open('/parametres');
    await fireEvent.press(
      await screen.findByRole('button', { name: settingsRow(r.rowEnabled(30)) }),
    );
    const changed = jest.fn();
    const stop = onDataChanged(changed);
    await fireEvent.press(await screen.findByRole('button', { name: r.delayAccessibility(30) }));
    const choices = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel);
    expect(choices).toEqual(
      expect.arrayContaining(['10 min', '15 min', '20 min', '30 min', '45 min', '60 min']),
    );
    await fireEvent.press(screen.getByRole('button', { name: r.delay(45) }));
    expect(await screen.findByRole('button', { name: r.delayAccessibility(45) })).toBeTruthy();
    stop();
    expect(changed).toHaveBeenCalled();
    expect(await stored('reminder_delay_min')).toBe('45');
    await fireEvent.press(screen.getByRole('button', { name: labels.common.back }));
    expect(await screen.findByRole('button', { name: settingsRow(r.rowEnabled(45)) })).toBeTruthy();
  });

  it('EX-29 désactiver ne demande rien ; la préférence est enregistrée', async () => {
    await setting('reminder_enabled', '1');
    state.permission = GRANTED;
    await open('/relance');
    const changed = jest.fn();
    const stop = onDataChanged(changed);
    await fireEvent(await toggle(), 'valueChange', false);
    await act(async () => undefined);
    stop();
    expect((await toggle()).props.accessibilityState).toMatchObject({ checked: false });
    expect(await stored('reminder_enabled')).toBe('0');
    expect(changed).toHaveBeenCalled();
    expect(state.requests).toEqual([]);
  });

  it('EX-29 préférence active, permission refusée : interrupteur activé et bandeau', async () => {
    await setting('reminder_enabled', '1');
    state.permission = DENIED;
    await open('/parametres');
    await fireEvent.press(await screen.findByRole('button', { name: settingsRow(r.rowDenied) }));
    expect((await toggle()).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText(r.deniedTitle)).toBeTruthy();
    expect(screen.getByText(r.deniedBody)).toBeTruthy();
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await fireEvent.press(screen.getByRole('button', { name: r.openSettings }));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('EX-29 retour des réglages du téléphone, permission accordée : le bandeau disparaît', async () => {
    const handlers: ((s: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      handlers.push(handler as (s: AppStateStatus) => void);
      return { remove: () => undefined };
    });
    await setting('reminder_enabled', '1');
    state.permission = { granted: false, canAskAgain: false, status: 'denied' };
    await open('/relance');
    expect(await screen.findByText(r.deniedTitle)).toBeTruthy();
    state.permission = GRANTED;
    await act(async () => {
      for (const handler of handlers) handler('active');
    });
    expect(screen.queryByText(r.deniedTitle)).toBeNull();
    expect((await toggle()).props.accessibilityState).toMatchObject({ checked: true });
    expect(state.requests).toEqual([]);
  });

  it('EX-29 permission jamais demandée, préférence active (restauration) : éteint, sans bandeau', async () => {
    await setting('reminder_enabled', '1');
    await open('/parametres');
    await fireEvent.press(await screen.findByRole('button', { name: settingsRow(r.rowDisabled) }));
    expect((await toggle()).props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.queryByText(r.deniedTitle)).toBeNull();
    expect(state.requests).toEqual([]);
  });

  it('EX-29 lecture de la permission en échec : éteint, sans bandeau, « Désactivée »', async () => {
    await setting('reminder_enabled', '1');
    state.fail.add('getPermissionsAsync');
    await open('/parametres');
    await fireEvent.press(await screen.findByRole('button', { name: settingsRow(r.rowDisabled) }));
    expect((await toggle()).props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.queryByText(r.deniedTitle)).toBeNull();
  });
});
