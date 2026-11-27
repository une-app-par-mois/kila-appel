// Historique (ticket 013, EX-16, EX-17), sur une vraie base node:sqlite et le jeu fictif : créneau du
// mercredi 17:30, groupe Poussins, séance du 25/11 enregistrée (Alix Présent, Sam Retard). Horloge
// figée au vendredi 27/11/2026 10:00 : « 30 derniers jours » commence le 29/10.
import { router as expoRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { type Seeded, seed } from '@/__fixtures__/seed';
import RollCall from '@/app/appel';
import FreeRollCall from '@/app/appel-libre';
import SessionDetail from '@/app/seances/[id]';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = {
  _layout: RootStack,
  ...tabRoutes,
  appel: RollCall,
  'appel-libre': FreeRollCall,
  'seances/[id]': SessionDetail,
};
const open = () => renderRouter(routes, { initialUrl: '/historique' });
const h = labels.history;
const session = (group: string, day: string, present: number, total: number) =>
  labels.rowAccessibility(group, h.sessionWhen(day, present, total));
const missing = (group: string, day: string, time = '17:30') =>
  labels.rowAccessibility(h.missingRow(group), h.missingWhen(day, time));
/** Libellés des lignes, dans l'ordre affiché. */
const rows = async () =>
  (await screen.findAllByTestId('history-row')).map((r) => r.props.accessibilityLabel);

describe('Historique (EX-16, EX-17)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    await db.execute('DELETE FROM roll_call_drafts');
    mockDb = db;
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 10, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  /** Séance sans créneau, enregistrée à la main. */
  const addSession = async (seasonId: number, groupId: number, date: string, time: string) => {
    const { lastInsertRowId: id } = await db.execute(
      "INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, NULL, ?, ?, 'recorded')",
      [seasonId, date, time],
    );
    await db.execute('INSERT INTO session_groups (session_id, group_id) VALUES (?, ?)', [
      id,
      groupId,
    ]);
    return id;
  };

  it('EX-16 EX-17 onglet Historique : 30 derniers jours, appels manquants mêlés, la plus récente en haut', async () => {
    await open();
    expect(await screen.findByRole('header', { name: h.title })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: labels.tabs.history }).props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(await rows()).toEqual([
      session('Poussins', 'Mer. 25/11', 2, 2),
      missing('Poussins', 'Mer. 18/11'),
      missing('Poussins', 'Mer. 11/11'),
      missing('Poussins', 'Mer. 04/11'),
    ]);
    expect(screen.getByRole('button', { name: h.allGroups })).toBeTruthy();
    expect(screen.getByRole('button', { name: h.periods.last30Days })).toBeTruthy();
  });

  it('EX-16 période : saison active, puis toutes les saisons (saisons passées)', async () => {
    const old = await db.query<{ id: number }>('SELECT id FROM groups WHERE season_id = ?', [
      s.otherSeasonId,
    ]);
    await addSession(s.otherSeasonId, old[0]?.id ?? 0, '2026-03-04', '18:00');
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: h.periods.last30Days }));
    await fireEvent.press(await screen.findByRole('button', { name: h.periods.season }));
    // Mercredis du 02/09 au 18/11 sans appel : 12, plus la séance du 25/11.
    expect(await rows()).toHaveLength(13);
    expect((await rows()).at(-1)).toBe(missing('Poussins', 'Mer. 02/09'));
    await fireEvent.press(screen.getByRole('button', { name: h.periods.season }));
    await fireEvent.press(await screen.findByRole('button', { name: h.periods.allSeasons }));
    expect((await rows()).at(-1)).toBe(session('Benjamins', 'Mer. 04/03', 0, 0));
    expect(await rows()).toHaveLength(14);
  });

  it('EX-16 filtre par groupe : seulement ses séances et ses appels manquants', async () => {
    const { lastInsertRowId: lundi } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Benjamins lundi')",
      [s.seasonId],
    );
    await addSession(s.seasonId, lundi, '2026-11-23', '18:00');
    await open();
    expect(await rows()).toHaveLength(5);
    await fireEvent.press(screen.getByRole('button', { name: h.allGroups }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Benjamins lundi' }));
    expect(await rows()).toEqual([session('Benjamins lundi', 'Lun. 23/11', 0, 0)]);
  });

  it('EX-16 aucune ligne pour ces filtres : « Aucun appel pour ces filtres. »', async () => {
    await db.execute("INSERT INTO groups (season_id, name) VALUES (?, 'Adultes')", [s.seasonId]);
    await open();
    // Sans séance, Adultes n'est proposé qu'avec la saison entière.
    await fireEvent.press(await screen.findByRole('button', { name: h.periods.last30Days }));
    await fireEvent.press(await screen.findByRole('button', { name: h.periods.season }));
    await fireEvent.press(await screen.findByRole('button', { name: h.allGroups }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Adultes' }));
    expect(await screen.findByText(h.noMatch)).toBeTruthy();
    expect(screen.queryByText(h.empty)).toBeNull();
  });

  it('EX-17 un appel manquant ouvre son appel ; une séance ouvre son détail', async () => {
    const router = await open();
    await fireEvent.press(
      await screen.findByRole('button', { name: missing('Poussins', 'Mer. 18/11') }),
    );
    expect(router.getPathname()).toBe('/appel');
    expect(router.getSearchParams()).toMatchObject({
      creneau: String(s.slotId),
      date: '2026-11-18',
    });
    await act(async () => {
      expoRouter.back();
    });
    await fireEvent.press(
      await screen.findByRole('button', { name: session('Poussins', 'Mer. 25/11', 2, 2) }),
    );
    expect(router.getPathname()).toBe(`/seances/${s.sessionId}`);
  });

  it('EX-17 la séance de « Maintenant », finie et sans appel, est dans l’Historique', async () => {
    jest.setSystemTime(new Date(2026, 11, 2, 19, 30));
    await open();
    expect((await rows())[0]).toBe(missing('Poussins', 'Mer. 02/12'));
  });

  it('EX-02 séance d’un groupe supprimé : « Groupe supprimé », seulement avec tous les groupes', async () => {
    await db.execute('DELETE FROM slots');
    await db.execute('DELETE FROM groups WHERE id = ?', [s.groupId]);
    await open();
    expect(await rows()).toEqual([session(h.removedGroup, 'Mer. 25/11', 2, 2)]);
  });

  it('P1 rien d’enregistré ni de manquant : la carte de la maquette, « Faire l’appel » comme « Nouvel appel »', async () => {
    await db.execute('DELETE FROM sessions');
    await db.execute('DELETE FROM slots');
    const router = await open();
    const card = await screen.findByText(h.empty);
    expect(card).toBeTruthy();
    expect(screen.queryByText(h.noMatch)).toBeNull();
    expect(screen.queryByRole('button', { name: h.allGroups })).toBeNull();
    await fireEvent.press(
      within(screen.getByTestId('history-empty')).getByRole('button', { name: h.start }),
    );
    expect(router.getPathname()).toBe('/appel-libre');
  });
  it('EX-16 « 30 derniers jours » couvre toutes les saisons (changement de saison, aucune saison active)', async () => {
    jest.setSystemTime(new Date(2026, 7, 15, 10, 0));
    await db.execute('UPDATE seasons SET is_active = 0');
    // La séance du 25/11 du jeu fictif serait future à cette date.
    await db.execute('DELETE FROM sessions');
    const [old] = await db.query<{ id: number }>('SELECT id FROM groups WHERE season_id = ?', [
      s.otherSeasonId,
    ]);
    await addSession(s.otherSeasonId, old?.id ?? 0, '2026-07-29', '18:00');
    await addSession(s.otherSeasonId, old?.id ?? 0, '2026-07-01', '18:00');
    await open();
    expect(await rows()).toEqual([session('Benjamins', 'Mer. 29/07', 0, 0)]);
    await fireEvent.press(screen.getByRole('button', { name: h.allGroups }));
    expect(
      await screen.findByRole('button', { name: h.groupOfSeason('Benjamins', 'Saison 2025-2026') }),
    ).toBeTruthy();
    // Seuls les groupes qui ont une séance dans la période sont proposés.
    expect(screen.queryByRole('button', { name: /^Poussins/ })).toBeNull();
  });

  it('EX-16 changement de période : un groupe qui n’y existe pas redevient « Tous les groupes » aussitôt', async () => {
    await db.execute(
      "INSERT INTO groups (season_id, name, archived_at) VALUES (?, 'Adultes', '2026-10-01')",
      [s.seasonId],
    );
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: h.periods.last30Days }));
    await fireEvent.press(await screen.findByRole('button', { name: h.periods.season }));
    await fireEvent.press(await screen.findByRole('button', { name: h.allGroups }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Adultes' }));
    expect(await screen.findByText(h.noMatch)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: h.periods.season }));
    await fireEvent.press(await screen.findByRole('button', { name: h.periods.last30Days }));
    // Aussitôt : « Tous les groupes », sans « Aucun appel pour ces filtres » de passage.
    expect(screen.getByRole('button', { name: h.allGroups })).toBeTruthy();
    expect(screen.queryByText(h.noMatch)).toBeNull();
    expect(await rows()).toHaveLength(4);
  });

  it('EX-16 changement de filtre dont la lecture échoue : aucune ligne de l’ancien filtre ne reste', async () => {
    await open();
    expect(await rows()).toHaveLength(4);
    await db.execute('ALTER TABLE sessions RENAME TO sessions_hidden');
    await fireEvent.press(screen.getByRole('button', { name: h.periods.last30Days }));
    await fireEvent.press(await screen.findByRole('button', { name: h.periods.season }));
    expect(await screen.findByText(labels.common.loadFailed)).toBeTruthy();
    expect(screen.queryAllByTestId('history-row')).toHaveLength(0);
  });
});
