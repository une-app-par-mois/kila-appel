// Écran Sauvegarde : export (ticket 014b, EX-19, EX-21, SEC-09, ABS-06), sur une vraie base
// node:sqlite et le jeu fictif. Les fichiers passent par node:fs dans un dossier temporaire (ce que
// fait expo-file-system dans le cache) ; le partage du système est imité. Horloge figée au
// vendredi 27/11/2026.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { nodeStorage, tempDir } from '@/__fixtures__/backupFiles';
import { seed } from '@/__fixtures__/seed';
import Backup from '@/app/donnees';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import type { BackupStorage } from '@/data/expoFiles';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { settingsRepo } from '@/data/settingsRepo';

let mockDb: Db | null = null;
let mockStorage: BackupStorage;
const mockShare = jest.fn<Promise<void>, [string]>();
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
// Le vrai cycle sur node:fs et node:sqlite : seul l'accès aux fichiers et le partage changent.
jest.mock('@/data/expoFiles', () => ({
  expoBackupDeps: {
    get files() {
      return mockStorage;
    },
    share: (path: string) => mockShare(path),
    open: (path: string) => require('@/__fixtures__/backupFiles').openNode(path),
  },
}));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const routes = { _layout: RootStack, ...tabRoutes, donnees: Backup };
const open = (initialUrl = '/donnees') => renderRouter(routes, { initialUrl });
const t = labels.backup;
const exportButton = () => screen.findByRole('button', { name: t.export });

// SEC-09, ABS-06 : le texte de la maquette, au caractère près. Il n'est jamais réduit.
const WARNING_TITLE = 'Ce fichier n’est pas protégé';
const WARNING =
  'Il contient les noms, dates de naissance et contacts d’urgence de vos membres, et toutes ' +
  'leurs présences, en clair. Toute personne qui l’obtient peut les lire. Gardez-le en lieu sûr : ' +
  'sa garde vous revient.';

describe('EX-19 écran Sauvegarde : export', () => {
  let db: Db;
  let dir: ReturnType<typeof tempDir>;
  let backups: string;
  beforeEach(async () => {
    dir = tempDir();
    backups = dir.path('sauvegardes');
    mockStorage = nodeStorage(backups);
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    mockDb = db;
    mockShare.mockReset();
    log.mockClear();
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
    dir.remove();
  });

  it('SEC-09 ABS-06 avertissement complet au-dessus du bouton, « en clair » en gras', async () => {
    await open();
    expect(await screen.findByRole('header', { name: t.title })).toBeTruthy();
    expect(screen.getByText(WARNING_TITLE)).toBeTruthy();
    expect(screen.getByText(WARNING)).toBeTruthy();
    expect(screen.getByText('en clair')).toHaveStyle({ fontFamily: 'IBMPlexSans-Bold' });
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf(WARNING_TITLE)).toBeLessThan(tree.indexOf(t.export));
    expect(tree.indexOf('sa garde vous revient.')).toBeLessThan(tree.indexOf(t.export));
  });

  it('EX-21 aucune sauvegarde : le dit sous le bouton', async () => {
    await open();
    expect(await screen.findByText('Aucune sauvegarde pour l’instant.')).toBeTruthy();
  });

  it.each([
    ['2026-11-27', 'Dernière sauvegarde : aujourd’hui.'],
    ['2026-11-26', 'Dernière sauvegarde : hier.'],
    ['2026-10-24', 'Dernière sauvegarde : il y a 34 jours.'],
    ['2026-11-30', 'Dernière sauvegarde : le 30/11/2026.'],
  ])('EX-21 dernière sauvegarde le %s : « %s »', async (date, text) => {
    await settingsRepo(db).setLastBackupDate(date);
    await open();
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it('EX-19 exporte une copie datée, la partage, puis l’efface et note la date', async () => {
    let shared = '';
    mockShare.mockImplementation(async (path) => {
      shared = path;
      // Pendant le partage : le fichier existe, c'est une sauvegarde datée du jour.
      expect(path.endsWith('/kila-sauvegarde-2026-11-27.db')).toBe(true);
      expect(new TextDecoder().decode(readFileSync(path).slice(0, 15))).toBe('SQLite format 3');
      const copy = openNodeDb(path);
      expect(await settingsRepo(copy).lastBackupDate()).toBe('2026-11-27');
      await copy.close();
      // La date n'est pas notée avant la fin du partage.
      expect(await settingsRepo(db).lastBackupDate()).toBeNull();
    });
    await open();
    await fireEvent.press(await exportButton());
    expect(await screen.findByText('Dernière sauvegarde : aujourd’hui.')).toBeTruthy();
    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(existsSync(shared)).toBe(false);
    expect(readdirSync(backups)).toEqual([]);
    expect(await settingsRepo(db).lastBackupDate()).toBe('2026-11-27');
    expect(log).toHaveBeenCalledWith('BACKUP_SHARED');
  });

  it('EX-21 partage en échec : copie effacée, aucune date, message', async () => {
    mockShare.mockRejectedValue(new Error('partage impossible'));
    await open();
    await fireEvent.press(await exportButton());
    expect(await screen.findByText(t.exportFailed)).toBeTruthy();
    expect(readdirSync(backups)).toEqual([]);
    expect(await settingsRepo(db).lastBackupDate()).toBeNull();
    expect(screen.getByText('Aucune sauvegarde pour l’instant.')).toBeTruthy();
    expect(log).toHaveBeenCalledWith('BACKUP_EXPORT_FAILED');
  });

  it('EX-19 copie refusée par la vérification : rien n’est partagé ni noté, copie effacée', async () => {
    // Une base dont VACUUM INTO écrit un fichier qui n'est pas une sauvegarde (version 0).
    await db.execute('PRAGMA user_version = 0');
    await open();
    await fireEvent.press(await exportButton());
    expect(await screen.findByText(t.exportFailed)).toBeTruthy();
    expect(mockShare).not.toHaveBeenCalled();
    expect(readdirSync(backups)).toEqual([]);
    expect(await settingsRepo(db).lastBackupDate()).toBeNull();
  });

  it('EX-19 le dossier dédié est vidé à l’ouverture de l’écran', async () => {
    mkdirSync(join(backups, 'ancien'), { recursive: true });
    writeFileSync(join(backups, 'ancien', 'kila-sauvegarde-2026-10-01.db'), 'reste');
    await open();
    await waitFor(() => expect(existsSync(backups)).toBe(false));
  });

  it('un deuxième appui pendant le partage ne lance pas un deuxième export', async () => {
    let finish: () => void = () => undefined;
    mockShare.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    await open();
    const button = await exportButton();
    await fireEvent.press(button);
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));
    await fireEvent.press(button);
    finish();
    expect(await screen.findByText('Dernière sauvegarde : aujourd’hui.')).toBeTruthy();
    expect(mockShare).toHaveBeenCalledTimes(1);
  });
});

describe('Paramètres › Données › Sauvegarde et restauration', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    mockDb = db;
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 27, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('montre la dernière sauvegarde et mène à l’écran Sauvegarde', async () => {
    await settingsRepo(db).setLastBackupDate('2026-10-24');
    const router = await open('/parametres');
    expect(await screen.findByText(labels.settings.data)).toBeTruthy();
    expect(await screen.findByText('Dernière : il y a 34 jours')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Sauvegarde et restauration/ }));
    expect(router.getPathname()).toBe('/donnees');
  });

  it('sans sauvegarde : « Aucune sauvegarde »', async () => {
    await open('/parametres');
    expect(await screen.findByText('Aucune sauvegarde')).toBeTruthy();
  });

  it.each([
    ['/donnees', 'Dernière sauvegarde : aujourd’hui.', 'Dernière sauvegarde : hier.'],
    ['/parametres', 'Dernière : aujourd’hui', 'Dernière : hier'],
  ])(
    'EX-21 %s ouvert après minuit : « aujourd’hui » devient « hier »',
    async (url, before, after) => {
      jest.setSystemTime(new Date(2026, 10, 27, 23, 59, 30));
      await settingsRepo(db).setLastBackupDate('2026-11-27');
      await open(url);
      expect(await screen.findByText(before)).toBeTruthy();
      // L'horloge partagée (ticket 012) relit l'heure toutes les 15 s.
      await act(async () => {
        jest.advanceTimersByTime(45_000);
      });
      expect(await screen.findByText(after)).toBeTruthy();
    },
  );
});
