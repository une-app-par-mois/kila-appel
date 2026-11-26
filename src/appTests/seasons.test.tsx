// Écrans des saisons (ticket 006c, EX-01), sur une vraie base node:sqlite et le jeu fictif (SEC-13).
// Les tests d'écrans vivent hors de src/app : Expo Router y prend chaque fichier pour une route.
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import Settings from '@/app/index';
import SeasonForm from '@/app/saisons/[id]';
import Seasons from '@/app/saisons/index';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = { index: Settings, 'saisons/index': Seasons, 'saisons/[id]': SeasonForm };
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels;

describe('Écrans des saisons (EX-01)', () => {
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

  it('Paramètres montre la saison active et mène aux saisons', async () => {
    const router = await open('/');
    await fireEvent.press(
      await screen.findByRole('button', {
        name: `${t.settings.seasons}, Active : Saison 2026-2027`,
      }),
    );
    expect(router.getPathname()).toBe('/saisons');
  });

  it('liste les saisons ; « Activer » change la saison active (une seule)', async () => {
    await open('/saisons');
    expect(
      await screen.findByRole('button', {
        name: `Saison 2026-2027, 01/09/2026 – 31/07/2027, ${t.seasons.active}`,
      }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.seasons.activate }));
    await screen.findByRole('button', {
      name: `Saison 2025-2026, 01/09/2025 – 31/07/2026, ${t.seasons.active}`,
    });
    expect(await count(db, 'seasons', 'is_active = 1 AND id = ?', [s.otherSeasonId])).toBe(1);
  });

  it('crée une saison : erreurs sous les champs (RM-04), puis retour à la liste', async () => {
    const router = await open('/saisons');
    await fireEvent.press(await screen.findByRole('button', { name: t.seasons.create }));
    expect(router.getPathname()).toBe('/saisons/nouvelle');
    await fireEvent.changeText(screen.getByLabelText(t.seasonForm.name), '2027-2028');
    await fireEvent.changeText(screen.getByLabelText(t.seasonForm.start), '31/02/2027');
    await fireEvent.changeText(screen.getByLabelText(t.seasonForm.end), '31/07/2028');
    await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.DATE_INVALID);
    await fireEvent.changeText(screen.getByLabelText(t.seasonForm.start), '01/09/2028');
    await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.END_BEFORE_START);
    await fireEvent.changeText(screen.getByLabelText(t.seasonForm.start), '01/09/2027');
    await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(router.getPathname()).toBe('/saisons'));
    expect(await screen.findByText('2027-2028')).toBeTruthy();
  });

  it('un double appui sur « Enregistrer » ne crée qu’une saison', async () => {
    await open('/saisons/nouvelle');
    await fireEvent.changeText(await screen.findByLabelText(t.seasonForm.name), '2027-2028');
    await fireEvent.changeText(screen.getByLabelText(t.seasonForm.start), '01/09/2027');
    await fireEvent.changeText(screen.getByLabelText(t.seasonForm.end), '31/07/2028');
    const save = screen.getByRole('button', { name: t.common.save });
    await fireEvent.press(save);
    await fireEvent.press(save);
    await waitFor(async () => expect(await count(db, 'seasons', "name = '2027-2028'")).toBe(1));
  });

  it('le retour de la liste ouverte directement mène à Paramètres', async () => {
    const router = await open('/saisons');
    await fireEvent.press(await screen.findByRole('button', { name: t.common.back }));
    await waitFor(() => expect(router.getPathname()).toBe('/'));
  });

  it('une saison introuvable : message, ni champ ni « Enregistrer »', async () => {
    await open('/saisons/999');
    expect(await screen.findByText(t.errors.NOT_FOUND)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.common.save })).toBeNull();
    expect(screen.queryByLabelText(t.seasonForm.name)).toBeNull();
  });

  it('refuse des dates qui laisseraient une séance hors de la saison', async () => {
    await open(`/saisons/${s.seasonId}`);
    const start = await screen.findByLabelText(t.seasonForm.start);
    await waitFor(() => expect(start.props.value).toBe('01/09/2026'));
    await fireEvent.changeText(start, '01/12/2026');
    await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.SESSIONS_OUTSIDE_SEASON);
    expect(await count(db, 'seasons', "start_date = '2026-09-01'")).toBe(1);
  });

  it('EX-01 la suppression dit ce qui sera effacé ; « Garder » ne touche à rien', async () => {
    const router = await open(`/saisons/${s.seasonId}`);
    await fireEvent.press(await screen.findByRole('button', { name: t.seasonForm.delete }));
    expect(
      await screen.findByRole('header', { name: 'Supprimer Saison 2026-2027 ?' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Seront effacés définitivement : 1 groupe, 2 inscriptions, 1 créneau, 1 séance, 2 présences et l’appel en cours.',
      ),
    ).toBeTruthy();
    expect(screen.getByText(t.seasonDeletion.kept)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.common.keep }));
    expect(await count(db, 'seasons')).toBe(2);
    await fireEvent.press(screen.getByRole('button', { name: t.seasonForm.delete }));
    await fireEvent.press(await screen.findByRole('button', { name: t.common.deleteForever }));
    await waitFor(() => expect(router.getPathname()).toBe('/saisons'));
    expect(await count(db, 'seasons')).toBe(1);
    expect(await count(db, 'members')).toBe(2);
  });

  it('une saison sans aucune donnée liée : le message le dit', async () => {
    await open(`/saisons/${s.otherSeasonId}`);
    await db.execute('DELETE FROM groups WHERE season_id = ?', [s.otherSeasonId]);
    await fireEvent.press(await screen.findByRole('button', { name: t.seasonForm.delete }));
    expect(await screen.findByText(t.seasonDeletion.nothingElse)).toBeTruthy();
  });

  it('CONV-15 un échec de lecture affiche un message au lieu d’attendre sans fin', async () => {
    await db.close();
    mockDb = db;
    await open('/saisons');
    expect(await screen.findByText(t.common.loadFailed)).toBeTruthy();
    db = await prepareDatabase(openNodeDb());
  });
});
