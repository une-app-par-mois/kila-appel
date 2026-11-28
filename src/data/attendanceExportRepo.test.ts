/**
 * @jest-environment node
 */
// Export CSV des présences (ticket 036, EX-31, RM-03, SEC-05, SEC-07, ABS-04) sur le jeu fictif
// des statistiques (`statsSeed.ts`, tableaux en tête du fichier) et un jeu piégé. Comptes en clair.
import { STATS_TODAY, type StatsSeeded, statsSeed } from '@/__fixtures__/statsSeed';
import { labels } from '@/config/libelles';
import { attendanceExportRepo } from '@/data/attendanceExportRepo';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { statsRepo } from '@/data/statsRepo';
import { attendanceCsv } from '@/domain/attendanceCsv';
import { decodeCsv } from '@/domain/csvDecode';
import { parseCsv } from '@/domain/csvParse';
import { customPeriod, monthPeriod, type StatsPeriod, seasonPeriod } from '@/domain/statsPeriod';

const CSV_LABELS = { ...labels.stats.csv, statuses: labels.statuses, weekdays: labels.weekdays };

describe('Export des présences (EX-31, RM-03)', () => {
  let db: Db;
  let s: StatsSeeded;
  let SEASON: StatsPeriod;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await statsSeed(db);
    SEASON = seasonPeriod(
      { id: s.seasonId, startDate: '2026-09-01', endDate: '2027-07-31' },
      STATS_TODAY,
    );
  });
  afterEach(async () => {
    await db.close();
  });
  const repo = () => attendanceExportRepo(db);

  it('EX-31 saison, tous les groupes : 57 lignes (46 Poussins, 10 Benjamins, 1 sans groupe)', async () => {
    const rows = await repo().rows(SEASON, null);
    expect(rows).toHaveLength(57);
    expect(await repo().count(SEASON, null)).toBe(57);
    const by = (g: string) => rows.filter((r) => r.groups.join(', ') === g).length;
    expect([by('Poussins'), by('Benjamins'), by('Vétérans'), by('')]).toEqual([46, 9, 1, 1]);
  });

  it('EX-31 séances préparées et annulées absentes ; aucune ligne sans présence', async () => {
    const rows = await repo().rows(SEASON, null);
    expect(rows.map((r) => r.date)).not.toContain('2026-11-20');
    expect(rows.map((r) => r.date)).not.toContain('2026-11-13');
    // S13 (25/11) : Zoé et Emma seulement (Hugo, Léa et Jules sans présence).
    expect(rows.filter((r) => r.date === '2026-11-25').map((r) => r.firstName)).toEqual([
      'Zoé',
      'Emma',
    ]);
  });

  it('EX-31 groupe filtré : ses lignes seulement, sans les présences sans groupe', async () => {
    const poussins = await repo().rows(SEASON, s.groups.poussins);
    expect(poussins).toHaveLength(46);
    expect(new Set(poussins.map((r) => r.groups.join(', ')))).toEqual(new Set(['Poussins']));
    expect(await repo().count(SEASON, s.groups.poussins)).toBe(46);
    expect(await repo().rows(SEASON, s.groups.benjamins)).toHaveLength(9);
    expect(await repo().count(SEASON, s.groups.benjamins)).toBe(9);
    expect(await repo().count(SEASON, s.groups.veterans)).toBe(1);
    expect(await repo().count(SEASON, s.groups.adultes)).toBe(0);
    expect(poussins.map((r) => r.date)).not.toContain('2026-11-06');
  });

  it('EX-31 présence dont le groupe est supprimé : dans « Tous les groupes », sans groupe', async () => {
    const orphan = (await repo().rows(SEASON, null)).filter((r) => r.date === '2026-11-06');
    expect(orphan).toEqual([
      expect.objectContaining({ lastName: 'Blanc', firstName: 'Zoé', groups: [], hasSlot: false }),
    ]);
  });

  it('RM-03 Léa sous Poussins jusqu’au 14/10, puis sous Benjamins', async () => {
    const lea = (await repo().rows(SEASON, null)).filter((r) => r.firstName === 'Léa');
    expect(lea.map((r) => `${r.date} ${r.groups.join(', ')}`)).toEqual([
      ...['09-02', '09-09', '09-16', '09-23', '09-30', '10-07', '10-14'].map(
        (d) => `2026-${d} Poussins`,
      ),
      ...['10-19', '10-24', '10-26', '11-02', '11-09', '11-16', '11-23'].map(
        (d) => `2026-${d} Benjamins`,
      ),
    ]);
  });

  it('RM-03 séance à deux groupes : chaque présence sous le groupe du membre, une ligne chacune', async () => {
    const b2 = (await repo().rows(SEASON, null)).filter((r) => r.date === '2026-10-24');
    expect(b2.map((r) => [r.lastName, r.groups])).toEqual([
      ['Michel', ['Benjamins']],
      ['Roux', ['Vétérans']],
    ]);
  });

  it('RM-03 présence qui compte pour les deux groupes de la séance : une seule ligne, groupes triés', async () => {
    await db.execute(
      "INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, '2026-10-01')",
      [s.members.paul, s.groups.benjamins],
    );
    const b2 = (await repo().rows(SEASON, null)).filter((r) => r.date === '2026-10-24');
    expect(b2.map((r) => [r.lastName, r.groups])).toEqual([
      ['Michel', ['Benjamins']],
      ['Roux', ['Benjamins', 'Vétérans']],
    ]);
    expect(await repo().count(SEASON, null)).toBe(57);
    const benjamins = await repo().rows(SEASON, s.groups.benjamins);
    expect(benjamins.find((r) => r.lastName === 'Roux')?.groups).toEqual(['Benjamins']);
    expect(await repo().count(SEASON, s.groups.benjamins)).toBe(10);
  });

  // Q2 de la fiche, en attente du porteur : comportement attendu (« Sans groupe », hors de l'export
  // Benjamins) impossible sans changer RM-03 ou le schéma. Ce test fixe le comportement actuel,
  // identique dans les statistiques du jalon 2 ; il sera inversé selon la réponse.
  it('RM-03 Q2 séance à deux groupes dont l’un est supprimé : la présence passe au groupe restant (actuel)', async () => {
    // B2 (24/10) : Benjamins et Vétérans ; Paul n'est inscrit qu'aux Vétérans.
    await db.execute('DELETE FROM groups WHERE id = ?', [s.groups.veterans]);
    const b2 = (await repo().rows(SEASON, null)).filter((r) => r.date === '2026-10-24');
    expect(b2.map((r) => [r.lastName, r.groups])).toEqual([
      ['Michel', ['Benjamins']],
      ['Roux', ['Benjamins']],
    ]);
    expect(await repo().count(SEASON, s.groups.benjamins)).toBe(10);
    const stats = await statsRepo(db).overview(SEASON);
    const benjamins = stats.groups.find((g) => g.groupId === s.groups.benjamins);
    expect(benjamins?.counts).toEqual({ present: 7, late: 1, excused: 0, absent: 2 });
  });

  it('EX-31 tri par date, heure, séance, puis par nom (Collator français) ; archivés compris', async () => {
    const rows = await repo().rows(SEASON, null);
    expect(rows.filter((r) => r.date === '2026-09-02').map((r) => r.lastName)).toEqual([
      'Blanc',
      'Lefebvre',
      'Michel',
      'Moreau',
    ]);
    const keys = rows.map((r) => `${r.date} ${r.startTime}`);
    expect([...keys].sort()).toEqual(keys);
  });

  it('EX-31 « Ce mois » : 17 lignes ; ancienne saison en dates libres : 2 lignes sous Anciens', async () => {
    expect(await repo().count(monthPeriod(STATS_TODAY), null)).toBe(17);
    const march = await repo().rows(customPeriod('2026-03-01', '2026-03-31'), null);
    expect(march.map((r) => [r.lastName, r.groups, r.status])).toEqual([
      ['Blanc', ['Anciens'], 'present'],
      ['Roux', ['Anciens'], 'absent'],
    ]);
  });

  it('EX-31 bornes de période comprises ; période sans séance : 0 ligne', async () => {
    expect(await repo().count(customPeriod('2026-11-25', '2026-11-25'), null)).toBe(2);
    expect(await repo().rows(customPeriod('2026-11-26', '2026-11-27'), null)).toEqual([]);
    expect(await repo().count(customPeriod('2026-11-26', '2026-11-27'), null)).toBe(0);
  });

  it('EX-31 groupes proposés : ceux des statistiques de la période', async () => {
    expect(await repo().groups(SEASON)).toEqual([
      { groupId: s.groups.adultes, name: 'Adultes', archived: false },
      { groupId: s.groups.benjamins, name: 'Benjamins', archived: false },
      { groupId: s.groups.poussins, name: 'Poussins', archived: false },
      { groupId: s.groups.veterans, name: 'Vétérans', archived: true },
    ]);
  });

  it('SEC-05 ABS-04 groupe ou période invalides : erreur sans donnée', async () => {
    await expect(repo().rows(SEASON, 0)).rejects.toThrow('Données : NOT_FOUND');
    await expect(repo().count(SEASON, 1.5)).rejects.toThrow('Données : NOT_FOUND');
    await expect(repo().rows({ ...SEASON, seasonId: -1 }, null)).rejects.toThrow('NOT_FOUND');
    await expect(repo().rows({ ...SEASON, from: '2026-13-01' }, null)).rejects.toThrow();
    expect(await repo().rows(SEASON, 999)).toEqual([]);
  });
});

describe('Jeu piégé : SEC-07 et aller-retour', () => {
  let db: Db;
  afterEach(async () => {
    await db.close();
  });

  const exec = async (sql: string, params: (string | number | null)[] = []) =>
    (await db.execute(sql, params)).lastInsertRowId;

  it('SEC-07 EX-31 fichier relu par decodeCsv puis parseCsv, champs neutralisés', async () => {
    db = await prepareDatabase(openNodeDb());
    const season = await exec(
      "INSERT INTO seasons (name, start_date, end_date, is_active) VALUES ('S', '2026-09-01', '2027-07-31', 1)",
    );
    const group = (name: string) =>
      exec('INSERT INTO groups (season_id, name) VALUES (?, ?)', [season, name]);
    const trap = await group('=HYPERLINK("x")');
    const gone = await group('Supprimé');
    const slot = (name: string | null) =>
      exec(
        `INSERT INTO slots (season_id, weekday, start_time, duration_min, schedule_from, name)
         VALUES (?, 3, '14:00', 60, '2026-09-01', ?)`,
        [season, name],
      );
    const named = await slot('@Créneau');
    const unnamed = await slot(null);
    const deleted = await slot('Effacé');
    const people: [string, string][] = [
      ['=1+1', '-Marie'],
      ['@SOMME', "O'Brien"],
      ['Dupont;Martin', 'Zoé "Zaza"'],
      ['Marie-Ève', '+33612345678'],
    ];
    const members: number[] = [];
    for (const [last, first] of people)
      members.push(
        await exec('INSERT INTO members (last_name, first_name) VALUES (?, ?)', [last, first]),
      );
    const call = async (date: string, slotId: number, groupId: number) => {
      const id = await exec(
        "INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, ?, ?, '14:00', 'recorded')",
        [season, slotId, date],
      );
      await exec('INSERT INTO session_groups (session_id, group_id) VALUES (?, ?)', [id, groupId]);
      for (const m of members)
        await exec(
          "INSERT INTO attendances (session_id, member_id, status) VALUES (?, ?, 'present')",
          [id, m],
        );
    };
    await call('2026-11-04', named, trap);
    await call('2026-11-11', unnamed, trap);
    await call('2026-11-18', deleted, gone);
    await exec('DELETE FROM slots WHERE id = ?', [deleted]);
    await exec('DELETE FROM groups WHERE id = ?', [gone]);

    const period = customPeriod('2026-09-01', '2026-11-30');
    const rows = await attendanceExportRepo(db).rows(period, null);
    const decoded = decodeCsv(new TextEncoder().encode(attendanceCsv(rows, CSV_LABELS)));
    if (!('text' in decoded)) throw new Error('décodage refusé');
    const parsed = parseCsv(decoded.text);
    if (!('rows' in parsed)) throw new Error('lecture refusée');
    const cells = parsed.rows.map((r) => r.cells);
    expect(cells[0]).toEqual(['Date', 'Créneau', 'Groupe', 'Nom', 'Prénom', 'Statut']);
    // Tri par nom dans chaque séance (Collator) : ponctuation (« @ »), symboles (« = »), lettres.
    const people4 = [
      ["'@SOMME", "O'Brien"],
      ["'=1+1", "'-Marie"],
      ['Dupont;Martin', 'Zoé "Zaza"'],
      ['Marie-Ève', "'+33612345678"],
    ];
    const expected = [
      ['04/11/2026', "'@Créneau", '\'=HYPERLINK("x")'],
      ['11/11/2026', 'Mercredi 14:00', '\'=HYPERLINK("x")'],
      ['18/11/2026', 'Sans créneau 14:00', 'Sans groupe'],
    ].flatMap((head) => people4.map((p) => [...head, ...p, 'Présent']));
    expect(cells.slice(1)).toEqual(expected);
  });
});
