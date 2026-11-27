// Écran Sauvegarde, purge : cas limites (ticket 015b, revue de code). Pendant la purge, la
// confirmation ne se ferme pas ; à minuit, elle reste affichée ; la lecture de l'impact en échec
// est journalisée. Vraie base node:sqlite, jeu fictif, horloge figée.
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { oldSeason } from '@/__fixtures__/purgeSeed';
import { seed } from '@/__fixtures__/seed';
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
const button = (name: string) => screen.getByRole('button', { name });
const TITLE = 'Purger 2023-2024 ?';

/** Promesse tenue jusqu'à `open()`. */
const gate = () => {
  let open: () => void = () => undefined;
  const wait = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { wait, open: () => open() };
};

describe('EX-24 purge : cas limites de l’écran', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await oldSeason(db, await seed(db));
    await settingsRepo(db).setRetentionSeasons(2);
    mockDb = db;
    log.mockClear();
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    fileLock.release('erase');
    mockDb = null;
    await db.close();
  });

  const openConfirmation = async () => {
    await renderRouter(routes, { initialUrl: '/donnees' });
    await fireEvent.press(await screen.findByRole('button', { name: 'Purger 2023-2024…' }));
    await screen.findByRole('header', { name: TITLE });
  };

  it('pendant la purge : Garder, Purger et le retour sont sans effet', async () => {
    await openConfirmation();
    const backs = screen.getAllByRole('button', { name: 'Retour' }).length;
    const g = gate();
    const transaction = db.transaction.bind(db);
    jest.spyOn(db, 'transaction').mockImplementation(async (work) => {
      await g.wait;
      return transaction(work);
    });
    await fireEvent.press(button('Purger'));
    await waitFor(() => expect(button('Garder')).toBeDisabled());
    expect(button('Purger')).toBeDisabled();
    // Le retour de la confirmation disparaît, comme sur l'écran Restauration.
    expect(screen.getAllByRole('button', { name: 'Retour' })).toHaveLength(backs - 1);
    await fireEvent.press(button('Garder'));
    // Retour du système (onRequestClose de la fenêtre) : ignoré.
    await fireEvent(screen.getByRole('header', { name: TITLE }), 'requestClose');
    expect(screen.getByRole('header', { name: TITLE })).toBeTruthy();
    await act(async () => {
      g.open();
    });
    await waitFor(() => expect(screen.queryByRole('header', { name: TITLE })).toBeNull());
    expect(await screen.findByText('Aucune saison ne dépasse cette durée.')).toBeTruthy();
  });

  it('à minuit, la confirmation ouverte reste affichée pendant le rechargement', async () => {
    jest.setSystemTime(new Date(2026, 10, 27, 23, 59, 30));
    await openConfirmation();
    // Le rechargement du nouveau jour reste en attente : la confirmation ne doit pas disparaître.
    const g = gate();
    const query = db.query.bind(db);
    jest.spyOn(db, 'query').mockImplementation(async (sql, params) => {
      await g.wait;
      return query(sql, params);
    });
    await act(async () => {
      jest.advanceTimersByTime(45_000);
    });
    expect(screen.getByRole('header', { name: TITLE })).toBeTruthy();
    expect(button('Purger')).not.toBeDisabled();
    await act(async () => {
      g.open();
    });
    expect(screen.getByRole('header', { name: TITLE })).toBeTruthy();
  });

  it('lecture de l’impact en échec : PURGE_IMPACT_FAILED et message', async () => {
    await renderRouter(routes, { initialUrl: '/donnees' });
    const purgeButton = await screen.findByRole('button', { name: 'Purger 2023-2024…' });
    jest.spyOn(db, 'transaction').mockRejectedValueOnce(new Error('lecture'));
    await fireEvent.press(purgeButton);
    expect(await screen.findByText('La purge n’a pas abouti. Rien n’a été effacé.')).toBeTruthy();
    expect(log).toHaveBeenCalledWith('PURGE_IMPACT_FAILED');
    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
  });
});
