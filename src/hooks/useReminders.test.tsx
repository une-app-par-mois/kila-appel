// Reprogrammation des relances (ticket 028b, EX-28, ADR-007). Le module natif est imité en
// mémoire (src/__fixtures__/expoModules.ts) et les dépôts sont simulés : ils sont testés sur
// node:sqlite. Heure de Paris (jest.config.js), horloge fixée au mercredi 2026-12-02 à 13:00.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import type { fakeNotifications } from '@/__fixtures__/expoModules';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { resetRemindersForTests, useReminders } from '@/hooks/useReminders';

jest.mock('expo-notifications', () => require('@/__fixtures__/expoModules').fakeNotifications());
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const mockData = {
  dbState: { status: 'ready', db: {} } as object,
  season: { id: 1, name: '2026-2027', startDate: '2026-09-01', endDate: '2027-07-31' } as
    | object
    | null,
  slots: [] as object[],
  groups: [{ id: 1, name: 'Poussins mercredi', archivedAt: null }],
  sessions: [] as { slotId: number; date: string; state: string }[],
  settings: jest.fn(),
};
jest.mock('@/hooks/useDatabase', () => ({ useDatabaseState: () => mockData.dbState }));
jest.mock('@/data/seasonsRepo', () => ({
  seasonsRepo: () => ({ getActive: async () => mockData.season }),
}));
jest.mock('@/data/slotsRepo', () => ({
  slotsRepo: () => ({ listBySeason: async () => mockData.slots }),
}));
jest.mock('@/data/groupsRepo', () => ({
  groupsRepo: () => ({ listBySeason: async () => mockData.groups }),
}));
jest.mock('@/data/sessionsRepo', () => ({
  sessionsRepo: () => ({ reminderSessions: async () => mockData.sessions }),
}));
jest.mock('@/data/settingsRepo', () => ({
  settingsRepo: () => ({ reminderSettings: mockData.settings }),
}));

const fake = jest.requireMock('expo-notifications') as ReturnType<typeof fakeNotifications>;
const { state } = fake;
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const SLOT = {
  id: 10,
  seasonId: 1,
  weekday: 3,
  startTime: '14:00',
  durationMin: 90,
  place: null,
  name: null,
  scheduleFrom: '2026-11-18',
  groups: [{ id: 1, name: 'Poussins mercredi' }],
};
const presented = (date: string) => ({
  identifier: `relance-10-${date}`,
  content: { data: { slotId: 10, date } },
});
const OLD = { identifier: 'relance-10-2026-11-11', content: {}, trigger: {} };
const ids = () => state.scheduled.map((s) => s.identifier);
const shown = () => state.presented.map((p) => p.identifier);
const codes = () => log.mock.calls.map((c) => c[0]);

let appState: ((status: AppStateStatus) => void) | null = null;

beforeEach(() => {
  jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 11, 2, 13, 0) });
  jest.clearAllMocks();
  Object.assign(state, {
    scheduled: [OLD],
    presented: [presented('2026-11-18'), presented('2026-11-25')],
    channels: [],
    permission: { granted: true, canAskAgain: true, status: 'granted' },
  });
  state.fail.clear();
  resetRemindersForTests();
  mockData.dbState = { status: 'ready', db: {} };
  mockData.slots = [SLOT];
  mockData.sessions = [{ slotId: 10, date: '2026-11-18', state: 'recorded' }];
  mockData.settings.mockResolvedValue({ enabled: true, delayMin: 30 });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appState = listener;
    return { remove: () => undefined };
  });
});

afterEach(() => jest.useRealTimers());

/** Monte le hook et attend la fin de la reprogrammation (canal créé, ou relances annulées). */
const mount = async () => {
  const view = await renderHook(() => useReminders());
  await waitFor(() => expect(ids()).not.toContain(OLD.identifier));
  return view;
};

describe('useReminders : reprogrammation des relances (EX-28, ADR-007)', () => {
  it('EX-28 ouverture : canal « Relances », relance à début + délai, affichées périmées retirées', async () => {
    await mount();
    await waitFor(() => expect(ids()).toEqual(['relance-10-2026-12-02']));
    expect(state.channels).toEqual([
      { id: 'relances', channel: { name: 'Relances', importance: 6, showBadge: false } },
    ]);
    expect(state.scheduled[0]?.trigger).toMatchObject({ date: new Date(2026, 11, 2, 14, 30) });
    // Appel fait le 18 : retirée ; appel du 25 toujours manquant : gardée.
    expect(shown()).toEqual(['relance-10-2026-11-25']);
  });

  it('EX-28 appel enregistré : relance annulée par son identifiant et retirée ; retour au premier plan : relu', async () => {
    state.presented.push(presented('2026-12-02'));
    await mount();
    await waitFor(() => expect(ids()).toEqual(['relance-10-2026-12-02']));
    const cancelAll = jest.spyOn(fake, 'cancelAllScheduledNotificationsAsync');
    const cancelOne = jest.spyOn(fake, 'cancelScheduledNotificationAsync');
    mockData.sessions.push({ slotId: 10, date: '2026-12-02', state: 'recorded' });
    await act(async () => notifyDataChanged());
    await waitFor(() => expect(ids()).toEqual([]));
    expect(cancelOne).toHaveBeenCalledWith('relance-10-2026-12-02');
    expect(cancelAll).not.toHaveBeenCalled();
    expect(shown()).toEqual(['relance-10-2026-11-25']);
    mockData.sessions = [];
    await act(async () => appState?.('active'));
    await waitFor(() => expect(ids()).toEqual(['relance-10-2026-12-02']));
  });

  it('EX-28 relance encore due, dans la minute, pas encore délivrée : gardée, Android la délivre', async () => {
    // Créneau de 12:30, délai 30 : relance à 13:00, la minute courante, absente du plan.
    mockData.slots = [{ ...SLOT, startTime: '12:30' }];
    state.scheduled.push({ identifier: 'relance-10-2026-12-02', content: {}, trigger: {} });
    await mount();
    await waitFor(() => expect(shown()).toHaveLength(1));
    // Gardée telle quelle ; celle de la semaine suivante (maintenant + 7 jours) est programmée.
    await waitFor(() => expect(ids()).toEqual(['relance-10-2026-12-02', 'relance-10-2026-12-09']));
  });

  it('ADR-007 annulation unitaire en échec : journalisée, rejouée à la passe suivante', async () => {
    state.fail.add('cancelScheduledNotificationAsync');
    await renderHook(() => useReminders());
    await waitFor(() => expect(codes()).toContain('REMINDER_CANCEL_FAILED'));
    expect(ids()).toContain(OLD.identifier);
    state.fail.clear();
    await act(async () => notifyDataChanged());
    await waitFor(() => expect(ids()).toEqual(['relance-10-2026-12-02']));
  });

  it('EX-29 relance désactivée : tout est annulé, ni canal ni relance', async () => {
    mockData.settings.mockResolvedValue({ enabled: false, delayMin: 30 });
    await mount();
    expect(ids()).toEqual([]);
    expect(state.channels).toEqual([]);
    // Les relances affichées suivent la même règle : celle du 25 reste due.
    expect(shown()).toEqual(['relance-10-2026-11-25']);
  });

  it('EX-29 permission refusée : tout est annulé, ni canal ni relance', async () => {
    state.permission = { granted: false, canAskAgain: true, status: 'denied' };
    await mount();
    await waitFor(() => expect(shown()).toHaveLength(1));
    expect(ids()).toEqual([]);
    expect(state.channels).toEqual([]);
  });

  it('EX-29 création du canal en échec : rien n’est programmé', async () => {
    state.fail.add('setNotificationChannelAsync');
    await mount();
    await waitFor(() => expect(codes()).toContain('REMINDER_CHANNEL_FAILED'));
    expect(ids()).toEqual([]);
  });

  it('ABS-04 programmation en échec : journalisée par un code, sans bloquer l’appli', async () => {
    state.fail.add('scheduleNotificationAsync');
    await mount();
    await waitFor(() =>
      expect(log).toHaveBeenCalledWith('REMINDER_SCHEDULE_FAILED', { slotId: 10 }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('Poussins');
  });

  it('ADR-007 lecture en échec : REMINDERS_SCHEDULE_FAILED, rien n’est touché', async () => {
    mockData.settings.mockRejectedValue(new Error('base'));
    await renderHook(() => useReminders());
    await waitFor(() => expect(log).toHaveBeenCalledWith('REMINDERS_SCHEDULE_FAILED'));
    expect(ids()).toEqual([OLD.identifier]);
    expect(shown()).toHaveLength(2);
  });

  it('EX-28 délai invalide : tout est annulé, rien n’est programmé, échec journalisé', async () => {
    mockData.settings.mockResolvedValue({ enabled: true, delayMin: 25 });
    await mount();
    await waitFor(() => expect(log).toHaveBeenCalledWith('REMINDERS_SCHEDULE_FAILED'));
    expect(ids()).toEqual([]);
    expect(state.channels).toEqual([]);
  });

  it('SEC-03 appli au premier plan : bannière, liste et son, sans pastille ; rien de journalisé', async () => {
    const handler = jest.spyOn(fake, 'setNotificationHandler');
    await mount();
    expect(handler).toHaveBeenCalledTimes(1);
    const [arg] = handler.mock.calls[0] as [{ handleNotification: () => Promise<object> }];
    log.mockClear();
    await expect(arg.handleNotification()).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
    expect(log).not.toHaveBeenCalled();
  });
});
