/**
 * @jest-environment node
 */
// Adaptateur expo-print (src/data/expoPrint.ts, ticket 040a, SEC-08, ABS-04) : HTML marqué du
// rapport seulement, argument fermé (html, width, height ; jamais `uri`), chemin rendu contrôlé
// (enfant direct de `cache/Print/`), erreurs sans chemin. Modules natifs imités sur node:fs
// (src/__fixtures__/expoModules.ts, ADR-008).
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { printPdf } from '@/data/expoPrint';
import type { ReportHtml } from '@/domain/reportHtml';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => require('@/__fixtures__/expoModules').fakeFileSystem());
jest.mock('expo-print', () => {
  const { join: j } = require('node:path');
  const root = () => j(jest.requireMock('expo-file-system').Paths.root, 'cache dir', 'Print');
  const fake = require('@/__fixtures__/expoModules').fakePrint(root);
  return { state: fake.state, printToFileAsync: jest.fn(fake.render) };
});

const fsMock = jest.requireMock('expo-file-system') as { Paths: { root: string } };
const printMock = jest.requireMock('expo-print') as {
  state: { calls: object[]; uri: string | null; fail: boolean };
  printToFileAsync: jest.Mock;
};
const cache = join(fsMock.Paths.root, 'cache dir');
const printDir = join(cache, 'Print');
const uriOf = (path: string) => `file://${path.split('/').map(encodeURIComponent).join('/')}`;
// Seul reportHtml produit un ReportHtml dans l'appli ; ici, un HTML fictif marqué à la main.
const page = '<p>Rapport fictif de Dupont Léa</p>' as ReportHtml;
const NO_PATH = /cache|Print|Dupont|\//;

beforeEach(() => {
  printMock.printToFileAsync.mockClear();
  Object.assign(printMock.state, { calls: [], uri: null, fail: false });
});
afterEach(() => rmSync(cache, { recursive: true, force: true }));

describe('SEC-08 printPdf : HTML du rapport, argument fermé', () => {
  it.each([
    ['portrait', { html: page, width: 595, height: 842 }],
    ['landscape', { html: page, width: 842, height: 595 }],
  ] as const)('A4 %s : html, width et height seulement, jamais uri', async (orientation, args) => {
    const path = await printPdf(page, orientation);
    expect(printMock.printToFileAsync.mock.calls).toEqual([[args]]);
    expect(Object.keys(printMock.state.calls[0] ?? {})).not.toContain('uri');
    expect(path.startsWith(`${printDir}/`)).toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('%PDF-')).toBe(true);
  });

  it('refuse une chaîne qui n’est pas un HTML du rapport (typage)', async () => {
    // @ts-expect-error SEC-08 : seul un ReportHtml (produit par reportHtml) est accepté.
    await printPdf('<p>libre</p>', 'portrait');
    expect(printMock.printToFileAsync).toHaveBeenCalledTimes(1);
  });
});

describe('SEC-08 ABS-04 printPdf : chemin rendu contrôlé, erreurs sans chemin', () => {
  it.each([
    ['dans exports/', () => uriOf(join(cache, 'exports', '1', 'a.pdf'))],
    ['dans un sous-dossier de Print/', () => uriOf(join(printDir, '1', 'a.pdf'))],
    ['égal à Print/', () => uriOf(printDir)],
    ['par une remontée', () => uriOf(`${printDir}/../exports/a.pdf`)],
    ['hors du cache', () => uriOf(join(fsMock.Paths.root, 'Print', 'a.pdf'))],
    ['sans le schéma file://', () => join(printDir, 'a.pdf')],
    ['d’un autre schéma', () => `content://${printDir}/a.pdf`],
    ['qui n’est pas un PDF', () => uriOf(join(printDir, 'a.html'))],
  ])('refuse un chemin %s, sans le citer', async (_label, uri) => {
    printMock.state.uri = uri();
    const error = await printPdf(page, 'portrait').catch((e: Error) => e);
    expect(error).toEqual(new Error('Chemin de fichier refusé'));
    expect((error as Error).message).not.toMatch(NO_PATH);
  });

  it('rendu natif en échec : erreur fixe, sans le message natif', async () => {
    printMock.state.fail = true;
    const error = await printPdf(page, 'portrait').catch((e: Error) => e);
    expect(error).toEqual(new Error('Rendu du PDF impossible'));
    expect((error as Error).message).not.toMatch(NO_PATH);
    expect(existsSync(printDir)).toBe(false);
  });
});
