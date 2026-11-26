import { renderHook, waitFor } from '@testing-library/react-native';
import type { Db } from '@/data/db';
import { useDatabase } from '@/hooks/useDatabase';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('@/data/expoDb', () => ({ openExpoDb: jest.fn() }));
// La vraie ouverture (migration, DB_READY) est testée sur node:sqlite : src/data/open.test.ts.
jest.mock('@/data/open', () => ({ openAppDatabase: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const { openAppDatabase } = jest.requireMock('@/data/open') as { openAppDatabase: jest.Mock };

const fakeDb = { query: jest.fn() } as unknown as Db;
const open = async () => fakeDb;

describe('useDatabase : base ouverte au démarrage (ADR-008)', () => {
  beforeEach(() => {
    log.mockClear();
    openAppDatabase.mockReset();
  });

  it('rend la base une fois prête', async () => {
    openAppDatabase.mockResolvedValue(fakeDb);
    const { result } = await renderHook(() => useDatabase(open));
    await waitFor(() => expect(result.current).toBe(fakeDb));
    expect(openAppDatabase).toHaveBeenCalledWith(open);
  });

  it('écrit DB_OPEN_FAILED dans le journal, sans détail, si l’ouverture échoue', async () => {
    openAppDatabase.mockRejectedValue(new Error('fichier illisible'));
    const { result } = await renderHook(() => useDatabase(open));
    await waitFor(() => expect(log).toHaveBeenCalledWith('DB_OPEN_FAILED'));
    expect(result.current).toBeNull();
  });
});
