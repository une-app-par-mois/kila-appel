/**
 * @jest-environment node
 */
// Adaptateur expo-notifications (ticket 028a, EX-28, ADR-007). Le module natif est imité en
// mémoire (src/__fixtures__/expoModules.ts) : on teste le code de l'adaptateur, pas le module.
// Heure de Paris, fixée par jest.config.js avant les workers : passages à l'heure d'été
// (29 mars 2026) et d'hiver (25 octobre 2026).

import type { fakeNotifications } from '@/__fixtures__/expoModules';
import {
  cancelAllReminders,
  createReminderChannel,
  dismissAllReminders,
  dismissStaleReminders,
  firstOccurrence,
  lastReminderTarget,
  onReminderTarget,
  reminderPermission,
  scheduleReminders,
  toLocalDate,
} from '@/data/expoNotifications';
import type { PlannedReminder } from '@/domain/reminders';

jest.mock('expo-notifications', () => require('@/__fixtures__/expoModules').fakeNotifications());

const fake = jest.requireMock('expo-notifications') as ReturnType<typeof fakeNotifications>;
const { state } = fake;
let logs: jest.SpyInstance;
// Horloge relue avant chaque appel natif : fixée avant toutes les relances des tests.
let clock: jest.SpyInstance;

beforeEach(() => {
  state.scheduled = [];
  state.presented = [];
  state.channels = [];
  state.permission = { granted: false, canAskAgain: true, status: 'undetermined' };
  state.lastResponse = null;
  state.listeners = [];
  state.fail.clear();
  logs = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  clock = jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 0, 1));
});
afterEach(() => {
  logs.mockRestore();
  clock.mockRestore();
});

const planned = (overrides: Partial<PlannedReminder> = {}): PlannedReminder => ({
  slotId: 3,
  date: '2026-12-02',
  startTime: '17:30',
  fireDate: '2026-12-02',
  fireTime: '18:00',
  groupNames: ['Poussins mercredi'],
  ...overrides,
});
const local = (y: number, m: number, d: number, h: number, mi: number, s = 0) =>
  new Date(y, m - 1, d, h, mi, s);
const triggers = () => state.scheduled.map((x) => (x.trigger as { date: Date }).date.toISOString());
const loggedCodes = () => logs.mock.calls.map((call) => call[1]);
const target = (slotId: unknown, date: unknown, identifier = `relance-${slotId}-${date}`) => ({
  identifier,
  content: { data: { slotId, date } },
});

describe('EX-28 conversion des dates et heures locales', () => {
  it('les tests tournent à l’heure de Paris, quel que soit le fuseau du poste ou de la CI', () => {
    expect(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()).toBe(-60);
    expect(new Date('2026-07-15T12:00:00Z').getTimezoneOffset()).toBe(-120);
  });

  it('heure ordinaire : la Date locale correspondante', () => {
    expect(toLocalDate('2026-12-02', '18:00')?.toISOString()).toBe('2026-12-02T17:00:00.000Z');
  });

  it('heure d’été : l’heure absente passe à la première minute valide (03:00)', () => {
    expect(toLocalDate('2026-03-29', '02:30')?.toISOString()).toBe('2026-03-29T01:00:00.000Z');
    expect(toLocalDate('2026-03-29', '02:00')?.toISOString()).toBe('2026-03-29T01:00:00.000Z');
    expect(toLocalDate('2026-03-29', '03:00')?.toISOString()).toBe('2026-03-29T01:00:00.000Z');
  });

  it('heure d’hiver : l’heure doublée prend la première occurrence', () => {
    expect(toLocalDate('2026-10-25', '02:30')?.toISOString()).toBe('2026-10-25T00:30:00.000Z');
    expect(toLocalDate('2026-10-25', '03:00')?.toISOString()).toBe('2026-10-25T02:00:00.000Z');
  });

  it('heure d’hiver : la seconde occurrence est ramenée à la première, quel que soit le moteur', () => {
    const second = new Date('2026-10-25T01:30:00.000Z');
    expect(firstOccurrence(second).toISOString()).toBe('2026-10-25T00:30:00.000Z');
    const ordinary = new Date('2026-12-02T17:00:00.000Z');
    expect(firstOccurrence(ordinary)).toEqual(ordinary);
  });

  it.each([
    ['2026-02-30', '18:00'],
    ['2026-12-02', '24:00'],
    ['02/12/2026', '18:00'],
    ['2026-12-02', '8:00'],
  ])('refuse une valeur hors format : %s %s', (date, time) => {
    expect(toLocalDate(date, time)).toBeNull();
  });
});

describe('EX-28 programmer les relances', () => {
  const now = local(2026, 12, 2, 17, 0);

  it('programme une notification à date fixe, texte de la maquette, données réduites', async () => {
    expect(await scheduleReminders([planned()], now)).toBe(1);
    expect(state.scheduled).toEqual([
      {
        identifier: 'relance-3-2026-12-02',
        content: {
          title: 'Appel non fait : Poussins mercredi',
          body: 'Le créneau a commencé à 17:30.',
          data: { slotId: 3, date: '2026-12-02' },
          sound: 'default',
        },
        trigger: {
          type: 'date',
          date: new Date('2026-12-02T17:00:00.000Z'),
          channelId: 'relances',
        },
      },
    ]);
  });

  it('SEC-12 données de la notification : slotId et date seulement', async () => {
    await scheduleReminders([planned({ groupNames: ['Benjamins', 'Poussins'] })], now);
    const content = state.scheduled[0]?.content as { data: object };
    expect(Object.keys(content.data).sort()).toEqual(['date', 'slotId']);
  });

  it('écarte un déclencheur déjà passé ou à la minute courante', async () => {
    const reminders = [
      planned({ slotId: 1, fireTime: '17:59' }),
      planned({ slotId: 2, fireTime: '18:00' }),
      planned({ slotId: 3, fireTime: '18:01' }),
    ];
    expect(await scheduleReminders(reminders, local(2026, 12, 2, 18, 0, 30))).toBe(1);
    expect(state.scheduled.map((x) => x.identifier)).toEqual(['relance-3-2026-12-02']);
    expect(await scheduleReminders([planned()], local(2026, 12, 2, 17, 59, 59))).toBe(1);
  });

  it('relit l’heure avant chaque appel : un déclencheur à moins de 5 s est écarté (iOS le refuse)', async () => {
    clock.mockReturnValue(local(2026, 12, 2, 17, 59, 56).getTime());
    expect(await scheduleReminders([planned()], now)).toBe(0);
    clock.mockReturnValue(local(2026, 12, 2, 17, 59, 55).getTime());
    expect(await scheduleReminders([planned()], now)).toBe(1);
    // Passée entre le calcul et l'appel : écartée aussi.
    state.scheduled = [];
    clock.mockReturnValue(local(2026, 12, 2, 18, 0, 1).getTime());
    expect(await scheduleReminders([planned()], now)).toBe(0);
  });

  it('heure d’été : une relance à 02:30 part à 03:00', async () => {
    const r = planned({ date: '2026-03-29', fireDate: '2026-03-29', fireTime: '02:30' });
    expect(await scheduleReminders([r], local(2026, 3, 28, 12, 0))).toBe(1);
    expect(triggers()).toEqual(['2026-03-29T01:00:00.000Z']);
  });

  it('heure d’hiver : une relance à 02:30 part une seule fois, à la première occurrence', async () => {
    const r = planned({ date: '2026-10-25', fireDate: '2026-10-25', fireTime: '02:30' });
    expect(await scheduleReminders([r], local(2026, 10, 24, 12, 0))).toBe(1);
    expect(triggers()).toEqual(['2026-10-25T00:30:00.000Z']);
    // Pendant la seconde 02:30 (01:30 UTC), la première est passée : rien n'est programmé.
    state.scheduled = [];
    expect(await scheduleReminders([r], new Date('2026-10-25T01:00:00.000Z'))).toBe(0);
  });

  it('ABS-04 date illisible : écartée, journalisée par un code, les autres partent', async () => {
    const reminders = [planned({ slotId: 1, fireTime: '25:00' }), planned({ slotId: 2 })];
    expect(await scheduleReminders(reminders, now)).toBe(1);
    expect(logs).toHaveBeenCalledWith('[kila]', 'REMINDER_DATE_INVALID', { slotId: 1 });
  });

  it('ABS-04 échec du module : journalisé par un code, sans nom de groupe', async () => {
    state.fail.add('scheduleNotificationAsync');
    expect(await scheduleReminders([planned()], now)).toBe(0);
    expect(logs).toHaveBeenCalledWith('[kila]', 'REMINDER_SCHEDULE_FAILED', { slotId: 3 });
    expect(JSON.stringify(logs.mock.calls)).not.toContain('Poussins');
  });
});

describe('EX-28 annuler et retirer', () => {
  it('annule toutes les relances programmées', async () => {
    await scheduleReminders([planned()], local(2026, 12, 2, 17, 0));
    expect(await cancelAllReminders()).toBe(true);
    expect(state.scheduled).toEqual([]);
  });

  it('annulation en échec : faux et un code', async () => {
    state.fail.add('cancelAllScheduledNotificationsAsync');
    expect(await cancelAllReminders()).toBe(false);
    expect(loggedCodes()).toEqual(['REMINDER_CANCEL_FAILED']);
  });

  it('retire les relances affichées qui ne sont plus dues, garde les autres', async () => {
    state.presented = [
      target(3, '2026-12-02'),
      target(4, '2026-12-01'),
      target('4', '2026-12-01', 'autre'),
    ];
    await dismissStaleReminders([{ slotId: 3, date: '2026-12-02' }]);
    expect(state.presented.map((x) => x.identifier)).toEqual(['relance-3-2026-12-02', 'autre']);
  });

  it('retire toutes les relances affichées (Tout effacer)', async () => {
    state.presented = [target(3, '2026-12-02'), target('x', 'y', 'autre')];
    await dismissAllReminders();
    expect(state.presented).toEqual([]);
  });

  it('lecture des relances affichées en échec : un code, sans erreur levée', async () => {
    state.fail.add('getPresentedNotificationsAsync');
    await dismissStaleReminders([]);
    await dismissAllReminders();
    expect(loggedCodes()).toEqual(['REMINDER_DISMISS_FAILED', 'REMINDER_DISMISS_FAILED']);
  });

  it('retrait en échec : un code par relance, les autres essayées', async () => {
    state.presented = [target(3, '2026-12-02'), target(4, '2026-12-01')];
    state.fail.add('dismissNotificationAsync');
    await dismissAllReminders();
    expect(loggedCodes()).toEqual(['REMINDER_DISMISS_FAILED', 'REMINDER_DISMISS_FAILED']);
  });
});

describe('EX-29 permission et canal Android (sans demande au 028a)', () => {
  it('lit la permission accordée ou non', async () => {
    expect(await reminderPermission()).toEqual({ granted: false, canAskAgain: true });
    state.permission = { granted: true, canAskAgain: true, status: 'granted' };
    expect(await reminderPermission()).toEqual({ granted: true, canAskAgain: true });
  });

  it('lecture en échec : non accordée, un code', async () => {
    state.fail.add('getPermissionsAsync');
    expect(await reminderPermission()).toEqual({ granted: false, canAskAgain: false });
    expect(loggedCodes()).toEqual(['REMINDER_PERMISSION_FAILED']);
  });

  it('crée le canal des relances, sans pastille', async () => {
    expect(await createReminderChannel('Relances')).toBe(true);
    expect(state.channels).toEqual([
      { id: 'relances', channel: { name: 'Relances', importance: 6, showBadge: false } },
    ]);
  });

  it('création du canal en échec : faux et un code', async () => {
    state.fail.add('setNotificationChannelAsync');
    expect(await createReminderChannel('Relances')).toBe(false);
    expect(loggedCodes()).toEqual(['REMINDER_CHANNEL_FAILED']);
  });
});

describe('EX-28 appui sur une relance (CONV-14 : données validées)', () => {
  const response = (slotId: unknown, date: unknown) => ({
    notification: { date: 0, request: target(slotId, date) },
  });

  it('dernière réponse : la cible, ou null', () => {
    expect(lastReminderTarget()).toBeNull();
    state.lastResponse = response(3, '2026-12-02');
    expect(lastReminderTarget()).toEqual({ slotId: 3, date: '2026-12-02' });
  });

  it.each([
    ['3', '2026-12-02'],
    [0, '2026-12-02'],
    [1.5, '2026-12-02'],
    [3, '2026-13-01'],
    [3, 20261202],
    [undefined, undefined],
  ])('données hors format refusées : %p %p', (slotId, date) => {
    state.lastResponse = response(slotId, date);
    expect(lastReminderTarget()).toBeNull();
  });

  it('dernière réponse en échec : null et un code', () => {
    state.fail.add('getLastNotificationResponse');
    expect(lastReminderTarget()).toBeNull();
    expect(loggedCodes()).toEqual(['REMINDER_RESPONSE_FAILED']);
  });

  it('écouteur : la cible validée (null si hors format), puis désabonnement', () => {
    const seen: unknown[] = [];
    const stop = onReminderTarget((t) => seen.push(t));
    for (const listener of state.listeners) listener(response(3, '2026-12-02'));
    for (const listener of state.listeners) listener(response('3', 'x'));
    expect(seen).toEqual([{ slotId: 3, date: '2026-12-02' }, null]);
    stop();
    expect(state.listeners).toEqual([]);
  });

  it('écouteur en échec : un code, désabonnement sans effet', () => {
    state.fail.add('addNotificationResponseReceivedListener');
    const stop = onReminderTarget(() => undefined);
    expect(() => stop()).not.toThrow();
    expect(loggedCodes()).toEqual(['REMINDER_LISTEN_FAILED']);
  });
});
