// Nettoyage des dossiers temporaires au démarrage (ticket 014c ; revues de sécurité du 014b et du
// 014e) : une fois par processus, sous le verrou commun, jamais pendant une opération en cours.
import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { fileLock } from '@/hooks/fileLock';
import {
  cleanupAtStartup,
  resetStartupCleanupForTests,
  useStartupCleanup,
} from '@/hooks/useStartupCleanup';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const mockClear = { sauvegardes: jest.fn(), restauration: jest.fn() };
const mockClearPicked = jest.fn();
const mockPickerOs = jest.fn();
jest.mock('@/data/expoFiles', () => ({
  expoStorage: (name: 'sauvegardes' | 'restauration') => ({ clear: () => mockClear[name]() }),
  expoPicker: (os: string) => {
    mockPickerOs(os);
    return { clearPicked: () => mockClearPicked() };
  },
}));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const allClears = [mockClear.sauvegardes, mockClear.restauration, mockClearPicked];

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
    for (const task of ['export', 'restore', 'cleanup'] as const) fileLock.release(task);
  });

  it('vide sauvegardes, restauration et les copies du sélecteur, une fois par processus', async () => {
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
    finish();
    await running;
    expect(fileLock.holder()).toBeNull();
  });

  it('sauté pendant une opération : rien n’est vidé, le verrou reste à l’opération', async () => {
    expect(fileLock.acquire('restore')).toBe(true);
    await cleanupAtStartup();
    for (const clear of allClears) expect(clear).not.toHaveBeenCalled();
    expect(fileLock.holder()).toBe('restore');
  });

  it('un échec écrit STARTUP_CLEANUP_FAILED, les autres dossiers sont vidés, rien ne bloque', async () => {
    mockClear.sauvegardes.mockRejectedValueOnce(new Error('/chemin/privé'));
    mockClearPicked.mockImplementationOnce(() => {
      throw new Error('erreur immédiate');
    });
    await expect(cleanupAtStartup()).resolves.toBeUndefined();
    expect(mockClear.restauration).toHaveBeenCalledTimes(1);
    // ABS-04 : un code seul.
    expect(log.mock.calls).toEqual([['STARTUP_CLEANUP_FAILED']]);
    expect(fileLock.holder()).toBeNull();
  });

  it('useStartupCleanup : lancé au montage, une fois même après plusieurs montages', async () => {
    const first = await renderHook(() => useStartupCleanup());
    await first.unmount();
    await renderHook(() => useStartupCleanup());
    for (const clear of allClears) expect(clear).toHaveBeenCalledTimes(1);
  });
});
