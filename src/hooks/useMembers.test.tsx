import { act, renderHook, waitFor } from '@testing-library/react-native';
import { onDataChanged } from '@/hooks/dataChanged';
import { useEnrollments, useMember, useMembers } from '@/hooks/useMembers';

// La base et les dépôts sont simulés : les dépôts sont testés sur node:sqlite.
const mockDb = { fake: true };
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
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
  candidates: jest.fn(),
  enroll: jest.fn(),
  withdraw: jest.fn(),
};
jest.mock('@/data/membersRepo', () => ({ membersRepo: () => mockMembers }));
jest.mock('@/data/enrollmentsRepo', () => ({ enrollmentsRepo: () => mockEnrollments }));

const TODAY = '2026-11-26';
const input = { firstName: 'Alix', lastName: 'Exemple', birthDate: null };

describe('useMembers, useMember, useEnrollments (EX-03, EX-04, CONV-10)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useMembers charge la liste filtrée ; create inscrit au groupe à la date du jour et prévient', async () => {
    mockMembers.list.mockResolvedValue([]);
    mockMembers.create.mockResolvedValue(7);
    const changed = jest.fn();
    const stop = onDataChanged(changed);
    const { result } = await renderHook(() =>
      useMembers({ today: TODAY, query: 'ali', groupId: 3 }),
    );
    await waitFor(() => expect(result.current.members).toEqual([]));
    expect(mockMembers.list).toHaveBeenCalledWith({
      today: TODAY,
      archived: false,
      groupId: 3,
      query: 'ali',
    });
    let id = 0;
    await act(async () => {
      id = await result.current.create(input, 3);
    });
    expect(id).toBe(7);
    expect(mockMembers.create).toHaveBeenCalledWith(input, { groupId: 3, today: TODAY });
    expect(changed).toHaveBeenCalled();
    stop();
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

  it('useEnrollments : inscriptions et candidats du groupe ; inscrire, retirer', async () => {
    mockEnrollments.listByGroup.mockResolvedValue([]);
    mockEnrollments.candidates.mockResolvedValue([
      { id: 8, firstName: 'Noah', lastName: 'Girard' },
    ]);
    const { result } = await renderHook(() => useEnrollments(3, TODAY));
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    expect(result.current.enrollments).toEqual([]);
    await act(async () => {
      await result.current.enroll([8], TODAY);
      await result.current.withdraw(1, TODAY);
    });
    expect(mockEnrollments.enroll).toHaveBeenCalledWith(3, [8], TODAY);
    expect(mockEnrollments.withdraw).toHaveBeenCalledWith(1, TODAY);
    mockEnrollments.listByGroup.mockRejectedValue(new Error('BROKEN'));
    const failed = await renderHook(() => useEnrollments(4, TODAY));
    await waitFor(() => expect(failed.result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('ENROLLMENTS_LOAD_FAILED', { groupId: 4 });
  });
});
