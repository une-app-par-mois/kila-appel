// Écran « Statistiques d'un membre » (ticket 025, EX-27, RM-01, RM-03, NF-06), sur une vraie base
// node:sqlite et le jeu fictif du 023 (`statsSeed.ts`). Horloge figée au vendredi 27/11/2026
// 10:00. Paramètres : `groupe`, puis `periode` (saison, mois) ou `du` et `au`.
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { POUSSINS_DATES, type StatsSeeded, statsSeed } from '@/__fixtures__/statsSeed';
import StatsGroup from '@/app/stats/groupes/[id]';
import StatsMember from '@/app/stats/membres/[id]';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { NBSP } from '@/domain/attendanceRate';
import { toDisplayDate } from '@/domain/formats';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = {
  _layout: RootStack,
  ...tabRoutes,
  'stats/groupes/[id]': StatsGroup,
  'stats/membres/[id]': StatsMember,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels.stats;
const m = labels.stats.memberScreen;
const pct = (n: number) => `${n}${NBSP}%`;
/** Libellés d'accessibilité des cases, dans l'ordre affiché. */
const squares = async () =>
  (await screen.findAllByTestId('session-square')).map((q) => q.props.accessibilityLabel);
/** Libellé attendu de la case de la séance S`n` des Poussins (1 à 13). */
const day = (n: number) => toDisplayDate(POUSSINS_DATES[n - 1] ?? '');
const status = (name: string, n: number) => labels.alerts.square(name, day(n));

describe('Statistiques d’un membre (ticket 025, EX-27, RM-01, RM-03)', () => {
  let db: Db;
  let seeded: StatsSeeded;
  const url = (member: number, group: number, period = 'periode=saison') =>
    `/stats/membres/${member}?groupe=${group}&${period}`;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    seeded = await statsSeed(db);
    mockDb = db;
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 10, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('EX-27 RM-01 Hugo : 64 %, barre, comptes accordés, 13 cases de la plus ancienne à la plus récente', async () => {
    await open(url(seeded.members.hugo, seeded.groups.poussins));
    expect(await screen.findByRole('header', { name: 'Hugo Moreau' })).toBeTruthy();
    expect(screen.getByText('Poussins · saison 2026-2027')).toBeTruthy();
    expect(screen.getByTestId('member-rate').props.children).toBe(pct(64));
    // Chiffre clé : Plex Mono 26, Encre (charte, maquette `.chiffre`).
    expect(screen.getByTestId('member-rate')).toHaveStyle({
      fontFamily: theme.fonts.digits,
      fontSize: 26,
      color: theme.colors.encre,
    });
    expect(screen.queryByText(t.archived)).toBeNull();
    expect(screen.getByTestId('attendance-bar')).toBeTruthy();
    expect(screen.getByText('6 présents · 1 retard · 1 excusé · 4 absents')).toBeTruthy();
    expect(screen.getByText(m.bySession)).toBeTruthy();
    expect(await squares()).toEqual([
      status('Présent', 1),
      status('Présent', 2),
      status('Retard', 3),
      status('Présent', 4),
      status('Excusé', 5),
      status('Présent', 6),
      status('Présent', 7),
      status('Présent', 8),
      status('Absent', 9),
      status('Absent', 10),
      status('Absent', 11),
      status('Absent', 12),
      // RM-03 : S13, le jour de la fin de son inscription (fin exclue).
      t.notEnrolled('25/11/2026'),
    ]);
    expect(screen.getByText('Case vide : séance hors inscription ou sans statut.')).toBeTruthy();
    // Pas de légende des couleurs ici (décision du porteur du 2026-11-27).
    expect(screen.queryByTestId('attendance-legend')).toBeNull();
  });

  it('RM-03 Léa : cases vides après son départ des Poussins, ses présences des Benjamins absentes', async () => {
    await open(url(seeded.members.lea, seeded.groups.poussins));
    expect(await screen.findByText('7 présents · 0 retard · 0 excusé · 0 absent')).toBeTruthy();
    const labelsShown = await squares();
    expect(labelsShown).toHaveLength(13);
    expect(labelsShown.slice(7)).toEqual([8, 9, 10, 11, 12, 13].map((n) => t.notEnrolled(day(n))));
  });

  it('RM-03 RM-01 Emma, inscrite en cours de période : cases vides avant, « Sans statut », « — » et barre', async () => {
    await open(url(seeded.members.emma, seeded.groups.poussins));
    expect(await screen.findByRole('header', { name: 'Emma Durand' })).toBeTruthy();
    expect(screen.getByTestId('member-rate').props.children).toBe('—');
    expect(screen.getByTestId('attendance-bar').props.accessibilityLabel).toBe(
      `${pct(100)} excusé`,
    );
    expect(screen.getByText('0 présent · 0 retard · 2 excusés · 0 absent')).toBeTruthy();
    expect(await squares()).toEqual([
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => t.notEnrolled(day(n))),
      t.noStatus(day(11)),
      status('Excusé', 12),
      status('Excusé', 13),
    ]);
  });

  it('RM-03 Nour : présence comptée hors inscription (groupe unique) affichée avec son statut', async () => {
    await open(url(seeded.members.nour, seeded.groups.benjamins));
    expect(await screen.findByText('1 présent · 0 retard · 0 excusé · 1 absent')).toBeTruthy();
    const shown = await squares();
    expect(shown[0]).toBe(labels.alerts.square('Absent', '19/10/2026'));
    expect(shown[2]).toBe(labels.alerts.square('Présent', '26/10/2026'));
    expect(shown[3]).toBe(t.notEnrolled('02/11/2026'));
  });

  it('RM-01 membre sans séance sur la période : « — », pas de barre, pas de case', async () => {
    await open(url(seeded.members.zoe, seeded.groups.poussins, 'du=2026-09-03&au=2026-09-08'));
    expect(await screen.findByText('Poussins · du 03/09/2026 au 08/09/2026')).toBeTruthy();
    expect(screen.getByTestId('member-rate').props.children).toBe('—');
    expect(screen.queryByTestId('attendance-bar')).toBeNull();
    expect(screen.getByText(m.noSession)).toBeTruthy();
    expect(screen.queryByTestId('session-square')).toBeNull();
    expect(screen.queryByText(m.legend)).toBeNull();
  });

  it('EX-27 membre archivé : taux et case « Sans statut » de la dernière séance', async () => {
    await open(url(seeded.members.jules, seeded.groups.poussins, 'periode=mois'));
    expect(await screen.findByText('Poussins · du 01/11/2026 au 27/11/2026')).toBeTruthy();
    expect(screen.getByTestId('member-rate').props.children).toBe(pct(100));
    expect(await squares()).toEqual([
      status('Présent', 10),
      status('Présent', 11),
      status('Présent', 12),
      t.noStatus(day(13)),
    ]);
  });

  it('EX-27 membre introuvable ou hors de la liste du groupe : message, retour « ‹ » vers le groupe', async () => {
    const router = await open(url(seeded.members.max, seeded.groups.poussins, 'periode=mois'));
    expect(await screen.findByText(labels.errors.NOT_FOUND)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: labels.common.back }));
    // Sans historique : l'écran du groupe, même période.
    expect(router.getPathname()).toBe(`/stats/groupes/${seeded.groups.poussins}`);
    expect(router.getSearchParams()).toEqual({
      id: String(seeded.groups.poussins),
      periode: 'mois',
    });
  });

  it('EX-27 « ‹ » sans historique ni groupe valide : retour à l’onglet', async () => {
    const router = await open(`/stats/membres/${seeded.members.hugo}?groupe=x`);
    expect(await screen.findByText(labels.errors.NOT_FOUND)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: labels.common.back }));
    expect(router.getPathname()).toBe('/stats');
  });

  it('EX-27 « Archivé » : sous le nom d’un membre archivé, et pour un groupe archivé', async () => {
    await open(url(seeded.members.jules, seeded.groups.poussins));
    expect(await screen.findByRole('header', { name: 'Jules Lefebvre' })).toBeTruthy();
    expect(screen.getByTestId('member-archived').props.children).toBe(t.archived);
    expect(screen.queryByTestId('group-archived')).toBeNull();
  });

  it('EX-27 « Archivé » : groupe archivé (Vétérans), membre actif', async () => {
    await open(url(seeded.members.paul, seeded.groups.veterans));
    expect(await screen.findByRole('header', { name: 'Paul Roux' })).toBeTruthy();
    expect(screen.getByTestId('group-archived').props.children).toBe(t.archived);
    expect(screen.queryByTestId('member-archived')).toBeNull();
  });

  it('EX-27 membre inexistant : message', async () => {
    await open(url(9999, seeded.groups.poussins));
    expect(await screen.findByText(labels.errors.NOT_FOUND)).toBeTruthy();
  });
});
