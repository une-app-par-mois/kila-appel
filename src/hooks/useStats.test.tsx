import { act, renderHook, waitFor } from '@testing-library/react-native';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useGroupStats, useMemberStats, useStats } from '@/hooks/useStats';

// La base et les dépôts sont simulés : les dépôts sont testés sur node:sqlite.
const mockDb = { fake: true };
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/hooks/useLocalNow', () => ({
  useLocalNow: () => ({ date: '2026-11-27', time: '18:00' }),
}));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const mockSeasons = { getActive: jest.fn() };
const mockStats = { overview: jest.fn(), group: jest.fn(), member: jest.fn() };
jest.mock('@/data/seasonsRepo', () => ({ seasonsRepo: () => mockSeasons }));
jest.mock('@/data/statsRepo', () => ({ statsRepo: () => mockStats }));

const season = {
  id: 1,
  name: 'Saison 2026-2027',
  startDate: '2026-09-01',
  endDate: '2027-07-31',
  isActive: true,
};
const SEASON = { kind: 'season', from: '2026-09-01', to: '2026-11-27' };
const MONTH = { kind: 'month', from: '2026-11-01', to: '2026-11-27' };

describe('useStats (EX-27, CONV-10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeasons.getActive.mockResolvedValue(season);
  });

  it('EX-27 période par défaut : la saison active ; rechargé après notifyDataChanged', async () => {
    mockStats.overview.mockResolvedValueOnce({ sessions: 1 }).mockResolvedValue({ sessions: 2 });
    const { result } = await renderHook(() => useStats(null));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.stats).toEqual({ season, period: SEASON, overview: { sessions: 1 } });
    expect(mockStats.overview).toHaveBeenCalledWith(SEASON);
    await act(async () => notifyDataChanged());
    await waitFor(() => expect(result.current.stats?.overview).toEqual({ sessions: 2 }));
  });

  it('EX-27 sans saison active : `season` nul, période « Ce mois »', async () => {
    mockSeasons.getActive.mockResolvedValue(null);
    mockStats.overview.mockResolvedValue({ sessions: 0 });
    const { result } = await renderHook(() => useStats({ kind: 'season' }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.stats?.season).toBeNull();
    expect(result.current.stats?.period).toEqual(MONTH);
  });

  it('EX-27 dates libres invalides : échec de lecture journalisé, sans donnée', async () => {
    const { result } = await renderHook(() =>
      useStats({ kind: 'custom', from: '2026-12-01', to: '2026-11-01' }),
    );
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(mockStats.overview).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('STATS_LOAD_FAILED', {});
  });

  it('EX-27 groupe : identifiant et période transmis, rechargé après notifyDataChanged', async () => {
    mockStats.group.mockResolvedValueOnce({ sessions: 13 }).mockResolvedValue({ sessions: 14 });
    const { result } = await renderHook(() => useGroupStats(7, { kind: 'month' }));
    await waitFor(() => expect(result.current.stats?.group).toEqual({ sessions: 13 }));
    expect(mockStats.group).toHaveBeenCalledWith(7, MONTH);
    await act(async () => notifyDataChanged());
    await waitFor(() => expect(result.current.stats?.group).toEqual({ sessions: 14 }));
  });

  it('EX-27 membre : identifiants et période transmis ; échec journalisé sans nom (ABS-04)', async () => {
    mockStats.member.mockResolvedValueOnce({ counts: {} }).mockRejectedValue(new Error('x'));
    const { result } = await renderHook(() => useMemberStats(3, 7, null));
    await waitFor(() => expect(result.current.stats?.member).toEqual({ counts: {} }));
    expect(mockStats.member).toHaveBeenCalledWith(3, 7, SEASON);
    await act(async () => notifyDataChanged());
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('MEMBER_STATS_LOAD_FAILED', { memberId: 3, groupId: 7 });
  });
});
