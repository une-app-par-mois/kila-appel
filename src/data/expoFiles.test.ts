/**
 * @jest-environment node
 */
// Adaptateur expo-file-system et expo-sharing de la sauvegarde (ticket 014b, EX-19). Le module
// natif est imité sur node:fs, dans un dossier temporaire qui tient lieu de cache de l'appareil :
// on teste le code de l'adaptateur, pas le module natif (ADR-008).
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  expoBackupDeps,
  expoBackupStorage,
  pathToUri,
  shareBackup,
  uriToPath,
} from '@/data/expoFiles';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => undefined) }));
jest.mock('expo-file-system', () => {
  const fs = require('node:fs');
  const { join: joinPath } = require('node:path');
  const { tmpdir } = require('node:os');
  const root: string = fs.mkdtempSync(joinPath(tmpdir(), 'kila-expo-fs-'));
  type MockPart = string | { uri: string };
  const uriOf = (parts: MockPart[]) =>
    parts
      .map((p) => (typeof p === 'string' ? p : p.uri))
      .reduce((a, b) => `${a.replace(/\/+$/, '')}/${b.replace(/^\/+/, '')}`);
  const pathOf = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));
  class FakeFile {
    uri: string;
    constructor(...parts: MockPart[]) {
      this.uri = uriOf(parts);
    }
    get size() {
      return fs.existsSync(pathOf(this.uri)) ? fs.statSync(pathOf(this.uri)).size : 0;
    }
    open() {
      const fd = fs.openSync(pathOf(this.uri), 'r');
      return {
        readBytes: async (length: number) => {
          const buffer = new Uint8Array(length);
          const read = fs.readSync(fd, buffer, 0, length, 0);
          return buffer.slice(0, read);
        },
        close: () => fs.closeSync(fd),
      };
    }
    async copy(destination: FakeFile) {
      if (fs.existsSync(pathOf(destination.uri))) throw new Error('DestinationAlreadyExists');
      fs.copyFileSync(pathOf(this.uri), pathOf(destination.uri));
    }
  }
  class FakeDirectory {
    uri: string;
    constructor(...parts: MockPart[]) {
      this.uri = `${uriOf(parts).replace(/\/+$/, '')}/`;
    }
    get exists() {
      return fs.existsSync(pathOf(this.uri));
    }
    create(options?: { intermediates?: boolean }) {
      fs.mkdirSync(pathOf(this.uri), { recursive: options?.intermediates === true });
    }
    delete() {
      fs.rmSync(pathOf(this.uri), { recursive: true });
    }
  }
  return {
    File: FakeFile,
    Directory: FakeDirectory,
    FileMode: { ReadOnly: 'r' },
    Paths: { cache: new FakeDirectory(`file://${root}/cache dir/`), root },
  };
});

const { shareAsync } = jest.requireMock('expo-sharing') as { shareAsync: jest.Mock };
const fsMock = jest.requireMock('expo-file-system') as { Paths: { root: string } };
const cache = join(fsMock.Paths.root, 'cache dir');
const backups = join(cache, 'sauvegardes');

describe('EX-19 chemins : URI d’expo-file-system et chemins du système (sans file://)', () => {
  it.each([
    [
      'file:///data/user/0/com.jitavision.kila/cache/sauvegardes/',
      '/data/user/0/com.jitavision.kila/cache/sauvegardes',
    ],
    [
      'file:///var/mobile/Caches/a%20b/kila-sauvegarde-2026-11-27.db',
      '/var/mobile/Caches/a b/kila-sauvegarde-2026-11-27.db',
    ],
  ])('convertit %s', (uri, path) => {
    expect(uriToPath(uri)).toBe(path);
  });

  it.each([
    'content://com.android.providers/document/1',
    'https://exemple.invalid/a.db',
    '/data/sans-schema.db',
    'file://relatif/a.db',
    'file:///data/../etc/a.db',
    'file:///data/%2E%2E/a.db',
  ])('refuse %s', (uri) => {
    expect(() => uriToPath(uri)).toThrow('Chemin de fichier refusé');
  });

  it('écrit l’URI d’un chemin, caractères spéciaux encodés', () => {
    expect(pathToUri('/var/a b/c#1.db')).toBe('file:///var/a%20b/c%231.db');
    expect(uriToPath(pathToUri('/var/a b/c#1.db'))).toBe('/var/a b/c#1.db');
  });

  it.each(['relatif/a.db', '/data/../a.db', 'file:///data/a.db'])('refuse le chemin %s', (path) => {
    expect(() => pathToUri(path)).toThrow('Chemin de fichier refusé');
  });
});

describe('EX-19 dossier dédié de la sauvegarde, dans le cache', () => {
  const files = expoBackupStorage;
  afterEach(() => rmSync(cache, { recursive: true, force: true }));

  it('crée un sous-dossier neuf à chaque export, dans le dossier dédié du cache', async () => {
    const first = await files.newDir();
    const second = await files.newDir();
    expect(first).not.toBe(second);
    for (const dir of [first, second]) {
      expect(dir.startsWith(`${backups}/`)).toBe(true);
      expect(existsSync(dir)).toBe(true);
    }
  });

  it('lit la taille et le début d’un fichier, le copie octet pour octet', async () => {
    const dir = await files.newDir();
    const source = join(dir, 'a.db');
    writeFileSync(source, 'SQLite format 3\u0000 et la suite');
    expect(await files.size(source)).toBe(28);
    expect(await files.size(join(dir, 'absent.db'))).toBe(0);
    expect(new TextDecoder().decode(await files.readHead(source, 15))).toBe('SQLite format 3');
    await files.copy(source, join(dir, 'b.db'));
    expect(readFileSync(join(dir, 'b.db'))).toEqual(readFileSync(source));
  });

  it('vide le dossier dédié (ouverture de l’écran), même absent', async () => {
    await files.clear();
    const dir = await files.newDir();
    writeFileSync(join(dir, 'kila-sauvegarde-2026-11-27.db'), 'reste');
    await files.clear();
    expect(existsSync(backups)).toBe(false);
  });

  it('efface un sous-dossier et tout ce qu’il contient (-wal, -shm, -journal)', async () => {
    const dir = await files.newDir();
    for (const name of ['copie.db', 'copie.db-wal', 'copie.db-shm', 'copie.db-journal']) {
      writeFileSync(join(dir, name), 'x');
    }
    await files.removeDir(dir);
    expect(existsSync(dir)).toBe(false);
    expect(readdirSync(backups)).toEqual([]);
  });

  it('n’efface rien hors du dossier dédié', async () => {
    const dir = await files.newDir();
    writeFileSync(join(cache, 'autre.txt'), 'gardé');
    for (const outside of [backups, cache, `${backups}-autre`, `${dir}/../..`, '/']) {
      await expect(files.removeDir(outside)).rejects.toThrow('Chemin de fichier refusé');
    }
    expect(existsSync(dir)).toBe(true);
    expect(readFileSync(join(cache, 'autre.txt'), 'utf8')).toBe('gardé');
  });
});

describe('EX-19 partage par le système', () => {
  it('partage le fichier par son URI, en type générique (extension .db gardée sur iOS)', async () => {
    await shareBackup('/data/cache/sauvegardes/1/kila-sauvegarde-2026-11-27.db');
    expect(shareAsync).toHaveBeenCalledWith(
      'file:///data/cache/sauvegardes/1/kila-sauvegarde-2026-11-27.db',
      { mimeType: 'application/octet-stream' },
    );
  });

  it('rassemble le dossier, le partage et l’ouverture brute d’une copie', () => {
    expect(expoBackupDeps.files).toBe(expoBackupStorage);
    expect(expoBackupDeps.share).toBe(shareBackup);
    expect(typeof expoBackupDeps.open).toBe('function');
  });
});
