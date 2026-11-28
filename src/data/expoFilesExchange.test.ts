/**
 * @jest-environment node
 */
// Fichiers des échanges dans src/data/expoFiles.ts (ticket 033, SEC-06, SEC-10, ABS-04) : lecture
// bornée d'un fichier choisi pour l'import, écriture et partage des exports CSV et PDF dans
// `cache/exports/`. Modules natifs imités sur node:fs (src/__fixtures__/expoModules.ts, ADR-008).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expoPicker, expoStorage, readFileBytes, shareFile, writeFile } from '@/data/expoFiles';

// Limite locale : celle de l'import (MAX_CSV_BYTES) appartient au ticket 031.
const LIMIT = 1024 * 1024;
let mockChoice: () => string | null = () => null;
let mockSize: number | undefined;
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => undefined) }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('expo-file-system', () => require('@/__fixtures__/expoModules').fakeFileSystem());
jest.mock('expo-document-picker', () => {
  const { join: joinPath } = require('node:path');
  const fs = jest.requireMock('expo-file-system') as { Paths: { root: string } };
  return require('@/__fixtures__/expoModules').fakeDocumentPicker(
    () => joinPath(fs.Paths.root, 'cache dir'),
    () => mockChoice(),
    () => undefined,
    undefined,
    () => mockSize,
    () => 'choisi.csv',
  );
});

const fsMock = jest.requireMock('expo-file-system') as {
  Paths: { root: string };
  File: { prototype: { delete(): void; write(c: unknown): Promise<void> } };
};
const { shareAsync } = jest.requireMock('expo-sharing') as { shareAsync: jest.Mock };
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const cache = join(fsMock.Paths.root, 'cache dir');
const picked = join(cache, 'DocumentPicker');
const exportsDir = join(cache, 'exports');
const source = join(fsMock.Paths.root, 'telechargements', 'membres.csv');
const importPicker = expoPicker('android', LIMIT, 'import');
const pickPath = async () => {
  const result = await importPicker.pick();
  return result !== null && 'path' in result ? result.path : '';
};
const uriOf = (path: string) => `file://${path.split('/').map(encodeURIComponent).join('/')}`;
const bytesOf = (result: Awaited<ReturnType<typeof readFileBytes>>) =>
  'bytes' in result ? new TextDecoder().decode(result.bytes) : result.reason;

beforeEach(() => {
  mkdirSync(join(fsMock.Paths.root, 'telechargements'), { recursive: true });
  writeFileSync(source, 'nom;prenom\nMartin;Léa\n');
  mockChoice = () => source;
  mockSize = undefined;
  log.mockClear();
  shareAsync.mockClear();
});
afterEach(() => {
  jest.restoreAllMocks();
  rmSync(cache, { recursive: true, force: true });
});

describe('SEC-06 sélecteur de l’import : limite passée par l’appelant, codes de l’import', () => {
  it('1 Mo + 1 octet annoncé : TOO_LARGE, copie effacée, IMPORT_REJECTED_TOO_LARGE', async () => {
    mockSize = LIMIT + 1;
    expect(await importPicker.pick()).toEqual({ reason: 'TOO_LARGE' });
    expect(readdirSync(picked)).toEqual([]);
    expect(log.mock.calls).toEqual([['IMPORT_REJECTED_TOO_LARGE']]);
  });

  it('1 Mo annoncé : accepté', async () => {
    mockSize = LIMIT;
    expect(await pickPath()).not.toBe('');
  });

  it('chemin inattendu : IMPORT_PICK_PATH_REFUSED, dossier du sélecteur vidé', async () => {
    const picker = jest.requireMock('expo-document-picker') as {
      getDocumentAsync: () => Promise<unknown>;
    };
    jest.spyOn(picker, 'getDocumentAsync').mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: 'a.csv', uri: 'file:///autre/a.csv', lastModified: 0 }],
    });
    await expect(importPicker.pick()).rejects.toThrow('Chemin de fichier refusé');
    expect(log.mock.calls).toEqual([['IMPORT_PICK_PATH_REFUSED']]);
  });
});

describe('SEC-06 readFileBytes : lecture bornée, copie du sélecteur effacée', () => {
  it('lit les octets et efface la copie', async () => {
    const path = await pickPath();
    expect(bytesOf(await readFileBytes(path, LIMIT, 'android'))).toBe('nom;prenom\nMartin;Léa\n');
    expect(existsSync(path)).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it('taille réelle de 1 Mo + 1 octet (taille annoncée absente) : TOO_LARGE, copie effacée', async () => {
    writeFileSync(source, new Uint8Array(LIMIT + 1));
    const path = await pickPath();
    expect(await readFileBytes(path, LIMIT, 'android')).toEqual({ reason: 'TOO_LARGE' });
    expect(existsSync(path)).toBe(false);
    expect(log.mock.calls).toEqual([['IMPORT_REJECTED_TOO_LARGE']]);
  });

  it('taille réelle de 1 Mo exactement : lue', async () => {
    writeFileSync(source, new Uint8Array(LIMIT));
    const path = await pickPath();
    const result = await readFileBytes(path, LIMIT, 'android');
    expect('bytes' in result && result.bytes.length).toBe(LIMIT);
  });

  it('fichier grossi après la mesure : la lecture bornée le refuse quand même', async () => {
    const path = await pickPath();
    const handle = jest.spyOn(fsMock.File.prototype as never, 'open' as never);
    handle.mockImplementationOnce((() => ({
      readBytes: async (length: number) => new Uint8Array(length),
      close: () => undefined,
    })) as never);
    expect(await readFileBytes(path, LIMIT, 'android')).toEqual({ reason: 'TOO_LARGE' });
    expect(existsSync(path)).toBe(false);
  });

  it.each([
    ['hors du dossier du sélecteur', () => source],
    ['le dossier du sélecteur lui-même', () => picked],
    ['un sous-dossier imbriqué', () => join(picked, 'a', 'b.csv')],
    ['une remontée', () => `${picked}/../exports/x.csv`],
  ])('refuse %s : IMPORT_PICK_PATH_REFUSED, sans chemin, rien lu', async (_label, path) => {
    await pickPath();
    const error = await readFileBytes(path(), LIMIT, 'android').catch((e: Error) => e);
    expect(error).toEqual(new Error('Chemin de fichier refusé'));
    expect(log.mock.calls).toEqual([['IMPORT_PICK_PATH_REFUSED']]);
    expect(existsSync(source)).toBe(true);
    expect(existsSync(picked)).toBe(false);
  });

  it('lecture en échec : erreur sans chemin (ABS-04), copie effacée quand même', async () => {
    const path = await pickPath();
    jest.spyOn(fsMock.File.prototype as never, 'open' as never).mockImplementationOnce(() => {
      throw new Error(`échec de ${path}`);
    });
    const error = await readFileBytes(path, LIMIT, 'android').catch((e: Error) => e);
    expect(error).toEqual(new Error('Lecture du fichier impossible'));
    expect(existsSync(path)).toBe(false);
  });

  it('copie impossible à effacer : le dossier du sélecteur est vidé', async () => {
    const path = await pickPath();
    jest.spyOn(fsMock.File.prototype, 'delete').mockImplementationOnce(() => {
      throw new Error('fichier verrouillé');
    });
    expect(bytesOf(await readFileBytes(path, LIMIT, 'android'))).toContain('Martin');
    expect(existsSync(picked)).toBe(false);
  });
});

describe('SEC-10 cache/exports/ : écriture bornée et partage', () => {
  const exportsStorage = expoStorage('exports');

  it('écrit du texte (BOM gardé) ou des octets dans un sous-dossier neuf de exports/', async () => {
    const dir = await exportsStorage.newDir();
    expect(dir.startsWith(`${exportsDir}/`)).toBe(true);
    await writeFile(join(dir, 'kila-presences-2026-11-28.csv'), '﻿nom;prenom\n');
    await writeFile(join(dir, 'kila-rapport-2026-11-28.pdf'), new Uint8Array([37, 80, 68, 70]));
    expect(readFileSync(join(dir, 'kila-presences-2026-11-28.csv'), 'utf8')).toBe('﻿nom;prenom\n');
    expect([...readFileSync(join(dir, 'kila-rapport-2026-11-28.pdf'))]).toEqual([37, 80, 68, 70]);
  });

  it('n’écrase pas un fichier déjà écrit', async () => {
    const path = join(await exportsStorage.newDir(), 'a.csv');
    await writeFile(path, 'premier');
    await expect(writeFile(path, 'second')).rejects.toThrow('Écriture du fichier impossible');
    expect(readFileSync(path, 'utf8')).toBe('premier');
  });

  it.each([
    ['directement dans exports/', () => join(exportsDir, 'a.csv')],
    ['dans un sous-dossier imbriqué', () => join(exportsDir, '1', '2', 'a.csv')],
    ['hors du cache des exports', () => join(cache, 'sauvegardes', '1', 'a.csv')],
    ['par une remontée', () => `${exportsDir}/1/../../a.csv`],
  ])('refuse un chemin %s', async (_label, path) => {
    await expect(writeFile(path(), 'x')).rejects.toEqual(new Error('Chemin de fichier refusé'));
    expect(existsSync(join(cache, 'a.csv'))).toBe(false);
  });

  it.each(['a.db', 'A.csv', 'a b.csv', 'a.csv.db', '.csv', 'é.pdf', 'a.txt', 'a.CSV'])(
    'refuse le nom %s',
    async (name) => {
      const dir = await exportsStorage.newDir();
      await expect(writeFile(join(dir, name), 'x')).rejects.toThrow('Chemin de fichier refusé');
      expect(readdirSync(dir)).toEqual([]);
    },
  );

  it('écriture en échec : erreur sans chemin (ABS-04)', async () => {
    const path = join(await exportsStorage.newDir(), 'a.csv');
    jest.spyOn(fsMock.File.prototype, 'write').mockRejectedValueOnce(new Error(path));
    await expect(writeFile(path, 'x')).rejects.toEqual(new Error('Écriture du fichier impossible'));
  });

  it.each([
    ['csv', 'a.csv', { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' }],
    ['pdf', 'a.pdf', { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }],
  ] as const)('partage un %s avec ses types', async (kind, name, options) => {
    const path = join(await exportsStorage.newDir(), name);
    await writeFile(path, 'x');
    await shareFile(path, kind);
    expect(shareAsync).toHaveBeenCalledWith(uriOf(path), options);
  });

  it.each([
    ['un type différent de l’extension', 'a.csv', 'pdf'],
    ['un type hors de la liste', 'a.csv', 'db'],
  ])('refuse de partager %s', async (_label, name, kind) => {
    const path = join(await exportsStorage.newDir(), name);
    await writeFile(path, 'x');
    await expect(shareFile(path, kind as 'csv')).rejects.toThrow('Chemin de fichier refusé');
    expect(shareAsync).not.toHaveBeenCalled();
  });

  it('refuse de partager un fichier hors de exports/', async () => {
    await expect(shareFile(join(cache, 'sauvegardes', '1', 'a.csv'), 'csv')).rejects.toThrow(
      'Chemin de fichier refusé',
    );
    expect(shareAsync).not.toHaveBeenCalled();
  });

  it('vidage et sous-dossier : seul un enfant direct de exports/ s’efface', async () => {
    const dir = await exportsStorage.newDir();
    await writeFile(join(dir, 'a.csv'), 'x');
    await expect(exportsStorage.removeDir(join(dir, 'b'))).rejects.toThrow('refusé');
    await expect(exportsStorage.removeDir(exportsDir)).rejects.toThrow('refusé');
    await exportsStorage.removeDir(dir);
    expect(readdirSync(exportsDir)).toEqual([]);
    await exportsStorage.newDir();
    await exportsStorage.clear();
    expect(existsSync(exportsDir)).toBe(false);
  });
});
