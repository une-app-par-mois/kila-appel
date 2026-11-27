/**
 * @jest-environment node
 */
// useRestore, gardes ajoutées après les revues du 014e : verrou commun avec l'export, écran fermé
// pendant la vérification ou la confirmation, échec avant la vérification, refus puis nouvel essai
// aussitôt, fichier trop gros annoncé par le sélecteur. Vrai cycle sur node:fs et node:sqlite.
import { existsSync, readdirSync } from 'node:fs';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { nodePicker, nodeStorage, openNode, tempDir } from '@/__fixtures__/backupFiles';
import { backupFile, dump, refusedFiles } from '@/__fixtures__/restoreFiles';
import { seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import type { BackupStorage, RestoreDeps } from '@/data/expoFiles';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { fileLock } from '@/hooks/fileLock';
import { useBackupExport } from '@/hooks/useBackupExport';
import { useRestore } from '@/hooks/useRestore';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

/** Promesse que le test libère quand il veut. */
const gate = () => {
  let release: () => void = () => undefined;
  const wait = new Promise<void>((resolve) => (release = resolve));
  return { wait, release: () => release() };
};

describe('EX-20 useRestore : gardes', () => {
  let dir: ReturnType<typeof tempDir>;
  let db: Db;
  let picker: ReturnType<typeof nodePicker>;
  let storage: BackupStorage;
  let deps: RestoreDeps;
  const nav = { onCancel: jest.fn(), onDone: jest.fn() };
  const pickedDir = () => dir.path('DocumentPicker');
  const noCopyLeft = () => {
    for (const d of [dir.path('restauration'), pickedDir()]) {
      expect(existsSync(d) ? readdirSync(d) : []).toEqual([]);
    }
  };
  const restored = () => log.mock.calls.some(([code]) => code === 'RESTORE_DONE');
  const start = () => renderHook(() => useRestore(deps, nav));

  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
    dir = tempDir();
    picker = nodePicker(pickedDir());
    storage = nodeStorage(dir.path('restauration'));
    deps = {
      files: { ...storage },
      open: openNode,
      pick: jest.fn(() => picker.pick()),
      removePicked: picker.removePicked,
      clearPicked: picker.clearPicked,
    };
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    nav.onCancel.mockClear();
    nav.onDone.mockClear();
    log.mockClear();
    picker.next = await backupFile(dir.path('choisi.db'));
  });
  afterEach(async () => {
    // Écrans fermés et restauration finie : le verrou du module est rendu avant le test suivant.
    await cleanup();
    await waitFor(() => expect(fileLock.holder()).toBeNull());
    jest.useRealTimers();
    mockDb = null;
    await db.close();
    dir.remove();
  });

  // Revue de sécurité du 014c : le vidage des dossiers se fait sous le verrou de la restauration.
  it('vide les dossiers en tenant le verrou de la restauration, jamais sans lui', async () => {
    const holders: (string | null)[] = [];
    deps.files = {
      ...storage,
      clear: async () => {
        holders.push(fileLock.holder());
        await storage.clear();
      },
    };
    deps.clearPicked = async () => {
      holders.push(fileLock.holder());
      await picker.clearPicked();
    };
    // Base pas encore prête au montage : le vidage attend le verrou, il ne part pas seul.
    mockDb = null;
    const restore = await start();
    await act(async () => undefined);
    mockDb = db;
    await restore.rerender({});
    await waitFor(() => expect(restore.result.current.state.step).toBe('confirm'));
    expect(holders).toEqual(['restore', 'restore']);
  });

  it('verrou pris par le nettoyage au démarrage : rien n’est vidé, l’écran se ferme', async () => {
    const clear = jest.fn(storage.clear);
    deps.files = { ...storage, clear };
    expect(fileLock.acquire('cleanup')).toBe(true);
    await start();
    await waitFor(() => expect(nav.onCancel).toHaveBeenCalledTimes(1));
    expect(clear).not.toHaveBeenCalled();
    fileLock.release('cleanup');
  });

  it('pendant une restauration, l’export ne part pas', async () => {
    const restore = await start();
    await waitFor(() => expect(restore.result.current.state.step).toBe('confirm'));
    expect(fileLock.holder()).toBe('restore');
    const share = jest.fn(async () => undefined);
    const backupDeps = { files: nodeStorage(dir.path('sauvegardes')), share, open: openNode };
    const exporter = await renderHook(() => useBackupExport(backupDeps));
    await act(async () => exporter.result.current.exportNow());
    expect(share).not.toHaveBeenCalled();
    await act(async () => restore.result.current.cancel());
    await waitFor(() => expect(fileLock.holder()).toBeNull());
  });

  it('pendant un export, la restauration ne lance pas le sélecteur', async () => {
    const sharing = gate();
    const share = jest.fn(() => sharing.wait);
    const backupDeps = { files: nodeStorage(dir.path('sauvegardes')), share, open: openNode };
    const exporter = await renderHook(() => useBackupExport(backupDeps));
    let running: Promise<void> = Promise.resolve();
    await act(async () => {
      running = exporter.result.current.exportNow();
    });
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(fileLock.holder()).toBe('export');
    await start();
    await waitFor(() => expect(nav.onCancel).toHaveBeenCalledTimes(1));
    expect(deps.pick).not.toHaveBeenCalled();
    sharing.release();
    await act(() => running);
    expect(fileLock.holder()).toBeNull();
  });

  it('écran fermé pendant la vérification : la restauration ne part jamais', async () => {
    const verifying = gate();
    deps.files.newDir = async () => {
      await verifying.wait;
      return storage.newDir();
    };
    const before = await dump(db);
    const { result, unmount } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('verifying'));
    await unmount();
    verifying.release();
    await waitFor(() => expect(fileLock.holder()).toBeNull());
    expect(restored()).toBe(false);
    expect(await dump(db)).toEqual(before);
    noCopyLeft();
  });

  it('fermeture pendant la confirmation : jamais de restauration, verrou rendu', async () => {
    const before = await dump(db);
    const { result, unmount } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    await unmount();
    await waitFor(() => expect(fileLock.holder()).toBeNull());
    expect(restored()).toBe(false);
    expect(await dump(db)).toEqual(before);
    expect(nav.onDone).not.toHaveBeenCalled();
    expect(nav.onCancel).not.toHaveBeenCalled();
    noCopyLeft();
  });

  it('newDir en échec : copie du sélecteur effacée, « n’a pas abouti », code générique', async () => {
    deps.files.newDir = () => Promise.reject(new Error('disque plein'));
    const { result } = await start();
    await waitFor(() => expect(result.current.state).toEqual({ step: 'failed' }));
    noCopyLeft();
    expect(log).toHaveBeenCalledWith('RESTORE_UNEXPECTED');
  });

  it('refus puis « Choisir un fichier… » aussitôt : le sélecteur repart', async () => {
    picker.next = dir.path('texte.db');
    await refusedFiles['fichier texte'].write(picker.next);
    // Le nettoyage prend un peu de temps : le refus ne s'affiche qu'après lui.
    deps.files.removeDir = async (path) => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return storage.removeDir(path);
    };
    const { result } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('rejected'));
    await act(async () => {
      void result.current.choose();
    });
    await waitFor(() => expect(deps.pick).toHaveBeenCalledTimes(2));
  });

  it('fichier annoncé trop gros par le sélecteur : refus sans copie ni vérification', async () => {
    deps.pick = jest.fn(async () => ({ reason: 'TOO_LARGE' as const }));
    deps.files.newDir = jest.fn(storage.newDir);
    const { result } = await start();
    await waitFor(() =>
      expect(result.current.state).toEqual({ step: 'rejected', reason: 'TOO_LARGE' }),
    );
    expect(deps.files.newDir).not.toHaveBeenCalled();
    expect(fileLock.holder()).toBeNull();
  });
});
