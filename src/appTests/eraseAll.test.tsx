// Écran Tout effacer (ticket 015f, EX-23, SEC-10, SEC-11, ABS-05), sur une vraie base node:sqlite
// et le jeu fictif. Les copies du cache passent par node:fs dans un dossier temporaire. Horloge
// figée au vendredi 27/11/2026. Entrées depuis Paramètres et depuis Sauvegarde.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { tempDir } from '@/__fixtures__/backupFiles';
import { counts } from '@/__fixtures__/purgeSeed';
import { seed } from '@/__fixtures__/seed';
import Backup from '@/app/donnees';
import EraseAll from '@/app/tout-effacer';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { settingsRepo } from '@/data/settingsRepo';
import { type FileTask, fileLock } from '@/hooks/fileLock';

let mockDb: Db | null = null;
let mockDir = '';
/**
 * Dossiers dont le vidage échoue : erreur immédiate, avant toute promesse, pour `sauvegardes`,
 * `restauration` et `exports` ; promesse rejetée pour `DocumentPicker`.
 */
let mockFailing = new Set<string>();
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
// Les dossiers du cache sur node:fs : `sauvegardes`, `restauration`, `exports` (033), `DocumentPicker`
// et `Print` (040a, ci-dessous).
jest.mock('@/data/expoFiles', () => {
  const { join: j } = require('node:path');
  const fixtures = require('@/__fixtures__/backupFiles');
  return {
    expoBackupDeps: { files: { clear: async () => {} } },
    expoStorage: (name: string) => {
      const storage = fixtures.nodeStorage(j(mockDir, name));
      if (!mockFailing.has(name)) return storage;
      return {
        ...storage,
        clear: () => {
          throw new Error('cache');
        },
      };
    },
    expoPicker: () => {
      const picker = fixtures.nodePicker(j(mockDir, 'DocumentPicker'));
      if (!mockFailing.has('DocumentPicker')) return picker;
      return { ...picker, clearPicked: () => Promise.reject(new Error('cache')) };
    },
  };
});
// Ticket 040a : `cache/Print/` d'expo-print sur node:fs ; échec immédiat comme les autres dossiers.
jest.mock('@/data/expoExports', () => ({
  clearPrint: async () => {
    if (mockFailing.has('Print')) throw new Error('cache');
    require('node:fs').rmSync(require('node:path').join(mockDir, 'Print'), {
      recursive: true,
      force: true,
    });
  },
}));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const Stub = () => null;
const routes = {
  _layout: RootStack,
  ...tabRoutes,
  donnees: Backup,
  'tout-effacer': EraseAll,
  'groupes/nouveau': Stub,
  'saisons/index': Stub,
};
const t = labels.eraseAll;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const field = () => screen.getByLabelText(t.field);
/** Sauvegarde, puis « Tout effacer… » : la première confirmation. */
const openFromBackup = async () => {
  const router = await renderRouter(routes, { initialUrl: '/donnees' });
  await fireEvent.press(await screen.findByRole('button', { name: t.open }));
  await screen.findByRole('header', { name: t.title });
  return router;
};
const CACHE = ['sauvegardes', 'restauration', 'exports', 'Print', 'DocumentPicker'];

describe('EX-23 écran Tout effacer', () => {
  let dir: ReturnType<typeof tempDir>;
  let db: Db;
  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
    dir = tempDir();
    mockDir = dir.path('');
    for (const name of CACHE) {
      mkdirSync(dir.path(name));
      writeFileSync(join(dir.path(name), 'copie.db'), 'copie fictive');
    }
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    await settingsRepo(db).setRetentionSeasons(1);
    mockDb = db;
    mockFailing = new Set();
    log.mockClear();
  });
  afterEach(async () => {
    jest.useRealTimers();
    for (const task of ['erase', 'export', 'restore', 'cleanup'] as FileTask[]) {
      fileLock.release(task);
    }
    mockDb = null;
    await db.close();
    dir.remove();
  });

  it('Sauvegarde : section « Tout effacer » de la maquette, puis l’écran', async () => {
    const router = await renderRouter(routes, { initialUrl: '/donnees' });
    expect(
      await screen.findByText('Efface toutes les données de cet appareil. Double confirmation.'),
    ).toBeTruthy();
    expect(screen.getByText('Tout effacer')).toBeTruthy();
    await fireEvent.press(button('Tout effacer…'));
    await waitFor(() => expect(router.getPathname()).toBe('/tout-effacer'));
  });

  it('Paramètres : la ligne « Tout effacer » ouvre directement l’écran', async () => {
    const router = await renderRouter(routes, { initialUrl: '/parametres' });
    await fireEvent.press(await screen.findByRole('button', { name: 'Tout effacer' }));
    await waitFor(() => expect(router.getPathname()).toBe('/tout-effacer'));
    expect(await screen.findByRole('header', { name: 'Tout effacer ?' })).toBeTruthy();
  });

  it('avertissement de la maquette au caractère près, « définitivement » en gras', async () => {
    await openFromBackup();
    expect(
      screen.getByText(
        'Toutes les données de cet appareil seront effacées définitivement : membres, contacts d’urgence, groupes, créneaux, séances, présences et réglages.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('définitivement')).toHaveStyle({ fontFamily: 'IBMPlexSans-Bold' });
    expect(
      screen.getByText('Sans sauvegarde, elles ne pourront pas être retrouvées.'),
    ).toBeTruthy();
    expect(field().props.autoCapitalize).toBe('characters');
    expect(field().props.autoCorrect).toBe(false);
  });

  it('EX-23 bouton désactivé tant que le mot est faux ; minuscules et espaces acceptés', async () => {
    await openFromBackup();
    expect(button('Tout effacer')).toBeDisabled();
    for (const wrong of ['EFFACE', 'EFFACERR', 'E FFACER', 'supprimer']) {
      await fireEvent.changeText(field(), wrong);
      expect(button('Tout effacer')).toBeDisabled();
    }
    await fireEvent.changeText(field(), '  effacer ');
    expect(button('Tout effacer')).not.toBeDisabled();
    await fireEvent.changeText(field(), 'EFFACER');
    expect(button('Tout effacer')).not.toBeDisabled();
  });

  it('EX-23 Entrée n’efface rien', async () => {
    const before = await counts(db);
    await openFromBackup();
    await fireEvent.changeText(field(), 'EFFACER');
    await fireEvent(field(), 'submitEditing');
    expect(await counts(db)).toEqual(before);
    expect(screen.getByRole('header', { name: t.title })).toBeTruthy();
  });

  it('« Garder » et le retour ramènent à Sauvegarde sans rien effacer', async () => {
    const before = await counts(db);
    const router = await openFromBackup();
    await fireEvent.changeText(field(), 'EFFACER');
    await fireEvent.press(button('Garder'));
    await waitFor(() => expect(router.getPathname()).toBe('/donnees'));
    await fireEvent.press(button('Tout effacer…'));
    await fireEvent.press(await screen.findByRole('button', { name: labels.common.back }));
    await waitFor(() => expect(router.getPathname()).toBe('/donnees'));
    expect(await counts(db)).toEqual(before);
    for (const name of CACHE) expect(existsSync(dir.path(name))).toBe(true);
  });

  it('EX-23 SEC-10 réussite : tout effacé, copies vidées, Bienvenue et saison recréée', async () => {
    const router = await openFromBackup();
    await fireEvent.changeText(field(), 'EFFACER');
    await fireEvent.press(button('Tout effacer'));
    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(await screen.findByText(labels.welcome.seasonCreated('2026-2027'))).toBeTruthy();
    // L'appel en cours est effacé ; la seule ligne revenue est la saison recréée par Bienvenue.
    const after = await counts(db);
    expect(after.roll_call_drafts).toBe(0);
    expect(after.members).toBe(0);
    expect(after.settings).toBe(0);
    expect(await db.query('SELECT name FROM seasons')).toEqual([{ name: '2026-2027' }]);
    expect(await settingsRepo(db).retentionSeasons()).toBe(3);
    for (const name of CACHE) expect(existsSync(dir.path(name))).toBe(false);
    // Retour impossible vers l'écran Tout effacer : la pile a été vidée.
    const stack = router.getRouterState()?.routes[0]?.state?.routes.map((r) => r.name);
    expect(stack).toEqual(['(tabs)']);
  });

  it.each([['sauvegardes'], ['restauration'], ['exports'], ['Print'], ['DocumentPicker']])(
    'SEC-10 vidage de %s en échec : journalisé, les autres vidés, Bienvenue quand même',
    async (failing) => {
      mockFailing = new Set([failing]);
      const router = await openFromBackup();
      await fireEvent.changeText(field(), 'EFFACER');
      await fireEvent.press(button('Tout effacer'));
      await waitFor(() => expect(router.getPathname()).toBe('/'));
      expect(log).toHaveBeenCalledWith('ERASE_COPIES_FAILED');
      for (const name of CACHE) expect(existsSync(dir.path(name))).toBe(name === failing);
      expect(await counts(db)).toMatchObject({ members: 0, roll_call_drafts: 0 });
    },
  );

  it('EX-23 échec : message, rien d’effacé, copies gardées', async () => {
    jest.spyOn(db, 'transaction').mockRejectedValue(new Error('panne'));
    const before = await counts(db);
    await openFromBackup();
    await fireEvent.changeText(field(), 'EFFACER');
    await fireEvent.press(button('Tout effacer'));
    expect(
      await screen.findByText('L’effacement n’a pas abouti. Rien n’a été effacé.'),
    ).toBeTruthy();
    expect(await counts(db)).toEqual(before);
    for (const name of CACHE) expect(existsSync(dir.path(name))).toBe(true);
    expect(button('Tout effacer')).not.toBeDisabled();
  });

  it.each(['export', 'restore', 'cleanup', 'erase'] as FileTask[])(
    'SEC-11 boutons désactivés sous le verrou (%s)',
    async (task) => {
      await openFromBackup();
      await fireEvent.changeText(field(), 'EFFACER');
      expect(button('Tout effacer')).not.toBeDisabled();
      await act(async () => {
        fileLock.acquire(task);
      });
      await waitFor(() => expect(button('Tout effacer')).toBeDisabled());
      await act(async () => {
        fileLock.release(task);
      });
      await waitFor(() => expect(button('Tout effacer')).not.toBeDisabled());
    },
  );

  it('SEC-11 « Tout effacer… » de Sauvegarde désactivé sous le verrou', async () => {
    await renderRouter(routes, { initialUrl: '/donnees' });
    expect(await screen.findByRole('button', { name: t.open })).not.toBeDisabled();
    await act(async () => {
      fileLock.acquire('restore');
    });
    await waitFor(() => expect(button(t.open)).toBeDisabled());
  });

  it('pendant l’effacement : tout désactivé, retour caché et bloqué', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const transaction = db.transaction.bind(db);
    jest.spyOn(db, 'transaction').mockImplementation((work) => gate.then(() => transaction(work)));
    const router = await openFromBackup();
    await fireEvent.changeText(field(), 'EFFACER');
    await fireEvent.press(button('Tout effacer'));
    await waitFor(() => expect(button('Tout effacer')).toBeDisabled());
    expect(button('Garder')).toBeDisabled();
    expect(field().props.editable).toBe(false);
    expect(screen.queryByRole('button', { name: labels.common.back })).toBeNull();
    await act(async () => {
      appRouter.back();
    });
    expect(router.getPathname()).toBe('/tout-effacer');
    release();
    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(await counts(db)).toMatchObject({ members: 0, settings: 0 });
  });
});
