// Nettoyage des dossiers temporaires au démarrage (ticket 014c ; revues de sécurité du 014b et du
// 014e) : une fois par processus, sous le verrou commun, jamais pendant une opération en cours.
import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { type FileTask, fileLock } from '@/hooks/fileLock';
import {
  cleanupAtStartup,
  resetStartupCleanupForTests,
  useStartupCleanup,
} from '@/hooks/useStartupCleanup';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const mockClear = {
  sauvegardes: jest.fn(),
  restauration: jest.fn(),
  exports: jest.fn(),
  Print: jest.fn(),
};
const mockClearPicked = jest.fn();
const mockPickerOs = jest.fn();
jest.mock('@/data/expoFiles', () => ({
  expoStorage: (name: 'sauvegardes' | 'restauration' | 'exports') => ({
    clear: () => mockClear[name](),
  }),
  expoPicker: (os: string) => {
    mockPickerOs(os);
    return { clearPicked: () => mockClearPicked() };
  },
}));
// Ticket 040a : PDF laissé par expo-print dans `cache/Print/` après un arrêt brutal (SEC-08, SEC-10).
jest.mock('@/data/expoExports', () => ({ clearPrint: () => mockClear.Print() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const allClears = [
  mockClear.sauvegardes,
  mockClear.restauration,
  mockClear.exports,
  mockClear.Print,
  mockClearPicked,
];

describe('Nettoyage au démarrage (ticket 014c)', () => {
  beforeEach(() => {
    resetStartupCleanupForTests();
    log.mockClear();
    mockPickerOs.mockClear();
    for (const clear of allClears) {
      clear.mockReset();
      clear.mockResolvedValue(undefined);
    }
  });
  afterEach(() => {
    const tasks: FileTask[] = ['export', 'restore', 'cleanup', 'erase', 'import', 'csv', 'report'];
    for (const task of tasks) fileLock.release(task);
  });

  it('SEC-10 vide sauvegardes, restauration, exports (033), Print (040a) et le sélecteur, une fois', async () => {
    await cleanupAtStartup();
    await cleanupAtStartup();
    for (const clear of allClears) expect(clear).toHaveBeenCalledTimes(1);
    expect(mockPickerOs).toHaveBeenCalledWith(Platform.OS);
    expect(log).not.toHaveBeenCalled();
  });

  it('tient le verrou pendant le nettoyage : export et restauration attendent', async () => {
    let finish: () => void = () => undefined;
    mockClearPicked.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
    const running = cleanupAtStartup();
    expect(fileLock.holder()).toBe('cleanup');
    expect(fileLock.acquire('export')).toBe(false);
    expect(fileLock.acquire('restore')).toBe(false);
    for (const task of ['import', 'csv', 'report'] as const) {
      expect(fileLock.acquire(task)).toBe(false);
    }
    finish();
    await running;
    expect(fileLock.holder()).toBeNull();
  });

  it.each(['restore', 'import', 'csv', 'report'] as const)(
    'sauté pendant une opération (%s) : rien n’est vidé, le verrou lui reste',
    async (task) => {
      expect(fileLock.acquire(task)).toBe(true);
      await cleanupAtStartup();
      for (const clear of allClears) expect(clear).not.toHaveBeenCalled();
      expect(fileLock.holder()).toBe(task);
      fileLock.release(task);
    },
  );

  it('un échec écrit STARTUP_CLEANUP_FAILED, les autres dossiers sont vidés, rien ne bloque', async () => {
    mockClear.sauvegardes.mockRejectedValueOnce(new Error('/chemin/privé'));
    mockClearPicked.mockImplementationOnce(() => {
      throw new Error('erreur immédiate');
    });
    await expect(cleanupAtStartup()).resolves.toBeUndefined();
    expect(mockClear.restauration).toHaveBeenCalledTimes(1);
    expect(mockClear.exports).toHaveBeenCalledTimes(1);
    expect(mockClear.Print).toHaveBeenCalledTimes(1);
    // ABS-04 : un code seul.
    expect(log.mock.calls).toEqual([['STARTUP_CLEANUP_FAILED']]);
    expect(fileLock.holder()).toBeNull();
  });

  it('useStartupCleanup rend vrai une fois le nettoyage fini, échec compris', async () => {
    let finish: () => void = () => undefined;
    mockClearPicked.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => (finish = () => reject(new Error('x')))),
    );
    const hook = await renderHook(() => useStartupCleanup());
    expect(hook.result.current).toBe(false);
    await act(async () => finish());
    expect(hook.result.current).toBe(true);
    // Nouveau montage dans le même processus : déjà fini.
    const again = await renderHook(() => useStartupCleanup());
    await act(async () => undefined);
    expect(again.result.current).toBe(true);
  });

  it('useStartupCleanup : vrai aussi quand le nettoyage est sauté (verrou pris)', async () => {
    expect(fileLock.acquire('export')).toBe(true);
    const hook = await renderHook(() => useStartupCleanup());
    await act(async () => undefined);
    expect(hook.result.current).toBe(true);
  });

  it('useStartupCleanup : lancé au montage, une fois même après plusieurs montages', async () => {
    const first = await renderHook(() => useStartupCleanup());
    await first.unmount();
    await renderHook(() => useStartupCleanup());
    for (const clear of allClears) expect(clear).toHaveBeenCalledTimes(1);
  });
});
