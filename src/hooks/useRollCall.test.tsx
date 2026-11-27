import { act, renderHook, waitFor } from '@testing-library/react-native';
import { onDataChanged } from '@/hooks/dataChanged';
import { useProposedSession, useRollCall, useRoster } from '@/hooks/useRollCall';

// La base et les dépôts sont simulés : les dépôts sont testés sur node:sqlite.
const mockDb = { fake: true };
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const mockEnrollments = { listByGroup: jest.fn() };
const mockSeasons = { getActive: jest.fn() };
const mockSlots = { listBySeason: jest.fn() };
const mockGroups = { listBySeason: jest.fn() };
const mockSessions = { record: jest.fn(), isRecorded: jest.fn() };
jest.mock('@/data/enrollmentsRepo', () => ({ enrollmentsRepo: () => mockEnrollments }));
jest.mock('@/data/seasonsRepo', () => ({ seasonsRepo: () => mockSeasons }));
jest.mock('@/data/slotsRepo', () => ({ slotsRepo: () => mockSlots }));
jest.mock('@/data/groupsRepo', () => ({ groupsRepo: () => mockGroups }));
jest.mock('@/data/sessionsRepo', () => ({ sessionsRepo: () => mockSessions }));

const season = { id: 1, startDate: '2026-09-01', endDate: '2027-07-31' };
// Mercredi 17:30, 90 min, depuis le début de la saison.
const slot = {
  id: 3,
  seasonId: 1,
  weekday: 3,
  startTime: '17:30',
  durationMin: 90,
  place: 'Gymnase',
  name: null,
  scheduleFrom: '2026-09-01',
  groups: [{ id: 2, name: 'Poussins' }],
};

describe('useRoster, useProposedSession, useRollCall (EX-09, EX-15)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('EX-09 liste de l’appel : inscrits au groupe à la date de la séance', async () => {
    mockEnrollments.listByGroup.mockResolvedValue([{ memberId: 1 }]);
    const { result } = await renderHook(() => useRoster(2, '2026-12-02'));
    await waitFor(() => expect(result.current.roster).toEqual([{ memberId: 1 }]));
    expect(result.current.loaded).toBe(true);
    expect(mockEnrollments.listByGroup).toHaveBeenCalledWith(2, '2026-12-02');
  });

  it('liste de l’appel en échec : signalée, journal sans donnée (ABS-04)', async () => {
    mockEnrollments.listByGroup.mockRejectedValue(new Error('Alix Exemple'));
    const { result } = await renderHook(() => useRoster(2, '2026-12-02'));
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('ROSTER_LOAD_FAILED', { groupId: 2 });
  });

  it('EX-09 séance proposée : le créneau en cours, avec son groupe et son lieu', async () => {
    mockSeasons.getActive.mockResolvedValue(season);
    mockSlots.listBySeason.mockResolvedValue([slot]);
    mockGroups.listBySeason.mockResolvedValue([{ id: 2 }]);
    const now = { date: '2026-12-02', time: '18:00' };
    const { result } = await renderHook(() => useProposedSession(now));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.session).toEqual({ slot, date: '2026-12-02', startTime: '17:30' });
  });

  it('EX-09 un créneau dont le groupe est archivé n’est pas proposé (l’enregistrement le refuserait)', async () => {
    mockSeasons.getActive.mockResolvedValue(season);
    mockSlots.listBySeason.mockResolvedValue([slot]);
    mockGroups.listBySeason.mockResolvedValue([]);
    const now = { date: '2026-12-02', time: '18:00' };
    const { result } = await renderHook(() => useProposedSession(now));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.session).toBeNull();
  });

  it('liste de l’appel sans groupe choisi : rien à charger, pas d’attente sans fin', async () => {
    const { result } = await renderHook(() => useRoster(null, '2026-12-02'));
    expect(result.current.roster).toBeNull();
    expect(result.current.loaded).toBe(false);
    expect(mockEnrollments.listByGroup).not.toHaveBeenCalled();
  });

  it('EX-09 sans saison active ni créneau : aucune séance proposée', async () => {
    mockSeasons.getActive.mockResolvedValue(null);
    const now = { date: '2026-12-02', time: '18:00' };
    const { result } = await renderHook(() => useProposedSession(now));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.session).toBeNull();
    expect(mockSlots.listBySeason).not.toHaveBeenCalled();
  });

  it('EX-15 enregistrer prévient les écrans ouverts ; « déjà enregistrée » lu dans le dépôt', async () => {
    mockSessions.record.mockResolvedValue(9);
    mockSessions.isRecorded.mockResolvedValue(true);
    const changed = jest.fn();
    const stop = onDataChanged(changed);
    const { result } = await renderHook(() => useRollCall());
    const call = {
      slotId: 3,
      groupId: 2,
      date: '2026-12-02',
      startTime: '17:30',
      statuses: [],
      comment: null,
    };
    let id = 0;
    await act(async () => {
      id = await result.current.record(call);
    });
    expect(id).toBe(9);
    expect(mockSessions.record).toHaveBeenCalledWith(call);
    expect(changed).toHaveBeenCalled();
    expect(await result.current.isRecorded(3, '2026-12-02')).toBe(true);
    stop();
  });
});
