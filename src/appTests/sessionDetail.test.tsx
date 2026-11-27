// Détail, correction et suppression d'une séance (ticket 013, EX-18), sur une vraie base node:sqlite
// et le jeu fictif : séance du mercredi 25/11 17:30 (Poussins), Alix Présent, Sam Retard. Horloge
// figée au vendredi 27/11/2026 10:00.
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import RollCall from '@/app/appel';
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
  'seances/[id]': SessionDetail,
};
const t = labels.session;
const st = labels.statuses;
const counter = labels.rollCall.counter;
const row = (name: string, status: string) =>
  screen.findByRole('button', { name: labels.rollCall.row(name, status) });
const button = (name: string) => screen.findByRole('button', { name });

describe('Détail d’une séance (EX-18)', () => {
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

  /** Ouvert depuis l'Historique, comme dans l'appli. */
  const openDetail = async (id = s.sessionId) => {
    const screenRouter = await renderRouter(routes, { initialUrl: '/historique' });
    await screen.findByRole('header', { name: labels.history.title });
    await act(async () => {
      router.push(`/seances/${id}`);
    });
    return screenRouter;
  };

  it('EX-18 en-tête, compteur, présences triées par nom, aide ; « Enregistrer » inactif tant que rien ne change', async () => {
    await openDetail();
    expect(await screen.findByRole('header', { name: 'Poussins' })).toBeTruthy();
    expect(screen.getByText('Mer. 25/11/2026 · 17:30 · enregistrée')).toBeTruthy();
    expect(await row('Alix Exemple', st.present)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: labels.rollCall.row('Sam Fictif', st.late) }),
    ).toBeTruthy();
    expect(screen.getByText(counter.present(1))).toBeTruthy();
    expect(screen.getByText(counter.late(1))).toBeTruthy();
    expect(screen.getByText(t.help)).toBeTruthy();
    expect(screen.getByLabelText(labels.rollCall.comment)).toBeTruthy();
    expect((await button(t.save)).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('EX-10 EX-18 corriger : un appui fait défiler les statuts ; statuts et commentaire enregistrés, retour à l’Historique', async () => {
    const screenRouter = await openDetail();
    await fireEvent.press(await row('Sam Fictif', st.late));
    expect(await row('Sam Fictif', st.excused)).toBeTruthy();
    expect(screen.getByText(counter.excused(1))).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(labels.rollCall.comment), '  Pluie  ');
    const save = await button(t.save);
    expect(save.props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(save);
    await waitFor(() => expect(screenRouter.getPathname()).toBe('/historique'));
    expect(
      await db.query(
        'SELECT member_id, status FROM attendances WHERE session_id = ? ORDER BY member_id',
        [s.sessionId],
      ),
    ).toEqual(
      [
        { member_id: s.memberId, status: 'present' },
        { member_id: s.otherMemberId, status: 'excused' },
      ].sort((a, b) => a.member_id - b.member_id),
    );
    expect(await db.query('SELECT comment FROM sessions WHERE id = ?', [s.sessionId])).toEqual([
      { comment: 'Pluie' },
    ]);
  });

  it('EX-18 revenir au statut d’origine : plus rien à enregistrer', async () => {
    await openDetail();
    await fireEvent.press(await row('Alix Exemple', st.present));
    expect((await button(t.save)).props.accessibilityState).toMatchObject({ disabled: false });
    for (const status of [st.absent, st.late, st.excused])
      await fireEvent.press(await row('Alix Exemple', status));
    expect((await button(t.save)).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('EX-18 ABS-05 supprimer après confirmation : tout est effacé, la date redevient un appel manquant', async () => {
    const screenRouter = await openDetail();
    await fireEvent.press(await button(t.delete));
    expect(await screen.findByRole('header', { name: t.deleteTitle })).toBeTruthy();
    expect(screen.getByText(t.deleteMessage('Poussins', '25/11/2026', 2))).toBeTruthy();
    expect(screen.getByText(t.reappears)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.deleteConfirm }));
    await waitFor(() => expect(screenRouter.getPathname()).toBe('/historique'));
    expect(await count(db, 'sessions', 'id = ?', [s.sessionId])).toBe(0);
    expect(await count(db, 'session_groups', 'session_id = ?', [s.sessionId])).toBe(0);
    expect(await count(db, 'attendances', 'session_id = ?', [s.sessionId])).toBe(0);
    expect(
      await screen.findByRole('button', {
        name: labels.rowAccessibility(
          labels.history.missingRow('Poussins'),
          labels.history.missingWhen('Mer. 25/11', '17:30'),
        ),
      }),
    ).toBeTruthy();
  });

  it('EX-18 « Garder » ne supprime rien', async () => {
    await openDetail();
    await fireEvent.press(await button(t.delete));
    await fireEvent.press(await button(t.keep));
    expect(await screen.findByRole('header', { name: 'Poussins' })).toBeTruthy();
    expect(await count(db, 'sessions', 'id = ?', [s.sessionId])).toBe(1);
  });

  it('EX-39 EX-18 appel sans créneau : la confirmation ne promet aucun appel manquant', async () => {
    const { lastInsertRowId: id } = await db.execute(
      "INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, NULL, '2026-11-24', '10:05', 'recorded')",
      [s.seasonId],
    );
    await db.execute('INSERT INTO session_groups (session_id, group_id) VALUES (?, ?)', [
      id,
      s.groupId,
    ]);
    await openDetail(id);
    expect(await screen.findByText('Mar. 24/11/2026 · 10:05 · enregistrée')).toBeTruthy();
    await fireEvent.press(await button(t.delete));
    expect(await screen.findByText(t.deleteMessage('Poussins', '24/11/2026', 0))).toBeTruthy();
    expect(screen.queryByText(t.reappears)).toBeNull();
  });

  it('EX-18 créneau supprimé ou saison inactive : la confirmation ne promet aucun appel manquant', async () => {
    await db.execute('UPDATE seasons SET is_active = 0');
    await openDetail();
    await fireEvent.press(await button(t.delete));
    expect(await screen.findByText(t.deleteMessage('Poussins', '25/11/2026', 2))).toBeTruthy();
    expect(screen.queryByText(t.reappears)).toBeNull();
  });

  it('EX-18 séance introuvable : le message, sans liste ni bouton', async () => {
    await openDetail(9999);
    expect(await screen.findByText(labels.errors.NOT_FOUND)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.delete })).toBeNull();
  });
});
