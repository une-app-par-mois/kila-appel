import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useGroups } from '@/hooks/useGroups';
import { useSeasons } from '@/hooks/useSeasons';

// La base et les dépôts sont simulés : les dépôts sont testés sur node:sqlite.
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => ({ fake: true }) }));
const mockSeasons = {
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  activate: jest.fn(),
  remove: jest.fn(),
  deletionImpact: jest.fn(),
};
const mockGroups = {
  listBySeason: jest.fn(),
  create: jest.fn(),
  rename: jest.fn(),
  archive: jest.fn(),
  unarchive: jest.fn(),
  remove: jest.fn(),
  deletionImpact: jest.fn(),
};
jest.mock('@/data/seasonsRepo', () => ({ seasonsRepo: () => mockSeasons }));
jest.mock('@/data/groupsRepo', () => ({ groupsRepo: () => mockGroups }));

const season = {
  id: 1,
  name: '2026-2027',
  startDate: '2026-09-01',
  endDate: '2027-07-31',
  isActive: true,
};

describe('useSeasons (EX-01, CONV-10)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('charge les saisons, puis recharge après chaque modification', async () => {
    mockSeasons.list.mockResolvedValueOnce([]).mockResolvedValue([season]);
    mockSeasons.create.mockResolvedValue(1);
    const { result } = await renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.seasons).toEqual([]));
    const input = { name: '2026-2027', startDate: '2026-09-01', endDate: '2027-07-31' };
    await act(async () => {
      await result.current.create(input);
    });
    expect(mockSeasons.create).toHaveBeenCalledWith(input);
    expect(result.current.seasons).toEqual([season]);
    for (const action of ['activate', 'remove'] as const) {
      await act(async () => {
        await result.current[action](1);
      });
      expect(mockSeasons[action]).toHaveBeenCalledWith(1);
    }
    await act(async () => {
      await result.current.update(1, input);
    });
    expect(mockSeasons.update).toHaveBeenCalledWith(1, input);
    expect(mockSeasons.list).toHaveBeenCalledTimes(5);
  });

  it('relaie une erreur de saisie à l’écran, sans recharger', async () => {
    mockSeasons.list.mockResolvedValue([]);
    mockSeasons.create.mockRejectedValue(new Error('NAME_REQUIRED'));
    const { result } = await renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.seasons).toEqual([]));
    await expect(result.current.create({ name: '', startDate: '', endDate: '' })).rejects.toThrow(
      'NAME_REQUIRED',
    );
    expect(mockSeasons.list).toHaveBeenCalledTimes(1);
  });

  it('donne l’impact d’une suppression sans rien modifier', async () => {
    mockSeasons.list.mockResolvedValue([season]);
    mockSeasons.deletionImpact.mockResolvedValue({
      groups: 3,
      slots: 3,
      sessions: 96,
      attendances: 900,
    });
    const { result } = await renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.seasons).toEqual([season]));
    expect(await result.current.deletionImpact(1)).toEqual({
      groups: 3,
      slots: 3,
      sessions: 96,
      attendances: 900,
    });
  });
});

describe('useGroups (EX-02, CONV-10)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('charge les groupes courants ou archivés de la saison, et recharge après modification', async () => {
    mockGroups.listBySeason.mockResolvedValue([]);
    mockGroups.create.mockResolvedValue(5);
    const { result } = await renderHook(() => useGroups(1, { archived: true }));
    await waitFor(() => expect(result.current.groups).toEqual([]));
    expect(mockGroups.listBySeason).toHaveBeenCalledWith(1, { archived: true });
    await act(async () => {
      await result.current.create('Poussins');
      await result.current.rename(5, 'Poussins mercredi');
      await result.current.archive(5, '2026-11-26');
      await result.current.unarchive(5);
      await result.current.remove(5);
    });
    expect(mockGroups.create).toHaveBeenCalledWith(1, 'Poussins');
    expect(mockGroups.rename).toHaveBeenCalledWith(5, 'Poussins mercredi');
    expect(mockGroups.archive).toHaveBeenCalledWith(5, '2026-11-26');
    expect(mockGroups.listBySeason).toHaveBeenCalledTimes(6);
    mockGroups.deletionImpact.mockResolvedValue({ enrollments: 2, slots: 1, sessions: 31 });
    expect(await result.current.deletionImpact(5)).toEqual({
      enrollments: 2,
      slots: 1,
      sessions: 31,
    });
  });

  it('ne charge rien sans saison', async () => {
    const { result } = await renderHook(() => useGroups(null));
    expect(result.current.groups).toBeNull();
    expect(mockGroups.listBySeason).not.toHaveBeenCalled();
  });
});
