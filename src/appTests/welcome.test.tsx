// Bienvenue (ticket 012b, P1) : à la place de l'accueil tant qu'une étape reste ; saison créée
// automatiquement. Vraie base node:sqlite ; horloge figée au vendredi 27/11/2026 10:00.
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import { tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const Stub = () => null;
const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  ...tabRoutes,
  'groupes/nouveau': Stub,
  'membres/nouveau': Stub,
  'creneaux/[id]': Stub,
  'saisons/index': Stub,
};
const open = () => renderRouter(routes, { initialUrl: '/' });
const w = labels.welcome;
const stepButtons = [w.createGroup, w.addMembers, w.addSlots, w.chooseSeason];
const shownButtons = () =>
  stepButtons.filter((name) => screen.queryByRole('button', { name }) !== null);

describe('Bienvenue (ticket 012b, P1)', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    mockDb = db;
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 10, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('P1 première ouverture : saison créée et active, 4 étapes, un seul bouton « Créer un groupe »', async () => {
    const router = await open();
    expect(await screen.findByRole('header', { name: w.title })).toBeTruthy();
    expect(await screen.findByText(w.seasonCreated('2026-2027'))).toBeTruthy();
    // « Créer un groupe » est à la fois le titre de l'étape et son bouton (maquette).
    for (const step of [w.season, w.group, w.members, w.slots]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }
    expect(shownButtons()).toEqual([w.createGroup]);
    expect(await db.query('SELECT name, start_date, end_date, is_active FROM seasons')).toEqual([
      { name: '2026-2027', start_date: '2026-09-01', end_date: '2027-08-31', is_active: 1 },
    ]);
    await fireEvent.press(screen.getByRole('button', { name: w.createGroup }));
    expect(router.getPathname()).toBe('/groupes/nouveau');
  });

  it('P1 un groupe sans membre : « Ajouter des membres », dans ce groupe', async () => {
    const { lastInsertRowId: seasonId } = await db.execute(
      "INSERT INTO seasons (name, start_date, end_date, is_active) VALUES ('2026-2027', '2026-09-01', '2027-08-31', 1)",
    );
    const { lastInsertRowId: groupId } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Poussins')",
      [seasonId],
    );
    const router = await open();
    await waitFor(() => expect(shownButtons()).toEqual([w.addMembers]));
    expect(screen.getByText(w.seasonActive('2026-2027'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: w.addMembers }));
    expect(router.getPathname()).toBe('/membres/nouveau');
    expect(router.getSearchParams()).toMatchObject({ groupe: String(groupId) });
  });

  it('P1 groupe et membres sans créneau : « Déclarer les créneaux »', async () => {
    const s: Seeded = await seed(db);
    await db.execute('DELETE FROM slots WHERE id = ?', [s.slotId]);
    const router = await open();
    await waitFor(() => expect(shownButtons()).toEqual([w.addSlots]));
    await fireEvent.press(screen.getByRole('button', { name: w.addSlots }));
    expect(router.getPathname()).toBe('/creneaux/nouveau');
  });

  it('P1 des saisons mais aucune active : « Choisir la saison active », rien de créé', async () => {
    await db.execute(
      "INSERT INTO seasons (name, start_date, end_date, is_active) VALUES ('2025-2026', '2025-09-01', '2026-08-31', 0)",
    );
    const router = await open();
    await waitFor(() => expect(shownButtons()).toEqual([w.chooseSeason]));
    expect(await count(db, 'seasons')).toBe(1);
    await fireEvent.press(screen.getByRole('button', { name: w.chooseSeason }));
    expect(router.getPathname()).toBe('/saisons');
  });

  it('P1 toutes les étapes faites : l’accueil, sans Bienvenue', async () => {
    await seed(db);
    await db.execute('DELETE FROM roll_call_drafts');
    await open();
    expect(await screen.findByText(labels.home.now)).toBeTruthy();
    expect(screen.queryByRole('header', { name: w.title })).toBeNull();
  });
});
