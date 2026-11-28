/**
 * @jest-environment node
 */
// Doublons ignorés de source `app` à l'import (ticket 034, EX-30, EX-04 ; zone sensible) : inscrits
// au groupe du fichier, désarchivés dès que ce groupe est trouvé (décision du porteur du
// 2026-11-28), sans réécrire ni nom, ni date, ni contact. ABS-03 : colonnes gardées. NF-08 : volume.
import { type ImportDb, importDb, previewOn } from '@/__fixtures__/importDb';
import { MOCKUP_ROWS, numbered } from '@/__fixtures__/importRows';
import { count } from '@/__fixtures__/seed';
import { importMembers } from '@/data/memberImportRepo';
import type { CsvRow } from '@/domain/csvParse';
import { keepImportColumns } from '@/domain/memberImport';

const TODAY = '2026-11-28';
const HEADER = ['nom', 'prenom', 'telephone', 'groupe'];
let base: ImportDb;

beforeEach(async () => {
  base = await importDb();
});
afterEach(async () => {
  await base.db.close();
});

const run = async (rows: CsvRow[], kept: number[] = []) => {
  const preview = await previewOn(base.db, rows, TODAY);
  return importMembers(base.db, { rows, preview, kept, today: TODAY });
};
const enrollments = (memberId: number) =>
  base.db.query<{ group_id: number; start_date: string; end_date: string | null }>(
    'SELECT group_id, start_date, end_date FROM enrollments WHERE member_id = ? ORDER BY id',
    [memberId],
  );
const archivedAt = async (memberId: number) =>
  (
    await base.db.query<{ archived_at: string | null }>(
      'SELECT archived_at FROM members WHERE id = ?',
      [memberId],
    )
  )[0]?.archived_at;

describe('EX-30 doublon ignoré de source app', () => {
  it('inscrit au groupe du fichier, sans toucher nom, date ni contact', async () => {
    const outcome = await run(
      numbered(HEADER, ['GARCIA', 'leo', '0600000099', 'Poussins mercredi']),
    );
    expect(outcome).toMatchObject({
      ok: true,
      result: { added: 0, duplicatesIgnored: 1, duplicatesEnrolled: 1, unarchived: 0 },
    });
    expect(await enrollments(base.garcia)).toEqual([
      { group_id: base.poussins, start_date: TODAY, end_date: null },
    ]);
    const [member] = await base.db.query(
      'SELECT last_name, first_name, birth_date FROM members WHERE id = ?',
      [base.garcia],
    );
    expect(member).toEqual({ last_name: 'Garcia', first_name: 'Léo', birth_date: '2017-03-14' });
    expect(await count(base.db, 'emergency_contacts')).toBe(0);
  });

  it('archivé et inscrit pendant l’import : désarchivé', async () => {
    const outcome = await run(numbered(HEADER, ['Blanc', 'Zoé', '', 'Adultes jeudi']));
    expect(outcome).toMatchObject({ ok: true, result: { duplicatesEnrolled: 1, unarchived: 1 } });
    expect(await archivedAt(base.blanc)).toBeNull();
    expect(await enrollments(base.blanc)).toHaveLength(1);
  });

  it.each([
    ['cellule vide', ''],
    ['groupe introuvable', 'Adulte jeudi'],
    ['groupe archivé', 'Éveil samedi'],
  ])('sans groupe trouvé (%s) : reste tel quel, archivé compris', async (_, group) => {
    const outcome = await run(numbered(HEADER, ['Blanc', 'Zoé', '', group]));
    expect(outcome).toMatchObject({ ok: true, result: { duplicatesEnrolled: 0, unarchived: 0 } });
    expect(await archivedAt(base.blanc)).toBe('2026-06-30');
    expect(await count(base.db, 'enrollments')).toBe(0);
  });

  it('pas de saison active : reste tel quel', async () => {
    await base.db.execute('UPDATE seasons SET is_active = 0');
    const outcome = await run(numbered(HEADER, ['Blanc', 'Zoé', '', 'Adultes jeudi']));
    expect(outcome).toMatchObject({ ok: true, result: { duplicatesEnrolled: 0, unarchived: 0 } });
    expect(await archivedAt(base.blanc)).toBe('2026-06-30');
  });

  it('EX-04 déjà inscrit (inscription pas finie) : pas d’inscription en double', async () => {
    await base.db.execute(
      'INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)',
      [base.garcia, base.poussins, '2026-09-01'],
    );
    const outcome = await run(numbered(HEADER, ['Garcia', 'Léo', '', 'Poussins mercredi']));
    expect(outcome).toMatchObject({ ok: true, result: { duplicatesEnrolled: 0 } });
    expect(await enrollments(base.garcia)).toHaveLength(1);
  });

  it('inscription finie avant le jour de l’import : inscrit de nouveau', async () => {
    await base.db.execute(
      'INSERT INTO enrollments (member_id, group_id, start_date, end_date) VALUES (?, ?, ?, ?)',
      [base.garcia, base.poussins, '2026-09-01', '2026-10-01'],
    );
    const outcome = await run(numbered(HEADER, ['Garcia', 'Léo', '', 'Poussins mercredi']));
    expect(outcome).toMatchObject({ ok: true, result: { duplicatesEnrolled: 1 } });
    expect(await enrollments(base.garcia)).toHaveLength(2);
  });

  // Décision du porteur du 2026-11-28 : désarchivé dès que le groupe du fichier est trouvé.
  it('archivé et déjà inscrit au groupe : désarchivé, pas d’inscription en double', async () => {
    await base.db.execute(
      'INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)',
      [base.blanc, base.adultes, '2026-09-01'],
    );
    const outcome = await run(numbered(HEADER, ['Blanc', 'Zoé', '', 'Adultes jeudi']));
    expect(outcome).toMatchObject({ ok: true, result: { duplicatesEnrolled: 0, unarchived: 1 } });
    expect(await archivedAt(base.blanc)).toBeNull();
    expect(await enrollments(base.blanc)).toHaveLength(1);
  });

  it('même membre sur plusieurs lignes : un désarchivage, une inscription par groupe distinct', async () => {
    const outcome = await run(
      numbered(
        HEADER,
        ['Blanc', 'Zoé', '', 'Adultes jeudi'],
        ['Blanc', 'Zoé', '', 'Benjamins lundi'],
        ['blanc', 'zoe', '', 'adultes JEUDI'],
        ['Blanc', 'Zoé', '', ''],
      ),
    );
    expect(outcome).toMatchObject({
      ok: true,
      result: { duplicatesIgnored: 4, duplicatesEnrolled: 1, unarchived: 1 },
    });
    expect((await enrollments(base.blanc)).map((e) => e.group_id)).toEqual([
      base.adultes,
      base.benjamins,
    ]);
  });

  it('doublon gardé : nouveau membre, l’existant reste tel quel', async () => {
    const outcome = await run(numbered(HEADER, ['Blanc', 'Zoé', '', 'Adultes jeudi']), [2]);
    expect(outcome).toMatchObject({
      ok: true,
      result: { added: 1, enrolled: 1, duplicatesIgnored: 0, duplicatesEnrolled: 0, unarchived: 0 },
    });
    expect(await archivedAt(base.blanc)).toBe('2026-06-30');
    expect(await enrollments(base.blanc)).toEqual([]);
  });

  it('doublon d’une ligne du fichier ignoré : rien n’est écrit pour lui', async () => {
    const outcome = await run(
      numbered(
        HEADER,
        ['Neuf', 'Alix', '', 'Adultes jeudi'],
        ['Neuf', 'Alix', '', 'Benjamins lundi'],
      ),
    );
    expect(outcome).toMatchObject({
      ok: true,
      result: { added: 1, enrolled: 1, duplicatesIgnored: 1, duplicatesEnrolled: 0 },
    });
  });
});

describe('ABS-03 keepImportColumns', () => {
  it('colonnes inconnues retirées, en-tête compris ; même aperçu et même écriture', async () => {
    const rows = numbered(
      ['Allergies', 'nom', 'prenom', 'groupe', 'nom'],
      ['Arachides', 'Neuf', 'Alix', 'Adultes jeudi', 'Autre'],
    );
    const kept = keepImportColumns(rows);
    expect(kept).toEqual(numbered(['nom', 'prenom', 'groupe'], ['Neuf', 'Alix', 'Adultes jeudi']));
    expect(await previewOn(base.db, kept, TODAY)).toEqual(await previewOn(base.db, rows, TODAY));
    const mockup = keepImportColumns(MOCKUP_ROWS);
    expect(JSON.stringify(mockup)).not.toMatch(/licence|L-001/);
    const preview = await previewOn(base.db, mockup, TODAY);
    expect(preview).toEqual(await previewOn(base.db, MOCKUP_ROWS, TODAY));
    expect(
      await importMembers(base.db, { rows: mockup, preview, kept: [], today: TODAY }),
    ).toMatchObject({ ok: true, result: { added: 21 } });
  });
});

describe('NF-08 volume', () => {
  it('2 000 lignes importées en moins de 2 s, 500 membres déjà présents (mesure indicative)', async () => {
    for (let i = 0; i < 500; i += 1)
      await base.db.execute('INSERT INTO members (last_name, first_name) VALUES (?, ?)', [
        `Existant${i}`,
        'Fictif',
      ]);
    const lines: string[][] = [];
    for (let i = 0; i < 2000; i += 1)
      lines.push([`Membre${i}`, 'Fictif', '0600000000', i % 2 === 0 ? 'Adultes jeudi' : '']);
    const rows = numbered(HEADER, ...lines);
    const started = performance.now();
    const outcome = await run(rows);
    const elapsed = performance.now() - started;
    expect(outcome).toMatchObject({ ok: true, result: { added: 2000, enrolled: 1000 } });
    expect(elapsed).toBeLessThan(2000);
  });
});
