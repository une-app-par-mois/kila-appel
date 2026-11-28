/**
 * @jest-environment node
 */
// Fichiers des échanges (ticket 033, SEC-06, SEC-10, ABS-04) : sélecteur de l'import et lecture
// bornée d'un fichier choisi (src/data/expoFiles.ts) ; exports dans expoExports.test.ts. Modules natifs imités sur node:fs (src/__fixtures__/expoModules.ts, ADR-008).
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_BACKUP_BYTES } from '@/data/backupCheck';
import { expoImportPicker, expoPicker, readFileBytes } from '@/data/expoFiles';

// Limite locale : celle de l'import (MAX_CSV_BYTES) appartient au ticket 031.
const LIMIT = 1024 * 1024;
let mockChoice: () => string | null = () => null;
let mockSize: number | undefined;
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
    () => undefined,
    undefined,
    () => mockSize,
    () => 'choisi.csv',
  );
});

const fsMock = jest.requireMock('expo-file-system') as {
  Paths: { root: string };
  File: { prototype: { delete(): void } };
  Directory: { prototype: { delete(): void } };
};
// Effacements natifs en échec, message avec un nom fictif : il ne doit jamais sortir (ABS-04).
const failDeletes = () => {
  const fail = () => {
    throw new Error('/cache/DocumentPicker/Dupont-Lea.csv');
  };
  jest.spyOn(fsMock.File.prototype, 'delete').mockImplementation(fail);
  jest.spyOn(fsMock.Directory.prototype, 'delete').mockImplementation(fail);
};
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };
const cache = join(fsMock.Paths.root, 'cache dir');
const picked = join(cache, 'DocumentPicker');
const source = join(fsMock.Paths.root, 'telechargements', 'membres.csv');
const importPicker = expoImportPicker('android', LIMIT);
const pickPath = async () => {
  const result = await importPicker.pick();
  return result !== null && 'path' in result ? result.path : '';
};
const bytesOf = (result: Awaited<ReturnType<typeof readFileBytes>>) =>
  'bytes' in result ? new TextDecoder().decode(result.bytes) : result.reason;

beforeEach(() => {
  mkdirSync(join(fsMock.Paths.root, 'telechargements'), { recursive: true });
  writeFileSync(source, 'nom;prenom\nMartin;Léa\n');
  mockChoice = () => source;
  mockSize = undefined;
  log.mockClear();
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

  it.each([
    ['import', importPicker, LIMIT, 'IMPORT'],
    ['restauration', expoPicker('android'), MAX_BACKUP_BYTES, 'RESTORE'],
  ] as const)(
    '%s, effacements en échec : refus rendu, code seul',
    async (_l, picker, max, code) => {
      mockSize = max + 1;
      failDeletes();
      expect(await picker.pick()).toEqual({ reason: 'TOO_LARGE' });
      expect(log.mock.calls).toEqual([
        [`${code}_REJECTED_TOO_LARGE`],
        [`${code}_COPY_CLEAR_FAILED`],
      ]);
    },
  );

  it('chemin inattendu et vidage en échec : seule l’erreur « Chemin de fichier refusé »', async () => {
    const picker = jest.requireMock('expo-document-picker') as {
      getDocumentAsync: () => Promise<unknown>;
    };
    jest.spyOn(picker, 'getDocumentAsync').mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: 'a.csv', uri: 'file:///autre/a.csv', lastModified: 0 }],
    });
    mkdirSync(picked, { recursive: true });
    failDeletes();
    await expect(importPicker.pick()).rejects.toEqual(new Error('Chemin de fichier refusé'));
    expect(log.mock.calls).toEqual([['IMPORT_PICK_PATH_REFUSED'], ['IMPORT_COPY_CLEAR_FAILED']]);
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

  it('M1 effacements en échec : le résultat est rendu, un code seul est écrit', async () => {
    const path = await pickPath();
    failDeletes();
    expect(bytesOf(await readFileBytes(path, LIMIT, 'android'))).toContain('Martin');
    expect(log.mock.calls).toEqual([['IMPORT_COPY_CLEAR_FAILED']]);
  });

  it('M1 chemin refusé et vidage en échec : l’erreur assainie n’est pas masquée', async () => {
    await pickPath();
    failDeletes();
    const error = await readFileBytes(source, LIMIT, 'android').catch((e: Error) => e);
    expect(error).toEqual(new Error('Chemin de fichier refusé'));
    expect(log.mock.calls).toEqual([['IMPORT_PICK_PATH_REFUSED'], ['IMPORT_COPY_CLEAR_FAILED']]);
  });

  it('M1 lecture et effacements en échec : seule l’erreur « Lecture du fichier impossible »', async () => {
    const path = await pickPath();
    failDeletes();
    jest.spyOn(fsMock.File.prototype as never, 'open' as never).mockImplementationOnce(() => {
      throw new Error('Dupont');
    });
    const error = await readFileBytes(path, LIMIT, 'android').catch((e: Error) => e);
    expect(error).toEqual(new Error('Lecture du fichier impossible'));
  });
});
