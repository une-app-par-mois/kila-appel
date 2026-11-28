/**
 * @jest-environment node
 */
// Écriture de l'import (ticket 034, EX-30, SEC-05, SEC-06 ; zone sensible) sur node:sqlite :
// transaction unique, revérification à la confirmation (IMPORT_STALE), rien d'écrit en échec.
// Doublons inscrits et désarchivés : memberImportDuplicates.test.ts. Données fictives (SEC-13).
import { type ImportDb, importDb, previewOn } from '@/__fixtures__/importDb';
import { MOCKUP_ROWS, numbered } from '@/__fixtures__/importRows';
import { dump } from '@/__fixtures__/restoreFiles';
import { count } from '@/__fixtures__/seed';
import { IMPORTED_CONTACT_LABEL, importContext, importMembers } from '@/data/memberImportRepo';

const TODAY = '2026-11-28';
let base: ImportDb;

beforeEach(async () => {
  base = await importDb();
});
afterEach(async () => {
  await base.db.close();
});

const confirmMockup = async (kept: number[] = []) => {
  const preview = await previewOn(base.db, MOCKUP_ROWS, TODAY);
  return importMembers(base.db, { rows: MOCKUP_ROWS, preview, kept, today: TODAY });
};

describe('EX-30 importContext', () => {
  it('NF-08 : membres (archivés compris), groupes non archivés de la saison active, deux requêtes', async () => {
    const query = jest.spyOn(base.db, 'query');
    const context = await importContext(base.db);
    expect(query).toHaveBeenCalledTimes(2);
    expect(context.existingMembers).toEqual([
      {
        id: base.garcia,
        lastName: 'Garcia',
        firstName: 'Léo',
        birthDate: '2017-03-14',
        archivedAt: null,
      },
      {
        id: base.blanc,
        lastName: 'Blanc',
        firstName: 'Zoé',
        birthDate: null,
        archivedAt: '2026-06-30',
      },
    ]);
    expect(context.groups.map((g) => g.name)).toEqual([
      'Poussins mercredi',
      'Benjamins lundi',
      'Adultes jeudi',
    ]);
    expect(context.activeSeasonId).toBe(base.seasonId);
    expect(context.season).toEqual({ startDate: '2026-09-01', endDate: '2027-07-31' });
  });

  it('sans saison active : aucun groupe, saison nulle', async () => {
    await base.db.execute('UPDATE seasons SET is_active = 0');
    const context = await importContext(base.db);
    expect(context.groups).toEqual([]);
    expect(context.activeSeasonId).toBeNull();
    expect(context.season).toBeNull();
  });

  it('saison active sans groupe : la saison est lue quand même', async () => {
    await base.db.execute('DELETE FROM groups');
    const context = await importContext(base.db);
    expect(context.groups).toEqual([]);
    expect(context.season).toEqual({ startDate: '2026-09-01', endDate: '2027-07-31' });
  });
});

describe('EX-30 importMembers : fichier de la maquette', () => {
  it('21 membres, leurs contacts, 18 inscriptions nouvelles, 2 doublons inscrits, 1 désarchivé', async () => {
    const preview = await previewOn(base.db, MOCKUP_ROWS, TODAY);
    const phones = preview.valid.filter((l) => l.member.phone !== null).length;
    const outcome = await importMembers(base.db, {
      rows: MOCKUP_ROWS,
      preview,
      kept: [],
      today: TODAY,
    });
    expect(outcome).toEqual({
      ok: true,
      result: {
        added: 21,
        enrolled: 18,
        duplicatesIgnored: 2,
        invalid: 1,
        duplicatesEnrolled: 2,
        unarchived: 1,
      },
    });
    expect(await count(base.db, 'members')).toBe(23);
    expect(await count(base.db, 'emergency_contacts')).toBe(phones);
    expect(phones).toBe(9);
    expect(await count(base.db, 'enrollments')).toBe(20);
    expect(
      await count(base.db, 'enrollments', 'start_date = ? AND end_date IS NULL', [TODAY]),
    ).toBe(20);
  });

  it('EX-05 : contact « Contact importé », position 0, téléphone sur 10 chiffres', async () => {
    await confirmMockup();
    const rows = await base.db.query<{ label: string; phone: string; position: number }>(
      `SELECT c.label, c.phone, c.position FROM emergency_contacts c
       JOIN members m ON m.id = c.member_id WHERE m.last_name = 'Laurent'`,
    );
    expect(rows).toEqual([{ label: IMPORTED_CONTACT_LABEL, phone: '0600000007', position: 0 }]);
    expect(IMPORTED_CONTACT_LABEL).toBe('Contact importé');
  });

  it('nom, prénom et date gardés ; groupe introuvable ou vide : pas d’inscription', async () => {
    await confirmMockup();
    const [rose] = await base.db.query<{ birth_date: string; archived_at: string | null }>(
      "SELECT birth_date, archived_at FROM members WHERE last_name = 'André' AND first_name = 'Rose'",
    );
    expect(rose).toEqual({ birth_date: '2016-09-03', archived_at: null });
    for (const lastName of ['Lefebvre', 'Fournier', 'Robert']) {
      expect(
        await count(
          base.db,
          'enrollments',
          'member_id = (SELECT id FROM members WHERE last_name = ?)',
          [lastName],
        ),
      ).toBe(0);
    }
  });

  it('EX-04 : début ramené au premier jour de la saison quand l’import la précède', async () => {
    const today = '2026-08-20';
    const rows = numbered(['nom', 'prenom', 'groupe'], ['Neuf', 'Alix', 'Adultes jeudi']);
    const preview = await previewOn(base.db, rows, today);
    await importMembers(base.db, { rows, preview, kept: [], today });
    expect(await count(base.db, 'enrollments', 'start_date = ?', ['2026-09-01'])).toBe(1);
  });

  it('doublon gardé : écrit comme un nouveau membre', async () => {
    const outcome = await confirmMockup([9]);
    expect(outcome).toMatchObject({ ok: true, result: { added: 22, duplicatesIgnored: 1 } });
    expect(await count(base.db, 'members', "last_name = 'Garcia'")).toBe(2);
  });

  it('SEC-05 : apostrophes, points-virgules et guillemets écrits tels quels', async () => {
    const rows = numbered(
      ['nom', 'prenom', 'telephone'],
      ["O'Brien", 'Zoé"); DROP TABLE members; --', '0600000011'],
      ['Martin; DELETE FROM groups', "L'Aïd", ''],
    );
    const preview = await previewOn(base.db, rows, TODAY);
    await importMembers(base.db, { rows, preview, kept: [], today: TODAY });
    const names = await base.db.query<{ last_name: string; first_name: string }>(
      'SELECT last_name, first_name FROM members ORDER BY id',
    );
    expect(names.slice(2)).toEqual([
      { last_name: "O'Brien", first_name: 'Zoé"); DROP TABLE members; --' },
      { last_name: 'Martin; DELETE FROM groups', first_name: "L'Aïd" },
    ]);
    expect(await count(base.db, 'groups')).toBe(4);
  });

  it('saison sans groupe : membres ajoutés sans inscription', async () => {
    await base.db.execute('DELETE FROM groups');
    const outcome = await confirmMockup();
    expect(outcome).toMatchObject({ ok: true, result: { added: 21, enrolled: 0 } });
    expect(await count(base.db, 'enrollments')).toBe(0);
  });

  it('cascades intactes : un membre importé supprimé emporte son contact et son inscription', async () => {
    await confirmMockup();
    const [{ id } = { id: 0 }] = await base.db.query<{ id: number }>(
      "SELECT id FROM members WHERE last_name = 'André'",
    );
    await base.db.execute('DELETE FROM members WHERE id = ?', [id]);
    expect(await count(base.db, 'emergency_contacts', 'member_id = ?', [id])).toBe(0);
    expect(await count(base.db, 'enrollments', 'member_id = ?', [id])).toBe(0);
  });

  it('rien à écrire : ni transaction, résultat à zéro', async () => {
    const rows = numbered(['nom', 'prenom'], ['Garcia', 'Léo'], ['Morel', '']);
    const preview = await previewOn(base.db, rows, TODAY);
    const transaction = jest.spyOn(base.db, 'transaction');
    const outcome = await importMembers(base.db, { rows, preview, kept: [], today: TODAY });
    expect(transaction).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      ok: true,
      result: {
        added: 0,
        enrolled: 0,
        duplicatesIgnored: 1,
        invalid: 1,
        duplicatesEnrolled: 0,
        unarchived: 0,
      },
    });
  });
});

describe('EX-30 importMembers : rien à écrire, aperçu revérifié quand même', () => {
  it('restauration entre l’aperçu et la confirmation : STALE, sans transaction', async () => {
    const rows = numbered(['nom', 'prenom'], ['Garcia', 'Léo']);
    const preview = await previewOn(base.db, rows, TODAY);
    await base.db.execute("DELETE FROM members WHERE last_name = 'Garcia'");
    const transaction = jest.spyOn(base.db, 'transaction');
    const outcome = await importMembers(base.db, { rows, preview, kept: [], today: TODAY });
    expect(outcome).toEqual({ ok: false, reason: 'STALE' });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('EX-30 importMembers : tout ou rien', () => {
  it('erreur au 15e membre : aucune ligne écrite, doublons désarchivés compris', async () => {
    // Contrainte forcée : la 15e insertion de cet import (2 membres déjà là) échoue.
    await base.db.execute(
      `CREATE TRIGGER fail_15th BEFORE INSERT ON members
       WHEN (SELECT COUNT(*) FROM members) >= 16 BEGIN SELECT RAISE(ABORT, 'refus forcé'); END`,
    );
    const before = await dump(base.db);
    await expect(confirmMockup()).rejects.toThrow();
    expect(await dump(base.db)).toEqual(before);
    expect(await count(base.db, 'members', 'archived_at IS NOT NULL')).toBe(1);
  });

  it.each([
    [
      'groupe archivé',
      'UPDATE groups SET archived_at = ? WHERE name = ?',
      ['2026-11-28', 'Adultes jeudi'],
    ],
    ['groupe supprimé', 'DELETE FROM groups WHERE name = ?', ['Benjamins lundi']],
    [
      'groupe ajouté au nom mal écrit',
      'INSERT INTO groups (season_id, name) VALUES (1, ?)',
      ['Poussin mercredi'],
    ],
    ['doublon supprimé', "DELETE FROM members WHERE last_name = 'Garcia'", []],
    ['doublon désarchivé', 'UPDATE members SET archived_at = NULL', []],
    [
      'membre ajouté au même nom',
      'INSERT INTO members (last_name, first_name) VALUES (?, ?)',
      ['Roux', 'Lucas'],
    ],
  ])(
    'changement entre l’aperçu et la confirmation (%s) : STALE, rien d’écrit',
    async (_, sql, params) => {
      const preview = await previewOn(base.db, MOCKUP_ROWS, TODAY);
      await base.db.execute(sql, params);
      const before = await dump(base.db);
      const outcome = await importMembers(base.db, {
        rows: MOCKUP_ROWS,
        preview,
        kept: [],
        today: TODAY,
      });
      expect(outcome).toEqual({ ok: false, reason: 'STALE' });
      expect(await dump(base.db)).toEqual(before);
    },
  );

  it('restauration entre l’aperçu et la confirmation (nouvelles saisons et ids) : STALE', async () => {
    const preview = await previewOn(base.db, MOCKUP_ROWS, TODAY);
    await base.db.execute('DELETE FROM groups');
    await base.db.execute('DELETE FROM members');
    await base.db.execute('DELETE FROM seasons');
    await base.db.execute(
      "INSERT INTO seasons (id, name, start_date, end_date, is_active) VALUES (7, 'S', '2026-09-01', '2027-07-31', 1)",
    );
    for (const name of ['Poussins mercredi', 'Benjamins lundi', 'Adultes jeudi'])
      await base.db.execute('INSERT INTO groups (season_id, name) VALUES (7, ?)', [name]);
    const before = await dump(base.db);
    const outcome = await importMembers(base.db, {
      rows: MOCKUP_ROWS,
      preview,
      kept: [],
      today: TODAY,
    });
    expect(outcome).toEqual({ ok: false, reason: 'STALE' });
    expect(await dump(base.db)).toEqual(before);
  });

  it('jour de la confirmation qui change le classement (date de naissance future) : STALE', async () => {
    const rows = numbered(['nom', 'prenom', 'naissance'], ['Neuf', 'Bébé', '2026-11-29']);
    const preview = await previewOn(base.db, rows, '2026-11-29');
    const outcome = await importMembers(base.db, { rows, preview, kept: [], today: TODAY });
    expect(outcome).toEqual({ ok: false, reason: 'STALE' });
    expect(await count(base.db, 'members')).toBe(2);
  });
});
