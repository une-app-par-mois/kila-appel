/**
 * @jest-environment node
 */
// useAttendanceExport (ticket 037, EX-31, SEC-10, SEC-12, ABS-04 ; zone sensible) : aperçu (groupes
// et nombre de lignes), plafond de 50 000 lignes, cycle de l'export sous le verrou 'csv'. Vrai cycle
// sur node:fs et node:sqlite avec le jeu fictif des statistiques ; le partage est imité et relit le
// fichier avant son effacement.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { nodeStorage, tempDir } from '@/__fixtures__/backupFiles';
import { type StatsSeeded, statsSeed } from '@/__fixtures__/statsSeed';
import { labels } from '@/config/libelles';
import { attendanceExportRepo } from '@/data/attendanceExportRepo';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { attendanceCsv } from '@/domain/attendanceCsv';
import { customPeriod } from '@/domain/statsPeriod';
import { fileLock } from '@/hooks/fileLock';
import {
  type CsvExportDeps,
  MAX_EXPORT_ROWS,
  tooManyRows,
  useAttendanceExport,
  useExportPreview,
} from '@/hooks/useAttendanceExport';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
// Nombre de lignes imposé pour le plafond (50 001 lignes ne se créent pas dans ce test).
let mockCount: number | null = null;
/** Lecture du nombre retenue jusqu'à `release()` (relecture en cours). */
let mockGate: Promise<void> = Promise.resolve();
jest.mock('@/data/attendanceExportRepo', () => {
  const actual = jest.requireActual('@/data/attendanceExportRepo');
  return {
    attendanceExportRepo: (db: Db) => {
      const repo = actual.attendanceExportRepo(db);
      const count = async (...a: never[]) => {
        await mockGate;
        return mockCount ?? repo.count(...a);
      };
      return { ...repo, count };
    },
  };
});

const CSV_LABELS = { ...labels.stats.csv, statuses: labels.statuses, weekdays: labels.weekdays };
const PERIOD = customPeriod('2026-09-01', '2026-11-27');
const CHOICE = { kind: 'custom', from: PERIOD.from, to: PERIOD.to } as const;
// Période dans le nom (changée après contradiction) ; « _ » refusé par `EXPORT_NAME` (033).
const FILE_NAME = 'kila-presences-2026-09-01-au-2026-11-27.csv';

describe('F-08 EX-31 plafond de l’export', () => {
  it('EX-31 50 000 lignes passent, 50 001 sont refusées', () => {
    expect(MAX_EXPORT_ROWS).toBe(50_000);
    expect(tooManyRows(50_000)).toBe(false);
    expect(tooManyRows(50_001)).toBe(true);
  });
});

describe('useAttendanceExport (EX-31, SEC-10)', () => {
  let dir: ReturnType<typeof tempDir>;
  let exportsDir: string;
  let db: Db;
  let s: StatsSeeded;
  /** Contenu lu par le faux partage, avant l'effacement du sous-dossier. */
  let shared: { path: string; text: string }[];
  let deps: CsvExportDeps;

  beforeEach(async () => {
    dir = tempDir();
    exportsDir = dir.path('exports');
    shared = [];
    deps = {
      files: nodeStorage(exportsDir),
      // Comme `writeFile` (033) : jamais par-dessus un fichier existant.
      write: async (path, content) => {
        if (existsSync(path)) throw new Error('Écriture du fichier impossible');
        writeFileSync(path, content);
      },
      share: jest.fn(async (path: string) => {
        shared.push({ path, text: readFileSync(path, 'utf8') });
      }),
    };
    db = await prepareDatabase(openNodeDb());
    s = await statsSeed(db);
    mockDb = db;
    mockCount = null;
    mockGate = Promise.resolve();
    log.mockClear();
  });
  afterEach(async () => {
    fileLock.release('restore');
    mockDb = null;
    await db.close();
    dir.remove();
  });

  const left = () => (existsSync(exportsDir) ? readdirSync(exportsDir) : []);
  const codes = () => log.mock.calls.map(([code]) => code as string);

  it('EX-31 aperçu : groupes de la période et nombre de lignes, groupe supprimé → tous', async () => {
    const repo = attendanceExportRepo(db);
    const all = await renderHook(() => useExportPreview(CHOICE, null, true));
    await waitFor(() => expect(all.result.current.preview).not.toBeNull());
    expect(all.result.current.preview?.count).toBe(await repo.count(PERIOD, null));
    expect(all.result.current.preview?.groups).toEqual(await repo.groups(PERIOD));
    const one = await renderHook(() => useExportPreview(CHOICE, s.groups.poussins, true));
    await waitFor(() => expect(one.result.current.preview?.groupId).toBe(s.groups.poussins));
    expect(one.result.current.preview?.count).toBe(await repo.count(PERIOD, s.groups.poussins));
    // Groupe sans séance sur la période (autre saison) : gardé, ajouté à la liste, 0 ligne ; jamais
    // élargi en silence à « Tous les groupes » (changée après contradiction).
    const other = await renderHook(() => useExportPreview(CHOICE, s.groups.anciens, true));
    await waitFor(() => expect(other.result.current.ready).toBe(true));
    expect(other.result.current.preview?.groupId).toBe(s.groups.anciens);
    expect(other.result.current.preview?.count).toBe(0);
    expect(other.result.current.preview?.groups.at(-1)).toEqual({
      groupId: s.groups.anciens,
      name: 'Anciens',
      archived: false,
    });
    // Groupe supprimé : retour à « Tous les groupes ».
    const gone = await renderHook(() => useExportPreview(CHOICE, 999_999, true));
    await waitFor(() => expect(gone.result.current.preview).not.toBeNull());
    expect(gone.result.current.preview?.groupId).toBeNull();
    expect(gone.result.current.preview?.count).toBe(await repo.count(PERIOD, null));
  });

  it('EX-31 aperçu périmé : `ready` faux pendant une relecture et après un échec', async () => {
    const { result, rerender } = await renderHook(
      ({ groupId }: { groupId: number | null }) => useExportPreview(CHOICE, groupId, true),
      { initialProps: { groupId: null as number | null } },
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    let release: () => void = () => undefined;
    mockGate = new Promise((resolve) => (release = resolve));
    await rerender({ groupId: s.groups.poussins });
    // Relecture en cours : l'aperçu est encore celui de « Tous les groupes ».
    expect(result.current.preview?.groupId).toBeNull();
    expect(result.current.ready).toBe(false);
    await act(async () => release());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await db.close();
    await rerender({ groupId: null });
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.ready).toBe(false);
    db = await prepareDatabase(openNodeDb());
  });

  it('EX-31 aperçu : rien n’est lu tant que la période n’est pas valide', async () => {
    const { result } = await renderHook(() => useExportPreview(CHOICE, null, false));
    await act(async () => undefined);
    expect(result.current.preview).toBeNull();
    expect(result.current.loadFailed).toBe(false);
  });

  it('EX-31 SEC-10 : le fichier partagé contient les lignes du 036, puis est effacé', async () => {
    const { result } = await renderHook(() => useAttendanceExport(deps));
    await act(() => result.current.exportNow(PERIOD, s.groups.poussins));
    const rows = await attendanceExportRepo(db).rows(PERIOD, s.groups.poussins);
    expect(shared).toHaveLength(1);
    expect(shared[0]?.path.split('/').pop()).toBe(FILE_NAME);
    expect(shared[0]?.text).toBe(attendanceCsv(rows, CSV_LABELS));
    expect(deps.share).toHaveBeenCalledWith(shared[0]?.path);
    expect(left()).toEqual([]);
    expect(result.current.failure).toBeNull();
    expect(result.current.busy).toBe(false);
    expect(codes()).toEqual(['CSV_SHARED']);
  });

  it('SEC-10 : une écriture en échec ne laisse aucun fichier et n’ouvre pas le partage', async () => {
    deps.write = async (path) => {
      writeFileSync(path, 'début');
      throw new Error('Écriture du fichier impossible');
    };
    const { result } = await renderHook(() => useAttendanceExport(deps));
    await act(() => result.current.exportNow(PERIOD, null));
    expect(deps.share).not.toHaveBeenCalled();
    expect(left()).toEqual([]);
    expect(result.current.failure).toBe('failed');
    expect(codes()).toEqual(['CSV_EXPORT_FAILED']);
  });

  it('SEC-10 : un partage en échec efface le sous-dossier et signale l’échec', async () => {
    deps.share = jest.fn(async () => {
      throw new Error('Partage du fichier impossible');
    });
    const { result } = await renderHook(() => useAttendanceExport(deps));
    await act(() => result.current.exportNow(PERIOD, null));
    expect(left()).toEqual([]);
    expect(result.current.failure).toBe('failed');
    // Un nouvel essai réussi efface le message d'échec.
    deps.share = jest.fn(async () => undefined);
    await act(() => result.current.exportNow(PERIOD, null));
    expect(result.current.failure).toBeNull();
  });

  it('SEC-10 : le dossier est vidé au début ; un vidage en échec n’empêche pas l’export', async () => {
    deps.files = { ...deps.files, clear: jest.fn(async () => Promise.reject(new Error('x'))) };
    const { result } = await renderHook(() => useAttendanceExport(deps));
    await act(() => result.current.exportNow(PERIOD, null));
    expect(deps.files.clear).toHaveBeenCalledTimes(1);
    expect(shared).toHaveLength(1);
    expect(codes()).toEqual(['CSV_CLEAR_FAILED', 'CSV_SHARED']);
  });

  it('SEC-10 verrou : rien ne part pendant une autre opération ; « csv » tenu jusqu’au partage', async () => {
    const { result } = await renderHook(() => useAttendanceExport(deps));
    expect(fileLock.acquire('restore')).toBe(true);
    await act(() => result.current.exportNow(PERIOD, null));
    expect(deps.share).not.toHaveBeenCalled();
    expect(result.current.failure).toBeNull();
    fileLock.release('restore');
    const holders: (string | null)[] = [];
    deps.share = jest.fn(async () => {
      holders.push(fileLock.holder());
      throw new Error('Partage du fichier impossible');
    });
    await act(() => result.current.exportNow(PERIOD, null));
    expect(holders).toEqual(['csv']);
    // Rendu même après une erreur.
    expect(fileLock.holder()).toBeNull();
  });

  it('EX-31 plafond sous le verrou : recompté avant la lecture, refus sans fichier', async () => {
    mockCount = 50_001;
    const { result } = await renderHook(() => useAttendanceExport(deps));
    await act(() => result.current.exportNow(PERIOD, null));
    expect(deps.share).not.toHaveBeenCalled();
    expect(left()).toEqual([]);
    expect(result.current.failure).toBe('tooMany');
    expect(codes()).toEqual(['CSV_REJECTED_TOO_MANY']);
    mockCount = 50_000;
    await act(() => result.current.exportNow(PERIOD, null));
    expect(deps.share).toHaveBeenCalledTimes(1);
    expect(result.current.failure).toBeNull();
  });

  it('SEC-10 deux appuis rapprochés : un seul export', async () => {
    let finish: () => void = () => undefined;
    deps.share = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { result } = await renderHook(() => useAttendanceExport(deps));
    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.exportNow(PERIOD, null);
      second = result.current.exportNow(PERIOD, null);
    });
    await waitFor(() => expect(deps.share).toHaveBeenCalledTimes(1));
    expect(result.current.busy).toBe(true);
    finish();
    await act(async () => {
      await Promise.all([first, second]);
    });
    expect(deps.share).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(false);
  });

  it('ABS-04 SEC-12 : le journal ne reçoit que des codes CSV_, sans nom ni chemin', async () => {
    deps.share = jest.fn(async () => {
      throw new Error(`${exportsDir}/Blanc-Zoé.csv`);
    });
    const { result } = await renderHook(() => useAttendanceExport(deps));
    await act(() => result.current.exportNow(PERIOD, null));
    for (const call of log.mock.calls) {
      expect(call).toHaveLength(1);
      expect(call[0]).toMatch(/^CSV_[A-Z_]+$/);
    }
  });
});
