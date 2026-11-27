/**
 * @jest-environment node
 */
// Sélecteur de fichiers sur iOS (ticket 014e, revue) : le sélecteur d'iOS (`asCopy`) dépose déjà
// une copie dans `tmp/<identifiant>-Inbox/`. L'adaptateur la prend telle quelle (sans seconde
// copie dans le cache), contrôle son chemin et l'efface comme la copie du sélecteur. Conteneur
// imité sur node:fs (src/__fixtures__/expoModules.ts) ; jamais essayé sur un iPhone.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_BACKUP_BYTES } from '@/data/backupCheck';
import { expoPicker, IOS_INBOX } from '@/data/expoFiles';

let mockChoice: () => string | null = () => null;
let mockSize: number | undefined;
const mockOptions = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => require('@/__fixtures__/expoModules').fakeFileSystem('ios'));
jest.mock('expo-document-picker', () => {
  const { join: joinPath } = require('node:path');
  const fs = jest.requireMock('expo-file-system') as { Paths: { root: string } };
  const app = joinPath(fs.Paths.root, 'app data');
  return require('@/__fixtures__/expoModules').fakeDocumentPicker(
    () => joinPath(app, 'Library', 'Caches'),
    () => mockChoice(),
    (o: object) => mockOptions(o),
    () => joinPath(app, 'tmp', 'com.jitavision.kila-Inbox'),
    () => mockSize,
  );
});

const fsMock = jest.requireMock('expo-file-system') as { Paths: { root: string } };
const app = join(fsMock.Paths.root, 'app data');
const caches = join(app, 'Library', 'Caches');
const inbox = join(app, 'tmp', 'com.jitavision.kila-Inbox');
const source = join(fsMock.Paths.root, 'Fichiers', 'kila-sauvegarde-2026-10-22.db');
const ios = expoPicker('ios');
const pathOf = (result: Awaited<ReturnType<typeof ios.pick>>) =>
  result !== null && 'path' in result ? result.path : '';
const pickerMock = () =>
  jest.requireMock('expo-document-picker') as { getDocumentAsync: () => Promise<unknown> };

describe('EX-20 sélecteur de fichiers sur iOS : copie de l’Inbox', () => {
  beforeEach(() => {
    mkdirSync(join(fsMock.Paths.root, 'Fichiers'), { recursive: true });
    writeFileSync(source, 'SQLite format 3\u0000 sauvegarde fictive');
    mockOptions.mockClear();
    mockSize = undefined;
  });
  afterEach(() => rmSync(app, { recursive: true, force: true }));

  it('dossier Inbox nommé d’après l’identifiant de l’appli (app.json)', () => {
    const config = JSON.parse(readFileSync(join(__dirname, '../../app.json'), 'utf8'));
    expect(IOS_INBOX).toBe(`${config.expo.ios.bundleIdentifier}-Inbox`);
  });

  it('prend la copie de l’Inbox telle quelle, sans seconde copie dans le cache', async () => {
    mockChoice = () => source;
    const path = pathOf(await ios.pick());
    expect(path.startsWith(`${inbox}/`)).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe(readFileSync(source, 'utf8'));
    expect(mockOptions).toHaveBeenCalledWith({
      type: '*/*',
      copyToCacheDirectory: false,
      multiple: false,
    });
    expect(existsSync(join(caches, 'DocumentPicker'))).toBe(false);
    await ios.removePicked(path);
    expect(readdirSync(inbox)).toEqual([]);
  });

  it('accepte la forme /private/var du même chemin', async () => {
    const path = `/private${inbox}/1-choisi.db`;
    jest.spyOn(pickerMock(), 'getDocumentAsync').mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: 'a.db', uri: `file://${encodeURI(path)}`, lastModified: 0 }],
    });
    expect(await ios.pick()).toEqual({ path });
    // Rien à cet endroit sur la machine de test : effacer ne lève pas d'erreur.
    await ios.removePicked(path);
  });

  it.each([
    'caches/DocumentPicker/1.db',
    'tmp/autre-Inbox/1.db',
    'tmp/1.db',
    'tmp/com.jitavision.kila-Inbox/sous/1.db',
  ])('refuse une copie hors de l’Inbox (%s) et vide l’Inbox', async (where) => {
    mkdirSync(inbox, { recursive: true });
    writeFileSync(join(inbox, 'copie-faite.db'), 'copie');
    const path = join(app, where.replace('caches', 'Library/Caches'));
    jest.spyOn(pickerMock(), 'getDocumentAsync').mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: 'a.db', uri: `file://${encodeURI(path)}`, lastModified: 0 }],
    });
    await expect(ios.pick()).rejects.toThrow('Chemin de fichier refusé');
    expect(existsSync(inbox)).toBe(false);
  });

  it('fichier annoncé trop gros : TOO_LARGE, copie de l’Inbox effacée', async () => {
    mockChoice = () => source;
    mockSize = MAX_BACKUP_BYTES + 1;
    expect(await ios.pick()).toEqual({ reason: 'TOO_LARGE' });
    expect(readdirSync(inbox)).toEqual([]);
  });

  it('n’efface rien hors de l’Inbox ; vide l’Inbox et cache/DocumentPicker/', async () => {
    mkdirSync(join(caches, 'DocumentPicker'), { recursive: true });
    writeFileSync(join(caches, 'DocumentPicker', 'ancien.db'), 'x');
    writeFileSync(join(caches, 'autre.db'), 'gardé');
    for (const outside of [source, join(caches, 'autre.db'), inbox]) {
      await expect(ios.removePicked(outside)).rejects.toThrow('Chemin de fichier refusé');
    }
    mockChoice = () => source;
    await ios.pick();
    await ios.clearPicked();
    expect(existsSync(inbox)).toBe(false);
    expect(existsSync(join(caches, 'DocumentPicker'))).toBe(false);
    expect(existsSync(join(caches, 'autre.db'))).toBe(true);
    expect(existsSync(source)).toBe(true);
  });
});
