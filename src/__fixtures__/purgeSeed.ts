// Jeu fictif de la purge (tickets 015, 015b) : une ancienne saison complète, des membres qui n'y
// figurent que par une inscription ou une présence, et les comptes de lignes de chaque table.
import { count, type Seeded } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';

export type Table = Parameters<typeof count>[1];
export const TABLES: Table[] = [
  'seasons',
  'members',
  'emergency_contacts',
  'groups',
  'enrollments',
  'slots',
  'slot_dates',
  'slot_groups',
  'sessions',
  'session_groups',
  'attendances',
  'roll_call_drafts',
  'roll_call_draft_groups',
  'roll_call_draft_statuses',
  'alert_acks',
  'settings',
];

export const insert = async (db: Db, sql: string, params: (string | number | null)[]) =>
  (await db.execute(sql, params)).lastInsertRowId;

export const addSeason = (db: Db, name: string, start: string, end: string) =>
  insert(db, 'INSERT INTO seasons (name, start_date, end_date) VALUES (?, ?, ?)', [
    name,
    start,
    end,
  ]);

export const addMember = (db: Db, lastName: string, archivedAt: string | null = null) =>
  insert(db, 'INSERT INTO members (last_name, first_name, archived_at) VALUES (?, ?, ?)', [
    lastName,
    'Zzprenompurgezz',
    archivedAt,
  ]);

/** Ancienne saison 2023-2024 : groupe, créneau, séance ; membres et présences au choix. */
export const oldSeason = async (db: Db, s: Seeded) => {
  const seasonId = await addSeason(db, '2023-2024', '2023-09-01', '2024-07-31');
  const groupId = await insert(db, 'INSERT INTO groups (season_id, name) VALUES (?, ?)', [
    seasonId,
    'Minimes',
  ]);
  const slotId = await insert(
    db,
    'INSERT INTO slots (season_id, weekday, start_time, duration_min, schedule_from) VALUES (?, 2, ?, 60, ?)',
    [seasonId, '18:00', '2023-09-01'],
  );
  await db.execute('INSERT INTO slot_groups (slot_id, group_id) VALUES (?, ?)', [slotId, groupId]);
  await db.execute('INSERT INTO slot_dates (slot_id, date) VALUES (?, ?)', [slotId, '2023-10-10']);
  const sessionId = await insert(
    db,
    "INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, ?, ?, ?, 'recorded')",
    [seasonId, slotId, '2023-10-03', '18:00'],
  );
  await db.execute('INSERT INTO session_groups (session_id, group_id) VALUES (?, ?)', [
    sessionId,
    groupId,
  ]);
  // Archivé, seulement dans l'ancienne saison : effacé, avec contact et alerte traitée.
  const onlyOld = await addMember(db, 'Zzanciennezz', '2024-08-01');
  // Une présence sans inscription dans l'ancienne saison : effacé aussi.
  const attendedOnly = await addMember(db, 'Zzpresencezz');
  const neverEnrolled = await addMember(db, 'Zzjamaiszz');
  await db.execute('INSERT INTO emergency_contacts (member_id, phone, position) VALUES (?, ?, 0)', [
    onlyOld,
    '0699999924',
  ]);
  await db.execute('INSERT INTO alert_acks (member_id, streak_length, acked_at) VALUES (?, 3, ?)', [
    onlyOld,
    '2024-01-10',
  ]);
  for (const memberId of [onlyOld, s.memberId]) {
    await db.execute('INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)', [
      memberId,
      groupId,
      '2023-09-01',
    ]);
  }
  for (const memberId of [onlyOld, attendedOnly, s.memberId]) {
    await db.execute(
      "INSERT INTO attendances (session_id, member_id, status) VALUES (?, ?, 'present')",
      [sessionId, memberId],
    );
  }
  return { seasonId, onlyOld, attendedOnly, neverEnrolled };
};

/** Jour du test : la saison 2026-2027 (active) et 2025-2026 sont commencées. */
export const TODAY = '2026-11-27';

export const counts = async (db: Db) =>
  Object.fromEntries(await Promise.all(TABLES.map(async (t) => [t, await count(db, t)])));
