/**
 * @jest-environment node
 */
// useMemberImport (ticket 034, EX-30, SEC-06, SEC-10, SEC-12 ; zone sensible) : vrai adaptateur
// (expoFiles.ts) sur des modules natifs imités (node:fs, src/__fixtures__/expoModules.ts), vraie
// base node:sqlite. Rien n'est écrit avant `confirm` ; verrou commun ; copie du sélecteur effacée ;
// session en mémoire vidée à l'abandon et après Tout effacer ; journal sans nom. Données fictives.
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { membersMacRoman, membersUtf8Bom, oversizeFile } from '@/__fixtures__/csvFiles';
import { type ImportDb, importDb } from '@/__fixtures__/importDb';
import { MOCKUP_ROWS } from '@/__fixtures__/importRows';
import { dump } from '@/__fixtures__/restoreFiles';
import { count } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { notifyDataErased, onDataChanged } from '@/hooks/dataChanged';
import { type FileTask, fileLock } from '@/hooks/fileLock';
import { importSession } from '@/hooks/importSession';
import { useMemberImport } from '@/hooks/useMemberImport';

let mockDb: Db | null = null;
let mockChoice: () => string | null = () => null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => require('@/__fixtures__/expoModules').fakeFileSystem());
jest.mock('expo-document-picker', () => {
  const { join: joinPath } = require('node:path');
  const fs = jest.requireMock('expo-file-system') as { Paths: { root: string } };
  return require('@/__fixtures__/expoModules').fakeDocumentPicker(
    () => joinPath(fs.Paths.root, 'cache dir'),
    () => mockChoice(),
    () => undefined,
    undefined,
    () => undefined,
    () => 'Dupont-Lea.csv',
  );
});
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const fsMock = jest.requireMock('expo-file-system') as {
  Paths: { root: string };
  File: { prototype: { open(): unknown } };
};
const cache = join(fsMock.Paths.root, 'cache dir');
const picked = join(cache, 'DocumentPicker');
const sources = join(fsMock.Paths.root, 'telechargements');
const TODAY = new Date(2026, 10, 28, 18, 0);

const mockupBytes = () =>
  new TextEncoder().encode(`${MOCKUP_ROWS.map((r) => r.cells.join(';')).join('\r\n')}\r\n`);
/** Le fichier que l'encadrant choisira. */
const willChoose = (bytes: Uint8Array) => {
  const path = join(sources, 'membres.csv');
  writeFileSync(path, bytes);
  mockChoice = () => path;
};
const noCopyLeft = () => expect(existsSync(picked) ? readdirSync(picked) : []).toEqual([]);
const start = (owner = false) => renderHook(() => useMemberImport('android', { owner }));

let base: ImportDb;
beforeEach(async () => {
  jest.useFakeTimers({ advanceTimers: true, now: TODAY });
  mkdirSync(sources, { recursive: true });
  base = await importDb();
  mockDb = base.db;
  willChoose(mockupBytes());
  log.mockClear();
});
afterEach(async () => {
  await cleanup();
  importSession.clear();
  jest.restoreAllMocks();
  jest.useRealTimers();
  mockDb = null;
  await base.db.close();
  rmSync(cache, { recursive: true, force: true });
});

/** Choisit le fichier et attend la fin de la lecture. */
const chosen = async (owner = false) => {
  const hook = await start(owner);
  await act(() => hook.result.current.choose());
  return hook;
};

describe('EX-30 choose : lecture et aperçu, rien d’écrit', () => {
  it('aperçu en mémoire, base inchangée, copie du sélecteur effacée', async () => {
    const before = await dump(base.db);
    const { result } = await chosen();
    expect(result.current.state).toEqual({ step: 'ready' });
    expect(result.current.preview?.counts).toEqual({
      rows: 24,
      toImport: 21,
      invalid: 1,
      duplicates: 2,
    });
    expect(await dump(base.db)).toEqual(before);
    noCopyLeft();
    expect(fileLock.holder()).toBeNull();
  });

  it.each([
    ['MacRoman', membersMacRoman(), 'UNSUPPORTED_ENCODING'],
    [
      'sans colonne prénom',
      new TextEncoder().encode('nom;groupe\r\nMartin;U11\r\n'),
      'MISSING_COLUMNS',
    ],
    ['guillemet non fermé', new TextEncoder().encode('nom;prenom\r\n"Martin;Léa\r\n'), 'MALFORMED'],
  ])('refus (%s) : code journalisé, copie effacée, pas d’aperçu', async (_, bytes, reason) => {
    willChoose(bytes);
    const { result } = await chosen();
    expect(result.current.state).toMatchObject({ step: 'rejected', reason });
    expect(result.current.preview).toBeNull();
    expect(log).toHaveBeenCalledWith(`IMPORT_REJECTED_${reason}`);
    noCopyLeft();
  });

  it('SEC-06 fichier de plus de 1 Mo : TOO_LARGE, copie effacée', async () => {
    willChoose(oversizeFile());
    const { result } = await chosen();
    expect(result.current.state).toEqual({ step: 'rejected', reason: 'TOO_LARGE' });
    noCopyLeft();
  });

  it('SEC-10 lecture en échec : failed, copie effacée, message natif jamais journalisé', async () => {
    jest.spyOn(fsMock.File.prototype, 'open').mockImplementation(() => {
      throw new Error('/cache/DocumentPicker/Dupont-Lea.csv');
    });
    const { result } = await chosen();
    expect(result.current.state).toEqual({ step: 'failed' });
    expect(log).toHaveBeenCalledWith('IMPORT_READ_FAILED');
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Dupont|Lea/);
    noCopyLeft();
  });

  it('sélecteur annulé : rien ne change', async () => {
    mockChoice = () => null;
    const { result } = await chosen();
    expect(result.current.state).toEqual({ step: 'idle' });
    expect(result.current.preview).toBeNull();
  });

  it.each<FileTask>(['restore', 'erase', 'cleanup', 'export'])(
    'verrou tenu par %s : choose ne fait rien',
    async (task) => {
      fileLock.acquire(task);
      try {
        const { result } = await chosen();
        expect(result.current.state).toEqual({ step: 'idle' });
        expect(existsSync(picked)).toBe(false);
      } finally {
        fileLock.release(task);
      }
    },
  );
});

describe('EX-30 confirm : écriture d’un bloc', () => {
  it('écrit, prévient les écrans, vide la session, journalise IMPORT_DONE', async () => {
    const changed = jest.fn();
    const off = onDataChanged(changed);
    const { result } = await chosen();
    await act(() => result.current.confirm([]));
    off();
    expect(result.current.state).toEqual({
      step: 'done',
      result: {
        added: 21,
        enrolled: 18,
        duplicatesIgnored: 2,
        invalid: 1,
        duplicatesEnrolled: 2,
        unarchived: 1,
      },
    });
    expect(changed).toHaveBeenCalled();
    expect(await count(base.db, 'members')).toBe(23);
    expect(result.current.preview).toBeNull();
    expect(log).toHaveBeenLastCalledWith('IMPORT_DONE');
  });

  it('double appui : une seule écriture', async () => {
    const { result } = await chosen();
    await act(async () => {
      await Promise.all([result.current.confirm([]), result.current.confirm([])]);
    });
    expect(await count(base.db, 'members')).toBe(23);
  });

  it('verrou pris : busy, session gardée, rien d’écrit', async () => {
    const { result } = await chosen();
    fileLock.acquire('restore');
    try {
      await act(() => result.current.confirm([]));
    } finally {
      fileLock.release('restore');
    }
    expect(result.current.state).toEqual({ step: 'busy' });
    expect(result.current.preview).not.toBeNull();
    expect(await count(base.db, 'members')).toBe(2);
  });

  it('restauration entre l’aperçu et la confirmation : stale, rien d’écrit, session vidée', async () => {
    const { result } = await chosen();
    await base.db.execute(
      "UPDATE groups SET archived_at = '2026-11-28' WHERE name = 'Adultes jeudi'",
    );
    const before = await dump(base.db);
    await act(() => result.current.confirm([]));
    expect(result.current.state).toEqual({ step: 'stale' });
    expect(await dump(base.db)).toEqual(before);
    expect(result.current.preview).toBeNull();
    expect(log).toHaveBeenCalledWith('IMPORT_STALE');
  });

  it('Tout effacer survenu depuis l’aperçu : session vidée, stale, rien d’écrit', async () => {
    const { result } = await chosen();
    await act(async () => notifyDataErased());
    expect(result.current.preview).toBeNull();
    await act(() => result.current.confirm([]));
    expect(result.current.state).toEqual({ step: 'stale' });
    expect(await count(base.db, 'members')).toBe(2);
  });

  it('écriture en échec : failed, IMPORT_WRITE_FAILED, session gardée', async () => {
    const { result } = await chosen();
    await base.db.execute(
      `CREATE TRIGGER fail_all BEFORE INSERT ON members BEGIN SELECT RAISE(ABORT, 'Rose André'); END`,
    );
    await act(() => result.current.confirm([]));
    expect(result.current.state).toEqual({ step: 'failed' });
    expect(log).toHaveBeenCalledWith('IMPORT_WRITE_FAILED');
    expect(result.current.preview).not.toBeNull();
    expect(await count(base.db, 'members')).toBe(2);
  });

  it('rien à écrire : aucune notification', async () => {
    willChoose(new TextEncoder().encode('nom;prenom\r\nGarcia;Léo\r\n'));
    const changed = jest.fn();
    const off = onDataChanged(changed);
    const { result } = await chosen();
    await act(() => result.current.confirm([]));
    off();
    expect(result.current.state).toMatchObject({ step: 'done', result: { added: 0 } });
    expect(changed).not.toHaveBeenCalled();
  });
});

describe('SEC-10 session : en mémoire seulement, vidée à l’abandon', () => {
  it('abandon : aperçu effacé', async () => {
    const { result } = await chosen();
    await act(async () => result.current.abandon());
    expect(result.current.preview).toBeNull();
    expect(importSession.get()).toBeNull();
  });

  it('écran de choix démonté : aperçu effacé ; un autre écran ne l’efface pas', async () => {
    const other = await start();
    const owner = await chosen(true);
    await other.unmount();
    expect(importSession.get()).not.toBeNull();
    await owner.unmount();
    expect(importSession.get()).toBeNull();
  });

  it('un second écran lit le même aperçu', async () => {
    await chosen();
    const { result } = await start();
    expect(result.current.preview?.counts.toImport).toBe(21);
  });
});

describe('SEC-12 journal', () => {
  it('codes seulement, aucun nom ni détail', async () => {
    willChoose(membersUtf8Bom());
    const { result } = await chosen();
    await act(() => result.current.confirm([]));
    await waitFor(() => expect(result.current.state.step).toBe('done'));
    for (const call of log.mock.calls) {
      expect(call).toHaveLength(1);
      expect(call[0]).toMatch(/^IMPORT_[A-Z_]+$/);
    }
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Martin|Zoé|Lefèvre|Léo|Dupont/);
  });
});
