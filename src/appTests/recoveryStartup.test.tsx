// Démarrage (ticket 014c, revue de code) : le layout racine lance l'ouverture de la base, affiche
// une vue neutre tant qu'elle n'est pas prête, et ne monte la pile qu'une fois la base prête et
// le nettoyage des dossiers temporaires fini (réussi ou non) : aucun écran Export ou Restauration
// ne peut s'ouvrir pendant ce nettoyage.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '@/app/_layout';
import { tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import { resetDatabaseForTests } from '@/hooks/useDatabase';
import { resetStartupCleanupForTests } from '@/hooks/useStartupCleanup';

let mockFile = '';
let mockOpenGate: Promise<void> = Promise.resolve();
let mockClear: () => Promise<void> = async () => undefined;
const mockOpened = jest.fn();
jest.mock('@/data/expoDb', () => ({
  openExpoDb: async () => {
    mockOpened();
    await mockOpenGate;
    return require('@/data/nodeDb').openNodeDb(mockFile);
  },
  deleteAppDatabase: async () => undefined,
}));
jest.mock('@/data/expoFiles', () => ({
  expoStorage: () => ({ clear: () => mockClear() }),
  expoPicker: () => ({ clearPicked: async () => undefined }),
}));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const Stub = () => null;
const routes = { _layout: RootLayout, ...tabRoutes, 'groupes/nouveau': Stub };
const open = () => renderRouter(routes, { initialUrl: '/' });
const gate = () => {
  let release: () => void = () => undefined;
  const wait = new Promise<void>((resolve) => (release = resolve));
  return { wait, release: () => release() };
};
const welcome = () => screen.queryByRole('header', { name: labels.welcome.title });

describe('Démarrage : vue neutre, puis la pile (ticket 014c)', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kila-demarrage-'));
    mockFile = join(dir, 'kila.db');
    mockOpenGate = Promise.resolve();
    mockClear = async () => undefined;
    mockOpened.mockClear();
    resetDatabaseForTests();
    resetStartupCleanupForTests();
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('pendant l’ouverture : ouverture lancée par le layout, aucun écran monté', async () => {
    const opening = gate();
    mockOpenGate = opening.wait;
    await open();
    expect(mockOpened).toHaveBeenCalledTimes(1);
    expect(welcome()).toBeNull();
    expect(screen.queryByText(labels.tabs.home)).toBeNull();
    await act(async () => opening.release());
    expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
  });

  it('base prête, nettoyage en cours : la pile attend la fin du nettoyage', async () => {
    const clearing = gate();
    mockClear = () => clearing.wait;
    await open();
    await act(async () => undefined);
    expect(welcome()).toBeNull();
    await act(async () => clearing.release());
    expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
  });

  it('nettoyage en échec : la pile se monte quand même', async () => {
    mockClear = async () => {
      throw new Error('dossier');
    };
    await open();
    expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
  });
});
