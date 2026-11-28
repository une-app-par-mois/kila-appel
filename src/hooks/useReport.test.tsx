/**
 * @jest-environment node
 */
// useReport (ticket 040b ; EX-32, SEC-08, SEC-10, SEC-12, ABS-04 ; zone sensible) : cycle du rapport
// PDF sous le verrou 'report'. Vraie base (node:sqlite, jeu fictif des statistiques), vrais
// adaptateurs (expoPrint, expoExports, expoFiles) sur les modules natifs imités
// (src/__fixtures__/expoModules.ts) ; le partage relit le fichier avant son effacement.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { type StatsSeeded, statsSeed } from '@/__fixtures__/statsSeed';
import { rapport, rapportPalette } from '@/config/libelles/rapport';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { reportGrids } from '@/domain/reportGrid';
import type { Report } from '@/domain/reportHtml';
import { customPeriod } from '@/domain/statsPeriod';
import { fileLock } from '@/hooks/fileLock';
import { MAX_REPORT_CHARS, tooLarge, useReport } from '@/hooks/useReport';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => require('@/__fixtures__/expoModules').fakeFileSystem());
jest.mock('expo-print', () => {
  const { join: j } = require('node:path');
  const root = () => j(jest.requireMock('expo-file-system').Paths.root, 'cache dir', 'Print');
  const fake = require('@/__fixtures__/expoModules').fakePrint(root);
  return { state: fake.state, printToFileAsync: jest.fn(fake.render) };
});
let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
/** Appels des deux lectures, avec ce qui était dans le cache à ce moment et leur résultat. */
const mockReads: { name: string; args: unknown[]; cache: string[]; result: unknown }[] = [];
const mockCacheNow = (): string[] => {
  const { join: j } = require('node:path');
  const { existsSync: ex, readdirSync: ls } = require('node:fs');
  const dir = j(jest.requireMock('expo-file-system').Paths.root, 'cache dir');
  return ex(dir) ? ls(dir, { recursive: true }) : [];
};
const mockRecord = (name: string, read: (...a: unknown[]) => Promise<unknown>) => {
  return async (...args: unknown[]) => {
    const cache = mockCacheNow();
    const result = await read(...args);
    mockReads.push({ name, args, cache, result });
    return result;
  };
};
jest.mock('@/data/reportRepo', () => {
  const actual = jest.requireActual('@/data/reportRepo');
  return {
    reportRepo: (db: Db) => {
      const repo = actual.reportRepo(db);
      return { report: mockRecord('report', repo.report) };
    },
  };
});
jest.mock('@/data/reportGridRepo', () => {
  const actual = jest.requireActual('@/data/reportGridRepo');
  return {
    reportGridRepo: (db: Db) => ({ grid: mockRecord('grid', actual.reportGridRepo(db).grid) }),
  };
});
/** Caractères ajoutés au HTML rendu (plafond : 1 000 001 caractères ne se créent pas en base). */
let mockPad = 0;
jest.mock('@/domain/reportHtml', () => {
  const actual = jest.requireActual('@/domain/reportHtml');
  return {
    ...actual,
    reportHtml: (...a: unknown[]) => `${actual.reportHtml(...a)}${'x'.repeat(mockPad)}`,
  };
});

const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const fsMock = jest.requireMock('expo-file-system') as { Paths: { root: string } };
const printMock = jest.requireMock('expo-print') as {
  state: { fail: boolean; uri: string | null };
  printToFileAsync: jest.Mock;
};
const shareMock = jest.requireMock('expo-sharing') as { shareAsync: jest.Mock };
const actualHtml = jest.requireActual('@/domain/reportHtml');

const cache = join(fsMock.Paths.root, 'cache dir');
const printDir = join(cache, 'Print');
const exportsDir = join(cache, 'exports');
const PERIOD = customPeriod('2026-09-01', '2026-11-27');
const FILE_NAME = 'kila-rapport-2026-09-01-au-2026-11-27.pdf';
const pathOf = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));

describe('EX-32 plafond du rapport (décision du porteur du 2026-11-28)', () => {
  it('EX-32 1 000 000 caractères passent, 1 000 001 sont refusés', () => {
    expect(MAX_REPORT_CHARS).toBe(1_000_000);
    expect(tooLarge(1_000_000)).toBe(false);
    expect(tooLarge(1_000_001)).toBe(true);
  });
});

describe('useReport (EX-32, SEC-08, SEC-10)', () => {
  let db: Db;
  let s: StatsSeeded;
  let shared: { name: string; head: string; options: unknown; holder: string | null }[];

  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await statsSeed(db);
    mockDb = db;
    mockPad = 0;
    mockReads.length = 0;
    shared = [];
    Object.assign(printMock.state, { fail: false, uri: null });
    printMock.printToFileAsync.mockClear();
    shareMock.shareAsync.mockReset();
    shareMock.shareAsync.mockImplementation(async (uri: string, options: unknown) => {
      const path = pathOf(uri);
      const head = readFileSync(path, 'utf8').slice(0, 5);
      shared.push({ name: path.split('/').pop() ?? '', head, options, holder: fileLock.holder() });
    });
    log.mockClear();
  });
  afterEach(async () => {
    for (const task of ['cleanup', 'erase'] as const) fileLock.release(task);
    mockDb = null;
    await db.close();
    rmSync(cache, { recursive: true, force: true });
  });

  /** Ce qui reste dans le cache ; le dossier `exports/` vide, recréé par chaque export, est admis. */
  const left = () => mockCacheNow().filter((e) => e !== 'exports');
  const codes = () => log.mock.calls.map(([code]) => code as string);
  const run = async (groupId: number | null = null) => {
    const hook = await renderHook(() => useReport());
    await act(() => hook.result.current.generate(PERIOD, groupId));
    return hook.result;
  };
  /** Argument du premier rendu : HTML et taille de page en points. */
  type PrintArgs = { html?: string; width?: number; height?: number };
  const printArgs = (): PrintArgs => printMock.printToFileAsync.mock.calls[0]?.[0] ?? {};
  const printedHtml = () => printArgs().html ?? '';

  it('EX-32 PDF partagé (application/pdf, %PDF-), nommé à la période, puis tout effacé', async () => {
    const result = await run();
    expect(shared).toEqual([
      {
        name: FILE_NAME,
        head: '%PDF-',
        options: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
        holder: 'report',
      },
    ]);
    expect(left()).toEqual([]);
    expect(result.current.failure).toBeNull();
    expect(result.current.busy).toBe(false);
    expect(codes()).toEqual(['REPORT_SHARED']);
  });

  it('EX-32 cache vidé avant les lectures ; même période et même filtre pour la grille', async () => {
    mkdirSync(printDir, { recursive: true });
    writeFileSync(join(printDir, 'reste.pdf'), '%PDF-reste');
    mkdirSync(join(exportsDir, 'ancien'), { recursive: true });
    writeFileSync(join(exportsDir, 'ancien', 'kila-reste.csv'), 'reste');
    await run(s.groups.poussins);
    expect(mockReads.map((r) => r.name)).toEqual(['report', 'grid']);
    expect(mockReads.map((r) => r.cache)).toEqual([[], []]);
    const [report, grid] = mockReads;
    expect(report?.args.slice(0, 2)).toEqual([PERIOD, s.groups.poussins]);
    expect(grid?.args).toEqual([PERIOD, s.groups.poussins]);
    expect(left()).toEqual([]);
  });

  it('EX-32 HTML : rapport et pages de grille de reportHtml, rien d’autre', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await run();
    const report = mockReads[0]?.result as Report;
    const grids = reportGrids(report, mockReads[1]?.result as never, rapport.report);
    expect(grids.size).toBeGreaterThan(0);
    const expected = actualHtml.reportHtml(report, rapport.report, rapportPalette, grids);
    expect(printedHtml()).toBe(expected);
    expect(printedHtml()).toContain('<section class="grid">');
  });

  it('EX-32 orientation : Android, pages mélangées et A4 portrait', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await run();
    const { width, height } = printArgs();
    expect([width, height]).toEqual([595, 842]);
    expect(printedHtml()).toContain('@page { size: A4 portrait; margin: 15mm }');
    expect(printedHtml()).toContain('@page paysage { size: A4 landscape; margin: 10mm }');
  });

  it('EX-32 orientation : iOS, tout en paysage d’office (Platform.OS)', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await run();
    const { width, height } = printArgs();
    expect([width, height]).toEqual([842, 595]);
    expect(printedHtml()).not.toContain('portrait');
    expect(shared).toHaveLength(1);
  });

  it('EX-32 plafond : au-delà, refus sans rendu, rien dans le cache', async () => {
    mockPad = MAX_REPORT_CHARS;
    const result = await run();
    expect(printMock.printToFileAsync).not.toHaveBeenCalled();
    expect(shareMock.shareAsync).not.toHaveBeenCalled();
    expect(left()).toEqual([]);
    expect(result.current.failure).toBe('tooLarge');
    expect(codes()).toEqual(['REPORT_REJECTED_TOO_LARGE']);
  });

  it('SEC-10 rendu en échec : le fichier partiel de cache/Print/ est effacé', async () => {
    printMock.state.fail = true;
    const result = await run();
    expect(shareMock.shareAsync).not.toHaveBeenCalled();
    expect(left()).toEqual([]);
    expect(result.current.failure).toBe('failed');
    expect(codes()).toEqual(['REPORT_FAILED']);
  });

  it('SEC-08 SEC-10 chemin rendu refusé : rien ne reste dans cache/Print/', async () => {
    mkdirSync(join(printDir, 'piege'), { recursive: true });
    printMock.state.uri = `file://${join(printDir, 'piege', 'a.pdf')}`;
    writeFileSync(join(printDir, 'piege', 'a.pdf'), '%PDF-piège');
    const result = await run();
    expect(shareMock.shareAsync).not.toHaveBeenCalled();
    expect(left()).toEqual([]);
    expect(result.current.failure).toBe('failed');
  });

  it('SEC-10 partage en échec : sous-dossier et cache/Print/ effacés', async () => {
    shareMock.shareAsync.mockRejectedValue(new Error(`${exportsDir}/Blanc-Zoé.pdf`));
    const result = await run();
    expect(left()).toEqual([]);
    expect(result.current.failure).toBe('failed');
    expect(codes()).toEqual(['REPORT_FAILED']);
  });

  it('EX-32 groupe introuvable : « failed » ; aucune séance : « empty », sans rendu', async () => {
    const gone = await run(999_999);
    expect(gone.current.failure).toBe('failed');
    expect(codes()).toEqual(['REPORT_FAILED']);
    log.mockClear();
    const hook = await renderHook(() => useReport());
    await act(() => hook.result.current.generate(customPeriod('2030-01-01', '2030-01-31'), null));
    expect(hook.result.current.failure).toBe('empty');
    expect(codes()).toEqual(['REPORT_EMPTY']);
    expect(printMock.printToFileAsync).not.toHaveBeenCalled();
    expect(left()).toEqual([]);
  });

  it.each(['cleanup', 'erase'] as const)(
    'SEC-10 verrou : rien ne part pendant « %s », ni l’inverse',
    async (task) => {
      expect(fileLock.acquire(task)).toBe(true);
      const blocked = await run();
      expect(mockReads).toEqual([]);
      expect(printMock.printToFileAsync).not.toHaveBeenCalled();
      expect(blocked.current.failure).toBeNull();
      fileLock.release(task);
      const attempts: boolean[] = [];
      shareMock.shareAsync.mockImplementation(async () => {
        attempts.push(fileLock.acquire(task));
        throw new Error('Partage du fichier impossible');
      });
      await run();
      expect(attempts).toEqual([false]);
      // Rendu même après une erreur.
      expect(fileLock.holder()).toBeNull();
    },
  );

  it('ABS-04 SEC-12 : le journal ne reçoit que des codes REPORT_, sans nom ni chemin', async () => {
    printMock.state.fail = true;
    await run();
    shareMock.shareAsync.mockRejectedValue(new Error(`${exportsDir}/Blanc-Zoé.pdf`));
    printMock.state.fail = false;
    await run();
    expect(log.mock.calls.length).toBeGreaterThan(0);
    for (const call of log.mock.calls) {
      expect(call).toHaveLength(1);
      expect(call[0]).toMatch(/^REPORT_[A-Z_]+$/);
    }
  });
});
