// Onglet Statistiques et choix d'une période (ticket 024, EX-27, RM-01, NF-06), sur une vraie base
// node:sqlite et le jeu fictif du 023 (`statsSeed.ts`). Horloge figée au vendredi 27/11/2026 10:00.
// Taux attendus écrits en clair, avec l'espace insécable `NBSP` avant « % ».
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { STATS_TODAY, statsSeed } from '@/__fixtures__/statsSeed';
import FreeRollCall from '@/app/appel-libre';
import PeriodScreen from '@/app/stats/periode';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { NBSP } from '@/domain/attendanceRate';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = {
  _layout: RootStack,
  ...tabRoutes,
  'appel-libre': FreeRollCall,
  'stats/periode': PeriodScreen,
};
const open = (initialUrl = '/stats') => renderRouter(routes, { initialUrl });
const t = labels.stats;
const pct = (n: number) => `${n}${NBSP}%`;
const chip = (name: string) => screen.findByRole('button', { name });
/** Carte d'un chiffre de la synthèse : « Taux de présence » ou « Séances ». */
const figure = async (testID: 'stats-rate' | 'stats-sessions') =>
  within(await screen.findByTestId(testID));
/** Ligne d'un groupe, trouvée par son nom. */
const groupRow = async (name: string) =>
  within(
    (await screen.findAllByTestId('stats-group')).find(
      (row) => within(row).queryByText(name) !== null,
    ) as never,
  );

describe('Onglet Statistiques (ticket 024, EX-27, RM-01)', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await statsSeed(db);
    mockDb = db;
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 10, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('EX-27 RM-01 saison par défaut : synthèse 87 %, 21 séances, période affichée, groupes', async () => {
    expect(STATS_TODAY).toBe('2026-11-27');
    await open();
    expect(await screen.findByRole('header', { name: t.title })).toBeTruthy();
    expect((await chip(t.periods.season)).props.accessibilityState).toEqual({ selected: true });
    expect((await chip(t.periods.month)).props.accessibilityState).toEqual({ selected: false });
    expect(await screen.findByText(t.periodShown('01/09/2026', '27/11/2026'))).toBeTruthy();
    expect((await figure('stats-rate')).getByText(pct(87))).toBeTruthy();
    expect((await figure('stats-sessions')).getByText('21')).toBeTruthy();
    expect(screen.getByText(t.byGroup)).toBeTruthy();
    const rows = await screen.findAllByTestId('stats-group');
    expect(rows.map((r) => within(r).getByTestId('stats-group-name').props.children)).toEqual([
      'Adultes',
      'Benjamins',
      'Poussins',
      'Vétérans',
    ]);
    const adultes = await groupRow('Adultes');
    expect(adultes.getByText('—')).toBeTruthy();
    expect(adultes.getByText(t.noSession)).toBeTruthy();
    expect(adultes.queryByTestId('attendance-bar')).toBeNull();
    expect((await groupRow('Benjamins')).getByText(pct(78))).toBeTruthy();
    expect((await groupRow('Poussins')).getByText(pct(88))).toBeTruthy();
    const veterans = await groupRow('Vétérans');
    expect(veterans.getByText(pct(100))).toBeTruthy();
    expect(veterans.getByText(t.archived)).toBeTruthy();
    // Boutons d'export masqués jusqu'au jalon 3 (décision du porteur du 2026-11-27).
    expect(screen.queryByText(/CSV|PDF/)).toBeNull();
  });

  it('NF-06 barre par statut : libellé d’accessibilité des parts non nulles, légende affichée', async () => {
    await open();
    const bar = async (name: string) => (await groupRow(name)).getByTestId('attendance-bar');
    // Poussins 37 P, 1 R, 3 E, 5 A sur 46 ; Benjamins 7 P, 2 A sur 9 ; Vétérans 1 R.
    expect((await bar('Poussins')).props.accessibilityLabel).toBe(
      `${pct(80)} présent, ${pct(2)} retard, ${pct(7)} excusé, ${pct(11)} absent`,
    );
    expect((await bar('Benjamins')).props.accessibilityLabel).toBe(
      `${pct(78)} présent, ${pct(22)} absent`,
    );
    expect((await bar('Vétérans')).props.accessibilityLabel).toBe(`${pct(100)} retard`);
    const legend = within(screen.getByTestId('attendance-legend'));
    for (const status of ['Présent', 'Retard', 'Excusé', 'Absent'])
      expect(legend.getByText(status)).toBeTruthy();
  });

  it('EX-27 « Ce mois » : 73 %, 9 séances, du 01/11 au 27/11', async () => {
    await open();
    await fireEvent.press(await chip(t.periods.month));
    expect((await chip(t.periods.month)).props.accessibilityState).toEqual({ selected: true });
    expect(await screen.findByText(t.periodShown('01/11/2026', '27/11/2026'))).toBeTruthy();
    expect((await figure('stats-rate')).getByText(pct(73))).toBeTruthy();
    expect((await figure('stats-sessions')).getByText('9')).toBeTruthy();
    expect((await groupRow('Benjamins')).getByText(pct(75))).toBeTruthy();
    expect((await groupRow('Poussins')).getByText(pct(70))).toBeTruthy();
    expect(screen.queryByText('Vétérans')).toBeNull();
  });

  it('EX-27 « Dates… » : champs partis de la période en cours, dates libres appliquées et gardées', async () => {
    const router = await open();
    await fireEvent.press(await chip(t.periods.custom));
    expect(router.getPathname()).toBe('/stats/periode');
    expect(await screen.findByRole('header', { name: t.periodScreen.title })).toBeTruthy();
    const from = screen.getByLabelText(t.periodScreen.from);
    const to = screen.getByLabelText(t.periodScreen.to);
    expect(from.props.value).toBe('01/09/2026');
    expect(to.props.value).toBe('27/11/2026');
    await fireEvent.changeText(from, '01/03/2026');
    await fireEvent.changeText(to, '31/03/2026');
    await fireEvent.press(screen.getByRole('button', { name: t.periodScreen.apply }));
    expect(router.getPathname()).toBe('/stats');
    expect(await screen.findByText(t.periodShown('01/03/2026', '31/03/2026'))).toBeTruthy();
    expect((await chip(t.periods.custom)).props.accessibilityState).toEqual({ selected: true });
    expect((await figure('stats-rate')).getByText(pct(50))).toBeTruthy();
    expect((await figure('stats-sessions')).getByText('1')).toBeTruthy();
    expect((await groupRow('Anciens')).getByText(t.archived)).toBeTruthy();
    // Période gardée en changeant d'onglet (état de l'écran, jamais en base).
    await fireEvent.press(screen.getByRole('button', { name: labels.tabs.history }));
    expect(router.getPathname()).toBe('/historique');
    await fireEvent.press(screen.getByRole('button', { name: labels.tabs.stats }));
    expect(await screen.findByText(t.periodShown('01/03/2026', '31/03/2026'))).toBeTruthy();
  });

  it('RM-04 EX-27 « Appliquer » refuse une date invalide ou une fin avant le début, sous le champ', async () => {
    const router = await open('/stats/periode?du=2026-11-01&au=2026-11-27');
    const from = await screen.findByLabelText(t.periodScreen.from);
    const to = screen.getByLabelText(t.periodScreen.to);
    const apply = () => fireEvent.press(screen.getByRole('button', { name: t.periodScreen.apply }));
    await fireEvent.changeText(from, '31/02/2026');
    await apply();
    expect(await screen.findByText(labels.errors.DATE_INVALID)).toBeTruthy();
    expect(router.getPathname()).toBe('/stats/periode');
    await fireEvent.changeText(from, '28/11/2026');
    expect(screen.queryByText(labels.errors.DATE_INVALID)).toBeNull();
    await apply();
    expect(await screen.findByText(labels.errors.END_BEFORE_START)).toBeTruthy();
    expect(router.getPathname()).toBe('/stats/periode');
    // Dates futures acceptées.
    await fireEvent.changeText(to, '31/12/2026');
    await apply();
    expect(router.getPathname()).toBe('/stats');
    expect(await screen.findByText(t.periodShown('28/11/2026', '31/12/2026'))).toBeTruthy();
  });

  it('EX-27 mêmes dates réappliquées après « Ce mois » : la période libre revient', async () => {
    const router = await open('/stats?du=2026-03-01&au=2026-03-31');
    expect(await screen.findByText(t.periodShown('01/03/2026', '31/03/2026'))).toBeTruthy();
    await fireEvent.press(await chip(t.periods.month));
    expect(await screen.findByText(t.periodShown('01/11/2026', '27/11/2026'))).toBeTruthy();
    await fireEvent.press(await chip(t.periods.custom));
    await fireEvent.changeText(await screen.findByLabelText(t.periodScreen.from), '01/03/2026');
    await fireEvent.changeText(screen.getByLabelText(t.periodScreen.to), '31/03/2026');
    await fireEvent.press(screen.getByRole('button', { name: t.periodScreen.apply }));
    expect(router.getPathname()).toBe('/stats');
    expect(await screen.findByText(t.periodShown('01/03/2026', '31/03/2026'))).toBeTruthy();
  });

  it('EX-27 retour de l’écran Période sans appliquer : la période ne change pas', async () => {
    const router = await open();
    await fireEvent.press(await chip(t.periods.custom));
    await fireEvent.press(await screen.findByRole('button', { name: labels.common.back }));
    expect(router.getPathname()).toBe('/stats');
    expect(await screen.findByText(t.periodShown('01/09/2026', '27/11/2026'))).toBeTruthy();
  });

  it('EX-27 dates reçues invalides : message de saisie sur l’onglet, rien n’est lu', async () => {
    await open('/stats?du=2026-12-01&au=2026-11-01');
    expect(await screen.findByText(labels.errors.END_BEFORE_START)).toBeTruthy();
    expect(screen.queryByTestId('stats-rate')).toBeNull();
    expect(screen.queryByText(labels.common.loadFailed)).toBeNull();
    await fireEvent.press(await chip(t.periods.month));
    expect((await figure('stats-rate')).getByText(pct(73))).toBeTruthy();
  });

  it('RM-01 période sans séance : « — », 0 séance, « Aucune séance sur la période. » par groupe', async () => {
    await open('/stats?du=2026-09-03&au=2026-09-08');
    expect((await figure('stats-rate')).getByText('—')).toBeTruthy();
    expect((await figure('stats-sessions')).getByText('0')).toBeTruthy();
    expect(await screen.findAllByText(t.noSession)).toHaveLength(3);
  });

  it('RM-01 aucun groupe à lister : une seule carte « Aucune séance sur la période. »', async () => {
    await db.execute("UPDATE groups SET archived_at = '2026-08-01'");
    await open('/stats?du=2026-09-03&au=2026-09-08');
    expect(await screen.findAllByText(t.noSession)).toHaveLength(1);
    expect(screen.queryByTestId('stats-group')).toBeNull();
  });

  it('EX-27 sans saison active : pas de puce « Saison », « Ce mois » sélectionnée', async () => {
    await db.execute('UPDATE seasons SET is_active = 0');
    await open();
    expect((await chip(t.periods.month)).props.accessibilityState).toEqual({ selected: true });
    expect(await screen.findByText(t.periodShown('01/11/2026', '27/11/2026'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.periods.season })).toBeNull();
    expect(screen.getByRole('button', { name: t.periods.custom })).toBeTruthy();
  });

  it('EX-27 état vide : aucune séance enregistrée, carte et « Faire l’appel » seulement', async () => {
    await db.execute("UPDATE sessions SET state = 'cancelled'");
    const router = await open();
    expect(await screen.findByText(t.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.periods.month })).toBeNull();
    expect(screen.queryByTestId('stats-rate')).toBeNull();
    expect(screen.queryByTestId('attendance-legend')).toBeNull();
    const start = await screen.findByRole('button', { name: t.start });
    await act(async () => {});
    await fireEvent.press(start);
    expect(router.getPathname()).toBe('/appel-libre');
  });
});
