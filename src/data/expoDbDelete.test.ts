/**
 * @jest-environment node
 */
// EX-22 « Repartir de zéro » (ticket 014c) : la base de l'appli est supprimée par expo-sqlite, qui
// efface aussi ses fichiers `-journal`, `-wal` et `-shm` (code natif d'expo-sqlite 58, relu).
import { deleteAppDatabase } from '@/data/expoDb';

const mockDelete = jest.fn(async (_name: string, _directory?: string) => undefined);
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
  deleteDatabaseAsync: (name: string, directory?: string) => mockDelete(name, directory),
}));

describe('EX-22 deleteAppDatabase', () => {
  beforeEach(() => mockDelete.mockClear());

  it('supprime kila.db, la base de l’appli, dans son dossier par défaut', async () => {
    await deleteAppDatabase();
    expect(mockDelete).toHaveBeenCalledWith('kila.db', undefined);
  });

  it('relaie l’échec de la suppression', async () => {
    mockDelete.mockRejectedValueOnce(new Error('Unable to delete'));
    await expect(deleteAppDatabase()).rejects.toThrow();
  });
});
