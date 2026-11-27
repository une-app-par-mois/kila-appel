/**
 * @jest-environment node
 */
// Verrou commun à l'export et à la restauration (ticket 014e, revue de sécurité) : une opération
// ne rend jamais le verrou d'une autre.
import { fileLock } from '@/hooks/fileLock';

describe('fileLock : une seule opération sur les fichiers à la fois', () => {
  afterEach(() => {
    fileLock.release('export');
    fileLock.release('restore');
    fileLock.release('erase');
  });

  it('release(export) pendant que la restauration tient le verrou : il reste pris', () => {
    expect(fileLock.acquire('restore')).toBe(true);
    fileLock.release('export');
    expect(fileLock.holder()).toBe('restore');
    expect(fileLock.acquire('export')).toBe(false);
    fileLock.release('restore');
    expect(fileLock.holder()).toBeNull();
    expect(fileLock.acquire('export')).toBe(true);
  });

  it('une opération ne prend pas deux fois le verrou', () => {
    expect(fileLock.acquire('export')).toBe(true);
    expect(fileLock.acquire('export')).toBe(false);
    expect(fileLock.acquire('restore')).toBe(false);
  });

  it('015b la purge prend le même verrou : ni export ni restauration pendant, ni l’inverse', () => {
    expect(fileLock.acquire('erase')).toBe(true);
    expect(fileLock.acquire('export')).toBe(false);
    expect(fileLock.acquire('restore')).toBe(false);
    fileLock.release('erase');
    expect(fileLock.acquire('restore')).toBe(true);
    expect(fileLock.acquire('erase')).toBe(false);
  });
});
