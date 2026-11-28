// Écran « Exporter les présences » (ticket 037, F-08, EX-31, SEC-09, SEC-10 ; zone sensible), ouvert
// depuis l'onglet Statistiques, sur une vraie base node:sqlite et le jeu fictif du 023
// (`statsSeed.ts`). Fichiers sur node:fs dans un dossier temporaire ; partage imité, qui relit le
// fichier avant son effacement. Horloge figée au vendredi 27/11/2026 10:00.
import { readdirSync, readFileSync } from 'node:fs';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
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
import { customPeriod, monthPeriod } from '@/domain/statsPeriod';
import { fileLock } from '@/hooks/fileLock';

let mockDb: Db | null = null;
let mockStorage: BackupStorage;
let mockCount: number | null = null;
const mockShare = jest.fn<Promise<void>, [string, string]>();
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
// Le vrai cycle sur node:fs : seuls l'accès aux fichiers et le partage changent.
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
// Nombre de lignes imposé pour le plafond (50 000 lignes ne se créent pas dans un test d'écran).
jest.mock('@/data/attendanceExportRepo', () => {
  const actual = jest.requireActual('@/data/attendanceExportRepo');
  return {
    attendanceExportRepo: (db: Db) => {
      const repo = actual.attendanceExportRepo(db);
      return { ...repo, count: async (...a: never[]) => mockCount ?? repo.count(...a) };
    },
  };
});

const routes = { _layout: RootStack, ...tabRoutes, 'stats/export': ExportScreen };
const open = (initialUrl = '/stats') => renderRouter(routes, { initialUrl });
const t = labels.attendanceExport;
const TODAY = '2026-11-27';
// SEC-09 : le texte de la maquette, au caractère près. Il n'est jamais réduit.
const WARNING =
  'Le fichier contient les noms des membres et leurs présences, en clair. Partagez-le ' +
  'seulement avec qui doit le recevoir.';
const field = (name: string) => screen.findByLabelText(name);
const exportButton = (count: number) => screen.findByRole('button', { name: t.export(count) });
const isDisabled = (el: { props: { accessibilityState?: { disabled?: boolean } } }) =>
  el.props.accessibilityState?.disabled === true;

describe('Export CSV des présences (ticket 037, EX-31)', () => {
  let db: Db;
  let s: StatsSeeded;
  let dir: ReturnType<typeof tempDir>;
  const repo = () => attendanceExportRepo(db);
  beforeEach(async () => {
    dir = tempDir();
    mockStorage = nodeStorage(dir.path('exports'));
    mockShare.mockReset();
    mockCount = null;
    db = await prepareDatabase(openNodeDb());
    s = await statsSeed(db);
    mockDb = db;
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 10, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    fileLock.release('restore');
    mockDb = null;
    await db.close();
    dir.remove();
  });

  it('EX-31 depuis Stats sur « Ce mois » : l’écran s’ouvre sur le mois, tous les groupes', async () => {
    const router = await open();
    await fireEvent.press(await screen.findByRole('button', { name: labels.stats.periods.month }));
    await fireEvent.press(await screen.findByRole('button', { name: t.open }));
    expect(router.getPathname()).toBe('/stats/export');
    expect(router.getSearchParams()).toEqual({ periode: 'mois' });
    expect(await screen.findByRole('header', { name: t.title })).toBeTruthy();
    const n = await repo().count(monthPeriod(TODAY), null);
    expect(n).toBeGreaterThan(0);
    expect(await exportButton(n)).toBeTruthy();
    expect((await field(t.from)).props.value).toBe('01/11/2026');
    expect((await field(t.to)).props.value).toBe('27/11/2026');
    expect(screen.getByText(t.allGroups)).toBeTruthy();
  });

  it('EX-31 changer le groupe ou les dates met à jour le nombre de lignes', async () => {
    await open('/stats/export?du=2026-09-01&au=2026-11-27');
    const season = customPeriod('2026-09-01', TODAY);
    await exportButton(await repo().count(season, null));
    await fireEvent.press(screen.getByRole('button', { name: `${t.group}, ${t.allGroups}` }));
    // Groupe archivé de la liste : « · Archivé » (décision du porteur du 2026-11-28).
    expect(await screen.findByRole('button', { name: t.archivedGroup('Vétérans') })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Poussins' }));
    const poussins = await repo().count(season, s.groups.poussins);
    expect(await exportButton(poussins)).toBeTruthy();
    await fireEvent.changeText(await field(t.from), '01/11/2026');
    const november = customPeriod('2026-11-01', TODAY);
    expect(await exportButton(await repo().count(november, s.groups.poussins))).toBeTruthy();
  });

  it('EX-31 dates à corriger : erreur sous le champ, bouton désactivé, rien n’est lu', async () => {
    await open('/stats/export?du=2026-09-01&au=2026-11-27');
    await exportButton(await repo().count(customPeriod('2026-09-01', TODAY), null));
    await fireEvent.changeText(await field(t.from), '28/11/2026');
    expect(await screen.findByText(labels.errors.END_BEFORE_START)).toBeTruthy();
    expect(isDisabled(await screen.findByRole('button', { name: t.open }))).toBe(true);
    await fireEvent.changeText(await field(t.from), '31/02/2026');
    expect(await screen.findByText(labels.errors.DATE_INVALID)).toBeTruthy();
    // Date incomplète : l'erreur attend la sortie du champ.
    await fireEvent.changeText(await field(t.to), '01/1');
    expect(screen.getAllByText(labels.errors.DATE_INVALID)).toHaveLength(1);
    await fireEvent(await field(t.to), 'blur');
    expect(screen.getAllByText(labels.errors.DATE_INVALID)).toHaveLength(2);
  });

  it('EX-31 SEC-09 période sans présence : état vide, bouton désactivé, bandeau entier', async () => {
    await open('/stats/export?du=2026-01-01&au=2026-01-31');
    expect(await screen.findByText(t.empty)).toBeTruthy();
    expect(isDisabled(await exportButton(0))).toBe(true);
    const warning = within(screen.getByTestId('csv-warning'));
    expect(warning.getByText(WARNING)).toBeTruthy();
    expect(warning.getByText(t.warningStrong)).toBeTruthy();
  });

  it('SEC-09 le bandeau est entier et avant le bouton', async () => {
    await open('/stats/export?periode=mois');
    const n = await repo().count(monthPeriod(TODAY), null);
    await exportButton(n);
    expect(screen.getByText(WARNING)).toBeTruthy();
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf(t.warningAfter)).toBeGreaterThan(0);
    expect(tree.indexOf(t.warningAfter)).toBeLessThan(tree.indexOf(t.export(n)));
  });

  it('EX-31 plafond : 50 000 lignes exportables, 50 001 refusées avec le compteur', async () => {
    mockCount = 50_000;
    await open('/stats/export?periode=mois');
    expect(isDisabled(await exportButton(50_000))).toBe(false);
    expect(screen.queryByText(t.tooMany)).toBeNull();
    mockCount = 50_001;
    await fireEvent.changeText(await field(t.from), '02/11/2026');
    expect(isDisabled(await exportButton(50_001))).toBe(true);
    expect(screen.getByText(t.tooMany)).toBeTruthy();
    expect(t.export(50_001)).toBe('Exporter (50\u00a0001 lignes)');
  });

  it('EX-31 SEC-10 export : fichier du 036 partagé en text/csv, puis effacé', async () => {
    let finish: () => void = () => undefined;
    let text = '';
    mockShare.mockImplementation(
      (path) =>
        new Promise<void>((resolve) => {
          text = readFileSync(path, 'utf8');
          finish = resolve;
        }),
    );
    await open('/stats/export?du=2026-09-01&au=2026-11-27');
    const period = customPeriod('2026-09-01', TODAY);
    await fireEvent.press(await exportButton(await repo().count(period, null)));
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));
    expect(mockShare.mock.calls[0]?.[1]).toBe('csv');
    expect(mockShare.mock.calls[0]?.[0]).toMatch(/\/kila-presences-2026-09-01-au-2026-11-27\.csv$/);
    expect(text.split('\r\n').length - 2).toBe(await repo().count(period, null));
    const busy = await screen.findByRole('button', { name: t.exporting });
    expect(isDisabled(busy)).toBe(true);
    await act(async () => finish());
    expect(await exportButton(await repo().count(period, null))).toBeTruthy();
    expect(readdirSync(dir.path('exports'))).toEqual([]);
    expect(screen.queryByText(t.failed)).toBeNull();
  });

  it('SEC-10 échec du partage : message, aucun fichier laissé', async () => {
    mockShare.mockRejectedValue(new Error('Partage du fichier impossible'));
    await open('/stats/export?periode=mois');
    await fireEvent.press(await exportButton(await repo().count(monthPeriod(TODAY), null)));
    expect(await screen.findByText(t.failed)).toBeTruthy();
    expect(readdirSync(dir.path('exports'))).toEqual([]);
  });

  it('verrou commun : bouton désactivé pendant une restauration', async () => {
    await open('/stats/export?periode=mois');
    const n = await repo().count(monthPeriod(TODAY), null);
    expect(isDisabled(await exportButton(n))).toBe(false);
    await act(async () => {
      fileLock.acquire('restore');
    });
    expect(isDisabled(await exportButton(n))).toBe(true);
    await act(async () => fileLock.release('restore'));
    expect(isDisabled(await exportButton(n))).toBe(false);
  });
});
