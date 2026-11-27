// Écran d'appel (ticket 010b, EX-09 à EX-15), sur une vraie base node:sqlite et le jeu fictif :
// créneau du mercredi 17:30, groupe Poussins, membres Alix Exemple et Sam Fictif.
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import RollCall from '@/app/appel';
import FreeRollCall from '@/app/appel-libre';
import Settings from '@/app/index';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = { index: Settings, appel: RollCall, 'appel-libre': FreeRollCall };
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels.rollCall;
const st = labels.statuses;
// Un mercredi passé, sans séance enregistrée (celle du 25/11 l'est dans le jeu fictif).
const DATE = '2026-11-18';
const row = (name: string, status: string) =>
  screen.findByRole('button', { name: t.row(name, status) });

describe('Écran d’appel (EX-09 à EX-15)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    mockDb = db;
    // Horloge figée : mercredi 18/11/2026 18:00, pendant la séance du jeu fictif.
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 18, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  const openCall = () => open(`/appel?creneau=${s.slotId}&date=${DATE}`);

  it('EX-09 EX-10 en-tête, membres inscrits triés par nom, tous à Présent, compteur', async () => {
    await openCall();
    expect(await screen.findByRole('header', { name: 'Poussins' })).toBeTruthy();
    expect(screen.getByText('Mer. 18/11/2026 · 17:30 · Gymnase')).toBeTruthy();
    expect(await row('Alix Exemple', st.present)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.row('Sam Fictif', st.present) })).toBeTruthy();
    const names = screen.getAllByTestId('roll-call-name').map((n) => n.props.children);
    expect(names).toEqual(['Alix Exemple', 'Sam Fictif']);
    expect(screen.getByText(t.counter.present(2))).toBeTruthy();
    expect(screen.getByText(t.counter.absent(0))).toBeTruthy();
    // EX-11 : la recherche n'apparaît qu'au-delà de 20 membres.
    expect(screen.queryByLabelText(t.search)).toBeNull();
  });

  it('EX-10 un appui fait défiler Présent → Absent → Retard → Excusé → Présent ; compteur à jour', async () => {
    await openCall();
    await fireEvent.press(await row('Alix Exemple', st.present));
    await fireEvent.press(await row('Alix Exemple', st.absent));
    expect(await row('Alix Exemple', st.late)).toBeTruthy();
    expect(screen.getByText(t.counter.present(1))).toBeTruthy();
    expect(screen.getByText(t.counter.late(1))).toBeTruthy();
    await fireEvent.press(await row('Alix Exemple', st.late));
    await fireEvent.press(await row('Alix Exemple', st.excused));
    expect(await row('Alix Exemple', st.present)).toBeTruthy();
    // Libellé toujours visible, jamais la couleur seule.
    expect(screen.getAllByText(st.present).length).toBeGreaterThanOrEqual(2);
  });

  it('EX-13 EX-15 enregistrer : séance, présences et commentaire écrits, « Appel enregistré », retour', async () => {
    const screenRouter = await open('/');
    await act(async () => {
      router.push(`/appel?creneau=${s.slotId}&date=${DATE}`);
    });
    await fireEvent.press(await row('Sam Fictif', st.present));
    await fireEvent.changeText(screen.getByLabelText(t.comment), '  Gymnase froid  ');
    await fireEvent.press(screen.getByRole('button', { name: t.save }));
    expect(await screen.findByText(t.saved)).toBeTruthy();
    // Plus rien ne change pendant et après l'écriture, commentaire compris.
    expect(screen.getByLabelText(t.comment).props.editable).toBe(false);
    const [session] = await db.query<{ id: number; comment: string; start_time: string }>(
      'SELECT id, comment, start_time FROM sessions WHERE slot_id = ? AND date = ?',
      [s.slotId, DATE],
    );
    expect(session).toMatchObject({ comment: 'Gymnase froid', start_time: '17:30' });
    expect(
      await db.query('SELECT member_id, status FROM attendances WHERE session_id = ?', [
        session?.id ?? 0,
      ]),
    ).toEqual(
      expect.arrayContaining([
        { member_id: s.memberId, status: 'present' },
        { member_id: s.otherMemberId, status: 'absent' },
      ]),
    );
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    await waitFor(() => expect(screenRouter.getPathname()).toBe('/'));
    // Retour à l'accueil : la séance est marquée enregistrée, la ligne mène à l'appel sans créneau.
    expect(
      await screen.findByText(t.proposedRecorded('Poussins', 'Mer.', '18/11', '17:30')),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${t.entry}`) }));
    expect(screenRouter.getPathname()).toBe('/appel-libre');
  });

  it('EX-15 séance déjà enregistrée (RM-05) : le message, sans bouton d’enregistrement', async () => {
    // Le 25/11 du jeu fictif est futur pour l'horloge figée : une séance du 11/11 est ajoutée.
    await db.execute(
      "INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, ?, '2026-11-11', '17:30', 'recorded')",
      [s.seasonId, s.slotId],
    );
    await open(`/appel?creneau=${s.slotId}&date=2026-11-11`);
    expect(await screen.findByText(labels.errors.ALREADY_RECORDED)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.save })).toBeNull();
    expect(await count(db, 'sessions')).toBe(2);
  });

  it('EX-11 au-delà de 20 membres, la recherche filtre sans accent ni casse', async () => {
    for (let i = 1; i <= 20; i++) {
      const { lastInsertRowId: id } = await db.execute(
        'INSERT INTO members (first_name, last_name) VALUES (?, ?)',
        [`Prénom${i}`, `Nom${String(i).padStart(2, '0')}`],
      );
      await db.execute(
        "INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, '2026-09-01')",
        [id, s.groupId],
      );
    }
    await db.execute("UPDATE members SET first_name = 'Zoé' WHERE id = ?", [s.memberId]);
    await openCall();
    const search = await screen.findByLabelText(t.search);
    await fireEvent.changeText(search, 'ZOE');
    expect(await row('Zoé Exemple', st.present)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.row('Sam Fictif', st.present) })).toBeNull();
    // Le compteur compte tout le groupe, pas seulement les membres affichés.
    expect(screen.getByText(t.counter.present(22))).toBeTruthy();
  });

  it('EX-09 créneau ou date invalides dans l’adresse : introuvable, rien à enregistrer', async () => {
    await open('/appel?creneau=9999&date=2026-11-18');
    expect(await screen.findByText(labels.errors.NOT_FOUND)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.save })).toBeNull();
  });

  it('EX-09 accueil : « Nouvel appel » ouvre la séance proposée', async () => {
    const router = await open('/');
    const entry = await screen.findByRole('button', { name: new RegExp(`^${t.entry}`) });
    await fireEvent.press(entry);
    expect(router.getPathname()).toBe('/appel');
    expect(await screen.findByRole('header', { name: 'Poussins' })).toBeTruthy();
  });

  it('EX-39 accueil sans séance à faire : « Nouvel appel » ouvre l’appel sans créneau', async () => {
    await db.execute('DELETE FROM slots');
    const router = await open('/');
    expect(await screen.findByText(t.noSession)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${t.entry}`) }));
    expect(router.getPathname()).toBe('/appel-libre');
  });

  it.each([
    ['future', '2026-11-25'],
    ['un autre jour que celui du créneau', '2026-11-16'],
  ])('EX-17 date %s : refusée dès l’ouverture, sans liste', async (_case, date) => {
    await open(`/appel?creneau=${s.slotId}&date=${date}`);
    expect(await screen.findByText(labels.errors.NOT_A_SLOT_SESSION)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.save })).toBeNull();
    expect(screen.queryByTestId('roll-call-name')).toBeNull();
  });

  it('EX-09 créneau lié aussi à un groupe archivé : l’appel et l’accueil prennent le groupe actif', async () => {
    const { lastInsertRowId: avenir } = await db.execute(
      "INSERT INTO groups (season_id, name, archived_at) VALUES (?, 'Avenir', '2026-10-01')",
      [s.seasonId],
    );
    await db.execute('INSERT INTO slot_groups (slot_id, group_id) VALUES (?, ?)', [
      s.slotId,
      avenir,
    ]);
    await open('/');
    const entry = await screen.findByRole('button', { name: new RegExp(`^${t.entry}`) });
    expect(screen.getByText(t.proposed('Poussins', 'Mer.', '18/11', '17:30'))).toBeTruthy();
    await fireEvent.press(entry);
    expect(await screen.findByRole('header', { name: 'Poussins' })).toBeTruthy();
  });
});
