// Garde-fous de la reprogrammation des relances (ticket 028b, ADR-007) : base pas prête, une
// passe à la fois, verrou des fichiers relu avant chaque écriture native, base effacée. Même
// imitation que useReminders.test.tsx ; horloge fixée au mercredi 2026-12-02 à 13:00 (Paris).
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import type { fakeNotifications } from '@/__fixtures__/expoModules';
import { notifyDataChanged, notifyDataErased } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { resetRemindersForTests, useReminders } from '@/hooks/useReminders';

jest.mock('expo-notifications', () => require('@/__fixtures__/expoModules').fakeNotifications());
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const mockData = {
  dbState: { status: 'ready', db: {} } as object,
  sessions: [] as { slotId: number; date: string; state: string }[],
  settings: jest.fn(),
  slots: [] as object[],
};
const SLOT = {
  id: 10,
  weekday: 3,
  startTime: '14:00',
  durationMin: 90,
  scheduleFrom: '2026-11-18',
  groups: [{ id: 1, name: 'Poussins mercredi' }],
};
jest.mock('@/hooks/useDatabase', () => ({ useDatabaseState: () => mockData.dbState }));
jest.mock('@/data/seasonsRepo', () => ({
  seasonsRepo: () => ({
    getActive: async () => ({ id: 1, startDate: '2026-09-01', endDate: '2027-07-31' }),
  }),
}));
jest.mock('@/data/slotsRepo', () => ({
  slotsRepo: () => ({ listBySeason: async () => mockData.slots }),
}));
jest.mock('@/data/groupsRepo', () => ({
  groupsRepo: () => ({ listBySeason: async () => [{ id: 1 }] }),
}));
jest.mock('@/data/sessionsRepo', () => ({
  sessionsRepo: () => ({ reminderSessions: async () => mockData.sessions }),
}));
jest.mock('@/data/settingsRepo', () => ({
  settingsRepo: () => ({ reminderSettings: mockData.settings }),
}));

const fake = jest.requireMock('expo-notifications') as ReturnType<typeof fakeNotifications>;
const { state } = fake;

const OLD = { identifier: 'relance-10-2026-11-11', content: {}, trigger: {} };
const TODAY = 'relance-10-2026-12-02';
const ids = () => state.scheduled.map((s) => s.identifier);
let appState: ((status: AppStateStatus) => void) | null = null;

beforeEach(() => {
  jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 11, 2, 13, 0) });
  jest.clearAllMocks();
  Object.assign(state, {
    scheduled: [OLD],
    presented: [{ identifier: TODAY, content: { data: { slotId: 10, date: '2026-12-02' } } }],
    channels: [],
    permission: { granted: true, canAskAgain: true, status: 'granted' },
  });
  state.fail.clear();
  resetRemindersForTests();
  mockData.dbState = { status: 'ready', db: {} };
  mockData.sessions = [];
  mockData.slots = [SLOT];
  mockData.settings.mockResolvedValue({ enabled: true, delayMin: 30 });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appState = listener;
    return { remove: () => undefined };
  });
});

afterEach(() => {
  fileLock.release('erase');
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('useReminders : garde-fous (ADR-007)', () => {
  it('ADR-007 rien n’est programmé ni annulé tant que la base n’est pas prête', async () => {
    mockData.dbState = { status: 'opening' };
    await renderHook(() => useReminders());
    await act(async () => notifyDataChanged());
    expect(ids()).toEqual([OLD.identifier]);
    expect(mockData.settings).not.toHaveBeenCalled();
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

  it('ADR-007 verrou pris (effacement) : reportée, reprise à sa libération', async () => {
    expect(fileLock.acquire('erase')).toBe(true);
    await renderHook(() => useReminders());
    await act(async () => notifyDataErased());
    expect(mockData.settings).not.toHaveBeenCalled();
    expect(ids()).toEqual([OLD.identifier]);
    await act(async () => fileLock.release('erase'));
    await waitFor(() => expect(ids()).toEqual([TODAY]));
    expect(mockData.settings).toHaveBeenCalledTimes(1);
  });

  it('ADR-007 verrou pris pendant la lecture : rien n’est écrit, passe refaite ensuite (F2)', async () => {
    let release: (value: object) => void = () => undefined;
    mockData.settings.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    await renderHook(() => useReminders());
    await waitFor(() => expect(mockData.settings).toHaveBeenCalledTimes(1));
    await act(async () => fileLock.acquire('erase'));
    await act(async () => release({ enabled: true, delayMin: 30 }));
    expect(ids()).toEqual([OLD.identifier]);
    await act(async () => fileLock.release('erase'));
    await waitFor(() => expect(ids()).toEqual([TODAY]));
  });

  it('ADR-007 verrou pris entre la lecture et la programmation : arrêt, puis reprise', async () => {
    const read = fake.getPermissionsAsync;
    jest.spyOn(fake, 'getPermissionsAsync').mockImplementationOnce(async () => {
      fileLock.acquire('erase');
      return read();
    });
    await renderHook(() => useReminders());
    await waitFor(() => expect(fileLock.holder()).toBe('erase'));
    await act(async () => undefined);
    expect(ids()).toEqual([OLD.identifier]);
    expect(state.channels).toEqual([]);
    await act(async () => fileLock.release('erase'));
    await waitFor(() => expect(ids()).toEqual([TODAY]));
  });

  it('ADR-007 effacement compté pendant une passe : elle s’arrête et repart', async () => {
    const read = fake.getPermissionsAsync;
    jest.spyOn(fake, 'getPermissionsAsync').mockImplementationOnce(async () => {
      mockData.sessions.push({ slotId: 10, date: '2026-12-02', state: 'recorded' });
      notifyDataErased();
      return read();
    });
    const schedule = jest.spyOn(fake, 'scheduleNotificationAsync');
    await renderHook(() => useReminders());
    await waitFor(() => expect(mockData.settings).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(ids()).toEqual([]));
    // La passe interrompue n'a rien programmé avec les données d'avant l'effacement.
    expect(schedule).not.toHaveBeenCalled();
  });

  it.each([
    { status: 'erased', after: 'startOver', pending: false },
    { status: 'restoreFailed', db: {}, pending: false },
  ])('SEC-11 base perdue ($status) : plus aucune relance', async (lost) => {
    const view = await renderHook(() => useReminders());
    await waitFor(() => expect(ids()).toEqual([TODAY]));
    mockData.dbState = lost;
    await view.rerender({});
    await waitFor(() => expect(ids()).toEqual([]));
    await waitFor(() => expect(state.presented).toEqual([]));
  });

  it('EX-29 listage en échec, relance désactivée : tout est annulé quand même', async () => {
    mockData.settings.mockResolvedValue({ enabled: false, delayMin: 30 });
    state.fail.add('getAllScheduledNotificationsAsync');
    await renderHook(() => useReminders());
    await waitFor(() => expect(ids()).toEqual([]));
  });

  it('SEC-03 une notification qui n’est pas une relance n’est jamais annulée', async () => {
    state.scheduled.push({ identifier: 'autre-1', content: {}, trigger: {} });
    await renderHook(() => useReminders());
    await waitFor(() => expect(ids()).toEqual(['autre-1', TODAY]));
  });

  it('ADR-007 verrou pris pendant la première annulation : la suivante ne part pas', async () => {
    state.scheduled.push({ identifier: 'relance-10-2026-11-04', content: {}, trigger: {} });
    const real = fake.cancelScheduledNotificationAsync;
    const cancel = jest.spyOn(fake, 'cancelScheduledNotificationAsync');
    cancel.mockImplementationOnce(async (id: string) => {
      fileLock.acquire('erase');
      return real(id);
    });
    await renderHook(() => useReminders());
    await waitFor(() => expect(fileLock.holder()).toBe('erase'));
    await act(async () => undefined);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(ids()).toEqual(['relance-10-2026-11-04']);
    await act(async () => fileLock.release('erase'));
    await waitFor(() => expect(ids()).toEqual([TODAY]));
  });

  it('ADR-007 verrou pris pendant la première programmation : la suivante ne part pas', async () => {
    mockData.slots = [SLOT, { ...SLOT, id: 11, startTime: '14:15' }];
    const real = fake.scheduleNotificationAsync;
    const schedule = jest.spyOn(fake, 'scheduleNotificationAsync');
    schedule.mockImplementationOnce(async (request) => {
      fileLock.acquire('erase');
      return real(request);
    });
    await renderHook(() => useReminders());
    await waitFor(() => expect(fileLock.holder()).toBe('erase'));
    await act(async () => undefined);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(ids()).toEqual([TODAY]);
    await act(async () => fileLock.release('erase'));
    await waitFor(() => expect(ids()).toEqual([TODAY, 'relance-11-2026-12-02']));
  });

  it('ADR-007 démonté : plus aucune passe', async () => {
    const view = await renderHook(() => useReminders());
    await waitFor(() => expect(ids()).toEqual([TODAY]));
    await view.unmount();
    await act(async () => notifyDataChanged());
    expect(mockData.settings).toHaveBeenCalledTimes(1);
  });
});
