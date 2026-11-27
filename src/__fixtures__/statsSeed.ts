// Jeux fictifs des statistiques (ticket 023, SEC-13 : aucune donnée réelle). `statsSeed` : taux
// recalculés à la main (tableau dans la PR), réutilisé par la campagne Maestro (030).
// `volumeSeed` : NF-08, 500 membres et 3 saisons.
import type { Db } from '@/data/db';

/** Jour de référence du jeu : vendredi 27/11/2026. */
export const STATS_TODAY = '2026-11-27';

type Code = 'P' | 'R' | 'E' | 'A';
const STATUS: Record<Code, string> = { P: 'present', R: 'late', E: 'excused', A: 'absent' };
type MemberKey = 'zoe' | 'hugo' | 'lea' | 'jules' | 'emma' | 'max' | 'nour' | 'paul';

/** Poussins, le mercredi à 17:30 : 13 séances enregistrées (S1 à S13). */
export const POUSSINS_DATES = [
  '2026-09-02',
  '2026-09-09',
  '2026-09-16',
  '2026-09-23',
  '2026-09-30',
  '2026-10-07',
  '2026-10-14',
  '2026-10-21',
  '2026-10-28',
  '2026-11-04',
  '2026-11-11',
  '2026-11-18',
  '2026-11-25',
];

/** Benjamins, le lundi à 17:00 ; B2 (samedi 24/10, 10:00) est commune avec Vétérans. */
export const BENJAMINS_DATES = [
  '2026-10-19',
  '2026-10-24',
  '2026-10-26',
  '2026-11-02',
  '2026-11-09',
  '2026-11-16',
  '2026-11-23',
];

// Statuts par séance (« - » : aucune présence). Inscriptions : fin exclue.
// Poussins       S1 … S13       inscription
// Zoé Blanc      PPPPPPPPPPPPP  01/09 →
// Hugo Moreau    PPRPEPPPAAAA-  01/09 → 25/11 (S13 hors inscription)
// Léa Michel     PPPPPPP------  01/09 → 15/10, puis Benjamins (RM-03)
// Jules Lefebvre PPPPPAPPPPPP-  01/09 →, archivé le 20/11
// Emma Durand    -----------EE  10/11 → (S11 : inscrite sans statut)
// Max Bernard    -------------  01/09 →, archivé, aucune présence : jamais listé
const POUSSINS: [MemberKey, string][] = [
  ['zoe', 'PPPPPPPPPPPPP'],
  ['hugo', 'PPRPEPPPAAAA-'],
  ['lea', 'PPPPPPP------'],
  ['jules', 'PPPPPAPPPPPP-'],
  ['emma', '-----------EE'],
];
// Benjamins      B1 … B7
// Léa Michel     PPPPPPA        15/10 →
// Nour Garcia    A-P----        01/09 → 20/10 : B3 compte par le cas de secours (groupe unique)
// Paul Roux      -R-----        Vétérans seulement : B2 compte pour Vétérans, pas Benjamins
const BENJAMINS: [MemberKey, string][] = [
  ['lea', 'PPPPPPA'],
  ['nour', 'A-P----'],
  ['paul', '-R-----'],
];

export type StatsSeeded = {
  seasonId: number;
  oldSeasonId: number;
  groups: Record<'poussins' | 'benjamins' | 'adultes' | 'veterans' | 'anciens', number>;
  members: Record<MemberKey, number>;
  poussinsSessions: number[];
  benjaminsSessions: number[];
};

const insert = async (db: Db, sql: string, params: (string | number | null)[]) =>
  (await db.execute(sql, params)).lastInsertRowId;

const session = async (db: Db, seasonId: number, date: string, time: string, state: string) =>
  insert(db, 'INSERT INTO sessions (season_id, date, start_time, state) VALUES (?, ?, ?, ?)', [
    seasonId,
    date,
    time,
    state,
  ]);

const attend = (db: Db, sessionId: number, memberId: number, code: Code) =>
  db.execute('INSERT INTO attendances (session_id, member_id, status) VALUES (?, ?, ?)', [
    sessionId,
    memberId,
    STATUS[code],
  ]);

const link = (db: Db, sessionId: number, groupId: number) =>
  db.execute('INSERT INTO session_groups (session_id, group_id) VALUES (?, ?)', [
    sessionId,
    groupId,
  ]);

const enroll = (db: Db, memberId: number, groupId: number, start: string, end: string | null) =>
  db.execute(
    'INSERT INTO enrollments (member_id, group_id, start_date, end_date) VALUES (?, ?, ?, ?)',
    [memberId, groupId, start, end],
  );

/** Jeu des statistiques : voir les tableaux ci-dessus et `statsRepo.test.ts`. */
export const statsSeed = async (db: Db): Promise<StatsSeeded> => {
  const seasonId = await insert(
    db,
    'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES (?, ?, ?, 1)',
    ['Saison 2026-2027', '2026-09-01', '2027-07-31'],
  );
  const oldSeasonId = await insert(
    db,
    'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES (?, ?, ?, 0)',
    ['Saison 2025-2026', '2025-09-01', '2026-07-31'],
  );
  const group = (season: number, name: string, archivedAt: string | null = null) =>
    insert(db, 'INSERT INTO groups (season_id, name, archived_at) VALUES (?, ?, ?)', [
      season,
      name,
      archivedAt,
    ]);
  const groups = {
    poussins: await group(seasonId, 'Poussins'),
    benjamins: await group(seasonId, 'Benjamins'),
    adultes: await group(seasonId, 'Adultes'),
    veterans: await group(seasonId, 'Vétérans', '2026-11-01'),
    anciens: await group(oldSeasonId, 'Anciens'),
  };
  const member = (last: string, first: string, archivedAt: string | null = null) =>
    insert(db, 'INSERT INTO members (last_name, first_name, archived_at) VALUES (?, ?, ?)', [
      last,
      first,
      archivedAt,
    ]);
  const members = {
    zoe: await member('Blanc', 'Zoé'),
    hugo: await member('Moreau', 'Hugo'),
    lea: await member('Michel', 'Léa'),
    jules: await member('Lefebvre', 'Jules', '2026-11-20'),
    emma: await member('Durand', 'Emma'),
    max: await member('Bernard', 'Max', '2026-10-01'),
    nour: await member('Garcia', 'Nour'),
    paul: await member('Roux', 'Paul'),
  };
  const { poussins, benjamins, veterans, anciens } = groups;
  await enroll(db, members.zoe, poussins, '2026-09-01', null);
  await enroll(db, members.hugo, poussins, '2026-09-01', '2026-11-25');
  await enroll(db, members.lea, poussins, '2026-09-01', '2026-10-15');
  await enroll(db, members.lea, benjamins, '2026-10-15', null);
  await enroll(db, members.jules, poussins, '2026-09-01', null);
  await enroll(db, members.emma, poussins, '2026-11-10', null);
  await enroll(db, members.max, poussins, '2026-09-01', null);
  await enroll(db, members.nour, benjamins, '2026-09-01', '2026-10-20');
  await enroll(db, members.paul, veterans, '2026-09-01', null);
  await enroll(db, members.zoe, anciens, '2025-09-01', null);
  await enroll(db, members.paul, anciens, '2025-09-01', null);

  const record = async (
    dates: string[],
    time: (date: string) => string,
    groupId: number,
    table: [MemberKey, string][],
  ) => {
    const ids: number[] = [];
    for (const [i, date] of dates.entries()) {
      const id = await session(db, seasonId, date, time(date), 'recorded');
      await link(db, id, groupId);
      for (const [key, codes] of table) {
        const code = codes[i];
        if (code && code !== '-') await attend(db, id, members[key], code as Code);
      }
      ids.push(id);
    }
    return ids;
  };
  const poussinsSessions = await record(POUSSINS_DATES, () => '17:30', poussins, POUSSINS);
  const benjaminsSessions = await record(
    BENJAMINS_DATES,
    (d) => (d === '2026-10-24' ? '10:00' : '17:00'),
    benjamins,
    BENJAMINS,
  );
  await link(db, benjaminsSessions[1] ?? 0, veterans);

  // Séance dont le groupe a été supprimé (EX-02) : synthèse seulement.
  const orphan = await session(db, seasonId, '2026-11-06', '10:00', 'recorded');
  await attend(db, orphan, members.zoe, 'P');
  // Jamais comptées : séance annulée et séance préparée, même avec des présences.
  for (const [date, state] of [
    ['2026-11-20', 'cancelled'],
    ['2026-11-13', 'prepared'],
  ] as const) {
    const id = await session(db, seasonId, date, '17:30', state);
    await link(db, id, poussins);
    await attend(db, id, members.hugo, 'A');
  }
  // Ancienne saison : Anciens, mercredi 04/03/2026.
  const old = await session(db, oldSeasonId, '2026-03-04', '18:00', 'recorded');
  await link(db, old, anciens);
  await attend(db, old, members.zoe, 'P');
  await attend(db, old, members.paul, 'A');

  return { seasonId, oldSeasonId, groups, members, poussinsSessions, benjaminsSessions };
};

/**
 * NF-08 : 3 saisons, 10 groupes par saison, 500 membres (50 par groupe, inscrits chaque saison),
 * 40 séances hebdomadaires par groupe, soit 1 200 séances et 60 000 présences. En SQL, d'un bloc.
 */
export const volumeSeed = async (
  db: Db,
): Promise<{ seasonIds: number[]; groupId: number; memberId: number }> => {
  const seasonIds: number[] = [];
  for (const year of [2024, 2025, 2026]) {
    seasonIds.push(
      await insert(
        db,
        'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES (?, ?, ?, ?)',
        [`Saison ${year}`, `${year}-09-01`, `${year + 1}-07-31`, year === 2026 ? 1 : 0],
      ),
    );
  }
  const n = (max: number) =>
    `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ${max})`;
  await db.execute(
    `${n(500)} INSERT INTO members (last_name, first_name) SELECT 'Nom' || i, 'Prénom' || i FROM n`,
  );
  await db.execute(
    `${n(10)} INSERT INTO groups (season_id, name) SELECT s.id, 'Groupe ' || i FROM seasons s, n`,
  );
  await db.execute(
    `INSERT INTO enrollments (member_id, group_id, start_date)
     SELECT m.id, g.id, s.start_date FROM members m JOIN seasons s
     JOIN groups g ON g.season_id = s.id AND g.name = 'Groupe ' || ((m.id - 1) % 10 + 1)`,
  );
  // Identifiant de séance = groupe × 1 000 + semaine : le lien séance-groupe s'en déduit.
  await db.execute(
    `${n(40)} INSERT INTO sessions (id, season_id, date, start_time, state)
     SELECT g.id * 1000 + i, s.id, date(s.start_date, '+' || ((i - 1) * 7) || ' days'), '17:30', 'recorded'
     FROM groups g JOIN seasons s ON s.id = g.season_id, n`,
  );
  await db.execute(
    'INSERT INTO session_groups (session_id, group_id) SELECT id, id / 1000 FROM sessions',
  );
  await db.execute(
    `INSERT INTO attendances (session_id, member_id, status)
     SELECT sg.session_id, e.member_id,
       CASE (sg.session_id + e.member_id) % 10 WHEN 0 THEN 'absent' WHEN 1 THEN 'late'
         WHEN 2 THEN 'excused' ELSE 'present' END
     FROM session_groups sg JOIN enrollments e ON e.group_id = sg.group_id`,
  );
  const [g] = await db.query<{ id: number }>(
    "SELECT id FROM groups WHERE season_id = ? AND name = 'Groupe 1'",
    [seasonIds[2] ?? 0],
  );
  return { seasonIds, groupId: g?.id ?? 0, memberId: 1 };
};
