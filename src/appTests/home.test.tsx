// Onglets et accueil (ticket 012, EX-06, EX-09, EX-14, EX-17), sur une vraie base node:sqlite et le
// jeu fictif : créneau du mercredi 17:30–19:00 au Gymnase, groupe Poussins, deux membres, séance
// du 25/11 enregistrée. Horloge figée au mercredi 18/11/2026 18:00, pendant la séance.
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { type Seeded, seed } from '@/__fixtures__/seed';
import TabsLayout from '@/app/(tabs)/_layout';
import Home from '@/app/(tabs)/index';
import Settings from '@/app/(tabs)/parametres';
import RollCall from '@/app/appel';
import FreeRollCall from '@/app/appel-libre';
import Emergency from '@/app/urgence';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': Home,
  '(tabs)/parametres': Settings,
  appel: RollCall,
  'appel-libre': FreeRollCall,
  urgence: Emergency,
};
const open = (initialUrl = '/') => renderRouter(routes, { initialUrl });
const h = labels.home;
const tab = labels.tabs;
const button = (name: string | RegExp) => screen.findByRole('button', { name });

describe('Onglets et accueil (ticket 012)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    await db.execute('DELETE FROM roll_call_drafts');
    mockDb = db;
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 18, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('EX-09 accueil : date du jour, séance du moment, « Faire l’appel » l’ouvre', async () => {
    const router = await open();
    expect(await screen.findByRole('header', { name: 'Mercredi 18 nov.' })).toBeTruthy();
    expect(screen.getByText(h.now)).toBeTruthy();
    expect(await screen.findByText(h.session('17:30', '19:00', 'Gymnase', 2))).toBeTruthy();
    await fireEvent.press(await button(h.start));
    expect(router.getPathname()).toBe('/appel');
    expect(router.getSearchParams()).toMatchObject({
      creneau: String(s.slotId),
      date: '2026-11-18',
    });
  });

  it('EX-09 séance du moment déjà enregistrée : « Appel enregistré », sans bouton', async () => {
    jest.setSystemTime(new Date(2026, 10, 25, 18, 0));
    await open();
    expect(await screen.findByText(h.recorded)).toBeTruthy();
    expect(screen.queryByRole('button', { name: h.start })).toBeNull();
  });

  it('EX-17 appels manquants : les 5 plus récents, puis « et N autres » ; un appui ouvre l’appel', async () => {
    const router = await open();
    expect(await screen.findByText(h.missing)).toBeTruthy();
    // Mercredis du 02/09 au 11/11 sans séance : 11 ; le 18/11 est en cours, pas manquant.
    const rows = await screen.findAllByTestId('missing-call');
    expect(rows).toHaveLength(5);
    expect(screen.getByText(h.missingRow('Mercredi', 11, 'nov.', '17:30'))).toBeTruthy();
    expect(screen.getByText(h.missingRow('Mercredi', 14, 'oct.', '17:30'))).toBeTruthy();
    expect(screen.queryByText(h.missingRow('Mercredi', 7, 'oct.', '17:30'))).toBeNull();
    expect(screen.getByText(h.more(6))).toBeTruthy();
    await fireEvent.press(rows[0] as (typeof rows)[number]);
    expect(router.getPathname()).toBe('/appel');
    expect(router.getSearchParams()).toMatchObject({
      creneau: String(s.slotId),
      date: '2026-11-11',
    });
  });

  it('EX-09 EX-17 séance du moment finie sans appel : sous « Maintenant », pas en double dans les manquants', async () => {
    jest.setSystemTime(new Date(2026, 10, 18, 19, 30));
    await open();
    expect(await screen.findByText(h.start)).toBeTruthy();
    expect(await screen.findAllByTestId('missing-call')).toHaveLength(5);
    expect(screen.queryByText(h.missingRow('Mercredi', 18, 'nov.', '17:30'))).toBeNull();
    expect(screen.getByText(h.missingRow('Mercredi', 11, 'nov.', '17:30'))).toBeTruthy();
    expect(screen.getByText(h.more(6))).toBeTruthy();
  });

  it('EX-17 sans appel manquant : pas de section', async () => {
    await db.execute("UPDATE slots SET schedule_from = '2026-11-18'");
    await open();
    expect(await screen.findByText(h.now)).toBeTruthy();
    expect(screen.queryByText(h.missing)).toBeNull();
  });

  it('EX-06 la recherche d’un contact d’urgence s’ouvre depuis l’accueil', async () => {
    const router = await open();
    await fireEvent.press(await button(labels.emergency.entry));
    expect(router.getPathname()).toBe('/urgence');
  });

  it('EX-09 onglets : Accueil, Nouvel appel, Paramètres ; Paramètres garde l’organisation', async () => {
    const router = await open();
    expect(await button(tab.home)).toBeTruthy();
    expect(screen.getByRole('button', { name: tab.newRollCall })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: tab.settings }));
    expect(router.getPathname()).toBe('/parametres');
    expect(await screen.findByText(labels.settings.organisation)).toBeTruthy();
    expect(screen.queryByText(labels.emergency.entry)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: tab.home }));
    expect(router.getPathname()).toBe('/');
  });

  it('EX-09 « Nouvel appel » ouvre la séance proposée', async () => {
    const router = await open();
    await screen.findByText(h.start);
    await fireEvent.press(await button(tab.newRollCall));
    expect(router.getPathname()).toBe('/appel');
    expect(router.getSearchParams()).toMatchObject({
      creneau: String(s.slotId),
      date: '2026-11-18',
    });
  });

  it('EX-39 « Nouvel appel » sans séance à faire : l’appel sans créneau', async () => {
    jest.setSystemTime(new Date(2026, 10, 25, 18, 0));
    const router = await open();
    await screen.findByText(h.recorded);
    await fireEvent.press(await button(tab.newRollCall));
    expect(router.getPathname()).toBe('/appel-libre');
  });

  it('EX-14 « Nouvel appel » reprend l’appel en cours ; la carte remplace « Maintenant »', async () => {
    await db.execute(
      "INSERT INTO roll_call_drafts (id, season_id, slot_id, date, started_at, updated_at) VALUES (1, ?, NULL, '2026-11-17', '18:00', '2026-11-17T18:01')",
      [s.seasonId],
    );
    await db.execute('INSERT INTO roll_call_draft_groups (draft_id, group_id) VALUES (1, ?)', [
      s.groupId,
    ]);
    const router = await open();
    expect(await screen.findByText(labels.draft.title)).toBeTruthy();
    expect(screen.queryByText(h.now)).toBeNull();
    await fireEvent.press(await button(tab.newRollCall));
    expect(router.getPathname()).toBe('/appel');
    expect(router.getSearchParams()).toMatchObject({
      groupe: String(s.groupId),
      date: '2026-11-17',
    });
  });
});
