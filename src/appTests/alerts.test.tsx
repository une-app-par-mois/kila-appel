// Alertes d'assiduité : écrans (ticket 022, F-04, EX-25, EX-26), sur une vraie base node:sqlite et
// le jeu fictif : Alix absente aux trois appels libres des 28/11, 01/12 et 03/12, Sam présent.
// Horloge figée au vendredi 04/12/2026 10:00 (aucune séance du moment).
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { alertsWorld } from '@/__fixtures__/alertsSeed';
import { type Seeded, seed } from '@/__fixtures__/seed';
import AlertScreen from '@/app/alertes/[id]';
import AlertThreshold from '@/app/assiduite';
import Emergency from '@/app/urgence';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { notifyDataChanged } from '@/hooks/dataChanged';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = {
  _layout: RootStack,
  ...tabRoutes,
  'alertes/[id]': AlertScreen,
  assiduite: AlertThreshold,
  urgence: Emergency,
};
const open = (initialUrl = '/') => renderRouter(routes, { initialUrl });
const a = labels.alerts;
const row = (name: string, group: string, n: number) =>
  labels.rowAccessibility(labels.rowAccessibility(name, group), a.absences(n));
const ALIX = row('Alix Exemple', 'Poussins', 3);

describe('Alertes d’assiduité : écrans (ticket 022)', () => {
  let db: Db;
  let s: Seeded;
  const absentOn = (date: string, memberId = s.memberId) =>
    alertsWorld(db).session(s.seasonId, [s.groupId], date, '18:00', [
      [memberId, 'absent'],
      [s.otherMemberId, 'present'],
    ]);
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    await db.execute('DELETE FROM alert_acks');
    await db.execute('DELETE FROM roll_call_drafts');
    for (const date of ['2026-11-28', '2026-12-01', '2026-12-03']) await absentOn(date);
    mockDb = db;
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 11, 4, 10, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('EX-25 accueil : nom, groupe et « 3 absences » lus d’un bloc ; un appui ouvre l’alerte', async () => {
    const router = await open();
    expect(await screen.findByText(a.section)).toBeTruthy();
    expect(screen.getByText(a.absences(3))).toBeTruthy();
    await fireEvent.press(await screen.findByRole('button', { name: ALIX }));
    expect(router.getPathname()).toBe(`/alertes/${s.memberId}`);
  });

  it('EX-25 sans alerte : état vide de la maquette, avec le seuil réglé', async () => {
    await db.execute("INSERT INTO settings (key, value) VALUES ('alert_threshold', '4')");
    await open();
    expect(await screen.findByText(a.empty(4))).toBeTruthy();
    expect(screen.queryByRole('button', { name: ALIX })).toBeNull();
  });

  it('EX-25 au plus 5 alertes sur l’accueil, puis « et N autres »', async () => {
    const w = alertsWorld(db);
    for (let i = 0; i < 6; i += 1) {
      const id = await w.member(`Nom${i}`, `Prénom${i}`);
      await w.enroll(id, s.groupId, '2026-09-01');
      for (const date of ['2026-12-01', '2026-12-02', '2026-12-03']) await absentOn(date, id);
    }
    await open();
    expect(await screen.findByText(a.more(2))).toBeTruthy();
    expect(screen.getAllByText(/^\d+ absences$/)).toHaveLength(5);
  });

  it('EX-25 appel en cours : l’accueil garde la section des alertes', async () => {
    await db.execute(
      'INSERT INTO roll_call_drafts (id, season_id, slot_id, date, started_at, updated_at) VALUES (1, ?, ?, ?, ?, ?)',
      [s.seasonId, s.slotId, '2026-12-04', '09:58', '2026-12-04T09:59:00'],
    );
    await open();
    expect(await screen.findByRole('button', { name: ALIX })).toBeTruthy();
  });

  it('EX-25 lecture des alertes en échec : section cachée, message d’erreur', async () => {
    await db.execute('DROP TABLE alert_acks');
    await open();
    expect(await screen.findByText(labels.common.loadFailed)).toBeTruthy();
    expect(screen.queryByText(a.section)).toBeNull();
  });

  it('EX-26 écran de l’alerte : sous-titre, dernières séances (icône et libellé, NF-06)', async () => {
    await open(`/alertes/${s.memberId}`);
    expect(await screen.findByRole('header', { name: 'Alix Exemple' })).toBeTruthy();
    expect(await screen.findByText(a.subtitle('Poussins', 3))).toBeTruthy();
    const squares = screen.getAllByTestId('session-square');
    expect(squares.map((q) => q.props.accessibilityLabel)).toEqual([
      a.square('Absent', '03/12/2026'),
      a.square('Absent', '01/12/2026'),
      a.square('Absent', '28/11/2026'),
      a.square('Présent', '25/11/2026'),
    ]);
    expect(screen.getByText(a.recentOrder)).toBeTruthy();
  });

  it('EX-26 « Marquer comme traitée » : retour à l’accueil sans l’alerte ; une absence de plus la ramène', async () => {
    const router = await open();
    await fireEvent.press(await screen.findByRole('button', { name: ALIX }));
    await fireEvent.press(await screen.findByRole('button', { name: a.acknowledge }));
    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(await screen.findByText(a.empty(3))).toBeTruthy();
    await absentOn('2026-12-04');
    await act(async () => notifyDataChanged());
    expect(
      await screen.findByRole('button', { name: row('Alix Exemple', 'Poussins', 4) }),
    ).toBeTruthy();
    expect(router.getPathname()).toBe('/');
  });

  it('EX-26 alerte qui n’est plus montrée à l’ouverture : retour à l’accueil', async () => {
    const router = await open(`/alertes/${s.otherMemberId}`);
    await waitFor(() => expect(router.getPathname()).toBe('/'));
  });

  it('EX-26 traitement refusé : message à l’écran, l’alerte reste', async () => {
    await db.execute(
      "CREATE TRIGGER refuse BEFORE INSERT ON alert_acks BEGIN SELECT RAISE(ABORT, 'refus'); END",
    );
    const router = await open(`/alertes/${s.memberId}`);
    await fireEvent.press(await screen.findByRole('button', { name: a.acknowledge }));
    expect(await screen.findByText(labels.errors.unknown)).toBeTruthy();
    expect(router.getPathname()).toBe(`/alertes/${s.memberId}`);
  });

  it('EX-25 « Voir ses contacts d’urgence » : recherche remplie avec le nom, sans nom dans la route (ABS-04)', async () => {
    const router = await open(`/alertes/${s.memberId}`);
    await fireEvent.press(await screen.findByRole('button', { name: a.contacts }));
    expect(router.getPathname()).toBe('/urgence');
    expect(router.getSearchParams()).toEqual({ membre: String(s.memberId) });
    expect(await screen.findByDisplayValue('Alix Exemple')).toBeTruthy();
    expect(await screen.findByText('Parent')).toBeTruthy();
  });

  it.each(['abc', '999'])(
    'EX-06 recherche d’urgence, membre « %s » invalide ou inconnu : vide',
    async (id) => {
      await open(`/urgence?membre=${id}`);
      expect(await screen.findByRole('header', { name: labels.emergency.title })).toBeTruthy();
      await act(async () => undefined);
      expect(screen.queryByDisplayValue(/./)).toBeNull();
    },
  );

  it('EX-25 seuil réglé : Paramètres et accueil suivent sans redémarrer', async () => {
    const router = await open('/parametres');
    expect(await screen.findByText(a.settingsSection)).toBeTruthy();
    const settingsRow = labels.rowAccessibility(a.settingTitle, a.settingsRow(3));
    await fireEvent.press(await screen.findByRole('button', { name: settingsRow }));
    expect(router.getPathname()).toBe('/assiduite');
    expect(screen.getByText(a.onlyUnexcused)).toBeTruthy();
    await fireEvent.press(await screen.findByRole('button', { name: a.choiceAccessibility(3) }));
    await fireEvent.press(await screen.findByRole('button', { name: a.choice(4) }));
    expect(await screen.findByRole('button', { name: a.choiceAccessibility(4) })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: labels.common.back }));
    expect(
      await screen.findByRole('button', {
        name: labels.rowAccessibility(a.settingTitle, a.settingsRow(4)),
      }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: labels.tabs.home }));
    expect(await screen.findByText(a.empty(4))).toBeTruthy();
  });
});
