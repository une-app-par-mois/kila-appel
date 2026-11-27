/**
 * @jest-environment node
 */
// useBackupExport (ticket 014b, revue de code et de sécurité) : un seul export à la fois, vidage
// du dossier une fois par montage et jamais pendant un export, date notée à part. Vrai cycle sur
// node:fs et node:sqlite ; le partage est imité.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { nodeStorage, openNode, tempDir } from '@/__fixtures__/backupFiles';
import { seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import type { BackupDeps, BackupStorage } from '@/data/expoFiles';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { settingsRepo } from '@/data/settingsRepo';
import { onDataChanged } from '@/hooks/dataChanged';
import { useBackupExport } from '@/hooks/useBackupExport';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

/** Partage qui attend `finish()` : la feuille du système reste ouverte jusque-là. */
const pendingShare = () => {
  let finish: () => void = () => undefined;
  const shared: string[] = [];
  const share = jest.fn(
    (path: string) =>
      new Promise<void>((resolve) => {
        shared.push(path);
        finish = resolve;
      }),
  );
  return { share, shared, finish: () => finish() };
};

describe('useBackupExport', () => {
  let dir: ReturnType<typeof tempDir>;
  let backups: string;
  let files: BackupStorage;
  let db: Db;
  const depsWith = (share: BackupDeps['share']): BackupDeps => ({ files, share, open: openNode });

  beforeEach(async () => {
    dir = tempDir();
    backups = dir.path('sauvegardes');
    const storage = nodeStorage(backups);
    files = { ...storage, clear: jest.fn(storage.clear), newDir: jest.fn(storage.newDir) };
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    log.mockClear();
  });
  afterEach(async () => {
    mockDb = null;
    await db.close();
    dir.remove();
  });

  it('vide le dossier une fois par montage, même si `deps` change d’identité', async () => {
    const share = jest.fn(async () => undefined);
    const { rerender, unmount } = await renderHook(
      ({ deps }: { deps: BackupDeps }) => useBackupExport(deps),
      {
        initialProps: { deps: depsWith(share) },
      },
    );
    await rerender({ deps: depsWith(share) });
    await rerender({ deps: depsWith(share) });
    await waitFor(() => expect(files.clear).toHaveBeenCalledTimes(1));
    await unmount();
  });

  it('un second écran monté pendant un partage ne vide pas le dossier', async () => {
    const { share, shared, finish } = pendingShare();
    const first = await renderHook(() => useBackupExport(depsWith(share)));
    await waitFor(() => expect(files.clear).toHaveBeenCalledTimes(1));
    let running: Promise<void> = Promise.resolve();
    await act(async () => {
      running = first.result.current.exportNow();
    });
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const second = await renderHook(() => useBackupExport(depsWith(share)));
    await act(async () => undefined);
    expect(files.clear).toHaveBeenCalledTimes(1);
    expect(existsSync(shared[0] ?? '')).toBe(true);
    // Le second écran ne lance pas d'autre export pendant ce temps.
    await act(() => second.result.current.exportNow());
    expect(share).toHaveBeenCalledTimes(1);
    finish();
    await act(() => running);
    expect(existsSync(shared[0] ?? '')).toBe(false);
    await first.unmount();
    await second.unmount();
  });

  it('deux appels directs de exportNow : un seul export', async () => {
    const { share, finish } = pendingShare();
    const { result, unmount } = await renderHook(() => useBackupExport(depsWith(share)));
    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.exportNow();
      second = result.current.exportNow();
    });
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    finish();
    await act(async () => {
      await Promise.all([first, second]);
    });
    expect(share).toHaveBeenCalledTimes(1);
    expect(files.newDir).toHaveBeenCalledTimes(1);
    await unmount();
  });

  it('l’export attend la fin du vidage du dossier avant d’y écrire', async () => {
    mkdirSync(join(backups, 'ancien'), { recursive: true });
    writeFileSync(join(backups, 'ancien', 'reste.db'), 'x');
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const realClear = files.clear;
    files.clear = jest.fn(async () => {
      await gate;
      await realClear();
    });
    const share = jest.fn(async (path: string) => {
      expect(existsSync(path)).toBe(true);
    });
    const { result, unmount } = await renderHook(() => useBackupExport(depsWith(share)));
    let running: Promise<void> = Promise.resolve();
    await act(async () => {
      running = result.current.exportNow();
    });
    await act(async () => undefined);
    expect(files.newDir).not.toHaveBeenCalled();
    release();
    await act(() => running);
    expect(share).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalledWith('BACKUP_EXPORT_FAILED');
    expect(result.current.failed).toBe(false);
    await unmount();
  });

  it('après un partage réussi, un échec de la date n’annonce pas un export raté', async () => {
    mockDb = {
      ...db,
      execute: (sql, params) =>
        /^INSERT INTO settings/.test(sql)
          ? Promise.reject(new Error('disque plein'))
          : db.execute(sql, params),
    };
    const share = jest.fn(async () => undefined);
    const { result, unmount } = await renderHook(() => useBackupExport(depsWith(share)));
    await act(() => result.current.exportNow());
    expect(share).toHaveBeenCalledTimes(1);
    expect(result.current.failed).toBe(false);
    expect(log).toHaveBeenCalledWith('LAST_BACKUP_SAVE_FAILED');
    expect(log).not.toHaveBeenCalledWith('BACKUP_EXPORT_FAILED');
    await unmount();
  });

  it('un rechargement qui échoue après la date notée n’annonce pas un export raté', async () => {
    const stop = onDataChanged(() => {
      throw new Error('écran en erreur');
    });
    const share = jest.fn(async () => undefined);
    const { result, unmount } = await renderHook(() => useBackupExport(depsWith(share)));
    await act(() => result.current.exportNow());
    stop();
    expect(result.current.failed).toBe(false);
    expect(await settingsRepo(db).lastBackupDate()).not.toBeNull();
    expect(log).toHaveBeenCalledWith('LAST_BACKUP_SAVE_FAILED');
    await unmount();
  });
});
