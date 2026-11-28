// Statistiques (F-05, EX-27) : agrégats calculés en SQL, une requête par écran (NF-08). Les taux
// se calculent avec `src/domain/attendanceRate.ts` (RM-01) ; requêtes paramétrées (SEC-05).
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import {
  byGroup,
  byName,
  COUNT_COLUMNS,
  type CountRow,
  countsFor,
  credits,
  enrolledAt,
  enrolledInPeriod,
  GROUP_ARCHIVED,
  RECORDED,
  toCounts,
} from '@/data/statsSql';
import type { StatusCounts } from '@/domain/attendanceRate';
import { customPeriod, type StatsPeriod } from '@/domain/statsPeriod';
import { type AttendanceStatus, isId } from '@/domain/validation';

/** Ligne « Par groupe » : `sessions` = séances enregistrées du groupe dans la période. */
export type GroupStatsRow = {
  groupId: number;
  name: string;
  /** Groupe archivé ou hors de la saison active : affiché après les autres, « Archivé ». */
  archived: boolean;
  sessions: number;
  counts: StatusCounts;
};

export type StatsOverview = {
  /** Au moins une séance enregistrée, toutes périodes confondues (état vide). */
  anyRecorded: boolean;
  /** Séances enregistrées de la période, avec ou sans groupe. */
  sessions: number;
  /** Toutes les présences de la période, chacune une fois. */
  counts: StatusCounts;
  groups: GroupStatsRow[];
};

export type MemberStatsRow = {
  memberId: number;
  firstName: string;
  lastName: string;
  archived: boolean;
  counts: StatusCounts;
};

export type GroupStats = Omit<GroupStatsRow, 'counts'> & { members: MemberStatsRow[] };

/** Une case : statut compté pour le groupe, ou `null` (inscrit sans statut, ou hors inscription). */
export type MemberSession = {
  sessionId: number;
  date: string;
  startTime: string;
  status: AttendanceStatus | null;
  /** Inscrit au groupe à la date de la séance (RM-03). */
  enrolled: boolean;
};

export type MemberStats = Omit<MemberStatsRow, 'counts'> & {
  groupId: number;
  groupName: string;
  groupArchived: boolean;
  counts: StatusCounts;
  sessions: MemberSession[];
};

type Flag = number | boolean;
type OverviewRow = CountRow & {
  groupId: number | null;
  name: string | null;
  archived: Flag;
  sessions: number;
  anyRecorded: Flag;
};
type GroupRow = CountRow & {
  groupId: number;
  name: string;
  archived: Flag;
  sessions: number;
  memberId: number | null;
  lastName: string;
  firstName: string;
  memberArchived: Flag;
};
type MemberRow = Omit<MemberStats, 'archived' | 'groupArchived' | 'counts' | 'sessions'> & {
  archived: Flag;
  groupArchived: Flag;
  sessionId: number | null;
  date: string;
  startTime: string;
  status: AttendanceStatus | null;
  enrolled: Flag;
  listed: Flag;
};

/**
 * Période revalidée avant toute requête (RM-04 ; entrée venue d'un écran) : ?1 début, ?2 fin,
 * ?3 saison (`null` : toutes les saisons).
 */
const bounds = (period: StatsPeriod): [string, string, number | null] => {
  const { from, to } = customPeriod(period.from, period.to);
  const { seasonId } = period;
  if (seasonId !== null && !isId(seasonId)) throw new DataError('NOT_FOUND');
  return [from, to, seasonId];
};

// EX-27 (plan point 4, décision du 2026-11-27) : groupes de la saison active non archivés, plus tout
// groupe qui a une séance dans la période. Dernière ligne (groupId nul) : la synthèse.
const OVERVIEW = `WITH ${RECORDED}, ${credits()},
  per_group AS (SELECT sg.group_id, COUNT(*) AS n FROM rs
    JOIN session_groups sg ON sg.session_id = rs.id GROUP BY sg.group_id),
  group_counts AS (SELECT group_id, ${COUNT_COLUMNS('cr')} FROM credits cr GROUP BY group_id)
SELECT g.id AS groupId, g.name, ${GROUP_ARCHIVED} AS archived, COALESCE(pg.n, 0) AS sessions,
  COALESCE(gc.present, 0) AS present, COALESCE(gc.late, 0) AS late,
  COALESCE(gc.excused, 0) AS excused, COALESCE(gc.absent, 0) AS absent, 0 AS anyRecorded
FROM groups g JOIN seasons se ON se.id = g.season_id
LEFT JOIN per_group pg ON pg.group_id = g.id LEFT JOIN group_counts gc ON gc.group_id = g.id
WHERE (se.is_active = 1 AND g.archived_at IS NULL) OR pg.n IS NOT NULL
UNION ALL
SELECT NULL, NULL, 0, (SELECT COUNT(*) FROM rs), ${COUNT_COLUMNS('a')},
  EXISTS (SELECT 1 FROM sessions WHERE state = 'recorded')
FROM rs JOIN attendances a ON a.session_id = rs.id`;

// EX-27 (plan point 5, lancement du lot J2-1) : membres inscrits au groupe à un moment de la
// période (inscription non vide qui la recoupe), archivés exclus ; plus tout membre dont une
// présence compte pour le groupe (archivé compris, cas de secours de RM-03).
const GROUP = `WITH ${RECORDED}, ${credits('sg.group_id = ?4')},
  listed AS (
    SELECT member_id FROM credits
    UNION SELECT m.id FROM members m WHERE ${enrolledInPeriod('m', '?4')})
SELECT g.id AS groupId, g.name, ${GROUP_ARCHIVED} AS archived,
  (SELECT COUNT(*) FROM rs JOIN session_groups sg ON sg.session_id = rs.id
   WHERE sg.group_id = g.id) AS sessions,
  m.id AS memberId, m.last_name AS lastName, m.first_name AS firstName,
  m.archived_at IS NOT NULL AS memberArchived, ${COUNT_COLUMNS('cr')}
FROM groups g JOIN seasons se ON se.id = g.season_id
LEFT JOIN members m ON m.id IN (SELECT member_id FROM listed)
LEFT JOIN credits cr ON cr.member_id = m.id
WHERE g.id = ?4
GROUP BY m.id`;

// EX-27 : chaque séance enregistrée du groupe dans la période ; statut seulement s'il compte pour
// le groupe (RM-03 : `countsFor`, la règle de `credits`). `listed` : même règle que la liste des membres (GROUP).
const MEMBER = `WITH ${RECORDED}
SELECT m.id AS memberId, m.last_name AS lastName, m.first_name AS firstName,
  m.archived_at IS NOT NULL AS archived, ${enrolledInPeriod('m', '?5')} AS listed,
  g.id AS groupId, g.name AS groupName,
  ${GROUP_ARCHIVED} AS groupArchived, x.id AS sessionId, x.date, x.start_time AS startTime,
  x.enrolled, x.status
FROM members m JOIN groups g ON g.id = ?5 JOIN seasons se ON se.id = g.season_id
LEFT JOIN (
  SELECT rs.id, rs.date, rs.start_time, ${enrolledAt('?4', '?5', 'rs.date')} AS enrolled,
    CASE WHEN ${countsFor('?4', '?5', 'rs')} THEN (SELECT a.status FROM attendances a
      WHERE a.session_id = rs.id AND a.member_id = ?4) END AS status
  FROM rs JOIN session_groups sg ON sg.session_id = rs.id AND sg.group_id = ?5
) x ON 1
WHERE m.id = ?4
ORDER BY x.date, x.start_time, x.id`;

export const statsRepo = (db: Db) => ({
  /** EX-27 : synthèse de la période et ligne par groupe (RM-01 : comptes sommés, pas de moyenne). */
  overview: async (period: StatsPeriod): Promise<StatsOverview> => {
    const rows = await db.query<OverviewRow>(OVERVIEW, bounds(period));
    const total = rows.find((r) => r.groupId === null);
    return {
      anyRecorded: Boolean(total?.anyRecorded),
      sessions: Number(total?.sessions ?? 0),
      counts: total ? toCounts(total) : { present: 0, late: 0, excused: 0, absent: 0 },
      groups: rows
        .filter((r): r is OverviewRow & { groupId: number; name: string } => r.groupId !== null)
        .map((r) => ({
          groupId: r.groupId,
          name: r.name,
          archived: Boolean(r.archived),
          sessions: Number(r.sessions),
          counts: toCounts(r),
        }))
        .sort(byGroup),
    };
  },

  /** EX-27 : membres d'un groupe, triés par nom ; `null` si le groupe n'existe pas (ou plus). */
  group: async (groupId: number, period: StatsPeriod): Promise<GroupStats | null> => {
    const range = bounds(period);
    if (!isId(groupId)) return null;
    const rows = await db.query<GroupRow>(GROUP, [...range, groupId]);
    const [first] = rows;
    if (!first) return null;
    return {
      groupId: first.groupId,
      name: first.name,
      archived: Boolean(first.archived),
      sessions: Number(first.sessions),
      members: rows
        .filter((r): r is GroupRow & { memberId: number } => r.memberId !== null)
        .map((r) => ({
          memberId: r.memberId,
          firstName: r.firstName,
          lastName: r.lastName,
          archived: Boolean(r.memberArchived),
          counts: toCounts(r),
        }))
        .sort(byName),
    };
  },

  /**
   * EX-27 : un membre dans un groupe, séance par séance de la plus ancienne à la plus récente
   * (date, puis heure) ; `null` si le membre ou le groupe n'existe pas, ou si le membre n'est pas
   * dans la liste du groupe pour la période.
   */
  member: async (
    memberId: number,
    groupId: number,
    period: StatsPeriod,
  ): Promise<MemberStats | null> => {
    const range = bounds(period);
    if (!isId(memberId) || !isId(groupId)) return null;
    const rows = await db.query<MemberRow>(MEMBER, [...range, memberId, groupId]);
    const [first] = rows;
    if (!first) return null;
    const sessions: MemberSession[] = rows
      .filter((r): r is MemberRow & { sessionId: number } => r.sessionId !== null)
      .map((r) => ({
        sessionId: r.sessionId,
        date: r.date,
        startTime: r.startTime,
        status: r.status,
        enrolled: Boolean(r.enrolled),
      }));
    const counts = { present: 0, late: 0, excused: 0, absent: 0 };
    for (const { status } of sessions) if (status) counts[status] += 1;
    // Absent de la liste du groupe (ni inscription sur la période, ni présence comptée) : null.
    if (!first.listed && sessions.every((x) => x.status === null)) return null;
    return {
      memberId: first.memberId,
      firstName: first.firstName,
      lastName: first.lastName,
      archived: Boolean(first.archived),
      groupId: first.groupId,
      groupName: first.groupName,
      groupArchived: Boolean(first.groupArchived),
      counts,
      sessions,
    };
  },
});
