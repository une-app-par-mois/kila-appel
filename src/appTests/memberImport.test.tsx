// Écrans de l'import CSV (ticket 035, F-07, EX-30, NF-06, NF-07) : vrai hook (034) et vraie base
// node:sqlite (base fictive de la maquette, SEC-13) ; seuls le sélecteur et la lecture du fichier
// sont imités. Horloge au 28/11/2026.
import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { manyRowsText, membersMacRoman, oversizeFile, utf16LeFile } from '@/__fixtures__/csvFiles';
import { type ImportDb, importDb } from '@/__fixtures__/importDb';
import { MOCKUP_ROWS } from '@/__fixtures__/importRows';
import Apercu from '@/app/import/apercu';
import ImportStart from '@/app/import/index';
import ImportResult from '@/app/import/resultat';
import Members from '@/app/membres/index';
import { RootStack } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { erasedCount } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { importSession } from '@/hooks/importSession';

let mockDb: Db | null = null;
let mockBytes: Uint8Array = new Uint8Array();
let mockCancel = false;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
// Sélecteur et lecture imités : le reste (décodage, analyse, aperçu, écriture) est le vrai code.
jest.mock('@/data/expoFiles', () => ({
  expoImportPicker: () => ({
    pick: async () => (mockCancel ? null : { path: '/cache/DocumentPicker/membres.csv' }),
    removePicked: async () => undefined,
    clearPicked: async () => undefined,
  }),
  readFileBytes: async (_path: string, maxBytes: number) =>
    mockBytes.length > maxBytes ? { reason: 'TOO_LARGE' } : { bytes: mockBytes },
}));

const t = labels.memberImport;
const routes = {
  _layout: RootStack,
  'membres/index': Members,
  'import/index': ImportStart,
  'import/apercu': Apercu,
  'import/resultat': ImportResult,
};
const text = (s: string) => new TextEncoder().encode(s);
/** Fichier d'un en-tête et de lignes, cellules séparées par `;`, fins de ligne CRLF. */
const file = (...lines: string[]) => text(`${lines.join('\r\n')}\r\n`);
const MOCKUP = file(...MOCKUP_ROWS.map((r) => r.cells.join(';')));
const ZWSP = String.fromCodePoint(0x200b);
const button = (name: string) => screen.findByRole('button', { name });
const boxes = (name: string) => screen.findAllByRole('checkbox', { name });
const back = () => act(async () => appRouter.back());
const members = async (db: Db) =>
  (await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM members'))[0]?.n;

/** Ouvre Membres, puis l'écran de choix, puis choisit le fichier `bytes`. */
const chooseFile = async (bytes: Uint8Array) => {
  mockBytes = bytes;
  await renderRouter(routes, { initialUrl: '/membres' });
  await fireEvent.press(await button(t.open));
  await fireEvent.press(await button(t.choose));
};

let base: ImportDb;
beforeEach(async () => {
  jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 28, 18, 0) });
  mockCancel = false;
  base = await importDb();
  mockDb = base.db;
});
afterEach(async () => {
  importSession.clear();
  jest.useRealTimers();
  mockDb = null;
  await base.db.close();
});

describe('EX-30 écrans de l’import CSV', () => {
  it('Membres : « Importer (CSV) » à gauche de « Nouveau membre » ; écran de choix de la maquette', async () => {
    await renderRouter(routes, { initialUrl: '/membres' });
    expect(await button('Nouveau membre')).toBeTruthy();
    await fireEvent.press(await button('Importer (CSV)'));
    expect(await screen.findByText('Importer des membres')).toBeTruthy();
    for (const cell of [...t.exampleHeader, ...t.exampleRow])
      expect(screen.getByText(cell)).toBeTruthy();
    expect(screen.getByText(t.exampleHint)).toBeTruthy();
    expect(await button('Choisir le fichier…')).toBeTruthy();
  });

  it('EX-30 parcours complet : aperçu de la maquette, « Importer 21 membres », résultat, membres', async () => {
    await chooseFile(MOCKUP);
    expect(await screen.findByText('Aperçu')).toBeTruthy();
    for (const s of ['24 lignes', '21 à importer', '1 invalide', '2 doublons', 'Doublons'])
      expect(screen.getByText(s)).toBeTruthy();
    expect(screen.getByText('14/03/2017 · déjà dans l’appli')).toBeTruthy();
    expect(screen.getByText('déjà dans l’appli (archivé)')).toBeTruthy();
    for (const s of [
      'Ligne invalide',
      'Ligne 17',
      'Prénom manquant',
      'Groupe introuvable',
      'Ligne 12',
    ])
      expect(screen.getByText(s)).toBeTruthy();
    expect(screen.getByText('« Poussin mercredi » : importé sans groupe')).toBeTruthy();
    expect(await members(base.db)).toBe(2);
    await fireEvent.press(await button('Importer 21 membres'));
    expect(await screen.findByText('21 membres importés')).toBeTruthy();
    expect(
      screen.getByText(
        '21 membres ajoutés, dont 18 inscrits à leur groupe. 2 doublons ignorés, dont 2 inscrits au groupe du fichier et 1 désarchivé. 1 ligne invalide.',
      ),
    ).toBeTruthy();
    expect(await members(base.db)).toBe(23);
    await fireEvent.press(await button('Voir les membres'));
    expect(await screen.findByText('Rose André')).toBeTruthy();
    expect(screen.queryByText('21 membres importés')).toBeNull();
  });

  it('EX-30, NF-06 : « Ignorer Léo Garcia » décoché, bouton et compteur suivent ; retour Android du résultat', async () => {
    await chooseFile(MOCKUP);
    const [garcia] = await boxes('Ignorer Léo Garcia');
    expect(garcia?.props.accessibilityState).toMatchObject({ checked: true });
    expect(await boxes('Ignorer Zoé Blanc')).toHaveLength(1);
    await fireEvent.press(garcia as never);
    expect(await button('Importer 22 membres')).toBeTruthy();
    expect(screen.getByText('22 à importer')).toBeTruthy();
    expect(screen.getByText('1 doublon')).toBeTruthy();
    const [after] = await boxes('Ignorer Léo Garcia');
    expect(after?.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(await button('Importer 22 membres'));
    expect(await screen.findByText('22 membres importés')).toBeTruthy();
    expect(await members(base.db)).toBe(24);
    // Pile [membres, résultat] : la touche retour mène aux membres, jamais à l'import.
    await back();
    expect(await screen.findByText('Rose André')).toBeTruthy();
    expect(screen.queryByText('Importer des membres')).toBeNull();
    expect(screen.queryByText('22 membres importés')).toBeNull();
  });

  it('doublon gardé au groupe introuvable : importé sans groupe ; cellule sur une seule ligne', async () => {
    await chooseFile(file('nom;prenom;groupe', 'Garcia;Léo;Poussin mercredi'));
    await fireEvent.press((await boxes('Ignorer Léo Garcia'))[0] as never);
    expect(
      await screen.findByText('« Poussin mercredi » introuvable : importé sans groupe'),
    ).toBeTruthy();
    expect(await button('Importer 1 membre')).toBeTruthy();
    expect(t.unknownGroup('Poussin\n\tmercredi')).toBe(
      '« Poussin mercredi » : importé sans groupe',
    );
    expect(t.keptWithoutGroup('Poussin\r\nmercredi')).toBe(
      '« Poussin mercredi » introuvable : importé sans groupe',
    );
    expect(t.unknownGroup('x'.repeat(101))).toBe(`« ${'x'.repeat(100)}… » : importé sans groupe`);
  });

  it('aucun membre à importer : « Inscrire 1 membre à son groupe », un membre compté une fois', async () => {
    await chooseFile(
      file('nom;prenom;groupe', 'Garcia;Léo;Benjamins lundi', 'Garcia;Léo;Benjamins lundi'),
    );
    expect(await screen.findByText('2 doublons')).toBeTruthy();
    await fireEvent.press(await button('Inscrire 1 membre à son groupe'));
    expect(await screen.findByText('Aucun membre importé')).toBeTruthy();
  });

  it('rien à importer ni à inscrire : bouton désactivé ; section vide cachée', async () => {
    await chooseFile(file('nom;prenom', 'Morel;'));
    const disabled = await button('Importer 0 membre');
    expect(disabled.props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.queryByText('Doublons')).toBeNull();
    expect(screen.queryByText('Groupe introuvable')).toBeNull();
  });

  it('textes des lignes invalides : date au format attendu, caractère invisible', async () => {
    await chooseFile(
      file('nom;prenom;date_naissance', 'Morel;Zoé;32/13/2016', `Petit;Zo${ZWSP}é;`),
    );
    expect(await screen.findByText('Date de naissance invalide (JJ/MM/AAAA)')).toBeTruthy();
    expect(screen.getByText('Prénom avec un caractère invisible')).toBeTruthy();
    expect(t.invalidReason('lastName', 'NAME_INVALID_CHAR')).toBe(
      'Nom avec un caractère invisible',
    );
  });

  it.each([
    ['colonnes absentes', file('a;b', '1;2'), t.refusals.MISSING_COLUMNS],
    ['pas un CSV', utf16LeFile(), t.refusals.NOT_TEXT],
    ['trop gros', oversizeFile(), t.refusals.TOO_LARGE],
    ['trop de lignes', text(manyRowsText(2001)), t.refusals.TOO_MANY_ROWS],
    ['guillemet non fermé', file('nom;prenom', '"Morel;Zoé'), t.refusals.MALFORMED],
    ['ancien format Mac', membersMacRoman(), t.refusals.UNSUPPORTED_ENCODING],
    ['vide', new Uint8Array(), t.refusals.EMPTY],
    ['en-tête seul', file('nom;prenom'), t.refusals.NO_MEMBERS],
  ])('« Fichier non reconnu » : %s, rien d’importé', async (_cause, bytes, message) => {
    await chooseFile(bytes);
    expect(await screen.findByText('Fichier non reconnu')).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(await members(base.db)).toBe(2);
    // Maquette : « Choisir un autre fichier » ramène à l'explication, sans ouvrir le sélecteur.
    mockBytes = MOCKUP;
    await fireEvent.press(await button('Choisir un autre fichier'));
    expect(await screen.findByText('Importer des membres')).toBeTruthy();
    expect(screen.queryByText('Aperçu')).toBeNull();
    await fireEvent.press(await button(t.choose));
    expect(await screen.findByText('Aperçu')).toBeTruthy();
  });

  it('retour depuis le refus, bouton « ‹ » ou touche Android : de nouveau l’explication', async () => {
    await chooseFile(utf16LeFile());
    await fireEvent.press(await button(labels.common.back));
    expect(await screen.findByText('Importer des membres')).toBeTruthy();
    await fireEvent.press(await button(t.choose));
    expect(await screen.findByText('Fichier non reconnu')).toBeTruthy();
    await back();
    expect(await screen.findByText('Importer des membres')).toBeTruthy();
    expect(screen.queryByText('Fichier non reconnu')).toBeNull();
  });

  it('sélecteur annulé : l’écran de choix reste, sans aperçu', async () => {
    mockCancel = true;
    await chooseFile(MOCKUP);
    expect(await button(t.choose)).toBeTruthy();
    expect(screen.queryByText('Aperçu')).toBeNull();
  });

  it('verrou : « Choisir le fichier… » désactivé pendant un export, une restauration ou une purge', async () => {
    await renderRouter(routes, { initialUrl: '/membres' });
    await fireEvent.press(await button(t.open));
    await button(t.choose);
    const choose = () => screen.getByRole('button', { name: t.choose });
    for (const task of ['export', 'restore', 'erase'] as const) {
      await act(async () => {
        fileLock.acquire(task);
      });
      await waitFor(() => expect(choose()).toBeDisabled());
      await act(async () => {
        fileLock.release(task);
      });
      await waitFor(() => expect(choose()).not.toBeDisabled());
    }
  });

  it('retour Android depuis l’aperçu : session abandonnée, retour à l’écran de choix', async () => {
    await chooseFile(MOCKUP);
    expect(await screen.findByText('Aperçu')).toBeTruthy();
    expect(importSession.held()).toBe(true);
    await back();
    expect(await button(t.choose)).toBeTruthy();
    expect(importSession.held()).toBe(false);
    expect(await members(base.db)).toBe(2);
  });

  it('nouvelle session ouverte avant le démontage de l’aperçu : elle reste', async () => {
    await chooseFile(MOCKUP);
    await screen.findByText('Aperçu');
    const current = importSession.get();
    if (current === null) throw new Error('Session attendue');
    // Nouveau choix de fichier terminé avant le démontage de l'ancien aperçu.
    await act(async () => {
      importSession.clear();
      importSession.set(current, erasedCount(), importSession.generation());
      appRouter.back();
    });
    expect(await button(t.choose)).toBeTruthy();
    expect(importSession.get()?.preview).toBe(current.preview);
  });

  it('membres ou groupes changés depuis l’aperçu : rien d’écrit, « recommencez l’import »', async () => {
    await chooseFile(MOCKUP);
    await screen.findByText('Aperçu');
    await base.db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', [
      '2026-11-28',
      base.poussins,
    ]);
    await fireEvent.press(await button('Importer 21 membres'));
    expect(await screen.findByText(t.stale)).toBeTruthy();
    expect(await members(base.db)).toBe(2);
  });

  it('résultat : compteurs relus comme des entiers ≥ 0 (paramètres de route)', async () => {
    await renderRouter(routes, {
      initialUrl: '/import/resultat?added=abc&invalid=-3&enrolled=1.5',
    });
    expect(await screen.findByText('Aucun membre importé')).toBeTruthy();
    expect(screen.queryByText(/invalide/)).toBeNull();
  });

  it('volume : 2 000 lignes invalides affichées sans plafond', async () => {
    await chooseFile(file('nom;prenom', ...Array.from({ length: 2000 }, () => 'Morel;')));
    expect(await screen.findByText('2000 invalides')).toBeTruthy();
    expect(screen.getByText('Ligne 2001')).toBeTruthy();
  }, 60_000);
});
