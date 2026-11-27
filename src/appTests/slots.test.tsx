// Écrans des créneaux (ticket 009b, EX-07), sur une vraie base node:sqlite et le jeu fictif.
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import SlotForm from '@/app/creneaux/[id]';
import Slots from '@/app/creneaux/index';
import Settings from '@/app/index';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { toIsoDate } from '@/domain/formats';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = { index: Settings, 'creneaux/index': Slots, 'creneaux/[id]': SlotForm };
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels;
const f = labels.slotForm;
const button = (name: string | RegExp) => screen.findByRole('button', { name });
const TODAY = toIsoDate(new Date());

describe('Écrans des créneaux (EX-07)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    mockDb = db;
  });
  afterEach(async () => {
    mockDb = null;
    await db.close();
  });

  it('Paramètres → Créneaux : « Mercredi 17:30 – 19:00 », groupe · lieu', async () => {
    const router = await open('/');
    await fireEvent.press(await button(t.rowAccessibility(t.settings.slots, t.slots.count(1))));
    expect(router.getPathname()).toBe('/creneaux');
    expect(await screen.findByText('Mercredi 17:30 – 19:00')).toBeTruthy();
    expect(screen.getByText('Poussins · Gymnase')).toBeTruthy();
  });

  it('EX-07 nouveau créneau : erreurs sous les champs, puis enregistré avec la date d’effet du jour', async () => {
    const router = await open('/creneaux');
    await fireEvent.press(await button(t.slots.create));
    expect(await screen.findByRole('header', { name: f.createTitle })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(f.duration), '1,5');
    await fireEvent.press(screen.getByRole('button', { name: f.create }));
    expect(await screen.findByText(t.errors.WEEKDAY_INVALID)).toBeTruthy();
    expect(screen.getByText(t.errors.TIME_INVALID)).toBeTruthy();
    expect(screen.getByText(t.errors.DURATION_INVALID)).toBeTruthy();
    expect(screen.getByText(t.errors.GROUP_REQUIRED)).toBeTruthy();
    expect(await count(db, 'slots')).toBe(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Lundi' }));
    expect(screen.getByRole('button', { name: 'Lundi' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    await fireEvent.changeText(screen.getByLabelText(f.start), '18:00');
    await fireEvent.changeText(screen.getByLabelText(f.duration), '1h30');
    await fireEvent.press(
      screen.getByRole('button', { name: t.rowAccessibility(f.group, f.noGroup) }),
    );
    await fireEvent.press(await button('Poussins'));
    await fireEvent.changeText(screen.getByLabelText(f.place), 'Dojo municipal');
    await fireEvent.press(screen.getByRole('button', { name: f.create }));
    await waitFor(() => expect(router.getPathname()).toBe('/creneaux'));
    expect(await screen.findByText('Lundi 18:00 – 19:30')).toBeTruthy();
    const [row] = await db.query<{
      duration_min: number;
      schedule_from: string;
      name: string | null;
    }>('SELECT duration_min, schedule_from, name FROM slots WHERE weekday = 1');
    expect(row).toEqual({ duration_min: 90, schedule_from: TODAY, name: null });
  });

  it('EX-07 modification : champs remplis, lieu et nom modifiables ; séance intacte', async () => {
    const router = await open(`/creneaux/${s.slotId}`);
    expect(await screen.findByRole('header', { name: 'Mercredi 17:30' })).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText(f.duration).props.value).toBe('1 h 30'));
    expect(screen.getByLabelText(f.place).props.value).toBe('Gymnase');
    expect(
      screen.getByRole('button', { name: t.rowAccessibility(f.group, 'Poussins') }),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(f.place), '');
    await fireEvent.changeText(screen.getByLabelText(f.name), 'Technique');
    await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(router.getPathname()).toBe('/creneaux'));
    expect(
      await db.query('SELECT place, name, schedule_from FROM slots WHERE id = ?', [s.slotId]),
    ).toEqual([{ place: null, name: 'Technique', schedule_from: '2025-09-01' }]);
    expect(await count(db, 'sessions', "slot_id = ? AND start_time = '17:30'", [s.slotId])).toBe(1);
  });

  it('EX-07 supprimer : la confirmation dit l’appel interrompu effacé ; séances conservées', async () => {
    const router = await open(`/creneaux/${s.slotId}`);
    await fireEvent.press(await button(f.delete));
    expect(await screen.findByText(t.slotDeletion.message(true))).toBeTruthy();
    expect(screen.getByText(t.slotDeletion.note)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.slotDeletion.confirm }));
    await waitFor(() => expect(router.getPathname()).toBe('/creneaux'));
    expect(await screen.findByText(t.slots.empty)).toBeTruthy();
    expect(await count(db, 'slots')).toBe(0);
    expect(await count(db, 'sessions', 'id = ? AND slot_id IS NULL', [s.sessionId])).toBe(1);
    expect(await count(db, 'roll_call_drafts')).toBe(0);
  });

  it('supprimer sans appel interrompu : message court ; « Garder » ne touche à rien', async () => {
    await db.execute('DELETE FROM roll_call_drafts');
    await open(`/creneaux/${s.slotId}`);
    await fireEvent.press(await button(f.delete));
    expect(await screen.findByText(t.slotDeletion.message(false))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.common.keep }));
    expect(await count(db, 'slots')).toBe(1);
  });

  it('sans saison active : un message, pas de « Nouveau créneau »', async () => {
    await db.execute('UPDATE seasons SET is_active = 0');
    await open('/creneaux');
    expect(await screen.findByText(t.slots.noActiveSeason)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.slots.create })).toBeNull();
  });

  it('sans saison active : pas de formulaire de création', async () => {
    await db.execute('UPDATE seasons SET is_active = 0');
    await open('/creneaux/nouveau');
    expect(await screen.findByText(t.slots.noActiveSeason)).toBeTruthy();
    expect(screen.queryByRole('button', { name: f.create })).toBeNull();
  });

  it('créneau introuvable : le dit, sans formulaire', async () => {
    await open('/creneaux/999');
    expect(await screen.findByText(t.errors.NOT_FOUND)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.common.save })).toBeNull();
  });

  it('groupe du créneau archivé depuis : toujours affiché et gardé', async () => {
    await db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', [TODAY, s.groupId]);
    const router = await open(`/creneaux/${s.slotId}`);
    expect(await button(t.rowAccessibility(f.group, 'Poussins'))).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(f.name), 'Technique');
    await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(router.getPathname()).toBe('/creneaux'));
    expect(await count(db, 'slot_groups', 'group_id = ?', [s.groupId])).toBe(1);
  });
});
