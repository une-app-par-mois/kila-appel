/**
 * @jest-environment node
 */
// Adaptateur de la restauration dans src/data/expoFiles.ts (ticket 014e, EX-20), cas d'Android :
// sélecteur de fichiers, copie du sélecteur, dossier dédié à part. Les modules natifs sont imités
// sur node:fs (src/__fixtures__/expoModules.ts) : on teste l'adaptateur, pas le module (ADR-008).
// Le cas d'iOS est dans expoFilesIos.test.ts.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_BACKUP_BYTES } from '@/data/backupCheck';
import { expoPicker, expoRestoreDeps, expoStorage, IOS_INBOX } from '@/data/expoFiles';

let mockChoice: () => string | null = () => null;
let mockSize: number | undefined;
let mockInbox = '';
const mockOptions = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('expo-file-system', () => require('@/__fixtures__/expoModules').fakeFileSystem());
jest.mock('expo-document-picker', () => {
  const { join: joinPath } = require('node:path');
  const fs = jest.requireMock('expo-file-system') as { Paths: { root: string } };
  return require('@/__fixtures__/expoModules').fakeDocumentPicker(
    () => joinPath(fs.Paths.root, 'cache dir'),
    () => mockChoice(),
    (o: object) => mockOptions(o),
    () => mockInbox,
    () => mockSize,
  );
});

const fsMock = jest.requireMock('expo-file-system') as { Paths: { root: string } };
const cache = join(fsMock.Paths.root, 'cache dir');
const picked = join(cache, 'DocumentPicker');
const source = join(fsMock.Paths.root, 'telechargements', 'kila-sauvegarde-2026-10-22.db');
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const android = expoPicker('android');
const pathOf = (result: Awaited<ReturnType<typeof android.pick>>) =>
  result !== null && 'path' in result ? result.path : '';

describe('EX-20 sélecteur de fichiers sur Android (expo-document-picker)', () => {
  beforeEach(() => {
    mkdirSync(join(fsMock.Paths.root, 'telechargements'), { recursive: true });
    writeFileSync(source, 'SQLite format 3\u0000 sauvegarde fictive');
    mockOptions.mockClear();
    log.mockClear();
    mockSize = undefined;
  });
  afterEach(() => rmSync(cache, { recursive: true, force: true }));

  it('copie le fichier choisi dans le cache et rend son chemin du système', async () => {
    mockChoice = () => source;
    const path = pathOf(await android.pick());
    expect(path.startsWith(`${picked}/`)).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe(readFileSync(source, 'utf8'));
    expect(mockOptions).toHaveBeenCalledWith({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
  });

  it('rend null si l’encadrant annule', async () => {
    mockChoice = () => null;
    expect(await android.pick()).toBeNull();
  });

  it('fichier annoncé trop gros : TOO_LARGE tout de suite, copie effacée', async () => {
    mockChoice = () => source;
    mockSize = MAX_BACKUP_BYTES + 1;
    expect(await android.pick()).toEqual({ reason: 'TOO_LARGE' });
    expect(readdirSync(picked)).toEqual([]);
    expect(log).toHaveBeenCalledWith('RESTORE_REJECTED_TOO_LARGE');
    mockSize = MAX_BACKUP_BYTES;
    expect(pathOf(await android.pick())).not.toBe('');
  });

  it.each(['file:///autre/choisi.db', 'content://com.android.providers/document/1'])(
    'refuse une copie hors de cache/DocumentPicker/ et vide ce dossier : %s',
    async (uri) => {
      mkdirSync(picked, { recursive: true });
      writeFileSync(join(picked, 'copie-faite.db'), 'copie');
      const picker = jest.requireMock('expo-document-picker') as {
        getDocumentAsync: () => Promise<unknown>;
      };
      jest.spyOn(picker, 'getDocumentAsync').mockResolvedValueOnce({
        canceled: false,
        assets: [{ name: 'a.db', uri, lastModified: 0 }],
      });
      await expect(android.pick()).rejects.toThrow('Chemin de fichier refusé');
      expect(existsSync(picked)).toBe(false);
      expect(log).toHaveBeenCalledWith('RESTORE_PICK_PATH_REFUSED');
    },
  );

  it('trop gros et copie impossible à effacer : le dossier du sélecteur est vidé', async () => {
    mockChoice = () => source;
    mockSize = MAX_BACKUP_BYTES + 1;
    const fs = jest.requireMock('expo-file-system') as { File: { prototype: { delete(): void } } };
    jest.spyOn(fs.File.prototype, 'delete').mockImplementationOnce(() => {
      throw new Error('fichier verrouillé');
    });
    expect(await android.pick()).toEqual({ reason: 'TOO_LARGE' });
    expect(existsSync(picked)).toBe(false);
  });

  it('iOS sans cache « Library/Caches » : tout fichier choisi est refusé', async () => {
    // Là où pointerait l'Inbox si la forme du cache n'était pas contrôlée.
    mockInbox = `${cache.slice(0, -'/Library/Caches'.length)}/tmp/${IOS_INBOX}`;
    mockChoice = () => source;
    await expect(expoPicker('ios').pick()).rejects.toThrow('Chemin de fichier refusé');
    expect(log).toHaveBeenCalledWith('RESTORE_PICK_PATH_REFUSED');
    rmSync(mockInbox, { recursive: true, force: true });
  });

  it('laisse remonter l’échec du sélecteur', async () => {
    mockChoice = () => {
      throw new Error('sélecteur indisponible');
    };
    await expect(android.pick()).rejects.toThrow();
  });

  it('efface la copie du sélecteur, et rien hors de cache/DocumentPicker/', async () => {
    mockChoice = () => source;
    const path = pathOf(await android.pick());
    writeFileSync(join(cache, 'autre.db'), 'gardé');
    for (const outside of [source, join(cache, 'autre.db'), picked, `${picked}/../autre.db`]) {
      await expect(android.removePicked(outside)).rejects.toThrow('Chemin de fichier refusé');
    }
    expect(existsSync(source)).toBe(true);
    expect(existsSync(join(cache, 'autre.db'))).toBe(true);
    await android.removePicked(path);
    expect(existsSync(path)).toBe(false);
    // Déjà effacée : rien à faire.
    await android.removePicked(path);
  });

  it('vide cache/DocumentPicker/ seul, même absent', async () => {
    await android.clearPicked();
    mockChoice = () => source;
    await android.pick();
    writeFileSync(join(cache, 'autre.db'), 'gardé');
    await android.clearPicked();
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
    expect(typeof expoRestoreDeps.pick).toBe('function');
    expect(typeof expoRestoreDeps.removePicked).toBe('function');
    expect(typeof expoRestoreDeps.clearPicked).toBe('function');
    expect(typeof expoRestoreDeps.open).toBe('function');
  });
});
