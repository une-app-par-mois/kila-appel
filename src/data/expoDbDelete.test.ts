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
    mockDelete.mockRejectedValueOnce(
      new Error("Unable to delete the database file for 'kila.db' database"),
    );
    await expect(deleteAppDatabase()).rejects.toThrow();
  });

  // Réponse du porteur du 2026-11-27 : un fichier déjà absent compte comme effacé.
  it.each([
    [
      'Android',
      "Call to function 'ExpoSQLite.deleteDatabaseAsync' has been rejected.\n→ Caused by: Database 'kila.db' not found",
    ],
    ['iOS', 'Database /var/mobile/Containers/Data/x/Documents/SQLite/kila.db not found'],
  ])('fichier déjà absent (%s, DatabaseNotFoundException) : réussite', async (_os, message) => {
    mockDelete.mockRejectedValueOnce(new Error(message));
    await expect(deleteAppDatabase()).resolves.toBeUndefined();
  });

  it('base encore ouverte : échec relayé, pas pris pour un fichier absent', async () => {
    mockDelete.mockRejectedValueOnce(
      new Error(
        "Unable to delete database 'kila.db' that is currently open. Close it prior to deletion.",
      ),
    );
    await expect(deleteAppDatabase()).rejects.toThrow();
  });
});
