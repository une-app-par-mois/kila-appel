// Écran Restauration par le vrai adaptateur src/data/expoFiles.ts et openExpoCopy (ticket 014e) :
// seuls les modules natifs sont imités (src/__fixtures__/expoModules.ts), dans un conteneur iOS
// dont le chemin contient une espace (jest-expo joue iOS ; Android : expoFilesRestore.test.ts).
// Sélecteur (copie de l'Inbox), URI file://, copie vérifiée dans Caches/restauration/, ouverture
// brute, effacement. La base de l'appli reste sur node:sqlite.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { backupFile, dump } from '@/__fixtures__/restoreFiles';
import { seed } from '@/__fixtures__/seed';
import Backup from '@/app/donnees';
import Restore from '@/app/restauration';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
let mockChoice: string | null = null;
const mockOpened = jest.fn();
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('expo-file-system', () => require('@/__fixtures__/expoModules').fakeFileSystem('ios'));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-document-picker', () => {
  const { join: joinPath } = require('node:path');
  const fs = jest.requireMock('expo-file-system') as { Paths: { root: string } };
  const app = joinPath(fs.Paths.root, 'app data');
  return require('@/__fixtures__/expoModules').fakeDocumentPicker(
    () => joinPath(app, 'Library', 'Caches'),
    () => mockChoice,
    () => undefined,
    () => joinPath(app, 'tmp', 'com.jitavision.kila-Inbox'),
  );
});
jest.mock('expo-sqlite', () =>
  require('@/__fixtures__/expoModules').fakeSqlite(
    (name: string, options?: object, directory?: string) => mockOpened(name, options, directory),
  ),
);
const { Paths } = jest.requireMock('expo-file-system') as { Paths: { root: string } };
const app = join(Paths.root, 'app data');
const cache = join(app, 'Library', 'Caches');
const routes = { _layout: RootStack, ...tabRoutes, donnees: Backup, restauration: Restore };

describe('EX-20 NF-04 restauration par le vrai adaptateur de fichiers', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    mockOpened.mockClear();
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('choisit, vérifie la copie à part, remplace, puis efface les deux copies', async () => {
    mkdirSync(join(Paths.root, 'telechargements'), { recursive: true });
    const backup = await backupFile(join(Paths.root, 'telechargements', 'kila.db'));
    const saved = openNodeDb(backup);
    const expected = await dump(saved);
    await saved.close();
    mockChoice = backup;
    const exportDir = join(cache, 'sauvegardes', 'export');
    const exported = () => {
      mkdirSync(exportDir, { recursive: true });
      writeFileSync(join(exportDir, 'kila-sauvegarde-2026-11-27.db'), 'x');
    };
    exported();
    const router = await renderRouter(routes, { initialUrl: '/donnees' });
    // L'écran Sauvegarde ne vide rien à l'ouverture (SEC-10, ticket 014g) ; la restauration ne
    // touche jamais à son dossier.
    await fireEvent.press(await screen.findByRole('button', { name: 'Choisir un fichier…' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Remplacer mes données' }));
    await waitFor(() => expect(router.getPathname()).toBe('/'));

    expect(await dump(db)).toEqual(expected);
    // La copie vérifiée a été ouverte par chemin, dans cache/restauration/, sur sa connexion.
    expect(mockOpened).toHaveBeenCalledWith(
      'restauration.db',
      { useNewConnection: true },
      expect.stringContaining('/app data/Library/Caches/restauration/'),
    );
    expect(readdirSync(join(app, 'tmp', 'com.jitavision.kila-Inbox'))).toEqual([]);
    expect(existsSync(join(cache, 'DocumentPicker'))).toBe(false);
    expect(readdirSync(join(cache, 'restauration'))).toEqual([]);
    expect(existsSync(join(cache, 'sauvegardes', 'export'))).toBe(true);
    expect(existsSync(backup)).toBe(true);
  });
});
