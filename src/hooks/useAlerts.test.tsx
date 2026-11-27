import { act, renderHook, waitFor } from '@testing-library/react-native';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useAlert, useAlerts, useAlertThreshold } from '@/hooks/useAlerts';
import { errorMessage } from '@/ui/errorMessage';

// La base et les dépôts sont simulés : les dépôts sont testés sur node:sqlite.
const mockDb = { fake: true };
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const mockAlerts = {
  list: jest.fn(),
  get: jest.fn(),
  recentStatuses: jest.fn(),
  acknowledge: jest.fn(),
};
const mockSettings = { alertThreshold: jest.fn(), setAlertThreshold: jest.fn() };
jest.mock('@/data/alertsRepo', () => ({ alertsRepo: () => mockAlerts }));
jest.mock('@/data/settingsRepo', () => ({ settingsRepo: () => mockSettings }));

const TODAY = '2026-11-27';
const alert = {
  memberId: 7,
  firstName: 'Alix',
  lastName: 'Exemple',
  groupName: 'Poussins',
  streak: 3,
  start: '2026-11-10',
  end: '2026-11-25',
};

describe('useAlerts (EX-25, EX-26, CONV-10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings.alertThreshold.mockResolvedValue(4);
  });

  it('EX-25 liste lue avec le seuil réglé, rechargée après notifyDataChanged', async () => {
    mockAlerts.list.mockResolvedValueOnce([]).mockResolvedValue([alert]);
    const { result } = await renderHook(() => useAlerts(TODAY));
    await waitFor(() => expect(result.current.alerts).toEqual([]));
    expect(mockAlerts.list).toHaveBeenCalledWith(TODAY, 4);
    await act(async () => notifyDataChanged());
    await waitFor(() => expect(result.current.alerts).toEqual([alert]));
  });

  it('EX-26 traiter : écrit la longueur du jour, puis tous les écrans rechargent', async () => {
    mockAlerts.list.mockResolvedValueOnce([alert]).mockResolvedValue([]);
    mockAlerts.acknowledge.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAlerts(TODAY));
    await waitFor(() => expect(result.current.alerts).toEqual([alert]));
    await act(async () => {
      await result.current.acknowledge(7, 3);
    });
    expect(mockAlerts.acknowledge).toHaveBeenCalledWith(7, 3, TODAY);
    await waitFor(() => expect(result.current.alerts).toEqual([]));
  });

  it('EX-26 un traitement refusé est relayé, sans rechargement', async () => {
    mockAlerts.list.mockResolvedValue([alert]);
    mockAlerts.acknowledge.mockRejectedValue(new RangeError('Longueur de série invalide'));
    const { result } = await renderHook(() => useAlerts(TODAY));
    await waitFor(() => expect(result.current.alerts).toEqual([alert]));
    await expect(result.current.acknowledge(7, 0)).rejects.toThrow(RangeError);
    expect(mockAlerts.list).toHaveBeenCalledTimes(1);
  });

  it('ABS-04 un échec de lecture écrit un code, jamais un nom', async () => {
    mockAlerts.list.mockRejectedValue(new Error('lecture'));
    const { result } = await renderHook(() => useAlerts(TODAY));
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('ALERTS_LOAD_FAILED', {});
  });
});

describe('useAlert (écran de l’alerte)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings.alertThreshold.mockResolvedValue(3);
  });

  it('lit l’alerte et les dernières séances du membre, rechargées après une modification', async () => {
    const recent = [{ sessionId: 1, date: '2026-11-25', startTime: '18:00', status: 'absent' }];
    mockAlerts.get.mockResolvedValueOnce(alert).mockResolvedValue(null);
    mockAlerts.recentStatuses.mockResolvedValue(recent);
    const { result } = await renderHook(() => useAlert(7, TODAY));
    await waitFor(() => expect(result.current.alert).toEqual(alert));
    expect(result.current.recent).toEqual(recent);
    expect(mockAlerts.get).toHaveBeenCalledWith(7, TODAY, 3);
    expect(mockAlerts.recentStatuses).toHaveBeenCalledWith(7);
    await act(async () => notifyDataChanged());
    await waitFor(() => expect(result.current.alert).toBeNull());
    expect(result.current.loaded).toBe(true);
  });

  it('un échec de lecture écrit un code et l’identifiant du membre', async () => {
    mockAlerts.get.mockRejectedValue(new Error('lecture'));
    mockAlerts.recentStatuses.mockResolvedValue([]);
    const { result } = await renderHook(() => useAlert(7, TODAY));
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('ALERT_LOAD_FAILED', { memberId: 7 });
  });
});

describe('useAlertThreshold (EX-25)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lit le seuil, l’enregistre, puis tous les écrans rechargent', async () => {
    mockSettings.alertThreshold.mockResolvedValueOnce(3).mockResolvedValue(5);
    mockSettings.setAlertThreshold.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAlertThreshold());
    await waitFor(() => expect(result.current.threshold).toBe(3));
    await act(async () => {
      await result.current.setThreshold(5);
    });
    expect(mockSettings.setAlertThreshold).toHaveBeenCalledWith(5);
    await waitFor(() => expect(result.current.threshold).toBe(5));
  });

  it('un seuil refusé est relayé à l’écran', async () => {
    mockSettings.alertThreshold.mockResolvedValue(3);
    mockSettings.setAlertThreshold.mockRejectedValue({ code: 'ALERT_THRESHOLD_INVALID' });
    const { result } = await renderHook(() => useAlertThreshold());
    await waitFor(() => expect(result.current.threshold).toBe(3));
    const refused = await result.current.setThreshold(11).catch((e: unknown) => e);
    expect(refused).toEqual({ code: 'ALERT_THRESHOLD_INVALID' });
    expect(errorMessage(refused)).toBe('Choisissez un seuil de 2 à 10 absences.');
  });
});
