import { act, renderHook, waitFor } from '@testing-library/react-native';
import { onDataChanged } from '@/hooks/dataChanged';
import { useEnrollments, useMember, useMemberCreation, useMembers } from '@/hooks/useMembers';

// La base et les dépôts sont simulés : les dépôts sont testés sur node:sqlite.
const mockDb = { fake: true };
let mockDbReady = true;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => (mockDbReady ? mockDb : null) }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const mockMembers = {
  list: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  archive: jest.fn(),
  unarchive: jest.fn(),
  remove: jest.fn(),
  deletionImpact: jest.fn(),
};
const mockEnrollments = {
  listByGroup: jest.fn(),
  listByMember: jest.fn(),
  listUpcomingByGroup: jest.fn(),
  candidates: jest.fn(),
  enroll: jest.fn(),
  withdraw: jest.fn(),
};
jest.mock('@/data/membersRepo', () => ({
  ...jest.requireActual('@/data/membersRepo'),
  membersRepo: () => mockMembers,
}));
jest.mock('@/data/enrollmentsRepo', () => ({ enrollmentsRepo: () => mockEnrollments }));
const mockSeasons = { getActive: jest.fn() };
jest.mock('@/data/seasonsRepo', () => ({ seasonsRepo: () => mockSeasons }));

const TODAY = '2026-11-26';
const input = { firstName: 'Alix', lastName: 'Exemple', birthDate: null };

describe('useMembers, useMember, useEnrollments (EX-03, EX-04, CONV-10)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useMembers charge la liste filtrée', async () => {
    mockMembers.list.mockResolvedValue([]);
    const { result } = await renderHook(() =>
      useMembers({ today: TODAY, query: 'ali', groupId: 3 }),
    );
    await waitFor(() => expect(result.current.members).toEqual([]));
    expect(mockMembers.list).toHaveBeenCalledWith({
      today: TODAY,
      archived: false,
      groupId: 3,
    });
  });

  it('useMemberCreation inscrit au groupe à la date donnée et prévient', async () => {
    mockMembers.create.mockResolvedValue(7);
    const changed = jest.fn();
    const stop = onDataChanged(changed);
    const { result } = await renderHook(() => useMemberCreation(TODAY));
    let id = 0;
    await act(async () => {
      id = await result.current(input, 3, '2026-12-01');
    });
    expect(id).toBe(7);
    expect(mockMembers.create).toHaveBeenCalledWith(input, {
      groupId: 3,
      today: TODAY,
      startDate: '2026-12-01',
    });
    expect(changed).toHaveBeenCalled();
    stop();
  });

  it('useMembers : la recherche filtre en mémoire, sans relire la base ni vider la liste', async () => {
    const alix = { id: 1, firstName: 'Alix', lastName: 'Exemple', archivedAt: null, groups: [] };
    const sam = { id: 2, firstName: 'Sam', lastName: 'Fictif', archivedAt: null, groups: [] };
    mockMembers.list.mockResolvedValue([alix, sam]);
    const { result, rerender } = await renderHook(
      ({ query }: { query: string }) => useMembers({ today: TODAY, query }),
      {
        initialProps: { query: '' },
      },
    );
    await waitFor(() => expect(result.current.members).toHaveLength(2));
    await rerender({ query: 'ali' });
    expect(result.current.members).toEqual([alix]);
    expect(mockMembers.list).toHaveBeenCalledTimes(1);
  });

  it('useMember.deletionImpact rejette (sans lever) quand la base n’est pas prête', async () => {
    mockDbReady = false;
    const { result } = await renderHook(() => useMember(5, TODAY));
    const promise = result.current.deletionImpact();
    await expect(promise).rejects.toMatchObject({ code: 'DB_NOT_READY' });
    mockDbReady = true;
  });

  it('useMembers signale un échec de lecture sans donnée au journal (ABS-04)', async () => {
    mockMembers.list.mockRejectedValue(new Error('Alix Exemple'));
    const { result } = await renderHook(() => useMembers({ today: TODAY }));
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('MEMBERS_LOAD_FAILED', {});
  });

  it('useMember : fiche et groupes, actions puis rechargement ; introuvable distingué', async () => {
    mockMembers.get.mockResolvedValue({ id: 5, ...input, archivedAt: null });
    mockEnrollments.listByMember.mockResolvedValue([
      { enrollmentId: 1, groupId: 3, groupName: 'Poussins', startDate: TODAY },
    ]);
    const { result } = await renderHook(() => useMember(5, TODAY));
    await waitFor(() => expect(result.current.member?.id).toBe(5));
    expect(result.current.groups).toHaveLength(1);
    expect(mockEnrollments.listByMember).toHaveBeenCalledWith(5, TODAY);
    await act(async () => {
      await result.current.update(input);
      await result.current.archive();
      await result.current.unarchive();
      await result.current.remove();
    });
    expect(mockMembers.update).toHaveBeenCalledWith(5, input, TODAY);
    expect(mockMembers.archive).toHaveBeenCalledWith(5, TODAY);
    expect(mockMembers.unarchive).toHaveBeenCalledWith(5);
    expect(mockMembers.remove).toHaveBeenCalledWith(5);
    mockMembers.deletionImpact.mockResolvedValue({ contacts: 2, attendances: 41, enrollments: 1 });
    expect(await result.current.deletionImpact()).toEqual({
      contacts: 2,
      attendances: 41,
      enrollments: 1,
    });

    mockMembers.get.mockResolvedValue(null);
    const missing = await renderHook(() => useMember(9, TODAY));
    await waitFor(() => expect(missing.result.current.loaded).toBe(true));
    expect(missing.result.current.member).toBeNull();
  });

  it('useMember relaie une action refusée et journalise un échec de lecture avec l’identifiant', async () => {
    mockMembers.get.mockResolvedValue({ id: 5, ...input, archivedAt: null });
    mockEnrollments.listByMember.mockResolvedValue([]);
    mockMembers.update.mockRejectedValue({ code: 'NAME_REQUIRED' });
    const { result } = await renderHook(() => useMember(5, TODAY));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await expect(result.current.update({ ...input, firstName: '' })).rejects.toEqual({
      code: 'NAME_REQUIRED',
    });
    mockMembers.get.mockRejectedValue(new Error('BROKEN'));
    const failed = await renderHook(() => useMember(6, TODAY));
    await waitFor(() => expect(failed.result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('MEMBER_LOAD_FAILED', { memberId: 6 });
  });

  it('useMember : retirer d’un groupe, inscrire à un groupe aujourd’hui (EX-04)', async () => {
    mockMembers.get.mockResolvedValue({ id: 7 });
    mockEnrollments.listByMember.mockResolvedValue([]);
    const { result } = await renderHook(() => useMember(7, TODAY));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.withdraw(1, TODAY);
      await result.current.enrollIn(3);
    });
    expect(mockEnrollments.withdraw).toHaveBeenCalledWith(1, TODAY);
    expect(mockEnrollments.enroll).toHaveBeenCalledWith(3, [7], TODAY);
    // Saison pas encore commencée : inscrit à son premier jour.
    mockSeasons.getActive.mockResolvedValue({ startDate: '2027-09-01', endDate: '2028-07-31' });
    await act(async () => {
      await result.current.enrollIn(3);
    });
    expect(mockEnrollments.enroll).toHaveBeenLastCalledWith(3, [7], '2027-09-01');
  });

  it('useEnrollments : inscrits du jour, à venir et candidats du groupe ; inscrire', async () => {
    mockEnrollments.listByGroup.mockResolvedValue([]);
    mockEnrollments.listUpcomingByGroup.mockResolvedValue([]);
    mockEnrollments.candidates.mockResolvedValue([
      { id: 8, firstName: 'Noah', lastName: 'Girard' },
    ]);
    const { result } = await renderHook(() => useEnrollments(3, TODAY));
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    expect(result.current.enrollments).toEqual([]);
    expect(result.current.upcoming).toEqual([]);
    await act(async () => {
      await result.current.enroll([8], TODAY);
    });
    expect(mockEnrollments.enroll).toHaveBeenCalledWith(3, [8], TODAY);
    mockEnrollments.listByGroup.mockRejectedValue(new Error('BROKEN'));
    const failed = await renderHook(() => useEnrollments(4, TODAY));
    await waitFor(() => expect(failed.result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('ENROLLMENTS_LOAD_FAILED', { groupId: 4 });
  });
});
