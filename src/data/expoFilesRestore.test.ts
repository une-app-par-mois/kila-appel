/**
 * @jest-environment node
 */
// Adaptateur de la restauration dans src/data/expoFiles.ts (ticket 014e, EX-20) : sélecteur de
// fichiers, copie du sélecteur, dossier dédié à part. Les modules natifs sont imités sur node:fs
// (src/__fixtures__/expoModules.ts) : on teste le code de l'adaptateur, pas le module (ADR-008).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  clearPicked,
  expoRestoreDeps,
  expoStorage,
  pickBackupFile,
  removePickedFile,
} from '@/data/expoFiles';

let mockChoice: () => string | null = () => null;
const mockOptions = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => require('@/__fixtures__/expoModules').fakeFileSystem());
jest.mock('expo-document-picker', () => {
  const { join: joinPath } = require('node:path');
  const fs = jest.requireMock('expo-file-system') as { Paths: { root: string } };
  return require('@/__fixtures__/expoModules').fakeDocumentPicker(
    () => joinPath(fs.Paths.root, 'cache dir'),
    () => mockChoice(),
    (o: object) => mockOptions(o),
  );
});

const fsMock = jest.requireMock('expo-file-system') as { Paths: { root: string } };
const cache = join(fsMock.Paths.root, 'cache dir');
const picked = join(cache, 'DocumentPicker');
const source = join(fsMock.Paths.root, 'telechargements', 'kila-sauvegarde-2026-10-22.db');

describe('EX-20 sélecteur de fichiers (expo-document-picker)', () => {
  beforeEach(() => {
    mkdirSync(join(fsMock.Paths.root, 'telechargements'), { recursive: true });
    writeFileSync(source, 'SQLite format 3\u0000 sauvegarde fictive');
    mockOptions.mockClear();
  });
  afterEach(() => rmSync(cache, { recursive: true, force: true }));

  it('copie le fichier choisi dans le cache et rend son chemin du système', async () => {
    mockChoice = () => source;
    const path = await pickBackupFile();
    expect(path).not.toBeNull();
    expect(path?.startsWith(`${picked}/`)).toBe(true);
    expect(readFileSync(path ?? '', 'utf8')).toBe(readFileSync(source, 'utf8'));
    expect(mockOptions).toHaveBeenCalledWith({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
  });

  it('rend null si l’encadrant annule', async () => {
    mockChoice = () => null;
    expect(await pickBackupFile()).toBeNull();
  });

  it.each(['file:///autre/choisi.db', 'content://com.android.providers/document/1'])(
    'refuse une copie hors de cache/DocumentPicker/ : %s',
    async (uri) => {
      const picker = jest.requireMock('expo-document-picker') as {
        getDocumentAsync: () => Promise<unknown>;
      };
      jest.spyOn(picker, 'getDocumentAsync').mockResolvedValueOnce({
        canceled: false,
        assets: [{ name: 'a.db', uri, lastModified: 0 }],
      });
      await expect(pickBackupFile()).rejects.toThrow('Chemin de fichier refusé');
    },
  );

  it('laisse remonter l’échec du sélecteur', async () => {
    mockChoice = () => {
      throw new Error('sélecteur indisponible');
    };
    await expect(pickBackupFile()).rejects.toThrow();
  });

  it('efface la copie du sélecteur, et rien hors de cache/DocumentPicker/', async () => {
    mockChoice = () => source;
    const path = (await pickBackupFile()) ?? '';
    writeFileSync(join(cache, 'autre.db'), 'gardé');
    for (const outside of [source, join(cache, 'autre.db'), picked, `${picked}/../autre.db`]) {
      await expect(removePickedFile(outside)).rejects.toThrow('Chemin de fichier refusé');
    }
    expect(existsSync(source)).toBe(true);
    expect(existsSync(join(cache, 'autre.db'))).toBe(true);
    await removePickedFile(path);
    expect(existsSync(path)).toBe(false);
    // Déjà effacée : rien à faire.
    await removePickedFile(path);
  });

  it('vide cache/DocumentPicker/ seul, même absent', async () => {
    await clearPicked();
    mockChoice = () => source;
    await pickBackupFile();
    writeFileSync(join(cache, 'autre.db'), 'gardé');
    await clearPicked();
    expect(existsSync(picked)).toBe(false);
    expect(existsSync(join(cache, 'autre.db'))).toBe(true);
    expect(existsSync(source)).toBe(true);
  });
});

describe('EX-20 dossiers dédiés : sauvegardes et restauration séparés', () => {
  afterEach(() => rmSync(cache, { recursive: true, force: true }));

  it('chaque dossier a ses sous-dossiers ; vider l’un ne touche jamais l’autre', async () => {
    const backups = expoStorage('sauvegardes');
    const restore = expoStorage('restauration');
    const exported = await backups.newDir();
    const verified = await restore.newDir();
    expect(exported.startsWith(`${join(cache, 'sauvegardes')}/`)).toBe(true);
    expect(verified.startsWith(`${join(cache, 'restauration')}/`)).toBe(true);
    writeFileSync(join(verified, 'restauration.db'), 'copie vérifiée');
    writeFileSync(join(exported, 'kila-sauvegarde-2026-11-27.db'), 'export');
    await backups.clear();
    expect(readFileSync(join(verified, 'restauration.db'), 'utf8')).toBe('copie vérifiée');
    await backups.newDir();
    await restore.clear();
    expect(existsSync(join(cache, 'restauration'))).toBe(false);
    expect(readdirSync(join(cache, 'sauvegardes'))).toHaveLength(1);
  });

  it('removeDir de l’un refuse un sous-dossier de l’autre', async () => {
    const exported = await expoStorage('sauvegardes').newDir();
    await expect(expoStorage('restauration').removeDir(exported)).rejects.toThrow(
      'Chemin de fichier refusé',
    );
    expect(existsSync(exported)).toBe(true);
  });

  it('rassemble les accès de la restauration', async () => {
    const verified = await expoRestoreDeps.files.newDir();
    expect(verified.startsWith(`${join(cache, 'restauration')}/`)).toBe(true);
    expect(expoRestoreDeps.pick).toBe(pickBackupFile);
    expect(expoRestoreDeps.removePicked).toBe(removePickedFile);
    expect(expoRestoreDeps.clearPicked).toBe(clearPicked);
    expect(typeof expoRestoreDeps.open).toBe('function');
  });
});
