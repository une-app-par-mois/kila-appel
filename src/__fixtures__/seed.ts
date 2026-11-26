// Jeu de données fictif pour les tests de la couche données (SEC-13 : aucune donnée réelle).
import type { Db } from '@/data/db';

export type Seeded = {
  seasonId: number;
  otherSeasonId: number;
  groupId: number;
  memberId: number;
  otherMemberId: number;
  slotId: number;
  sessionId: number;
};

const insert = async (db: Db, sql: string, params: (string | number | null)[]) =>
  (await db.execute(sql, params)).lastInsertRowId;

/** Une saison complète (groupe, deux membres, créneau, séance, présences) et une autre saison. */
export const seed = async (db: Db): Promise<Seeded> => {
  const seasonId = await insert(
    db,
    'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES (?, ?, ?, 1)',
    ['Saison 2026-2027', '2026-09-01', '2027-07-31'],
  );
  const otherSeasonId = await insert(
    db,
    'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES (?, ?, ?, 0)',
    ['Saison 2025-2026', '2025-09-01', '2026-07-31'],
  );
  const groupId = await insert(db, 'INSERT INTO groups (season_id, name) VALUES (?, ?)', [
    seasonId,
    'Poussins',
  ]);
  const otherGroupId = await insert(db, 'INSERT INTO groups (season_id, name) VALUES (?, ?)', [
    otherSeasonId,
    'Benjamins',
  ]);
  const memberId = await insert(
    db,
    'INSERT INTO members (last_name, first_name, birth_date) VALUES (?, ?, ?)',
    ['Exemple', 'Alix', '2015-03-14'],
  );
  const otherMemberId = await insert(
    db,
    'INSERT INTO members (last_name, first_name) VALUES (?, ?)',
    ['Fictif', 'Sam'],
  );
  for (const id of [memberId, otherMemberId]) {
    await db.execute(
      'INSERT INTO emergency_contacts (member_id, label, phone, position) VALUES (?, ?, ?, 0)',
      [id, 'Parent', '0600000000'],
    );
    await db.execute('INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)', [
      id,
      groupId,
      '2026-09-01',
    ]);
    await db.execute('INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)', [
      id,
      otherGroupId,
      '2025-09-01',
    ]);
    await db.execute(
      'INSERT INTO alert_acks (member_id, streak_length, acked_at) VALUES (?, 3, ?)',
      [id, '2026-11-20'],
    );
  }
  const slotId = await insert(
    db,
    'INSERT INTO slots (season_id, weekday, start_time, duration_min, place) VALUES (?, 3, ?, 90, ?)',
    [seasonId, '17:30', 'Gymnase'],
  );
  await db.execute('INSERT INTO slot_groups (slot_id, group_id) VALUES (?, ?)', [slotId, groupId]);
  await db.execute('INSERT INTO slot_dates (slot_id, date) VALUES (?, ?)', [slotId, '2026-12-05']);
  const sessionId = await insert(
    db,
    "INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, ?, ?, ?, 'recorded')",
    [seasonId, slotId, '2026-11-25', '17:30'],
  );
  await db.execute('INSERT INTO session_groups (session_id, group_id) VALUES (?, ?)', [
    sessionId,
    groupId,
  ]);
  await db.execute(
    "INSERT INTO attendances (session_id, member_id, status) VALUES (?, ?, 'present')",
    [sessionId, memberId],
  );
  await db.execute(
    "INSERT INTO attendances (session_id, member_id, status) VALUES (?, ?, 'late')",
    [sessionId, otherMemberId],
  );
  await db.execute(
    'INSERT INTO roll_call_drafts (id, slot_id, date, updated_at) VALUES (1, ?, ?, ?)',
    [slotId, '2026-12-02', '2026-12-02T17:35:00'],
  );
  await db.execute('INSERT INTO roll_call_draft_groups (draft_id, group_id) VALUES (1, ?)', [
    groupId,
  ]);
  for (const id of [memberId, otherMemberId]) {
    await db.execute(
      "INSERT INTO roll_call_draft_statuses (draft_id, member_id, status) VALUES (1, ?, 'absent')",
      [id],
    );
  }
  return { seasonId, otherSeasonId, groupId, memberId, otherMemberId, slotId, sessionId };
};

/** Nombre de lignes d'une table, avec un filtre facultatif (SQL statique, valeurs en paramètres). */
type Table =
  | 'seasons'
  | 'members'
  | 'emergency_contacts'
  | 'groups'
  | 'enrollments'
  | 'slots'
  | 'slot_dates'
  | 'slot_groups'
  | 'sessions'
  | 'session_groups'
  | 'attendances'
  | 'roll_call_drafts'
  | 'roll_call_draft_groups'
  | 'roll_call_draft_statuses'
  | 'alert_acks'
  | 'settings';

export const count = async (
  db: Db,
  table: Table,
  where = '1 = 1',
  params: (string | number | null)[] = [],
): Promise<number> => {
  const rows = await db.query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`,
    params,
  );
  return rows[0]?.n ?? 0;
};
