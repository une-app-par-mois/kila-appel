// Écran Sauvegarde : section Conservation et purge des anciennes saisons (ticket 015b, EX-24,
// SEC-11, ABS-05), sur une vraie base node:sqlite et le jeu fictif. Horloge figée au vendredi
// 27/11/2026. Ligne Conservation de Paramètres.
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { addSeason, counts, oldSeason } from '@/__fixtures__/purgeSeed';
import { type Seeded, seed } from '@/__fixtures__/seed';
import Backup from '@/app/donnees';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { settingsRepo } from '@/data/settingsRepo';
import { fileLock } from '@/hooks/fileLock';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('@/data/expoFiles', () => ({ expoBackupDeps: { files: { clear: async () => {} } } }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const routes = { _layout: RootStack, ...tabRoutes, donnees: Backup };
const open = (initialUrl = '/donnees') => renderRouter(routes, { initialUrl });
const button = (name: string | RegExp) => screen.getByRole('button', { name });

describe('EX-24 écran Sauvegarde : conservation et purge', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    mockDb = db;
    log.mockClear();
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    fileLock.release('export');
    fileLock.release('erase');
    mockDb = null;
    await db.close();
  });

  it('EX-24 « Garder les 3 dernières saisons » par défaut, aucune saison au-delà', async () => {
    await open();
    expect(await screen.findByText('Aucune saison ne dépasse cette durée.')).toBeTruthy();
    expect(screen.getByText('Garder les')).toBeTruthy();
    expect(screen.getByText('dernières saisons')).toBeTruthy();
    expect(button('Garder les 3 dernières saisons')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Purger/ })).toBeNull();
  });

  it('EX-24 choisir 1 saison : enregistré, candidates listées, rien de purgé', async () => {
    await addSeason(db, '2024-2025', '2024-09-01', '2025-07-31');
    const before = await counts(db);
    await open();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Garder les 3 dernières saisons' }),
    );
    expect(button('1 saison')).toBeTruthy();
    expect(button('2 saisons')).toBeTruthy();
    await fireEvent.press(button('1 saison'));
    expect(
      await screen.findByText('2 saisons dépassent cette durée : Saison 2025-2026, 2024-2025.'),
    ).toBeTruthy();
    expect(button('Purger 2 saisons…')).toBeTruthy();
    expect(await settingsRepo(db).retentionSeasons()).toBe(1);
    expect({ ...(await counts(db)), settings: 0 }).toEqual({ ...before, settings: 0 });
  });

  it('EX-24 confirmation chiffrée au caractère près, puis purge réelle et retour à Sauvegarde', async () => {
    const old = await oldSeason(db, s);
    await settingsRepo(db).setRetentionSeasons(2);
    await open();
    expect(await screen.findByText('1 saison dépasse cette durée : 2023-2024.')).toBeTruthy();
    await fireEvent.press(button('Purger 2023-2024…'));
    expect(await screen.findByRole('header', { name: 'Purger 2023-2024 ?' })).toBeTruthy();
    expect(
      screen.getByText(
        'Seront effacés définitivement : la saison 2023-2024, ses 1 groupe, 1 créneau, 1 séance et 3 présences.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('définitivement')).toHaveStyle({ fontFamily: 'IBMPlexSans-Bold' });
    expect(
      screen.getByText(
        '2 membres qui ne figurent plus dans aucune saison conservée seront aussi effacés.',
      ),
    ).toBeTruthy();
    await fireEvent.press(button('Purger'));
    await waitFor(() =>
      expect(screen.getByText('Aucune saison ne dépasse cette durée.')).toBeTruthy(),
    );
    expect(screen.queryByRole('header', { name: 'Purger 2023-2024 ?' })).toBeNull();
    expect(await db.query('SELECT id FROM seasons WHERE id = ?', [old.seasonId])).toEqual([]);
    expect(await db.query('SELECT id FROM members WHERE id = ?', [old.onlyOld])).toEqual([]);
  });

  it('EX-24 « Garder » ferme la confirmation sans rien effacer', async () => {
    await oldSeason(db, s);
    await settingsRepo(db).setRetentionSeasons(2);
    const before = await counts(db);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: 'Purger 2023-2024…' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Garder' }));
    await waitFor(() =>
      expect(screen.queryByRole('header', { name: 'Purger 2023-2024 ?' })).toBeNull(),
    );
    expect(await counts(db)).toEqual(before);
  });

  it('EX-24 appel en cours dans une saison purgée : annoncé', async () => {
    await settingsRepo(db).setRetentionSeasons(1);
    // L'appel en cours du jeu fictif passe dans la saison 2025-2026, qui sera purgée.
    await db.execute('UPDATE roll_call_drafts SET season_id = ?', [s.otherSeasonId]);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: 'Purger Saison 2025-2026…' }));
    expect(await screen.findByText(/L’appel en cours sera aussi effacé\.$/)).toBeTruthy();
  });

  it('EX-24 échec : « La purge n’a pas abouti. Rien n’a été effacé. », rien d’effacé', async () => {
    await oldSeason(db, s);
    await settingsRepo(db).setRetentionSeasons(2);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: 'Purger 2023-2024…' }));
    await screen.findByRole('header', { name: 'Purger 2023-2024 ?' });
    // Entre la confirmation et la purge, une saison plus récente disparaît : 2023-2024 est gardée.
    await db.execute('DELETE FROM seasons WHERE id = ?', [s.otherSeasonId]);
    const before = await counts(db);
    await fireEvent.press(button('Purger'));
    expect(await screen.findByText('La purge n’a pas abouti. Rien n’a été effacé.')).toBeTruthy();
    expect(log).toHaveBeenCalledWith('PURGE_FAILED');
    expect(await counts(db)).toEqual(before);
  });

  it('SEC-11 boutons d’export, de restauration et de purge désactivés sous le verrou', async () => {
    await oldSeason(db, s);
    await settingsRepo(db).setRetentionSeasons(2);
    await open();
    const purgeButton = await screen.findByRole('button', { name: 'Purger 2023-2024…' });
    expect(purgeButton).not.toBeDisabled();
    await act(async () => {
      fileLock.acquire('export');
    });
    await waitFor(() => expect(button('Purger 2023-2024…')).toBeDisabled());
    expect(button('Garder les 2 dernières saisons')).toBeDisabled();
    await act(async () => {
      fileLock.release('export');
      fileLock.acquire('erase');
    });
    await waitFor(() => expect(button('Exporter une sauvegarde')).toBeDisabled());
    expect(button('Choisir un fichier…')).toBeDisabled();
  });
});

describe('Paramètres : ligne Conservation (EX-24)', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  // Expressions écrites en dur : pas de RegExp construite (alerte Semgrep, ticket 019).
  it.each([
    [null, '3 saisons', /^Conservation, 3 saisons/],
    [1, '1 saison', /^Conservation, 1 saison/],
  ])('conservation %p : « %s », et la ligne ouvre Sauvegarde', async (retention, shown, row) => {
    if (retention !== null) await settingsRepo(db).setRetentionSeasons(retention);
    const router = await open('/parametres');
    expect(await screen.findByText(shown)).toBeTruthy();
    await fireEvent.press(button(row));
    expect(router.getPathname()).toBe('/donnees');
  });
});
