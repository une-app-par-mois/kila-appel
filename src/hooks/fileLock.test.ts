/**
 * @jest-environment node
 */
// Verrou commun aux opérations sur les fichiers (tickets 014e, 015b, 014c, 033) : une seule à la
// fois, et une opération ne rend jamais le verrou d'une autre.
import { type FileTask, fileLock } from '@/hooks/fileLock';

const TASKS: FileTask[] = ['export', 'restore', 'cleanup', 'erase', 'import', 'csv', 'report'];
const PAIRS = TASKS.flatMap((first) => TASKS.map((second) => [first, second] as const));

describe('fileLock : une seule opération sur les fichiers à la fois', () => {
  afterEach(() => {
    for (const task of TASKS) fileLock.release(task);
  });

  it.each(PAIRS)('%s tient le verrou : %s ne le prend pas ni ne le rend', (first, second) => {
    expect(fileLock.acquire(first)).toBe(true);
    expect(fileLock.acquire(second)).toBe(false);
    if (second !== first) fileLock.release(second);
    expect(fileLock.holder()).toBe(first);
    fileLock.release(first);
    expect(fileLock.holder()).toBeNull();
    expect(fileLock.acquire(second)).toBe(true);
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
});

describe('033 fileLock.run : verrou pris pendant le travail, rendu même après une erreur', () => {
  afterEach(() => {
    for (const task of TASKS) fileLock.release(task);
  });

  it.each(TASKS)('%s : tenu pendant le travail, rendu à la fin', async (task) => {
    const seen: (FileTask | null)[] = [];
    const result = await fileLock.run(task, async () => {
      seen.push(fileLock.holder());
      return 42;
    });
    expect(result).toEqual({ ran: true, value: 42 });
    expect(seen).toEqual([task]);
    expect(fileLock.holder()).toBeNull();
  });

  it.each(TASKS)('%s : rendu après une erreur, l’erreur remonte', async (task) => {
    await expect(
      fileLock.run(task, async () => {
        throw new Error('panne');
      }),
    ).rejects.toThrow('panne');
    expect(fileLock.holder()).toBeNull();
  });

  it.each(TASKS)('%s : rendu après une erreur immédiate (avant toute promesse)', async (task) => {
    await expect(
      fileLock.run(task, () => {
        throw new Error('immédiate');
      }),
    ).rejects.toThrow('immédiate');
    expect(fileLock.holder()).toBeNull();
  });

  it.each(PAIRS)('%s en cours : %s n’est pas lancé, le verrou reste au premier', async (a, b) => {
    expect(fileLock.acquire(a)).toBe(true);
    const work = jest.fn(async () => undefined);
    expect(await fileLock.run(b, work)).toEqual({ ran: false });
    expect(work).not.toHaveBeenCalled();
    expect(fileLock.holder()).toBe(a);
  });
});
