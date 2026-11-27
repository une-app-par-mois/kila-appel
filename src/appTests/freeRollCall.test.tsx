// Appel sans créneau et ajout d'un membre pendant l'appel (ticket 010c, EX-12, EX-39), sur une
// vraie base node:sqlite et le jeu fictif : groupe Poussins, membres Alix Exemple et Sam Fictif.
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { type Seeded, seed } from '@/__fixtures__/seed';
import RollCall from '@/app/appel';
import FreeRollCall from '@/app/appel-libre';
import Settings from '@/app/index';
import NewMember from '@/app/membres/nouveau';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

// Pile comme dans l'appli (`_layout.tsx`) : l'appel reste ouvert sous Nouveau membre (EX-12).
const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  index: Settings,
  appel: RollCall,
  'appel-libre': FreeRollCall,
  'membres/nouveau': NewMember,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels.rollCall;
const f = labels.freeRollCall;
const st = labels.statuses;
const row = (name: string, status: string) =>
  screen.findByRole('button', { name: t.row(name, status) });

describe('Appel sans créneau, ajout pendant l’appel (EX-12, EX-39)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    mockDb = db;
    // Horloge figée : mardi 17/11/2026 10:05, aucun créneau ce jour-là.
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 17, 10, 5) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('EX-39 groupe et date choisis, séance sans créneau à l’heure d’ouverture de l’appel', async () => {
    const router = await open('/appel-libre');
    expect(await screen.findByText(f.help)).toBeTruthy();
    expect(screen.getByLabelText(f.date).props.value).toBe('17/11/2026');
    await fireEvent.changeText(screen.getByLabelText(f.date), '16/11/2026');
    await fireEvent.press(await screen.findByRole('button', { name: 'Poussins' }));
    expect(router.getPathname()).toBe('/appel');
    expect(await screen.findByRole('header', { name: 'Poussins' })).toBeTruthy();
    expect(screen.getByText('Lun. 16/11/2026 · 10:05')).toBeTruthy();
    await fireEvent.press(await row('Sam Fictif', st.present));
    await fireEvent.press(screen.getByRole('button', { name: t.save }));
    expect(await screen.findByText(t.saved)).toBeTruthy();
    const sessions = await db.query<{ id: number; slot_id: number | null; start_time: string }>(
      "SELECT id, slot_id, start_time FROM sessions WHERE date = '2026-11-16'",
    );
    expect(sessions).toEqual([{ id: expect.any(Number), slot_id: null, start_time: '10:05' }]);
    expect(
      await db.query('SELECT member_id, status FROM attendances WHERE session_id = ?', [
        sessions[0]?.id ?? 0,
      ]),
    ).toEqual(
      expect.arrayContaining([
        { member_id: s.memberId, status: 'present' },
        { member_id: s.otherMemberId, status: 'absent' },
      ]),
    );
  });

  it.each([
    ['18/11/2026', labels.errors.DATE_IN_FUTURE],
    ['31/08/2026', labels.errors.DATE_OUTSIDE_SEASON],
    ['32/11/2026', labels.errors.DATE_INVALID],
  ])('EX-39 date %s refusée sous le champ, l’appel ne s’ouvre pas', async (date, message) => {
    const router = await open('/appel-libre');
    await fireEvent.changeText(await screen.findByLabelText(f.date), date);
    await fireEvent.press(await screen.findByRole('button', { name: 'Poussins' }));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(router.getPathname()).toBe('/appel-libre');
  });

  it('EX-39 date future dans l’adresse de l’appel : refusée dès l’ouverture', async () => {
    await open(`/appel?groupe=${s.groupId}&date=2026-11-18`);
    expect(await screen.findByText(labels.errors.DATE_IN_FUTURE)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.save })).toBeNull();
  });

  it('EX-12 ajouter un membre sans quitter l’appel : inscrit à la date de la séance, à Présent, statuts gardés', async () => {
    const router = await open(`/appel?groupe=${s.groupId}&date=2026-11-16`);
    await fireEvent.press(await row('Alix Exemple', st.present));
    await fireEvent.press(screen.getByRole('button', { name: t.addMember }));
    expect(router.getPathname()).toBe('/membres/nouveau');
    expect(
      await screen.findByText(labels.memberForm.rollCallNote('Poussins', '16/11/2026')),
    ).toBeTruthy();
    // Version « appel » : pas de choix du groupe.
    expect(screen.queryByLabelText(labels.memberForm.group)).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(labels.memberForm.firstName), 'Yanis');
    await fireEvent.changeText(screen.getByLabelText(labels.memberForm.lastName), 'Colin');
    await fireEvent.press(screen.getByRole('button', { name: labels.memberForm.rollCallCreate }));
    await waitFor(() => expect(router.getPathname()).toBe('/appel'));
    expect(await row('Yanis Colin', st.present)).toBeTruthy();
    expect(await row('Alix Exemple', st.absent)).toBeTruthy();
    expect(
      await db.query(
        "SELECT e.start_date FROM enrollments e JOIN members m ON m.id = e.member_id WHERE m.first_name = 'Yanis'",
      ),
    ).toEqual([{ start_date: '2026-11-16' }]);
  });

  it('EX-12 ajout le jour même : « à partir d’aujourd’hui »', async () => {
    await open(`/appel?groupe=${s.groupId}&date=2026-11-17`);
    await fireEvent.press(await screen.findByRole('button', { name: t.addMember }));
    expect(await screen.findByText(labels.memberForm.rollCallNote('Poussins', null))).toBeTruthy();
  });
});
