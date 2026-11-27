// Écrans des groupes (ticket 006d, EX-02), sur une vraie base node:sqlite et le jeu fictif (SEC-13).
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import GroupDetail from '@/app/groupes/[id]/index';
import GroupEdit from '@/app/groupes/[id]/modifier';
import Groups from '@/app/groupes/index';
import NewGroup from '@/app/groupes/nouveau';
import Settings from '@/app/index';
import Seasons from '@/app/saisons/index';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = {
  index: Settings,
  'saisons/index': Seasons,
  'groupes/index': Groups,
  'groupes/nouveau': NewGroup,
  'groupes/[id]/index': GroupDetail,
  'groupes/[id]/modifier': GroupEdit,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels;

describe('Écrans des groupes (EX-02)', () => {
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

  it('Paramètres montre le nombre de groupes et mène aux groupes', async () => {
    const router = await open('/');
    await fireEvent.press(
      await screen.findByRole('button', { name: `${t.settings.groups}, 1 groupe` }),
    );
    expect(router.getPathname()).toBe('/groupes');
  });

  it('liste les groupes de la saison active, avec la saison en sous-titre', async () => {
    await open('/groupes');
    expect(await screen.findByRole('button', { name: 'Poussins' })).toBeTruthy();
    expect(screen.getByText('Saison 2026-2027')).toBeTruthy();
    expect(screen.queryByText('Benjamins')).toBeNull();
    expect(screen.queryByRole('button', { name: t.groups.showArchived(0) })).toBeNull();
  });

  it('crée un groupe : nom exigé, rattaché à la saison active, puis sa fiche', async () => {
    const router = await open('/groupes/nouveau');
    expect(await screen.findByText(t.groupForm.attachedTo('Saison 2026-2027'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.groupForm.create }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.NAME_REQUIRED);
    await fireEvent.changeText(screen.getByLabelText(t.groupForm.name), 'Benjamins lundi');
    await fireEvent.press(screen.getByRole('button', { name: t.groupForm.create }));
    expect(await screen.findByRole('header', { name: 'Benjamins lundi' })).toBeTruthy();
    expect(router.getPathname()).toMatch(/^\/groupes\/\d+$/);
    expect(screen.getByText(t.group.noMember)).toBeTruthy();
    expect(
      await count(db, 'groups', 'season_id = ? AND name = ?', [s.seasonId, 'Benjamins lundi']),
    ).toBe(1);
  });

  it('EX-02 archive un groupe, le retrouve dans les archivés, puis le désarchive', async () => {
    await open('/groupes');
    await fireEvent.press(await screen.findByRole('button', { name: 'Poussins' }));
    await fireEvent.press(await screen.findByRole('button', { name: t.group.archive }));
    expect(await screen.findByRole('button', { name: t.group.unarchive })).toBeTruthy();
    expect(await count(db, 'groups', 'archived_at IS NOT NULL AND id = ?', [s.groupId])).toBe(1);
    await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
    expect(await screen.findByText(t.groups.empty)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.groups.showArchived(1) }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Poussins' }));
    await fireEvent.press(await screen.findByRole('button', { name: t.group.unarchive }));
    await screen.findByRole('button', { name: t.group.archive });
    expect(await count(db, 'groups', 'archived_at IS NULL AND id = ?', [s.groupId])).toBe(1);
  });

  it('un double appui sur « Archiver » archive une seule fois (pas de désarchivage aussitôt)', async () => {
    await open(`/groupes/${s.groupId}`);
    const archive = await screen.findByRole('button', { name: t.group.archive });
    await fireEvent.press(archive);
    await fireEvent.press(archive);
    await screen.findByRole('button', { name: t.group.unarchive });
    expect(await count(db, 'groups', 'archived_at IS NOT NULL AND id = ?', [s.groupId])).toBe(1);
  });

  it('renomme un groupe depuis « Renommer ou supprimer »', async () => {
    await open(`/groupes/${s.groupId}`);
    await fireEvent.press(await screen.findByRole('link', { name: t.group.edit }));
    const name = await screen.findByLabelText(t.groupForm.name);
    await waitFor(() => expect(name.props.value).toBe('Poussins'));
    await fireEvent.changeText(name, 'Poussins mercredi');
    await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
    expect(await screen.findByRole('header', { name: 'Poussins mercredi' })).toBeTruthy();
  });

  it('EX-02 la suppression dit ce qui sera effacé ; séances et présences restent', async () => {
    const router = await open(`/groupes/${s.groupId}/modifier`);
    await fireEvent.press(await screen.findByRole('button', { name: t.groupForm.delete }));
    expect(await screen.findByRole('header', { name: 'Supprimer Poussins ?' })).toBeTruthy();
    expect(
      screen.getByText(
        'Seront effacés définitivement : ses 2 inscriptions, ses liens à 1 créneau et à 1 séance et l’appel en cours (non enregistré).',
      ),
    ).toBeTruthy();
    expect(screen.getByText(t.groupDeletion.kept)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.common.deleteForever }));
    await waitFor(() => expect(router.getPathname()).toBe('/groupes'));
    expect(await count(db, 'groups', 'id = ?', [s.groupId])).toBe(0);
    expect(await count(db, 'roll_call_drafts')).toBe(0);
    expect(await count(db, 'sessions', 'id = ?', [s.sessionId])).toBe(1);
    expect(await count(db, 'attendances', 'session_id = ?', [s.sessionId])).toBe(2);
  });

  it('un groupe sans inscription ni lien : le message le dit', async () => {
    const id = (
      await db.execute("INSERT INTO groups (season_id, name) VALUES (?, 'Seul')", [s.seasonId])
    ).lastInsertRowId;
    await open(`/groupes/${id}/modifier`);
    await fireEvent.press(await screen.findByRole('button', { name: t.groupForm.delete }));
    expect(await screen.findByText(t.groupDeletion.nothingElse)).toBeTruthy();
  });

  it('sans saison active : message et bouton vers les saisons', async () => {
    await db.execute('UPDATE seasons SET is_active = 0');
    const router = await open('/groupes');
    expect(await screen.findByText(t.groups.noActiveSeason)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.groups.toSeasons }));
    expect(router.getPathname()).toBe('/saisons');
  });

  it('sans groupe : carte d’état vide et « Créer un groupe »', async () => {
    await db.execute('DELETE FROM groups');
    const router = await open('/groupes');
    expect(await screen.findByText(t.groups.empty)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.groups.createFirst }));
    expect(router.getPathname()).toBe('/groupes/nouveau');
  });

  it('un groupe introuvable : message, sans action', async () => {
    await open('/groupes/9999');
    expect(await screen.findByText(t.errors.NOT_FOUND)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.group.archive })).toBeNull();
  });
});
