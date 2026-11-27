// Reprogrammation des relances (ticket 028b, EX-28, ADR-007). Le module natif est imité en
// mémoire (src/__fixtures__/expoModules.ts) et les dépôts sont simulés : ils sont testés sur
// node:sqlite. Heure de Paris (jest.config.js), horloge fixée au mercredi 2026-12-02 à 13:00.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import type { fakeNotifications } from '@/__fixtures__/expoModules';
import { notifyDataChanged, notifyDataErased } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { useReminders } from '@/hooks/useReminders';

jest.mock('expo-notifications', () => require('@/__fixtures__/expoModules').fakeNotifications());
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const mockData = {
  db: { fake: true } as object | null,
  season: { id: 1, name: '2026-2027', startDate: '2026-09-01', endDate: '2027-07-31' } as
    | object
    | null,
  slots: [] as object[],
  groups: [{ id: 1, name: 'Poussins mercredi', archivedAt: null }],
  sessions: [] as { slotId: number; date: string; state: string }[],
  settings: jest.fn(),
};
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockData.db }));
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
  mockData.db = { fake: true };
  mockData.slots = [SLOT];
  mockData.sessions = [{ slotId: 10, date: '2026-11-18', state: 'recorded' }];
  mockData.settings.mockResolvedValue({ enabled: true, delayMin: 30 });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appState = listener;
    return { remove: () => undefined };
  });
});

afterEach(() => {
  fileLock.release('erase');
  jest.useRealTimers();
});

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

  it('rien n’est programmé ni annulé tant que la base n’est pas prête', async () => {
    mockData.db = null;
    await renderHook(() => useReminders());
    await act(async () => notifyDataChanged());
    expect(ids()).toEqual([OLD.identifier]);
    expect(shown()).toHaveLength(2);
    expect(mockData.settings).not.toHaveBeenCalled();
  });

  it('EX-28 appel enregistré : relance annulée et retirée ; retour au premier plan : relu', async () => {
    state.presented.push(presented('2026-12-02'));
    await mount();
    await waitFor(() => expect(ids()).toEqual(['relance-10-2026-12-02']));
    mockData.sessions.push({ slotId: 10, date: '2026-12-02', state: 'recorded' });
    await act(async () => notifyDataChanged());
    await waitFor(() => expect(ids()).toEqual([]));
    expect(shown()).toEqual(['relance-10-2026-11-25']);
    mockData.sessions = [];
    await act(async () => appState?.('active'));
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

  it('création du canal en échec : rien n’est programmé', async () => {
    state.fail.add('setNotificationChannelAsync');
    await mount();
    await waitFor(() => expect(codes()).toContain('REMINDER_CHANNEL_FAILED'));
    expect(ids()).toEqual([]);
  });

  it('programmation en échec : journalisée par un code, sans bloquer l’appli (ABS-04)', async () => {
    state.fail.add('scheduleNotificationAsync');
    await mount();
    await waitFor(() =>
      expect(log).toHaveBeenCalledWith('REMINDER_SCHEDULE_FAILED', { slotId: 10 }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('Poussins');
  });

  it('lecture en échec : REMINDERS_SCHEDULE_FAILED, rien n’est touché', async () => {
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

  it('ADR-007 une reprogrammation à la fois ; la dernière demande gagne', async () => {
    let release: (value: object) => void = () => undefined;
    mockData.settings.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    await renderHook(() => useReminders());
    await waitFor(() => expect(mockData.settings).toHaveBeenCalledTimes(1));
    mockData.sessions.push({ slotId: 10, date: '2026-12-02', state: 'recorded' });
    await act(async () => {
      notifyDataChanged();
      notifyDataChanged();
      appState?.('active');
    });
    expect(mockData.settings).toHaveBeenCalledTimes(1);
    await act(async () => release({ enabled: true, delayMin: 30 }));
    await waitFor(() => expect(mockData.settings).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(ids()).toEqual([]));
    await act(async () => notifyDataChanged());
    await waitFor(() => expect(mockData.settings).toHaveBeenCalledTimes(3));
  });

  it('verrou des fichiers pris (effacement) : reportée, reprise à sa libération', async () => {
    expect(fileLock.acquire('erase')).toBe(true);
    await renderHook(() => useReminders());
    await act(async () => notifyDataErased());
    expect(mockData.settings).not.toHaveBeenCalled();
    expect(ids()).toEqual([OLD.identifier]);
    await act(async () => fileLock.release('erase'));
    await waitFor(() => expect(ids()).toEqual(['relance-10-2026-12-02']));
    expect(mockData.settings).toHaveBeenCalledTimes(1);
  });

  it('appli au premier plan : bannière, liste et son, sans pastille ; rien de journalisé', async () => {
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
