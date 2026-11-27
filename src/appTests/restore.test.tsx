// Écran Restauration (ticket 014e, EX-20, NF-04, SEC-10), sur une vraie base node:sqlite et le jeu
// fictif. Les fichiers passent par node:fs dans un dossier temporaire (ce que fait
// expo-file-system dans le cache) ; le sélecteur du système est imité. Horloge au 27/11/2026.
import { existsSync, readdirSync } from 'node:fs';
import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { nodePicker, nodeStorage, tempDir } from '@/__fixtures__/backupFiles';
import { backupFile, dump, refusedFiles } from '@/__fixtures__/restoreFiles';
import { seed } from '@/__fixtures__/seed';
import Backup from '@/app/donnees';
import Restore from '@/app/restauration';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import type { BackupStorage } from '@/data/expoFiles';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { fileLock } from '@/hooks/fileLock';

let mockDb: Db | null = null;
let mockDir = '';
let mockPicker: ReturnType<typeof nodePicker>;
let mockPick: () => Promise<{ path: string } | null>;
let mockRestoreStorage: BackupStorage;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
// Le vrai cycle sur node:fs et node:sqlite : seuls les fichiers et le sélecteur changent.
jest.mock('@/data/expoFiles', () => {
  const { join } = require('node:path');
  const fixtures = require('@/__fixtures__/backupFiles');
  return {
    expoBackupDeps: {
      get files() {
        return fixtures.nodeStorage(join(mockDir, 'sauvegardes'));
      },
      share: async () => undefined,
      open: fixtures.openNode,
    },
    expoRestoreDeps: {
      get files() {
        return mockRestoreStorage;
      },
      open: fixtures.openNode,
      pick: () => mockPick(),
      removePicked: (path: string) => mockPicker.removePicked(path),
      clearPicked: () => mockPicker.clearPicked(),
    },
  };
});

const routes = { _layout: RootStack, ...tabRoutes, donnees: Backup, restauration: Restore };
const t = labels.restore;
/** Ouvre Sauvegarde, puis « Choisir un fichier… » : l'écran Restauration lance le sélecteur. */
const openRestore = async () => {
  const router = await renderRouter(routes, { initialUrl: '/donnees' });
  await fireEvent.press(await screen.findByRole('button', { name: t.choose }));
  return router;
};

describe('EX-20 écran Restauration', () => {
  let dir: ReturnType<typeof tempDir>;
  let db: Db;
  const noCopyLeft = () => {
    for (const d of [dir.path('restauration'), dir.path('DocumentPicker')]) {
      expect(existsSync(d) ? readdirSync(d) : []).toEqual([]);
    }
  };

  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
    dir = tempDir();
    mockDir = dir.path('');
    mockPicker = nodePicker(dir.path('DocumentPicker'));
    mockPick = () => mockPicker.pick();
    mockRestoreStorage = nodeStorage(dir.path('restauration'));
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
    dir.remove();
  });

  it('Sauvegarde : section « Restaurer » de la maquette, au caractère près', async () => {
    await renderRouter(routes, { initialUrl: '/donnees' });
    expect(await screen.findByText('Restaurer')).toBeTruthy();
    expect(
      screen.getByText(
        'Remplace toutes les données de l’appareil par celles du fichier. Le fichier est vérifié avant tout changement.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('toutes')).toHaveStyle({ fontFamily: 'IBMPlexSans-Bold' });
    expect(screen.getByRole('button', { name: 'Choisir un fichier…' })).toBeTruthy();
  });

  it.each([
    ['version 0', 'Ce fichier n’est pas une sauvegarde Ki&La'],
    ['fichier texte', 'Ce fichier n’est pas une sauvegarde Ki&La'],
    ['fichier tronqué', 'Cette sauvegarde est abîmée ou a été modifiée'],
    [
      'version plus récente',
      'Cette sauvegarde vient d’une version plus récente de l’appli : mettez l’appli à jour',
    ],
  ] as const)('%s : « %s », rien n’est modifié', async (kind, message) => {
    mockPicker.next = dir.path('choisi.db');
    await refusedFiles[kind].write(mockPicker.next);
    const before = await dump(db);
    await openRestore();
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText('Rien n’a été modifié. Choisissez un autre fichier.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choisir un fichier…' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.confirm })).toBeNull();
    expect(await dump(db)).toEqual(before);
    noCopyLeft();
  });

  it('résume la sauvegarde, puis Annuler ramène à Sauvegarde sans rien changer', async () => {
    await db.execute('DELETE FROM roll_call_drafts');
    mockPicker.next = await backupFile(dir.path('choisi.db'));
    const before = await dump(db);
    const router = await openRestore();
    expect(await screen.findByText('Sauvegarde du 22/10/2026')).toBeTruthy();
    expect(screen.getByText('3 membres · 2 groupes · 1 séance')).toBeTruthy();
    expect(
      screen.getByText(
        'Toutes les données actuelles de l’appareil seront remplacées par celles de ce fichier.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('remplacées')).toHaveStyle({ fontFamily: 'IBMPlexSans-Bold' });
    expect(screen.queryByText(/L’appel en cours/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(router.getPathname()).toBe('/donnees'));
    await waitFor(noCopyLeft);
    expect(await dump(db)).toEqual(before);
  });

  it('sans date dans la sauvegarde : « Sauvegarde »', async () => {
    mockPicker.next = await backupFile(dir.path('choisi.db'));
    const copy = openNodeDb(mockPicker.next);
    await copy.execute("DELETE FROM settings WHERE key = 'last_backup_at'");
    await copy.close();
    await openRestore();
    const summary = await screen.findByTestId('restore-summary');
    expect(within(summary).getByText('Sauvegarde')).toBeTruthy();
    expect(within(summary).getByText('3 membres · 2 groupes · 1 séance')).toBeTruthy();
  });

  // Le jeu fictif a un appel en cours, sur le groupe Poussins.
  it('nomme l’appel en cours qui sera remplacé', async () => {
    mockPicker.next = await backupFile(dir.path('choisi.db'));
    await openRestore();
    expect(
      await screen.findByText('L’appel en cours (Poussins) sera aussi remplacé.'),
    ).toBeTruthy();
  });

  it('appel en cours sans groupe : « L’appel en cours sera aussi remplacé. »', async () => {
    await db.execute('DELETE FROM roll_call_draft_groups');
    mockPicker.next = await backupFile(dir.path('choisi.db'));
    await openRestore();
    expect(await screen.findByText('L’appel en cours sera aussi remplacé.')).toBeTruthy();
  });

  it('NF-04 « Remplacer mes données » : données de la sauvegarde, puis l’Accueil', async () => {
    const backup = await backupFile(dir.path('choisi.db'));
    const saved = openNodeDb(backup);
    const expected = await dump(saved);
    await saved.close();
    mockPicker.next = backup;
    const router = await openRestore();
    await fireEvent.press(await screen.findByRole('button', { name: 'Remplacer mes données' }));
    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(await dump(db)).toEqual(expected);
    noCopyLeft();
    // Retour impossible vers la confirmation : la pile a été vidée.
    const stack = router.getRouterState()?.routes[0]?.state?.routes.map((r) => r.name);
    expect(stack).toEqual(['(tabs)']);
  });

  it('les boutons sont désactivés pendant la restauration', async () => {
    mockPicker.next = await backupFile(dir.path('choisi.db'));
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockDb = {
      ...db,
      execute: (sql, params) =>
        /^ATTACH/.test(sql) ? gate.then(() => db.execute(sql, params)) : db.execute(sql, params),
    };
    const router = await openRestore();
    await fireEvent.press(await screen.findByRole('button', { name: 'Remplacer mes données' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remplacer mes données' })).toBeDisabled(),
    );
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    release();
    await waitFor(() => expect(router.getPathname()).toBe('/'));
  });

  it('sélecteur annulé : retour à Sauvegarde', async () => {
    mockPicker.next = null;
    const router = await openRestore();
    await waitFor(() => expect(router.getPathname()).toBe('/donnees'));
  });

  it('sélecteur en échec : « La restauration n’a pas abouti »', async () => {
    mockPick = () => Promise.reject(new Error('sélecteur'));
    await openRestore();
    expect(await screen.findByText('La restauration n’a pas abouti')).toBeTruthy();
    expect(screen.getByText('Rien n’a été modifié. Choisissez un autre fichier.')).toBeTruthy();
  });

  it('« Vérification du fichier… » pendant la vérification', async () => {
    let release: () => void = () => undefined;
    const verifying = new Promise<void>((resolve) => (release = resolve));
    const storage = mockRestoreStorage;
    mockRestoreStorage = { ...storage, newDir: () => verifying.then(storage.newDir) };
    mockPicker.next = await backupFile(dir.path('choisi.db'));
    await openRestore();
    expect(await screen.findByText('Vérification du fichier…')).toBeTruthy();
    release();
    expect(await screen.findByText('Sauvegarde du 22/10/2026')).toBeTruthy();
    expect(screen.queryByText('Vérification du fichier…')).toBeNull();
  });

  it('retour du système bloqué pendant la restauration ; l’échec s’affiche', async () => {
    mockPicker.next = await backupFile(dir.path('choisi.db'));
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockDb = {
      ...db,
      execute: (sql, params) =>
        /^ATTACH/.test(sql)
          ? gate.then(() => Promise.reject(new Error('fichier illisible')))
          : db.execute(sql, params),
    };
    const before = await dump(db);
    const router = await openRestore();
    await fireEvent.press(await screen.findByRole('button', { name: 'Remplacer mes données' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled());
    await act(async () => appRouter.back());
    expect(router.getPathname()).toBe('/restauration');
    release();
    expect(await screen.findByText('La restauration n’a pas abouti')).toBeTruthy();
    expect(router.getPathname()).toBe('/restauration');
    expect(await dump(db)).toEqual(before);
    // Après l'échec, le retour fonctionne de nouveau.
    await act(async () => appRouter.back());
    await waitFor(() => expect(router.getPathname()).toBe('/donnees'));
  });

  it('Sauvegarde : Exporter et Choisir désactivés pendant l’autre opération', async () => {
    await renderRouter(routes, { initialUrl: '/donnees' });
    const exportButton = await screen.findByRole('button', { name: labels.backup.export });
    expect(exportButton).not.toBeDisabled();
    await act(async () => {
      fileLock.acquire('restore');
    });
    expect(screen.getByRole('button', { name: labels.backup.export })).toBeDisabled();
    expect(screen.getByRole('button', { name: t.choose })).toBeDisabled();
    await act(async () => {
      fileLock.release('restore');
      fileLock.acquire('export');
    });
    expect(screen.getByRole('button', { name: t.choose })).toBeDisabled();
    await act(async () => fileLock.release('export'));
    expect(screen.getByRole('button', { name: t.choose })).not.toBeDisabled();
  });
});
