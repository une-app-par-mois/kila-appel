// Jeux fictifs des alertes d'assiduité (ticket 021, SEC-13 : aucune donnée réelle) : petits
// constructeurs pour les scénarios RM-02 / EX-25 / EX-26, et jeu de volume pour NF-08.
import type { Db } from '@/data/db';
import type { AttendanceStatus } from '@/domain/validation';

type SessionState = 'recorded' | 'prepared' | 'cancelled' | 'unscheduled';

const insert = async (db: Db, sql: string, params: (string | number | null)[]) =>
  (await db.execute(sql, params)).lastInsertRowId;

/** Constructeurs : chaque appel insère une ligne et rend son identifiant. */
export const alertsWorld = (db: Db) => ({
  season: (name: string, start: string, end: string, active: boolean) =>
    insert(db, 'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES (?, ?, ?, ?)', [
      name,
      start,
      end,
      active ? 1 : 0,
    ]),
  group: (seasonId: number, name: string, archivedAt: string | null = null) =>
    insert(db, 'INSERT INTO groups (season_id, name, archived_at) VALUES (?, ?, ?)', [
      seasonId,
      name,
      archivedAt,
    ]),
  member: (lastName: string, firstName: string, archivedAt: string | null = null) =>
    insert(db, 'INSERT INTO members (last_name, first_name, archived_at) VALUES (?, ?, ?)', [
      lastName,
      firstName,
      archivedAt,
    ]),
  enroll: (memberId: number, groupId: number, start: string, end: string | null = null) =>
    insert(
      db,
      'INSERT INTO enrollments (member_id, group_id, start_date, end_date) VALUES (?, ?, ?, ?)',
      [memberId, groupId, start, end],
    ),
  /** Séance sans créneau (appel libre, EX-39) avec ses groupes et les statuts donnés. */
  session: async (
    seasonId: number,
    groupIds: number[],
    date: string,
    time: string,
    statuses: [number, AttendanceStatus][],
    state: SessionState = 'recorded',
  ) => {
    const id = await insert(
      db,
      'INSERT INTO sessions (season_id, date, start_time, state) VALUES (?, ?, ?, ?)',
      [seasonId, date, time, state],
    );
    for (const groupId of groupIds)
      await db.execute('INSERT INTO session_groups (session_id, group_id) VALUES (?, ?)', [
        id,
        groupId,
      ]);
    for (const [memberId, status] of statuses)
      await db.execute('INSERT INTO attendances (session_id, member_id, status) VALUES (?, ?, ?)', [
        id,
        memberId,
        status,
      ]);
    return id;
  },
});

/** Date du jour n (1 à 28) d'un mois de 2026 ou 2027, au format AAAA-MM-JJ. */
export const day = (yearMonth: string, n: number) => `${yearMonth}-${String(n).padStart(2, '0')}`;

export const VOLUME_MEMBERS = 500;
const SESSIONS_PER_SEASON = 30;
const GROUP_SIZE = 50;

/**
 * NF-08 : 500 membres, 3 saisons (la plus récente active), 10 groupes de 50 par saison, 30 séances
 * enregistrées par groupe et par saison. Un membre sur cinq finit sur 3 absences de suite dans la
 * saison active (100 alertes au seuil par défaut).
 */
export const seedAlertsVolume = async (db: Db): Promise<void> => {
  await db.transaction(async (tx) => {
    const w = alertsWorld(tx);
    const members: number[] = [];
    for (let i = 0; i < VOLUME_MEMBERS; i += 1)
      members.push(await w.member(`Nom${i}`, `Prénom${i}`));
    for (const [index, year] of [2024, 2025, 2026].entries()) {
      const active = index === 2;
      const seasonId = await w.season(
        `Saison ${year}`,
        `${year}-09-01`,
        `${year + 1}-07-31`,
        active,
      );
      for (let g = 0; g < VOLUME_MEMBERS / GROUP_SIZE; g += 1) {
        const groupId = await w.group(seasonId, `Groupe ${g}`);
        const groupMembers = members.slice(g * GROUP_SIZE, (g + 1) * GROUP_SIZE);
        for (const memberId of groupMembers) await w.enroll(memberId, groupId, `${year}-09-01`);
        for (let s = 0; s < SESSIONS_PER_SEASON; s += 1) {
          const date = day(`${year}-${s < 15 ? '10' : '11'}`, (s % 15) + 1);
          const late = s >= SESSIONS_PER_SEASON - 3;
          await w.session(
            seasonId,
            [groupId],
            date,
            '18:00',
            groupMembers.map((m, k): [number, AttendanceStatus] => [
              m,
              active && late && k % 5 === 0 ? 'absent' : 'present',
            ]),
          );
        }
      }
    }
  });
};
