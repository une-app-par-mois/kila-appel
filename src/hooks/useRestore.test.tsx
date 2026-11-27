/**
 * @jest-environment node
 */
// useRestore (ticket 014e, EX-20, NF-04, SEC-10 ; zone sensible) : vrai cycle sur node:fs et
// node:sqlite, sélecteur imité (copie dans un dossier « DocumentPicker »). Horloge figée au
// 27/11/2026. B2 (ticket 028c) : relances affichées retirées après une restauration réussie.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { nodePicker, nodeStorage, openNode, tempDir } from '@/__fixtures__/backupFiles';
import { backupFile, dump, refusedFiles, rowCounts } from '@/__fixtures__/restoreFiles';
import { seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import type { BackupStorage, RestoreDeps } from '@/data/expoFiles';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { onDataChanged } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { useRestore } from '@/hooks/useRestore';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
jest.mock('@/data/expoNotifications', () => ({
  cancelAllReminders: jest.fn(async () => true),
  dismissAllReminders: jest.fn(async () => {}),
}));
const { cancelAllReminders: cancel, dismissAllReminders: dismiss } = jest.requireMock(
  '@/data/expoNotifications',
) as { cancelAllReminders: jest.Mock; dismissAllReminders: jest.Mock };

describe('EX-20 useRestore', () => {
  let dir: ReturnType<typeof tempDir>;
  let db: Db;
  let picker: ReturnType<typeof nodePicker>;
  let files: BackupStorage;
  let deps: RestoreDeps;
  const nav = { onCancel: jest.fn(), onDone: jest.fn() };
  const restoreDir = () => dir.path('restauration');
  const pickedDir = () => dir.path('DocumentPicker');
  /** Plus aucune copie : ni celle du sélecteur, ni la copie vérifiée (-wal, -shm, -journal). */
  const noCopyLeft = () => {
    for (const d of [restoreDir(), pickedDir()]) {
      expect(existsSync(d) ? readdirSync(d) : []).toEqual([]);
    }
  };
  const start = () => renderHook(() => useRestore(deps, nav));

  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
    dir = tempDir();
    picker = nodePicker(pickedDir());
    const storage = nodeStorage(restoreDir());
    files = { ...storage, clear: jest.fn(storage.clear), newDir: jest.fn(storage.newDir) };
    deps = {
      files,
      open: openNode,
      pick: jest.fn(() => picker.pick()),
      removePicked: picker.removePicked,
      clearPicked: jest.fn(picker.clearPicked),
    };
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    nav.onCancel.mockClear();
    nav.onDone.mockClear();
    log.mockClear();
    dismiss.mockClear();
    cancel.mockClear();
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

  it.each(Object.entries(refusedFiles))('refuse %s, données intactes', async (_, file) => {
    picker.next = dir.path('choisi.db');
    await file.write(picker.next);
    const before = await dump(db);
    const { result } = await start();
    await waitFor(() =>
      expect(result.current.state).toEqual({ step: 'rejected', reason: file.reason }),
    );
    expect(await dump(db)).toEqual(before);
    noCopyLeft();
  });

  it('résume la sauvegarde ; sans appel en cours, pas de brouillon annoncé', async () => {
    await db.execute('DELETE FROM roll_call_drafts');
    picker.next = await backupFile(dir.path('choisi.db'));
    const { result } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    expect(result.current.state).toEqual({
      step: 'confirm',
      summary: { members: 3, groups: 2, recordedSessions: 1, backupDate: '2026-10-22' },
      draft: null,
    });
    // La copie du sélecteur est effacée dès la vérification ; la copie vérifiée attend.
    expect(readdirSync(pickedDir())).toEqual([]);
    expect(readdirSync(restoreDir())).toHaveLength(1);
    expect(log).toHaveBeenCalledWith('RESTORE_PICKED');
  });

  // Le jeu fictif a un appel en cours, sur le groupe Poussins.
  it('annonce l’appel en cours et son groupe', async () => {
    picker.next = await backupFile(dir.path('choisi.db'));
    const { result } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    expect(result.current.state).toMatchObject({ draft: { groupName: 'Poussins' } });
  });

  it('annonce l’appel en cours sans groupe (groupe supprimé depuis)', async () => {
    await db.execute('DELETE FROM roll_call_draft_groups');
    picker.next = await backupFile(dir.path('choisi.db'));
    const { result } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    expect(result.current.state).toMatchObject({ draft: { groupName: null } });
  });

  it('remplace les données par celles de la sauvegarde, puis prévient et part', async () => {
    const backup = await backupFile(dir.path('choisi.db'));
    const saved = openNodeDb(backup);
    const expected = await dump(saved);
    await saved.close();
    picker.next = backup;
    // B2 : relances annulées puis retirées une fois, sous le verrou, avant que les écrans ne
    // relisent.
    const order: string[] = [];
    cancel.mockImplementation(async () => order.push(`annulation ${fileLock.holder()}`));
    dismiss.mockImplementation(async () => {
      order.push(`retrait ${fileLock.holder()}`);
    });
    const changed = jest.fn(() => order.push('relecture'));
    const off = onDataChanged(changed);
    const { result } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    expect(dismiss).not.toHaveBeenCalled();
    await act(async () => result.current.confirm());
    await waitFor(() => expect(nav.onDone).toHaveBeenCalledTimes(1));
    off();
    expect(await dump(db)).toEqual(expected);
    expect(order).toEqual(['annulation restore', 'retrait restore', 'relecture']);
    expect(nav.onCancel).not.toHaveBeenCalled();
    noCopyLeft();
  });

  it.each([
    ['Annuler', 'cancel'],
    ['le démontage (retour)', 'unmount'],
  ])('%s pendant la confirmation : copies effacées, données intactes', async (_, how) => {
    picker.next = await backupFile(dir.path('choisi.db'));
    const before = await dump(db);
    const { result, unmount } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    if (how === 'cancel') await act(async () => result.current.cancel());
    else await unmount();
    await waitFor(noCopyLeft);
    expect(await dump(db)).toEqual(before);
    expect(nav.onDone).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('RESTORE_CANCELLED');
  });

  it('échec de la restauration : rien ne change, message, copies effacées', async () => {
    picker.next = await backupFile(dir.path('choisi.db'));
    const before = await rowCounts(db);
    // L'écriture de la dernière table échoue : toute la transaction est annulée.
    mockDb = {
      ...db,
      transaction: (work) =>
        db.transaction((tx) =>
          work({
            ...tx,
            execute: (sql, params) =>
              /^INSERT INTO main\."settings"/.test(sql)
                ? Promise.reject(new Error('disque plein'))
                : tx.execute(sql, params),
          }),
        ),
    };
    const { result } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    await act(async () => result.current.confirm());
    await waitFor(() => expect(result.current.state).toEqual({ step: 'failed' }));
    expect(await rowCounts(db)).toEqual(before);
    expect(nav.onDone).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    noCopyLeft();
  });

  it('sélecteur annulé : retour, rien n’est créé', async () => {
    picker.next = null;
    await start();
    await waitFor(() => expect(nav.onCancel).toHaveBeenCalledTimes(1));
    expect(files.newDir).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('RESTORE_CANCELLED');
  });

  it('sélecteur en échec : « n’a pas abouti »', async () => {
    deps.pick = jest.fn(() => Promise.reject(new Error('sélecteur')));
    const { result } = await start();
    await waitFor(() => expect(result.current.state).toEqual({ step: 'failed' }));
    expect(log).toHaveBeenCalledWith('RESTORE_PICK_FAILED');
  });

  it('après un refus, « Choisir un fichier… » relance le sélecteur', async () => {
    picker.next = dir.path('texte.db');
    await refusedFiles['fichier texte'].write(picker.next);
    const { result } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('rejected'));
    picker.next = await backupFile(dir.path('choisi.db'));
    // choose() se termine avec la décision : on ne l'attend pas.
    await act(async () => {
      void result.current.choose();
    });
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    expect(deps.pick).toHaveBeenCalledTimes(2);
  });

  it('double appui : un seul sélecteur, une seule restauration', async () => {
    picker.next = await backupFile(dir.path('choisi.db'));
    const { result } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    await act(async () => {
      void result.current.choose();
      void result.current.choose();
      result.current.confirm();
      result.current.confirm();
    });
    await waitFor(() => expect(nav.onDone).toHaveBeenCalledTimes(1));
    expect(deps.pick).toHaveBeenCalledTimes(1);
    expect(nav.onCancel).not.toHaveBeenCalled();
    expect(log.mock.calls.filter(([code]) => code === 'RESTORE_DONE')).toHaveLength(1);
  });

  it('vide les deux dossiers au montage, mais jamais pendant une restauration', async () => {
    mkdirSync(join(restoreDir(), 'ancien'), { recursive: true });
    writeFileSync(join(restoreDir(), 'ancien', 'restauration.db'), 'reste');
    mkdirSync(pickedDir(), { recursive: true });
    writeFileSync(join(pickedDir(), 'ancien.db'), 'reste');
    picker.next = await backupFile(dir.path('choisi.db'));
    const first = await start();
    await waitFor(() => expect(first.result.current.state.step).toBe('confirm'));
    expect(existsSync(join(restoreDir(), 'ancien'))).toBe(false);
    expect(existsSync(join(pickedDir(), 'ancien.db'))).toBe(false);
    expect(files.clear).toHaveBeenCalledTimes(1);
    // Un second écran pendant la confirmation : il ne vide rien et ne lance pas de sélecteur.
    const second = await start();
    await waitFor(() => expect(nav.onCancel).toHaveBeenCalledTimes(1));
    expect(files.clear).toHaveBeenCalledTimes(1);
    expect(deps.clearPicked).toHaveBeenCalledTimes(1);
    expect(deps.pick).toHaveBeenCalledTimes(1);
    await second.unmount();
    await act(async () => first.result.current.confirm());
    await waitFor(() => expect(nav.onDone).toHaveBeenCalledTimes(1));
    expect(await rowCounts(db)).toMatchObject({ members: 3 });
  });

  it('écran fermé pendant la restauration : elle se termine, sans navigation', async () => {
    picker.next = await backupFile(dir.path('choisi.db'));
    // La restauration attend `release()` avant d'attacher la copie.
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockDb = {
      ...db,
      execute: (sql, params) =>
        /^ATTACH/.test(sql) ? gate.then(() => db.execute(sql, params)) : db.execute(sql, params),
    };
    const changed = jest.fn();
    const off = onDataChanged(changed);
    const { result, unmount } = await start();
    await waitFor(() => expect(result.current.state.step).toBe('confirm'));
    await act(async () => result.current.confirm());
    await waitFor(() => expect(result.current.state.step).toBe('restoring'));
    await unmount();
    release();
    await waitFor(() => expect(changed).toHaveBeenCalled());
    off();
    expect(nav.onDone).not.toHaveBeenCalled();
    await waitFor(noCopyLeft);
  });
});
