/**
 * @jest-environment node
 */
// Adaptateur expo-notifications, permission de la relance (ticket 029, EX-29). Le module natif est
// imité en mémoire (src/__fixtures__/expoModules.ts). Lire la permission ne la demande jamais ;
// la demande n'a lieu qu'à l'activation, et ne lève jamais d'erreur.

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { fakeNotifications } from '@/__fixtures__/expoModules';
import { TEST_FILE, walkSources } from '@/__fixtures__/sourceFiles';
import { reminderPermissionState, requestReminderPermission } from '@/data/expoNotifications';

jest.mock('expo-notifications', () => require('@/__fixtures__/expoModules').fakeNotifications());

const fake = jest.requireMock('expo-notifications') as ReturnType<typeof fakeNotifications>;
const { state } = fake;
let logs: jest.SpyInstance;

beforeEach(() => {
  state.permission = { granted: false, canAskAgain: true, status: 'undetermined' };
  state.answer = { granted: true, canAskAgain: true, status: 'granted' };
  state.requests = [];
  state.fail.clear();
  logs = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => logs.mockRestore());

const loggedCodes = () => logs.mock.calls.map((call) => call[1]);

describe('EX-29 état de la permission (ticket 029)', () => {
  it.each([
    [{ granted: true, canAskAgain: true, status: 'granted' }, 'granted'],
    [{ granted: false, canAskAgain: true, status: 'undetermined' }, 'undetermined'],
    [{ granted: false, canAskAgain: true, status: 'denied' }, 'denied'],
    [{ granted: false, canAskAgain: false, status: 'denied' }, 'blocked'],
  ])('EX-29 %j se lit « %s », sans rien demander', async (permission, expected) => {
    state.permission = permission;
    expect(await reminderPermissionState()).toBe(expected);
    expect(state.requests).toEqual([]);
  });

  it('EX-29 lecture en échec : « unknown », journalisée par un code seul (ABS-04)', async () => {
    state.fail.add('getPermissionsAsync');
    expect(await reminderPermissionState()).toBe('unknown');
    expect(loggedCodes()).toEqual(['REMINDER_PERMISSION_FAILED']);
  });
});

describe('EX-29 demande de la permission (ticket 029)', () => {
  it('EX-29 iOS : alerte et son, sans pastille ; la réponse du système est rendue', async () => {
    expect(await requestReminderPermission()).toBe('granted');
    expect(state.requests).toEqual([
      { ios: { allowAlert: true, allowSound: true, allowBadge: false } },
    ]);
    expect(state.permission.granted).toBe(true);
  });

  it('EX-29 refus au dialogue : « denied », distinct d’un échec', async () => {
    state.answer = { granted: false, canAskAgain: false, status: 'denied' };
    expect(await requestReminderPermission()).toBe('denied');
  });

  it('EX-29 demande en échec : « failed », sans erreur levée, journalisée par un code', async () => {
    state.fail.add('requestPermissionsAsync');
    await expect(requestReminderPermission()).resolves.toBe('failed');
    expect(loggedCodes()).toEqual(['REMINDER_PERMISSION_REQUEST_FAILED']);
  });
});

describe('EX-29 un seul chemin vers la demande de permission (ticket 029, SEC-03)', () => {
  const ROOT = join(__dirname, '..', '..');
  // Identifiants du texte, découpés par un motif littéral (pas de motif construit : Semgrep).
  const identifiers = (text: string) => new Set(text.match(/[A-Za-z_$][\w$]*/g));
  const filesNaming = (name: string) =>
    walkSources(join(ROOT, 'src'))
      .filter((file) => !TEST_FILE.test(file))
      .filter((file) => identifiers(readFileSync(file, 'utf8')).has(name))
      .map((file) => relative(ROOT, file))
      .sort();

  it('EX-29 `requestReminderPermission` : défini par l’adaptateur, appelé par le hook seul', () => {
    expect(filesNaming('requestReminderPermission')).toEqual([
      'src/data/expoNotifications.ts',
      'src/hooks/useReminderSettings.ts',
    ]);
  });

  it('EX-29 `confirmPermission` : défini par le hook, appelé par l’écran de permission seul', () => {
    expect(filesNaming('confirmPermission')).toEqual([
      'src/app/permission-notifications.tsx',
      'src/hooks/useReminderSettings.ts',
    ]);
  });
});
