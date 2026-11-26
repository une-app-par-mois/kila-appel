import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useGroup, useGroups } from '@/hooks/useGroups';
import { useSeasons } from '@/hooks/useSeasons';

// La base et les dépôts sont simulés : les dépôts sont testés sur node:sqlite.
const mockDb = { fake: true };
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
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
  get: jest.fn(),
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

  it('une modification faite sur un écran recharge aussi les autres écrans ouverts', async () => {
    mockSeasons.list
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([season]);
    mockSeasons.activate.mockResolvedValue(undefined);
    const list = await renderHook(() => useSeasons());
    const form = await renderHook(() => useSeasons());
    await waitFor(() => expect(list.result.current.seasons).toEqual([]));
    await waitFor(() => expect(form.result.current.seasons).toEqual([]));
    await act(async () => {
      await form.result.current.activate(1);
    });
    await waitFor(() => expect(list.result.current.seasons).toEqual([season]));
    await list.unmount();
    await form.unmount();
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

  it('signale un échec de chargement (état d’erreur, code au journal) au lieu d’attendre sans fin', async () => {
    mockSeasons.list.mockRejectedValue(new Error('BROKEN_CONNECTION'));
    const { result } = await renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.seasons).toBeNull();
    expect(log).toHaveBeenCalledWith('SEASONS_LOAD_FAILED');
  });

  it('une modification enregistrée n’est pas présentée comme un échec si le rechargement échoue', async () => {
    mockSeasons.list.mockResolvedValueOnce([]).mockRejectedValue(new Error('BROKEN_CONNECTION'));
    mockSeasons.create.mockResolvedValue(1);
    const { result } = await renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.seasons).toEqual([]));
    await act(async () => {
      await result.current.create({ name: 'S', startDate: '2026-09-01', endDate: '2027-07-31' });
    });
    expect(result.current.loadFailed).toBe(true);
  });

  it('garde les mêmes actions d’un rendu à l’autre', async () => {
    mockSeasons.list.mockResolvedValue([]);
    const { result, rerender } = await renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.seasons).toEqual([]));
    const before = result.current;
    await rerender({});
    expect(result.current.create).toBe(before.create);
    expect(result.current.deletionImpact).toBe(before.deletionImpact);
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

  it('charge les groupes courants ou archivés de la saison', async () => {
    mockGroups.listBySeason.mockResolvedValue([]);
    const { result } = await renderHook(() => useGroups(1, { archived: true }));
    await waitFor(() => expect(result.current.groups).toEqual([]));
    expect(mockGroups.listBySeason).toHaveBeenCalledWith(1, { archived: true });
  });

  it('useGroup : actions sur le groupe, puis rechargement ; introuvable distingué du chargement', async () => {
    mockGroups.get.mockResolvedValue(null);
    const { result } = await renderHook(() => useGroup(5));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.group).toBeNull();
    await act(async () => {
      await result.current.rename('Poussins mercredi');
      await result.current.archive('2026-11-26');
      await result.current.unarchive();
      await result.current.remove();
    });
    expect(mockGroups.rename).toHaveBeenCalledWith(5, 'Poussins mercredi');
    expect(mockGroups.archive).toHaveBeenCalledWith(5, '2026-11-26');
    expect(mockGroups.unarchive).toHaveBeenCalledWith(5);
    expect(mockGroups.remove).toHaveBeenCalledWith(5);
    expect(mockGroups.get.mock.calls.length).toBeGreaterThanOrEqual(5);
    mockGroups.deletionImpact.mockResolvedValue({ enrollments: 2, slots: 1, sessions: 31 });
    expect(await result.current.deletionImpact()).toEqual({
      enrollments: 2,
      slots: 1,
      sessions: 31,
    });
  });

  it('useGroup signale un échec de lecture', async () => {
    mockGroups.get.mockRejectedValue(new Error('BROKEN_CONNECTION'));
    const { result } = await renderHook(() => useGroup(5));
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('GROUP_LOAD_FAILED', { groupId: 5 });
  });

  it('au changement de saison, vide la liste et ignore une réponse tardive de l’ancienne', async () => {
    let answerSeason1: (groups: unknown[]) => void = () => {};
    mockGroups.listBySeason.mockImplementation((seasonId: number) =>
      seasonId === 1
        ? new Promise((resolve) => {
            answerSeason1 = resolve;
          })
        : Promise.resolve([{ id: 20, seasonId: 2, name: 'Benjamins', archivedAt: null }]),
    );
    const { result, rerender } = await renderHook(
      ({ id }: { id: number | null }) => useGroups(id),
      {
        initialProps: { id: 1 as number | null },
      },
    );
    await rerender({ id: 2 });
    await waitFor(() => expect(result.current.groups?.[0]?.seasonId).toBe(2));
    await act(async () => {
      answerSeason1([{ id: 10, seasonId: 1, name: 'Poussins', archivedAt: null }]);
    });
    expect(result.current.groups?.[0]?.seasonId).toBe(2);
    await rerender({ id: null });
    expect(result.current.groups).toBeNull();
  });

  it('signale un échec de chargement des groupes', async () => {
    mockGroups.listBySeason.mockRejectedValue(new Error('BROKEN_CONNECTION'));
    const { result } = await renderHook(() => useGroups(1));
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('GROUPS_LOAD_FAILED', { seasonId: 1 });
  });

  it('une modification des saisons recharge aussi les groupes (suppression en cascade)', async () => {
    mockSeasons.list.mockResolvedValue([]);
    mockSeasons.remove.mockResolvedValue(undefined);
    mockGroups.listBySeason.mockResolvedValue([]);
    const seasonsHook = await renderHook(() => useSeasons());
    const groupsHook = await renderHook(() => useGroups(1));
    await waitFor(() => expect(groupsHook.result.current.groups).toEqual([]));
    const before = mockGroups.listBySeason.mock.calls.length;
    await act(async () => {
      await seasonsHook.result.current.remove(1);
    });
    await waitFor(() => expect(mockGroups.listBySeason.mock.calls.length).toBeGreaterThan(before));
    await seasonsHook.unmount();
    await groupsHook.unmount();
  });

  it('useGroup lit un groupe ; « create » rend l’identifiant créé', async () => {
    const group = { id: 5, seasonId: 1, name: 'Poussins', archivedAt: null, enrollmentCount: 0 };
    mockGroups.get.mockResolvedValue(group);
    mockGroups.listBySeason.mockResolvedValue([]);
    mockGroups.create.mockResolvedValue(5);
    const one = await renderHook(() => useGroup(5));
    await waitFor(() => expect(one.result.current.group).toEqual(group));
    const list = await renderHook(() => useGroups(1));
    await waitFor(() => expect(list.result.current.groups).toEqual([]));
    let id = 0;
    await act(async () => {
      id = await list.result.current.create('Poussins');
    });
    expect(id).toBe(5);
    await one.unmount();
    await list.unmount();
  });

  it('ne charge rien sans saison', async () => {
    const { result } = await renderHook(() => useGroups(null));
    expect(result.current.groups).toBeNull();
    expect(mockGroups.listBySeason).not.toHaveBeenCalled();
  });
});
