// EX-22 écran de récupération (ticket 014c) : le vrai layout racine, la vraie ouverture et la
// vraie base node:sqlite dans un fichier temporaire ; expo-sqlite est remplacé par node:sqlite
// (ouverture et suppression du fichier, avec `-journal`, `-wal`, `-shm`, comme expo-sqlite).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import RootLayout from '@/app/_layout';
import { tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { resetDatabaseForTests } from '@/hooks/useDatabase';
import { resetStartupCleanupForTests } from '@/hooks/useStartupCleanup';

let mockFile = '';
let mockWrap: (db: Db) => Db = (db) => db;
let mockDeleteFails = 0;
jest.mock('@/data/expoDb', () => ({
  openExpoDb: async () => mockWrap(require('@/data/nodeDb').openNodeDb(mockFile)),
  deleteAppDatabase: async () => {
    if (mockDeleteFails > 0) {
      mockDeleteFails -= 1;
      throw new Error('Unable to delete the database file');
    }
    const { rmSync: rm } = require('node:fs');
    for (const suffix of ['', '-journal', '-wal', '-shm'])
      rm(`${mockFile}${suffix}`, { force: true });
  },
}));
jest.mock('@/data/expoFiles', () => ({
  expoStorage: () => ({ clear: async () => undefined }),
  expoPicker: () => ({ clearPicked: async () => undefined }),
}));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const Stub = () => null;
const routes = {
  _layout: RootLayout,
  ...tabRoutes,
  'groupes/nouveau': Stub,
  'saisons/index': Stub,
};
const r = labels.recovery;
const open = () => renderRouter(routes, { initialUrl: '/' });
const button = (name: string) => screen.queryByRole('button', { name });

describe('EX-22 écran de récupération (ticket 014c)', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kila-recuperation-'));
    mockFile = join(dir, 'kila.db');
    mockWrap = (db) => db;
    mockDeleteFails = 0;
    resetDatabaseForTests();
    resetStartupCleanupForTests();
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('EX-22 base abîmée : variante abîmée, « Repartir de zéro » seulement après confirmation, puis Bienvenue', async () => {
    writeFileSync(mockFile, 'Ceci est un fichier texte, pas une base de données. '.repeat(40));
    const router = await open();
    expect(await screen.findByRole('header', { name: r.title })).toBeTruthy();
    expect(screen.getByText(r.damaged)).toBeTruthy();
    expect(screen.getByText(r.damagedChoice)).toBeTruthy();
    // Réponse du porteur du 2026-11-27 : « Réessayer » au-dessus de « Repartir de zéro ».
    const shown = screen.getAllByRole('button');
    const retryAt = shown.indexOf(screen.getByRole('button', { name: r.retry }));
    expect(retryAt).toBeGreaterThanOrEqual(0);
    expect(retryAt).toBeLessThan(shown.indexOf(screen.getByRole('button', { name: r.startOver })));
    // Aucune navigation : pas de retour, pas d'onglets, pas d'accueil.
    expect(button(labels.common.back)).toBeNull();
    expect(screen.queryByText(labels.tabs.home)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: r.startOver }));
    expect(await screen.findByText(r.confirmMessage)).toBeTruthy();
    expect(screen.getByRole('header', { name: r.confirmTitle })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: r.confirmCancel }));
    await waitFor(() => expect(screen.queryByText(r.confirmMessage)).toBeNull());
    // « Garder » : rien n'a été effacé.
    expect(readFileSync(mockFile, 'utf8')).toContain('fichier texte');

    await fireEvent.press(screen.getByRole('button', { name: r.startOver }));
    await fireEvent.press(await screen.findByRole('button', { name: r.confirm }));
    expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
    expect(readFileSync(mockFile, 'utf8')).not.toContain('fichier texte');
    expect(router.getPathname()).toBe('/');
  });

  it('EX-22 effacement en échec : message sous les boutons, fichier gardé, nouvel essai possible', async () => {
    writeFileSync(mockFile, 'Ceci est un fichier texte, pas une base de données. '.repeat(40));
    mockDeleteFails = 1;
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: r.startOver }));
    await fireEvent.press(await screen.findByRole('button', { name: r.confirm }));
    expect(await screen.findByText(r.resetFailed)).toBeTruthy();
    expect(readFileSync(mockFile, 'utf8')).toContain('fichier texte');
    await fireEvent.press(screen.getByRole('button', { name: r.startOver }));
    await fireEvent.press(await screen.findByRole('button', { name: r.confirm }));
    expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
  });

  it('EX-22 réglage refusé : message, « Réessayer » rouvre, aucune action destructive', async () => {
    let refusals = 1;
    mockWrap = (db) => ({
      ...db,
      query: async <T,>(sql: string, params: (string | number | null)[] = []) => {
        if (sql === 'PRAGMA secure_delete' && refusals > 0) {
          refusals -= 1;
          return [{ secure_delete: 0 }] as T[];
        }
        return db.query<T>(sql, params);
      },
    });
    await open();
    expect(await screen.findByText(r.settings)).toBeTruthy();
    expect(button(r.startOver)).toBeNull();
    expect(button(labels.common.back)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: r.retry }));
    expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
  });

  it('EX-22 version plus récente : le message seul, aucun bouton, fichier intact', async () => {
    const future = openNodeDb(mockFile);
    await future.execute('PRAGMA user_version = 99');
    await future.close();
    const before = readFileSync(mockFile);
    await open();
    expect(await screen.findByText(r.newer)).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    const after = readFileSync(mockFile);
    expect(after.length === before.length && after.every((byte, i) => byte === before[i])).toBe(
      true,
    );
  });

  it('EX-22 base saine : la pile s’affiche, pas d’écran de récupération', async () => {
    await open();
    expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
    expect(screen.queryByText(r.title)).toBeNull();
  });

  it('EX-22 l’écran de récupération n’importe pas la navigation (aucun chemin vers un écran)', () => {
    const source = readFileSync(join(__dirname, '..', 'ui', 'Recovery.tsx'), 'utf8');
    expect(source).not.toMatch(/expo-router|useRouter|router\.|<Link/);
  });
});
