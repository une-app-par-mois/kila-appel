// Écran « Statistiques d'un groupe » (ticket 025, EX-27, RM-01, RM-03, NF-06), ouvert depuis
// l'onglet Statistiques, sur une vraie base node:sqlite et le jeu fictif du 023 (`statsSeed.ts`).
// Horloge figée au vendredi 27/11/2026 10:00. Période passée en paramètres de route : `periode`
// (saison, mois) ou `du` et `au` (décision du porteur du 2026-11-27).
import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { type StatsSeeded, statsSeed } from '@/__fixtures__/statsSeed';
import StatsGroup from '@/app/stats/groupes/[id]';
import StatsMember from '@/app/stats/membres/[id]';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
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
  'stats/groupes/[id]': StatsGroup,
  'stats/membres/[id]': StatsMember,
};
const open = (initialUrl = '/stats') => renderRouter(routes, { initialUrl });
const t = labels.stats;
const g = labels.stats.groupScreen;
const pct = (n: number) => `${n}${NBSP}%`;
/** Ligne d'un groupe de l'onglet, trouvée par son nom. */
const tabRow = async (name: string) =>
  (await screen.findAllByTestId('stats-group')).find(
    (row) => within(row).queryByText(name) !== null,
  ) as never;
/** Lignes « Par membre » : nom affiché de chacune. */
const memberRows = async () => screen.findAllByTestId('stats-member');
const memberRow = async (name: string) =>
  within((await memberRows()).find((row) => within(row).queryByText(name) !== null) as never);

describe('Statistiques d’un groupe (ticket 025, EX-27, RM-01)', () => {
  let db: Db;
  let seeded: StatsSeeded;
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

  it('EX-27 RM-01 saison : un appui sur Poussins ouvre ses membres, triés par nom, avec leur taux', async () => {
    const router = await open();
    await fireEvent.press(await tabRow('Poussins'));
    expect(router.getPathname()).toBe(`/stats/groupes/${seeded.groups.poussins}`);
    expect(router.getSearchParams()).toEqual({
      id: String(seeded.groups.poussins),
      periode: 'saison',
    });
    expect(await screen.findByRole('header', { name: 'Poussins' })).toBeTruthy();
    expect(await screen.findByText(g.subtitle('Saison 2026-2027', 13))).toBeTruthy();
    expect(screen.getByText('Saison 2026-2027 · 13 séances')).toBeTruthy();
    expect(screen.getByText(g.byMember)).toBeTruthy();
    const rows = await memberRows();
    expect(rows.map((r) => within(r).getByTestId('stats-member-name').props.children)).toEqual([
      'Zoé Blanc',
      'Emma Durand',
      'Jules Lefebvre',
      'Léa Michel',
      'Hugo Moreau',
    ]);
    expect((await memberRow('Zoé Blanc')).getByText(pct(100))).toBeTruthy();
    // Que des excusés : pas de taux (RM-01).
    expect((await memberRow('Emma Durand')).getByText('—')).toBeTruthy();
    const jules = await memberRow('Jules Lefebvre');
    expect(jules.getByText(pct(92))).toBeTruthy();
    expect(jules.getByText(t.archived)).toBeTruthy();
    expect((await memberRow('Léa Michel')).getByText(pct(100))).toBeTruthy();
    expect((await memberRow('Hugo Moreau')).getByText(pct(64))).toBeTruthy();
    // Taux des listes : Plex Mono 18, Encre (charte, maquette `.taux`).
    expect((await memberRow('Hugo Moreau')).getByText(pct(64))).toHaveStyle({
      fontFamily: theme.fonts.digits,
      fontSize: 18,
      color: theme.colors.encre,
    });
    expect(screen.getByText('Triés par nom ; 5 membres.')).toBeTruthy();
    // Podium masqué jusqu'au jalon 5 (F-14) ; Max Bernard, archivé sans présence, jamais listé.
    expect(screen.queryByText(/Podium/)).toBeNull();
    expect(screen.queryByText('Max Bernard')).toBeNull();
  });

  it('EX-27 « Saison » filtre par saison : une séance d’une autre saison aux mêmes dates ne compte pas', async () => {
    const other = (
      await db.execute(
        "INSERT INTO seasons (name, start_date, end_date, is_active) VALUES ('Été', '2026-10-01', '2026-12-31', 0)",
      )
    ).lastInsertRowId;
    const session = (
      await db.execute(
        "INSERT INTO sessions (season_id, date, start_time, state) VALUES (?, '2026-11-05', '17:30', 'recorded')",
        [other],
      )
    ).lastInsertRowId;
    await db.execute('INSERT INTO session_groups (session_id, group_id) VALUES (?, ?)', [
      session,
      seeded.groups.poussins,
    ]);
    await db.execute(
      "INSERT INTO attendances (session_id, member_id, status) VALUES (?, ?, 'absent')",
      [session, seeded.members.zoe],
    );
    await open();
    // Onglet et écran du groupe : mêmes chiffres, la séance de l'autre saison n'y est pas.
    expect(within(await tabRow('Poussins')).getByText(pct(88))).toBeTruthy();
    await fireEvent.press(await tabRow('Poussins'));
    expect(await screen.findByText(g.subtitle('Saison 2026-2027', 13))).toBeTruthy();
    expect((await memberRow('Zoé Blanc')).getByText(pct(100))).toBeTruthy();
  });

  it('EX-27 « Ce mois » : periode=mois, du 01/11 au 27/11, 4 séances, Léa absente de la liste', async () => {
    const router = await open();
    await fireEvent.press(await screen.findByRole('button', { name: t.periods.month }));
    expect(await screen.findByText(t.periodShown('01/11/2026', '27/11/2026'))).toBeTruthy();
    await fireEvent.press(await tabRow('Poussins'));
    expect(router.getSearchParams()).toMatchObject({ periode: 'mois' });
    expect(await screen.findByText(g.subtitle('Du 01/11/2026 au 27/11/2026', 4))).toBeTruthy();
    expect((await memberRow('Hugo Moreau')).getByText(pct(0))).toBeTruthy();
    expect((await memberRow('Jules Lefebvre')).getByText(pct(100))).toBeTruthy();
    expect(screen.queryByText('Léa Michel')).toBeNull();
    expect(screen.getByText('Triés par nom ; 4 membres.')).toBeTruthy();
  });

  it('EX-27 dates libres : du et au transmis, « 1 séance », groupe archivé « Archivé »', async () => {
    const router = await open('/stats?du=2026-03-01&au=2026-03-31');
    await fireEvent.press(await tabRow('Anciens'));
    expect(router.getSearchParams()).toEqual({
      id: String(seeded.groups.anciens),
      du: '2026-03-01',
      au: '2026-03-31',
    });
    expect(await screen.findByText('Du 01/03/2026 au 31/03/2026 · 1 séance')).toBeTruthy();
    expect(screen.getByText(t.archived)).toBeTruthy();
    expect((await memberRow('Zoé Blanc')).getByText(pct(100))).toBeTruthy();
    expect((await memberRow('Paul Roux')).getByText(pct(0))).toBeTruthy();
  });

  it('EX-27 groupe archivé ou sans séance : ligne appuyable ; « Aucun membre sur la période. »', async () => {
    const router = await open();
    await fireEvent.press(await tabRow('Vétérans'));
    expect(await screen.findByRole('header', { name: 'Vétérans' })).toBeTruthy();
    expect(screen.getByText(t.archived)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: labels.common.back }));
    expect(router.getPathname()).toBe('/stats');
    await fireEvent.press(await tabRow('Adultes'));
    expect(await screen.findByRole('header', { name: 'Adultes' })).toBeTruthy();
    expect(screen.getByText('Saison 2026-2027 · 0 séance')).toBeTruthy();
    expect(screen.getByText(g.noMember)).toBeTruthy();
    expect(screen.queryByText(/Triés par nom/)).toBeNull();
  });

  it('EX-27 un appui sur un membre ouvre ses statistiques dans ce groupe, même période', async () => {
    const router = await open(`/stats/groupes/${seeded.groups.poussins}?periode=mois`);
    const hugo = await screen.findByRole('button', { name: `Hugo Moreau, ${pct(0)}` });
    await fireEvent.press(hugo);
    expect(router.getPathname()).toBe(`/stats/membres/${seeded.members.hugo}`);
    expect(router.getSearchParams()).toEqual({
      id: String(seeded.members.hugo),
      groupe: String(seeded.groups.poussins),
      periode: 'mois',
    });
    expect(await screen.findByRole('header', { name: 'Hugo Moreau' })).toBeTruthy();
    // NF-06 : nom, « Archivé » et taux lus d'un bloc.
    await fireEvent.press(screen.getByRole('button', { name: labels.common.back }));
    expect(
      await screen.findByRole('button', { name: `Jules Lefebvre, ${t.archived}, ${pct(100)}` }),
    ).toBeTruthy();
  });

  it('EX-27 appui pendant la relecture d’une nouvelle période : le groupe s’ouvre sur la période choisie', async () => {
    const router = await open();
    expect(within(await tabRow('Poussins')).getByText(pct(88))).toBeTruthy();
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const query = db.query.bind(db);
    const spy = jest.spyOn(db, 'query').mockImplementation(async (...args) => {
      await gate;
      return query(...args);
    });
    await fireEvent.press(await screen.findByRole('button', { name: t.periods.month }));
    // Chiffres de la saison encore affichés : l'appui suit pourtant « Ce mois ».
    expect(within(await tabRow('Poussins')).getByText(pct(88))).toBeTruthy();
    await fireEvent.press(await tabRow('Poussins'));
    expect(router.getSearchParams()).toEqual({
      id: String(seeded.groups.poussins),
      periode: 'mois',
    });
    spy.mockRestore();
    release();
    expect(await screen.findByText(g.subtitle('Du 01/11/2026 au 27/11/2026', 4))).toBeTruthy();
  });

  it('NF-06 ligne de groupe de l’onglet : lue d’un bloc (nom, Archivé, taux, parts), taux en Encre 18', async () => {
    await open();
    const veterans = await tabRow('Vétérans');
    expect((veterans as { props: { accessibilityLabel: string } }).props.accessibilityLabel).toBe(
      `Vétérans, ${t.archived}, ${pct(100)}, ${pct(100)} retard`,
    );
    expect(within(veterans).getByTestId('attendance-bar').props.accessible).toBe(false);
    expect(
      ((await tabRow('Adultes')) as { props: { accessibilityLabel: string } }).props
        .accessibilityLabel,
    ).toBe(`Adultes, —, ${t.noSession}`);
    expect(within(veterans).getByText(pct(100))).toHaveStyle({
      fontFamily: theme.fonts.digits,
      fontSize: 18,
      color: theme.colors.encre,
    });
    expect(within(await screen.findByTestId('stats-rate')).getByText(pct(87))).toHaveStyle({
      fontFamily: theme.fonts.digits,
      fontSize: 26,
      color: theme.colors.encre,
    });
  });

  it('EX-27 groupe introuvable : message, retour « ‹ » vers l’onglet', async () => {
    const router = await open('/stats/groupes/9999?periode=saison');
    expect(await screen.findByText(labels.errors.NOT_FOUND)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: labels.common.back }));
    expect(router.getPathname()).toBe('/stats');
  });

  it('EX-27 dates reçues invalides : message de saisie, rien n’est lu', async () => {
    await open(`/stats/groupes/${seeded.groups.poussins}?du=2026-12-01&au=2026-11-01`);
    expect(await screen.findByText(labels.errors.END_BEFORE_START)).toBeTruthy();
    expect(screen.queryByTestId('stats-member')).toBeNull();
  });
});
