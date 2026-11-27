/**
 * @jest-environment node
 */
// useBackupExport, vidage de cache/sauvegardes/ (ticket 014g, SEC-10) : au début de chaque export,
// sous le verrou commun ('export'), avant le sous-dossier neuf ; jamais au montage ni pendant une
// autre tâche du verrou ; un échec du vidage est journalisé sans empêcher le partage.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, renderHook } from '@testing-library/react-native';
import { nodeStorage, openNode, tempDir } from '@/__fixtures__/backupFiles';
import { seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import type { BackupDeps, BackupStorage } from '@/data/expoFiles';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { type FileTask, fileLock } from '@/hooks/fileLock';
import { useBackupExport } from '@/hooks/useBackupExport';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

describe('useBackupExport : vidage sous le verrou (SEC-10)', () => {
  let dir: ReturnType<typeof tempDir>;
  let backups: string;
  let files: BackupStorage;
  let db: Db;
  // Ordre des appels et tenant du verrou au moment du vidage.
  let calls: string[];
  let holders: (FileTask | null)[];
  const share = jest.fn(async (path: string) => {
    calls.push('share');
    expect(existsSync(path)).toBe(true);
  });
  const deps = (): BackupDeps => ({ files, share, open: openNode });

  beforeEach(async () => {
    dir = tempDir();
    backups = dir.path('sauvegardes');
    const storage = nodeStorage(backups);
    calls = [];
    holders = [];
    files = {
      ...storage,
      clear: jest.fn(async () => {
        calls.push('clear');
        holders.push(fileLock.holder());
        await storage.clear();
      }),
      newDir: jest.fn(async () => {
        calls.push('newDir');
        return storage.newDir();
      }),
    };
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    log.mockClear();
    share.mockClear();
  });
  afterEach(async () => {
    mockDb = null;
    await db.close();
    dir.remove();
  });

  it('SEC-10 : vidage une fois par export, verrou tenu par l’export, avant newDir', async () => {
    mkdirSync(join(backups, 'ancien'), { recursive: true });
    writeFileSync(join(backups, 'ancien', 'reste.db'), 'x');
    const { result, unmount } = await renderHook(() => useBackupExport(deps()));
    await act(() => result.current.exportNow());
    expect(holders).toEqual(['export']);
    expect(calls).toEqual(['clear', 'newDir', 'share']);
    expect(existsSync(join(backups, 'ancien'))).toBe(false);
    await act(() => result.current.exportNow());
    expect(files.clear).toHaveBeenCalledTimes(2);
    expect(holders).toEqual(['export', 'export']);
    expect(fileLock.holder()).toBeNull();
    await unmount();
  });

  it.each<FileTask>(['restore', 'erase', 'cleanup'])(
    'SEC-10 : pendant « %s », ni le montage ni exportNow ne vident le dossier',
    async (task) => {
      mkdirSync(join(backups, 'en-cours'), { recursive: true });
      writeFileSync(join(backups, 'en-cours', 'copie.db'), 'x');
      expect(fileLock.acquire(task)).toBe(true);
      try {
        const { result, unmount } = await renderHook(() => useBackupExport(deps()));
        await act(async () => undefined);
        await act(() => result.current.exportNow());
        expect(files.clear).not.toHaveBeenCalled();
        expect(files.newDir).not.toHaveBeenCalled();
        expect(share).not.toHaveBeenCalled();
        expect(existsSync(join(backups, 'en-cours', 'copie.db'))).toBe(true);
        await unmount();
      } finally {
        fileLock.release(task);
      }
    },
  );

  it.each([
    ['un rejet', () => Promise.reject(new Error('disque'))],
    [
      'une exception immédiate',
      () => {
        throw new Error('disque');
      },
    ],
  ])(
    'SEC-10 : un vidage en échec par %s est journalisé et le partage a lieu',
    async (_label, fail) => {
      files.clear = jest.fn(fail as () => Promise<void>);
      const { result, unmount } = await renderHook(() => useBackupExport(deps()));
      await act(() => result.current.exportNow());
      expect(log).toHaveBeenCalledWith('BACKUP_CLEAR_FAILED');
      expect(share).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith('BACKUP_SHARED');
      expect(log).not.toHaveBeenCalledWith('BACKUP_EXPORT_FAILED');
      expect(result.current.failed).toBe(false);
      expect(fileLock.holder()).toBeNull();
      await unmount();
    },
  );
});
