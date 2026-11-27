// Imitations des modules natifs de fichiers et de base pour Jest (ticket 014b), sur node:fs et
// node:sqlite : on teste le code des adaptateurs (expoFiles.ts, expoDb.ts), pas les modules natifs
// (ADR-008). À utiliser dans une fabrique de jest.mock : `require(ce fichier).fakeFileSystem()`.
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type Part = string | { uri: string };
const uriOf = (parts: Part[]) =>
  parts
    .map((p) => (typeof p === 'string' ? p : p.uri))
    .reduce((a, b) => `${a.replace(/\/+$/, '')}/${b.replace(/^\/+/, '')}`);
const pathOf = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));

class FakeFile {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = uriOf(parts);
  }
  get size() {
    return existsSync(pathOf(this.uri)) ? statSync(pathOf(this.uri)).size : 0;
  }
  open() {
    const fd = openSync(pathOf(this.uri), 'r');
    return {
      readBytes: async (length: number) => {
        const buffer = new Uint8Array(length);
        const read = readSync(fd, buffer, 0, length, 0);
        return buffer.slice(0, read);
      },
      close: () => closeSync(fd),
    };
  }
  async copy(destination: FakeFile) {
    if (existsSync(pathOf(destination.uri))) throw new Error('DestinationAlreadyExists');
    copyFileSync(pathOf(this.uri), pathOf(destination.uri));
  }
  get exists() {
    return existsSync(pathOf(this.uri));
  }
  delete() {
    rmSync(pathOf(this.uri), { recursive: true });
  }
}

class FakeDirectory {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = `${uriOf(parts).replace(/\/+$/, '')}/`;
  }
  get exists() {
    return existsSync(pathOf(this.uri));
  }
  create(options?: { intermediates?: boolean }) {
    mkdirSync(pathOf(this.uri), { recursive: options?.intermediates === true });
  }
  delete() {
    rmSync(pathOf(this.uri), { recursive: true, force: true });
  }
}

/** Le cache de l'appareil est `<root>/cache dir/` (avec une espace : URI encodées). */
export const fakeFileSystem = () => {
  const root = mkdtempSync(join(tmpdir(), 'kila-expo-fs-'));
  return {
    File: FakeFile,
    Directory: FakeDirectory,
    FileMode: { ReadOnly: 'r' },
    Paths: { cache: new FakeDirectory(`file://${root}/cache dir/`), root },
  };
};

/**
 * expo-document-picker (ticket 014e) : comme le module natif avec `copyToCacheDirectory`, copie
 * le fichier que rend `choose()` dans `<cache>/DocumentPicker/<n>.<ext>` ; `null` : annulé.
 * `choose` peut lever une erreur (sélecteur en échec). Options relevées par `options`.
 */
export const fakeDocumentPicker = (
  cacheRoot: () => string,
  choose: () => string | null,
  options: (o: object) => void,
) => {
  let next = 0;
  return {
    getDocumentAsync: async (o: object) => {
      options(o);
      const source = choose();
      if (source === null) return { canceled: true, assets: null };
      const dir = join(cacheRoot(), 'DocumentPicker');
      mkdirSync(dir, { recursive: true });
      next += 1;
      const path = join(dir, `${next}-choisi.db`);
      copyFileSync(source, path);
      const uri = `file://${path.split('/').map(encodeURIComponent).join('/')}`;
      return { canceled: false, assets: [{ name: 'choisi.db', uri, lastModified: 0 }] };
    },
  };
};

/** expo-sqlite : ouverture par nom et dossier (ou ':memory:'), options relevées par le mock. */
export const fakeSqlite = (open: (name: string, options?: object, directory?: string) => void) => ({
  openDatabaseAsync: async (name: string, options?: object, directory?: string) => {
    open(name, options, directory);
    const raw = new DatabaseSync(name === ':memory:' ? name : join(directory ?? '', name));
    return {
      runAsync: async (sql: string, params: (string | number | null)[]) => {
        const r = raw.prepare(sql).run(...params);
        return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
      },
      getAllAsync: async (sql: string, params: (string | number | null)[]) =>
        raw.prepare(sql).all(...params),
      execAsync: async (sql: string) => raw.exec(sql),
      closeAsync: async () => raw.close(),
    };
  },
});
