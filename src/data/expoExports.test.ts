/**
 * @jest-environment node
 */
// Exports CSV et PDF dans `cache/exports/` (src/data/expoExports.ts, ticket 033, SEC-10, ABS-04) :
// écriture bornée, partage par types fermés, erreurs sans chemin. Ticket 040a (EX-32, SEC-08,
// SEC-10) : PDF déplacé de `cache/Print/` sous `kila-rapport-AAAA-MM-JJ.pdf`, en-tête `%PDF-`
// contrôlé, original effacé en cas d'échec, `cache/Print/` vidé. Modules natifs imités sur node:fs
// (src/__fixtures__/expoModules.ts, ADR-008).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { clearPrint, moveReport, shareFile, writeFile } from '@/data/expoExports';
import { expoStorage } from '@/data/expoFiles';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => undefined) }));
jest.mock('expo-file-system', () => require('@/__fixtures__/expoModules').fakeFileSystem());
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const fsMock = jest.requireMock('expo-file-system') as {
  Paths: { root: string };
  File: {
    prototype: {
      delete(): void;
      write(c: unknown): Promise<void>;
      move(d: unknown): Promise<void>;
    };
  };
};
const { shareAsync } = jest.requireMock('expo-sharing') as { shareAsync: jest.Mock };
const cache = join(fsMock.Paths.root, 'cache dir');
const exportsDir = join(cache, 'exports');
const uriOf = (path: string) => `file://${path.split('/').map(encodeURIComponent).join('/')}`;
// Effacement natif en échec, message avec un nom fictif : il ne doit jamais sortir (ABS-04).
const failDeletes = () =>
  jest.spyOn(fsMock.File.prototype, 'delete').mockImplementation(() => {
    throw new Error('/cache/exports/1/Dupont-Lea.csv');
  });

beforeEach(() => shareAsync.mockClear());
afterEach(() => {
  jest.restoreAllMocks();
  rmSync(cache, { recursive: true, force: true });
});

describe('SEC-10 cache/exports/ : écriture bornée et partage', () => {
  const exportsStorage = expoStorage('exports');

  it('écrit du texte (BOM gardé) ou des octets dans un sous-dossier neuf de exports/', async () => {
    const dir = await exportsStorage.newDir();
    expect(dir.startsWith(`${exportsDir}/`)).toBe(true);
    await writeFile(join(dir, 'kila-presences-2026-11-28.csv'), '\uFEFFnom;prenom\n');
    await writeFile(join(dir, 'kila-rapport-2026-11-28.pdf'), new Uint8Array([37, 80, 68, 70]));
    expect(readFileSync(join(dir, 'kila-presences-2026-11-28.csv'), 'utf8')).toBe(
      '\uFEFFnom;prenom\n',
    );
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
    // Fichier créé mais non écrit : effacé.
    expect(existsSync(path)).toBe(false);
  });

  it('écriture et effacement en échec : toujours la même erreur sans chemin', async () => {
    const path = join(await exportsStorage.newDir(), 'a.csv');
    jest.spyOn(fsMock.File.prototype, 'write').mockRejectedValueOnce(new Error(path));
    failDeletes();
    await expect(writeFile(path, 'x')).rejects.toEqual(new Error('Écriture du fichier impossible'));
  });

  it('partage en échec : erreur sans chemin (ABS-04)', async () => {
    const path = join(await exportsStorage.newDir(), 'a.csv');
    await writeFile(path, 'x');
    shareAsync.mockRejectedValueOnce(new Error(path));
    await expect(shareFile(path, 'csv')).rejects.toEqual(
      new Error('Partage du fichier impossible'),
    );
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

describe('EX-32 SEC-10 rapport PDF : de cache/Print/ vers cache/exports/', () => {
  const exportsStorage = expoStorage('exports');
  const printDir = join(cache, 'Print');
  /** PDF laissé par le rendu dans `cache/Print/`, comme expo-print. */
  const printed = (content: string | Uint8Array = '%PDF-1.7\n% rapport fictif\n') => {
    mkdirSync(printDir, { recursive: true });
    const path = join(printDir, '3f2a-rapport.pdf');
    writeFileSync(path, content);
    return path;
  };

  it('EX-32 déplace le PDF sous kila-rapport-AAAA-MM-JJ.pdf, %PDF- en tête', async () => {
    const source = printed();
    const dir = await exportsStorage.newDir();
    const path = await moveReport(source, dir, '2026-11-28');
    expect(path).toBe(join(dir, 'kila-rapport-2026-11-28.pdf'));
    expect(readFileSync(path, 'utf8').startsWith('%PDF-')).toBe(true);
    expect(existsSync(source)).toBe(false);
    expect(readdirSync(dir)).toEqual(['kila-rapport-2026-11-28.pdf']);
  });

  it.each([
    ['vide', ''],
    ['trop court', '%PDF'],
    ['sans en-tête PDF', '<html>%PDF-1.7'],
    ['en minuscules', '%pdf-1.7'],
  ])('SEC-08 refuse un fichier %s, original effacé, rien déplacé', async (_label, content) => {
    const source = printed(content);
    const dir = await exportsStorage.newDir();
    await expect(moveReport(source, dir, '2026-11-28')).rejects.toEqual(
      new Error('Fichier PDF invalide'),
    );
    expect(existsSync(source)).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });

  it('SEC-08 lecture de l’en-tête en échec (fichier absent) : refus sans chemin', async () => {
    const dir = await exportsStorage.newDir();
    await expect(moveReport(join(printDir, 'absent.pdf'), dir, '2026-11-28')).rejects.toEqual(
      new Error('Fichier PDF invalide'),
    );
    expect(readdirSync(dir)).toEqual([]);
  });

  it('SEC-10 déplacement en échec : original effacé, erreur sans chemin (ABS-04)', async () => {
    const source = printed();
    const dir = await exportsStorage.newDir();
    jest.spyOn(fsMock.File.prototype, 'move').mockRejectedValueOnce(new Error(source));
    await expect(moveReport(source, dir, '2026-11-28')).rejects.toEqual(
      new Error('Déplacement du fichier impossible'),
    );
    expect(existsSync(source)).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });

  it('déplacement et effacement en échec : toujours la même erreur sans chemin', async () => {
    const source = printed();
    const dir = await exportsStorage.newDir();
    jest.spyOn(fsMock.File.prototype, 'move').mockRejectedValueOnce(new Error(source));
    failDeletes();
    await expect(moveReport(source, dir, '2026-11-28')).rejects.toEqual(
      new Error('Déplacement du fichier impossible'),
    );
  });

  it.each([
    ['hors de Print/', () => join(cache, 'exports', 'a.pdf')],
    ['dans un sous-dossier de Print/', () => join(printDir, '1', 'a.pdf')],
    ['par une remontée', () => `${printDir}/../a.pdf`],
    ['qui n’est pas un PDF', () => join(printDir, 'a.html')],
  ])('refuse une source %s, sans rien toucher', async (_label, source) => {
    const dir = await exportsStorage.newDir();
    await expect(moveReport(source(), dir, '2026-11-28')).rejects.toEqual(
      new Error('Chemin de fichier refusé'),
    );
    expect(readdirSync(dir)).toEqual([]);
  });

  it.each([
    ['dossier exports/ lui-même', () => exportsDir, '2026-11-28'],
    ['dossier hors de exports/', () => join(cache, 'sauvegardes', '1'), '2026-11-28'],
    ['date mal formée', () => join(exportsDir, '1'), '2026-1-28'],
    ['date piégée', () => join(exportsDir, '1'), '2026-11-28/../x'],
  ])('SEC-10 refuse une destination : %s ; original effacé', async (_l, dir, today) => {
    const source = printed();
    await expect(moveReport(source, dir(), today)).rejects.toThrow('Chemin de fichier refusé');
    expect(existsSync(source)).toBe(false);
  });

  it('SEC-10 clearPrint vide cache/Print/, et ne lève rien s’il est absent', async () => {
    printed();
    await clearPrint();
    expect(existsSync(printDir)).toBe(false);
    await expect(clearPrint()).resolves.toBeUndefined();
  });
});
