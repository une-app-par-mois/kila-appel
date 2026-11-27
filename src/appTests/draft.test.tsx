// Brouillon d'appel (ticket 011, EX-14), sur une vraie base node:sqlite et le jeu fictif :
// créneau du mercredi 17:30, groupe Poussins, membres Alix Exemple et Sam Fictif.
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import RollCall from '@/app/appel';
import FreeRollCall from '@/app/appel-libre';
import { tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  ...tabRoutes,
  appel: RollCall,
  'appel-libre': FreeRollCall,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels.rollCall;
const d = labels.draft;
const st = labels.statuses;
const DATE = '2026-11-18';
const row = (name: string, status: string) =>
  screen.findByRole('button', { name: t.row(name, status) });
const button = (name: string | RegExp) => screen.findByRole('button', { name });
/** Attend qu'une lecture de la base donne la valeur voulue (écritures du brouillon en arrière-plan). */
const eventually = async <T,>(read: () => Promise<T>, expected: T) => {
  for (let i = 0; i < 100; i++) {
    const value = await read();
    if (JSON.stringify(value) === JSON.stringify(expected)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  expect(await read()).toEqual(expected);
};

describe('Brouillon d’appel (EX-14)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    await db.execute('DELETE FROM roll_call_drafts');
    mockDb = db;
    // Horloge figée : mercredi 18/11/2026 18:00, pendant la séance du jeu fictif.
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 18, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  /** Brouillon tel qu'une fermeture forcée le laisse en base. */
  const insertDraft = async (
    slotId: number | null,
    date: string,
    startedAt: string,
    comment: string | null,
    statuses: [number, string][],
  ) => {
    await db.execute(
      "INSERT INTO roll_call_drafts (id, season_id, slot_id, date, started_at, comment, updated_at) VALUES (1, ?, ?, ?, ?, ?, '2026-11-18T18:01')",
      [s.seasonId, slotId, date, startedAt, comment],
    );
    await db.execute('INSERT INTO roll_call_draft_groups (draft_id, group_id) VALUES (1, ?)', [
      s.groupId,
    ]);
    for (const [memberId, status] of statuses) {
      await db.execute(
        'INSERT INTO roll_call_draft_statuses (draft_id, member_id, status) VALUES (1, ?, ?)',
        [memberId, status],
      );
    }
  };

  const draftStatuses = () =>
    db.query<{ member_id: number; status: string }>(
      'SELECT member_id, status FROM roll_call_draft_statuses ORDER BY member_id',
    );

  it('EX-14 aucun brouillon à l’ouverture ; chaque appui est écrit aussitôt, commentaire compris', async () => {
    await open(`/appel?creneau=${s.slotId}&date=${DATE}`);
    expect(await screen.findByText(d.savedOnEachTap)).toBeTruthy();
    expect(await count(db, 'roll_call_drafts')).toBe(0);
    await fireEvent.press(await row('Alix Exemple', st.present));
    await eventually(() => draftStatuses(), [{ member_id: s.memberId, status: 'absent' }]);
    await fireEvent.press(await row('Alix Exemple', st.absent));
    await eventually(() => draftStatuses(), [{ member_id: s.memberId, status: 'late' }]);
    await fireEvent.changeText(screen.getByLabelText(t.comment), 'Gymnase froid');
    await eventually(
      () => db.query('SELECT comment, started_at FROM roll_call_drafts'),
      [{ comment: 'Gymnase froid', started_at: '18:00' }],
    );
  });

  it('EX-14 après une fermeture forcée, l’accueil propose l’appel en cours, retrouvé tel quel', async () => {
    // État laissé par une fermeture forcée en plein appel : le brouillon écrit à chaque appui.
    await insertDraft(s.slotId, DATE, '18:00', 'Gymnase froid', [[s.memberId, 'absent']]);
    await open('/');
    expect(await screen.findByText(d.summary('Poussins', '18:00', d.absents(1)))).toBeTruthy();
    await fireEvent.press(await button(d.resume));
    expect(await row('Alix Exemple', st.absent)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.row('Sam Fictif', st.present) })).toBeTruthy();
    expect(screen.getByLabelText(t.comment).props.value).toBe('Gymnase froid');
  });

  it('EX-14 « Nouvel appel » ouvre le brouillon ; l’enregistrement l’efface', async () => {
    await insertDraft(s.slotId, DATE, '17:40', null, [[s.otherMemberId, 'excused']]);
    const router = await open('/');
    await fireEvent.press(await button(new RegExp(`^${t.entry}`)));
    expect(router.getPathname()).toBe('/appel');
    expect(await row('Sam Fictif', st.excused)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.save }));
    expect(await screen.findByText(t.saved)).toBeTruthy();
    expect(await count(db, 'roll_call_drafts')).toBe(0);
    // Le retour à l'Historique (1,2 s) se fait dans ce test, pas pendant le suivant.
    await waitFor(() => expect(router.getPathname()).toBe('/historique'), { timeout: 3000 });
    expect(
      await db.query(
        'SELECT status FROM attendances a JOIN sessions s ON s.id = a.session_id WHERE s.date = ? AND a.member_id = ?',
        [DATE, s.otherMemberId],
      ),
    ).toEqual([{ status: 'excused' }]);
  });

  it('EX-14 abandonner : confirmation, puis le brouillon disparaît ; « Revenir » le garde', async () => {
    await insertDraft(s.slotId, DATE, '18:00', null, [[s.memberId, 'absent']]);
    await open('/');
    await fireEvent.press(await button(d.abandon));
    expect(await screen.findByText(d.abandonMessage('Poussins'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: d.keep }));
    expect(await count(db, 'roll_call_drafts')).toBe(1);
    await fireEvent.press(await button(d.abandon));
    // Le bouton de la carte et celui de la confirmation portent le même nom : le dernier est
    // celui de la confirmation.
    await screen.findByText(d.abandonMessage('Poussins'));
    const confirms = screen.getAllByRole('button', { name: d.abandonConfirm });
    await fireEvent.press(confirms[confirms.length - 1] as (typeof confirms)[number]);
    await eventually(() => count(db, 'roll_call_drafts'), 0);
    await waitFor(() => expect(screen.queryByText(d.title)).toBeNull());
  });

  it('EX-14 un autre appel tant qu’un brouillon existe : bloqué, « Reprendre l’appel » (décision du 2026-11-27)', async () => {
    await insertDraft(s.slotId, DATE, '18:00', null, [[s.memberId, 'absent']]);
    await open(`/appel?groupe=${s.groupId}&date=2026-11-17`);
    expect(await screen.findByText(d.inProgress('Poussins', '18/11/2026'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.save })).toBeNull();
    await fireEvent.press(await button(d.resume));
    expect(await row('Alix Exemple', st.absent)).toBeTruthy();
  });

  it('EX-14 brouillon d’un groupe archivé : seulement « Abandonner », nulle part « Reprendre »', async () => {
    await insertDraft(s.slotId, DATE, '18:00', null, [[s.memberId, 'absent']]);
    await db.execute("UPDATE groups SET archived_at = '2026-11-18' WHERE id = ?", [s.groupId]);
    await open('/');
    expect(await screen.findByText(d.unresumable)).toBeTruthy();
    // Pas de Bienvenue pendant un appel en cours (décision du porteur du 2026-11-27, 012b).
    expect(screen.queryByRole('header', { name: labels.welcome.title })).toBeNull();
    expect(await button(d.abandon)).toBeTruthy();
    expect(screen.queryByRole('button', { name: d.resume })).toBeNull();
  });

  it('EX-14 créneau à deux groupes : le brouillon reprend son groupe, sans se bloquer lui-même', async () => {
    const { lastInsertRowId: other } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Vétérans')",
      [s.seasonId],
    );
    await db.execute('INSERT INTO slot_groups (slot_id, group_id) VALUES (?, ?)', [
      s.slotId,
      other,
    ]);
    await db.execute(
      "INSERT INTO roll_call_drafts (id, season_id, slot_id, date, started_at, updated_at) VALUES (1, ?, ?, ?, '18:00', '2026-11-18T18:01')",
      [s.seasonId, s.slotId, DATE],
    );
    await db.execute('INSERT INTO roll_call_draft_groups (draft_id, group_id) VALUES (1, ?)', [
      other,
    ]);
    await open('/');
    await fireEvent.press(await button(d.resume));
    expect(await screen.findByText('Vétérans')).toBeTruthy();
    expect(screen.queryByText(d.inProgress('Vétérans', '18/11/2026'))).toBeNull();
    expect(await screen.findByText(d.savedOnEachTap)).toBeTruthy();
  });

  it('EX-14 EX-39 appel sans créneau repris plus tard : garde l’heure de son ouverture', async () => {
    // Ouvert à 18:00, fermé de force, repris à 19:30.
    await insertDraft(null, '2026-11-17', '18:00', null, [[s.otherMemberId, 'absent']]);
    jest.setSystemTime(new Date(2026, 10, 18, 19, 30));
    const second = await open(`/appel?groupe=${s.groupId}&date=2026-11-17`);
    expect(await screen.findByText('Mar. 17/11/2026 · 18:00')).toBeTruthy();
    expect(await row('Sam Fictif', st.absent)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.save }));
    expect(await screen.findByText(t.saved)).toBeTruthy();
    expect(await db.query("SELECT start_time FROM sessions WHERE date = '2026-11-17'")).toEqual([
      { start_time: '18:00' },
    ]);
    await waitFor(() => expect(second.getPathname()).toBe('/historique'), { timeout: 3000 });
  });
});
