// Écran « Exporter les présences », cas limites (ticket 037, corrections de revue ; EX-31, SEC-10 ;
// zone sensible) : aperçu périmé ou en échec, groupe sans séance gardé, champs de date avant la
// lecture, saison gardée, adresse invalide, plafond au moment de l'export, message d'échec effacé.
// Vraie base node:sqlite, jeu fictif du 023 ; fichiers sur node:fs ; partage imité.
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { nodeStorage, tempDir } from '@/__fixtures__/backupFiles';
import { type StatsSeeded, statsSeed } from '@/__fixtures__/statsSeed';
import ExportScreen from '@/app/stats/export';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import { attendanceExportRepo } from '@/data/attendanceExportRepo';
import type { Db } from '@/data/db';
import type { BackupStorage } from '@/data/expoFiles';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { customPeriod, type StatsPeriod } from '@/domain/statsPeriod';

let mockDb: Db | null = null;
let mockStorage: BackupStorage;
let mockCount: number | null = null;
let mockCountFails = false;
/** Lecture du nombre retenue jusqu'à `release()` (relecture en cours). */
let mockGate: Promise<void> = Promise.resolve();
const mockPeriods: StatsPeriod[] = [];
const mockShare = jest.fn<Promise<void>, [string, string]>();
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('@/data/expoFiles', () => ({
  ...jest.requireActual('@/data/expoFiles'),
  expoStorage: () => ({
    clear: () => mockStorage.clear(),
    newDir: () => mockStorage.newDir(),
    removeDir: (path: string) => mockStorage.removeDir(path),
  }),
}));
jest.mock('@/data/expoExports', () => ({
  writeFile: async (path: string, content: string) =>
    require('node:fs').writeFileSync(path, content, { flag: 'wx' }),
  shareFile: (path: string, kind: string) => mockShare(path, kind),
}));
jest.mock('@/data/attendanceExportRepo', () => {
  const actual = jest.requireActual('@/data/attendanceExportRepo');
  return {
    attendanceExportRepo: (db: Db) => {
      const repo = actual.attendanceExportRepo(db);
      const count = async (period: StatsPeriod, groupId: number | null) => {
        mockPeriods.push(period);
        await mockGate;
        if (mockCountFails) throw new Error('lecture');
        return mockCount ?? repo.count(period, groupId);
      };
      return { ...repo, count };
    },
  };
});
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const routes = { _layout: RootStack, ...tabRoutes, 'stats/export': ExportScreen };
const open = (url: string) => renderRouter(routes, { initialUrl: url });
const t = labels.attendanceExport;
const TODAY = '2026-11-27';
const SEASON_URL = '/stats/export?du=2026-09-01&au=2026-11-27';
const field = (name: string) => screen.findByLabelText(name);
const exportButton = (count: number) => screen.findByRole('button', { name: t.export(count) });
const isDisabled = (el: { props: { accessibilityState?: { disabled?: boolean } } }) =>
  el.props.accessibilityState?.disabled === true;
const chooseGroup = async (current: string, name: string) => {
  await fireEvent.press(await screen.findByRole('button', { name: `${t.group}, ${current}` }));
  await fireEvent.press(await screen.findByRole('button', { name }));
};
/** Retient les prochaines lectures du nombre ; rend la fonction qui les libère. */
const hold = () => {
  let release: () => void = () => undefined;
  mockGate = new Promise((resolve) => (release = resolve));
  return async () => act(async () => release());
};

describe('Export CSV des présences : cas limites (ticket 037)', () => {
  let db: Db;
  let s: StatsSeeded;
  let dir: ReturnType<typeof tempDir>;
  const repo = () => attendanceExportRepo(db);
  beforeEach(async () => {
    dir = tempDir();
    mockStorage = nodeStorage(dir.path('exports'));
    mockShare.mockReset();
    mockCount = null;
    mockCountFails = false;
    mockGate = Promise.resolve();
    mockPeriods.length = 0;
    log.mockClear();
    db = await prepareDatabase(openNodeDb());
    s = await statsSeed(db);
    mockDb = db;
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 10, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
    dir.remove();
  });

  it('SEC-10 aperçu périmé : groupe changé, appui avant la fin de la lecture, rien ne part', async () => {
    await open(SEASON_URL);
    const all = await repo().count(customPeriod('2026-09-01', TODAY), null);
    await exportButton(all);
    const release = hold();
    await chooseGroup(t.allGroups, 'Poussins');
    // L'ancien compteur reste affiché, mais il n'exporte rien.
    const stale = await exportButton(all);
    expect(isDisabled(stale)).toBe(true);
    await fireEvent.press(stale);
    expect(mockShare).not.toHaveBeenCalled();
    await release();
    const poussins = await repo().count(customPeriod('2026-09-01', TODAY), s.groups.poussins);
    expect(isDisabled(await exportButton(poussins))).toBe(false);
  });

  it('SEC-10 aperçu périmé : période changée puis relecture en échec, bouton désactivé', async () => {
    await open(SEASON_URL);
    const all = await repo().count(customPeriod('2026-09-01', TODAY), null);
    await exportButton(all);
    mockCountFails = true;
    await fireEvent.changeText(await field(t.from), '01/11/2026');
    expect(await screen.findByText(labels.common.loadFailed)).toBeTruthy();
    const button = await exportButton(all);
    expect(isDisabled(button)).toBe(true);
    await fireEvent.press(button);
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('EX-31 groupe sans séance sur la nouvelle période : gardé, état vide, jamais élargi', async () => {
    await open(SEASON_URL);
    await chooseGroup(t.allGroups, 'Benjamins');
    // Benjamins : dernière séance le 23/11.
    await fireEvent.changeText(await field(t.from), '24/11/2026');
    expect(await screen.findByText(t.empty)).toBeTruthy();
    expect(screen.getByRole('button', { name: `${t.group}, Benjamins` })).toBeTruthy();
    expect(isDisabled(await exportButton(0))).toBe(true);
  });

  it('EX-31 date saisie avant la fin de la première lecture : l’autre date reste celle reçue', async () => {
    const release = hold();
    await open(SEASON_URL);
    expect((await field(t.from)).props.value).toBe('01/09/2026');
    await fireEvent.changeText(await field(t.from), '01/10/2026');
    expect((await field(t.to)).props.value).toBe('27/11/2026');
    await release();
    const october = await repo().count(customPeriod('2026-10-01', TODAY), null);
    expect(await exportButton(october)).toBeTruthy();
  });

  it('EX-31 dates retapées égales à la saison : la saison est gardée ; sinon période libre', async () => {
    await open('/stats/export?periode=saison');
    expect((await field(t.from)).props.value).toBe('01/09/2026');
    expect(mockPeriods.at(-1)?.seasonId).toBe(s.seasonId);
    await fireEvent.changeText(await field(t.from), '02/09/2026');
    expect((await field(t.from)).props.value).toBe('02/09/2026');
    await screen.findByRole('button', { name: /^Exporter \(/ });
    expect(mockPeriods.at(-1)).toMatchObject({ from: '2026-09-02', seasonId: null });
    await fireEvent.changeText(await field(t.from), '01/09/2026');
    await screen.findByRole('button', { name: /^Exporter \(/ });
    expect(mockPeriods.at(-1)).toMatchObject({ from: '2026-09-01', seasonId: s.seasonId });
  });

  it('EX-31 dates invalides dans l’adresse : valeurs reçues dans les champs, erreur, aucun journal', async () => {
    await open('/stats/export?du=2026-11-28&au=2026-11-01');
    expect((await field(t.from)).props.value).toBe('28/11/2026');
    expect((await field(t.to)).props.value).toBe('01/11/2026');
    expect(await screen.findByText(labels.errors.END_BEFORE_START)).toBeTruthy();
    expect(screen.queryByText(labels.common.loadFailed)).toBeNull();
    expect(isDisabled(await screen.findByRole('button', { name: t.open }))).toBe(true);
    expect(mockPeriods).toEqual([]);
    expect(log).not.toHaveBeenCalled();
  });

  it('EX-31 date illisible dans l’adresse : affichée telle quelle, erreur sous le champ', async () => {
    await open('/stats/export?du=abc&au=2026-11-01');
    expect((await field(t.from)).props.value).toBe('abc');
    expect(await screen.findByText(labels.errors.DATE_INVALID)).toBeTruthy();
    expect(log).not.toHaveBeenCalled();
  });

  it('EX-31 plafond dépassé au moment de l’export : texte « Trop de lignes », pas l’échec', async () => {
    mockCount = 50_000;
    await open(SEASON_URL);
    const button = await exportButton(50_000);
    mockCount = 50_001;
    await fireEvent.press(button);
    expect(await screen.findByText(t.tooMany)).toBeTruthy();
    expect(screen.queryByText(t.failed)).toBeNull();
    expect(mockShare).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('CSV_REJECTED_TOO_MANY');
  });

  it('EX-31 message d’échec effacé quand le groupe ou la période change', async () => {
    mockShare.mockRejectedValue(new Error('Partage du fichier impossible'));
    await open(SEASON_URL);
    await fireEvent.press(
      await exportButton(await repo().count(customPeriod('2026-09-01', TODAY), null)),
    );
    expect(await screen.findByText(t.failed)).toBeTruthy();
    await chooseGroup(t.allGroups, 'Poussins');
    expect(screen.queryByText(t.failed)).toBeNull();
    await fireEvent.press(
      await exportButton(await repo().count(customPeriod('2026-09-01', TODAY), s.groups.poussins)),
    );
    expect(await screen.findByText(t.failed)).toBeTruthy();
    await fireEvent.changeText(await field(t.from), '01/10/2026');
    expect(screen.queryByText(t.failed)).toBeNull();
  });
});
