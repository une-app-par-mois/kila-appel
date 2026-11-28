/**
 * @jest-environment node
 */
// Session de useMemberImport (ticket 034, EX-30, ABS-03, SEC-10 ; zone sensible) : en mémoire
// seulement, réduite aux colonnes reconnues, vidée à l'abandon (même pendant la lecture), au
// démontage de l'écran de choix et par Tout effacer ; `confirm` vérifie l'aperçu affiché. Même
// cadre que useMemberImport.test.tsx (modules natifs imités, node:sqlite). Données fictives.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, renderHook } from '@testing-library/react-native';
import { type ImportDb, importDb } from '@/__fixtures__/importDb';
import { MOCKUP_ROWS } from '@/__fixtures__/importRows';
import { count } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { notifyDataErased } from '@/hooks/dataChanged';
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

/** La prochaine lecture de la base (importContext, pendant `choose`) lance d'abord `before`. */
const beforeContext = (before: () => unknown) => {
  const query = base.db.query.bind(base.db);
  jest.spyOn(base.db, 'query').mockImplementationOnce((async (sql, params) => {
    await before();
    return query(sql, params);
  }) as Db['query']);
};

describe('SEC-10 session : en mémoire seulement, vidée à l’abandon', () => {
  it('abandon : aperçu effacé', async () => {
    const { result } = await chosen();
    await act(async () => result.current.abandon());
    expect(result.current.preview).toBeNull();
    expect(importSession.get()).toBeNull();
  });

  it('abandon pendant la lecture : aucune session, état idle', async () => {
    const hook = await start(true);
    beforeContext(() => hook.result.current.abandon());
    await act(() => hook.result.current.choose());
    expect(importSession.get()).toBeNull();
    expect(hook.result.current.state).toEqual({ step: 'idle' });
  });

  it.each([true, false])(
    'écran démonté pendant la lecture (propriétaire : %s) : aucune session',
    async (owner) => {
      const hook = await start(owner);
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let reached = () => {};
      const inContext = new Promise<void>((resolve) => {
        reached = resolve;
      });
      beforeContext(async () => {
        reached();
        await gate;
      });
      let pending = Promise.resolve();
      await act(async () => {
        pending = hook.result.current.choose();
        await inContext;
      });
      await hook.unmount();
      release();
      await act(() => pending);
      expect(importSession.get()).toBeNull();
    },
  );

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

  it('Tout effacer : lignes libérées aussitôt ; confirm rend stale, IMPORT_NO_SESSION', async () => {
    const { result } = await chosen();
    const shown = result.current.preview;
    await act(async () => notifyDataErased());
    expect(importSession.held()).toBe(false);
    expect(result.current.preview).toBeNull();
    await act(() => result.current.confirm(shown, []));
    expect(result.current.state).toEqual({ step: 'stale' });
    expect(log).toHaveBeenCalledWith('IMPORT_NO_SESSION');
    expect(log).not.toHaveBeenCalledWith('IMPORT_STALE');
    expect(await count(base.db, 'members')).toBe(2);
  });

  it('aperçu affiché qui n’est plus celui de la session : stale, rien d’écrit', async () => {
    const first = await chosen();
    const shown = first.result.current.preview;
    await chosen();
    expect(importSession.get()?.preview).not.toBe(shown);
    await act(() => first.result.current.confirm(shown, []));
    expect(first.result.current.state).toEqual({ step: 'stale' });
    expect(log).toHaveBeenCalledWith('IMPORT_NO_SESSION');
    expect(await count(base.db, 'members')).toBe(2);
  });
});

describe('ABS-03 minimisation en mémoire', () => {
  it('seules les colonnes reconnues restent dans la session ; l’import se fait', async () => {
    willChoose(
      new TextEncoder().encode(
        'Allergies;nom;prenom;groupe\r\nArachides;Neuf;Alix;Adultes jeudi\r\n;Deux;Sam;\r\n',
      ),
    );
    const { result } = await chosen();
    const rows = importSession.get()?.rows;
    expect(rows?.[0]?.cells).toEqual(['nom', 'prenom', 'groupe']);
    expect(JSON.stringify(rows)).not.toMatch(/Allergies|Arachides/);
    await act(() => result.current.confirm(result.current.preview, []));
    expect(result.current.state).toMatchObject({ step: 'done', result: { added: 2, enrolled: 1 } });
    expect(await count(base.db, 'members')).toBe(4);
  });
});
