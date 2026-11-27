// Écran Sauvegarde par le vrai adaptateur src/data/expoFiles.ts et openExpoCopy (ticket 014b,
// revue de code) : seuls les modules natifs sont imités (src/__fixtures__/expoModules.ts), avec un
// cache dont le chemin contient une espace, pour l'enchaînement newDir, URI file://, partage,
// removeDir. La base de l'appli reste sur node:sqlite.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { seed } from '@/__fixtures__/seed';
import Backup from '@/app/donnees';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { settingsRepo } from '@/data/settingsRepo';

let mockDb: Db | null = null;
const mockShareAsync = jest.fn<Promise<void>, [string, object]>();
const mockOpened = jest.fn();
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('expo-file-system', () => require('@/__fixtures__/expoModules').fakeFileSystem());
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({
  shareAsync: (uri: string, options: object) => mockShareAsync(uri, options),
}));
jest.mock('expo-sqlite', () =>
  require('@/__fixtures__/expoModules').fakeSqlite(
    (name: string, options?: object, directory?: string) => mockOpened(name, options, directory),
  ),
);
const { Paths } = jest.requireMock('expo-file-system') as { Paths: { root: string } };
const backups = join(Paths.root, 'cache dir', 'sauvegardes');

const routes = { _layout: RootStack, ...tabRoutes, donnees: Backup };

describe('EX-19 export par le vrai adaptateur de fichiers', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    mockShareAsync.mockReset();
    mockOpened.mockClear();
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('partage une URI file:// d’un sous-dossier neuf, puis l’efface', async () => {
    let sharedPath = '';
    mockShareAsync.mockImplementation(async (uri) => {
      expect(uri).toMatch(
        /^file:\/\/.*\/cache%20dir\/sauvegardes\/[^/]+\/kila-sauvegarde-2026-11-27\.db$/,
      );
      sharedPath = decodeURIComponent(uri.slice('file://'.length));
      expect(existsSync(sharedPath)).toBe(true);
    });
    await renderRouter(routes, { initialUrl: '/donnees' });
    await fireEvent.press(await screen.findByRole('button', { name: labels.backup.export }));
    expect(await screen.findByText('Dernière sauvegarde : aujourd’hui.')).toBeTruthy();
    expect(mockShareAsync).toHaveBeenCalledWith(expect.any(String), {
      mimeType: 'application/octet-stream',
    });
    // La copie de vérification a été ouverte par chemin, sur sa propre connexion.
    expect(mockOpened).toHaveBeenCalledWith(
      'verification.db',
      { useNewConnection: true },
      expect.stringContaining('/cache dir/sauvegardes/'),
    );
    expect(existsSync(sharedPath)).toBe(false);
    expect(readdirSync(backups)).toEqual([]);
    expect(await settingsRepo(db).lastBackupDate()).toBe('2026-11-27');
  });
});
