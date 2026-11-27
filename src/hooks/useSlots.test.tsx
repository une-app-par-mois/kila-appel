import { act, renderHook, waitFor } from '@testing-library/react-native';
import { onDataChanged } from '@/hooks/dataChanged';
import { useSlot, useSlots } from '@/hooks/useSlots';

// La base et le dépôt sont simulés : le dépôt est testé sur node:sqlite.
const mockDb = { fake: true };
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const mockSlots = {
  listBySeason: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};
jest.mock('@/data/slotsRepo', () => ({ slotsRepo: () => mockSlots }));

const TODAY = '2026-11-27';
const input = {
  weekday: 3,
  startTime: '14:00',
  durationMin: 90,
  place: null,
  name: null,
  groupId: 2,
};

describe('useSlots, useSlot (EX-07, CONV-10)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('liste les créneaux de la saison ; créer prévient les écrans ouverts', async () => {
    mockSlots.listBySeason.mockResolvedValue([]);
    mockSlots.create.mockResolvedValue(5);
    const changed = jest.fn();
    const stop = onDataChanged(changed);
    const { result } = await renderHook(() => useSlots(1));
    await waitFor(() => expect(result.current.slots).toEqual([]));
    expect(mockSlots.listBySeason).toHaveBeenCalledWith(1);
    let id = 0;
    await act(async () => {
      id = await result.current.create(input, TODAY);
    });
    expect(id).toBe(5);
    expect(mockSlots.create).toHaveBeenCalledWith(1, input, TODAY);
    expect(changed).toHaveBeenCalled();
    stop();
  });

  it('sans saison active : rien n’est lu, créer est refusé', async () => {
    const { result } = await renderHook(() => useSlots(null));
    expect(result.current.slots).toBeNull();
    expect(mockSlots.listBySeason).not.toHaveBeenCalled();
    await expect(result.current.create(input, TODAY)).rejects.toMatchObject({
      code: 'DB_NOT_READY',
    });
  });

  it('lecture en échec : signalée, journal sans donnée (ABS-04)', async () => {
    mockSlots.listBySeason.mockRejectedValue(new Error('Gymnase'));
    const { result } = await renderHook(() => useSlots(1));
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(log).toHaveBeenCalledWith('SLOTS_LOAD_FAILED', { seasonId: 1 });
  });

  it('un créneau : modifier et supprimer', async () => {
    mockSlots.get.mockResolvedValue({ id: 7 });
    const { result } = await renderHook(() => useSlot(7));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.slot).toEqual({ id: 7 });
    await act(async () => {
      await result.current.update(input, TODAY);
      await result.current.remove();
    });
    expect(mockSlots.update).toHaveBeenCalledWith(7, input, TODAY);
    expect(mockSlots.remove).toHaveBeenCalledWith(7);
  });
});
