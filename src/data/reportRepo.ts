// Rapport PDF, données (ticket 039 ; EX-32, RM-01, RM-03, NF-08) : synthèse, groupes et membres
// de chaque groupe en une seule requête paramétrée (SEC-05). Mêmes règles que les écrans de
// statistiques (`statsRepo.ts`, morceaux de `statsSql.ts`, attribution RM-03 dans `credits`) :
// mêmes nombres. Jamais de date de naissance, de contact ni de commentaire (ABS-03).
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import {
  byGroup,
  byName,
  COUNT_COLUMNS,
  type CountRow,
  credits,
  enrolledInPeriod,
  GROUP_ARCHIVED,
  RECORDED,
  toCounts,
} from '@/data/statsSql';
import { isIsoDate } from '@/domain/formats';
import type { Report, ReportGroup } from '@/domain/reportHtml';
import { customPeriod, type StatsPeriod } from '@/domain/statsPeriod';
import { isId } from '@/domain/validation';

type Flag = number | boolean;
/** Une ligne par synthèse (groupId nul), par groupe (memberId nul) et par membre d'un groupe. */
type ReportRow = CountRow & {
  groupId: number | null;
  name: string | null;
  archived: Flag;
  sessions: number;
  memberId: number | null;
  lastName: string | null;
  firstName: string | null;
  memberArchived: Flag;
};

// ?1 début, ?2 fin, ?3 saison (NULL : toutes), ?4 groupe du filtre (NULL : tous les groupes).
// Groupes : ceux des statistiques (saison active non archivés, plus tout groupe qui a une séance
// dans la période) ; avec un filtre, ce groupe seul. Membres (groupes qui ont des séances) : même
// règle que l'écran d'un groupe, inscrits sur la période ou présence comptée (archivé compris).
// Synthèse : chaque présence une fois ; avec un filtre, celles qui comptent pour le groupe.
const REPORT = `WITH ${RECORDED}, ${credits('(?4 IS NULL OR sg.group_id = ?4)')},
  per_group AS (SELECT sg.group_id, COUNT(*) AS n FROM rs
    JOIN session_groups sg ON sg.session_id = rs.id GROUP BY sg.group_id),
  shown AS (SELECT g.id, g.name, ${GROUP_ARCHIVED} AS archived, COALESCE(pg.n, 0) AS n
    FROM groups g JOIN seasons se ON se.id = g.season_id
    LEFT JOIN per_group pg ON pg.group_id = g.id
    WHERE CASE WHEN ?4 IS NULL
      THEN (se.is_active = 1 AND g.archived_at IS NULL) OR pg.n IS NOT NULL
      ELSE g.id = ?4 END),
  listed AS (SELECT group_id, member_id FROM credits
    UNION SELECT en.group_id, m.id FROM enrollments en
    JOIN shown sh ON sh.id = en.group_id AND sh.n > 0 JOIN members m ON m.id = en.member_id
    WHERE ${enrolledInPeriod('m', 'sh.id')}),
  group_counts AS (SELECT group_id, ${COUNT_COLUMNS('cr')} FROM credits cr GROUP BY group_id),
  member_counts AS (SELECT l.group_id, l.member_id, ${COUNT_COLUMNS('cr')} FROM listed l
    LEFT JOIN credits cr ON cr.group_id = l.group_id AND cr.member_id = l.member_id
    GROUP BY l.group_id, l.member_id),
  total AS (SELECT a.status FROM rs JOIN attendances a ON a.session_id = rs.id WHERE ?4 IS NULL
    UNION ALL SELECT status FROM credits WHERE ?4 IS NOT NULL)
SELECT NULL AS groupId, NULL AS name, 0 AS archived,
  CASE WHEN ?4 IS NULL THEN (SELECT COUNT(*) FROM rs)
    ELSE COALESCE((SELECT n FROM per_group WHERE group_id = ?4), 0) END AS sessions,
  ${COUNT_COLUMNS('t')}, NULL AS memberId, NULL AS lastName, NULL AS firstName, 0 AS memberArchived
FROM total t
UNION ALL
SELECT sh.id, sh.name, sh.archived, sh.n, COALESCE(gc.present, 0), COALESCE(gc.late, 0),
  COALESCE(gc.excused, 0), COALESCE(gc.absent, 0), NULL, NULL, NULL, 0
FROM shown sh LEFT JOIN group_counts gc ON gc.group_id = sh.id
UNION ALL
SELECT mc.group_id, NULL, 0, 0, mc.present, mc.late, mc.excused, mc.absent,
  m.id, m.last_name, m.first_name, m.archived_at IS NOT NULL
FROM member_counts mc JOIN members m ON m.id = mc.member_id`;

/** Période et date de création revalidées avant la requête (RM-04 ; entrées venues d'un écran). */
const bounds = (period: StatsPeriod, groupId: number | null, today: string) => {
  const { from, to } = customPeriod(period.from, period.to);
  const { seasonId } = period;
  if (seasonId !== null && !isId(seasonId)) throw new DataError('NOT_FOUND');
  if (!isIsoDate(today)) throw new Error('Date de création invalide (RM-04)');
  return { from, to, params: [from, to, seasonId, groupId] };
};

export const reportRepo = (db: Db) => ({
  /**
   * EX-32 : rapport de la période, tous les groupes (`groupId` nul) ou un seul ; `null` si le
   * groupe du filtre n'existe pas (ou plus). `today` : date de création affichée.
   */
  report: async (
    period: StatsPeriod,
    groupId: number | null,
    today: string,
  ): Promise<Report | null> => {
    const { from, to, params } = bounds(period, groupId, today);
    if (groupId !== null && !isId(groupId)) return null;
    const rows = await db.query<ReportRow>(REPORT, params);
    const groups = new Map<number, ReportGroup>();
    for (const r of rows) {
      if (r.groupId === null || r.memberId !== null) continue;
      groups.set(r.groupId, {
        groupId: r.groupId,
        name: r.name ?? '',
        archived: Boolean(r.archived),
        sessions: Number(r.sessions),
        counts: toCounts(r),
        members: [],
      });
    }
    if (groupId !== null && groups.size === 0) return null;
    for (const r of rows) {
      if (r.groupId === null || r.memberId === null) continue;
      groups.get(r.groupId)?.members.push({
        memberId: r.memberId,
        firstName: r.firstName ?? '',
        lastName: r.lastName ?? '',
        archived: Boolean(r.memberArchived),
        counts: toCounts(r),
      });
    }
    const total = rows.find((r) => r.groupId === null);
    return {
      from,
      to,
      createdOn: today,
      sessions: Number(total?.sessions ?? 0),
      counts: total ? toCounts(total) : { present: 0, late: 0, excused: 0, absent: 0 },
      groups: [...groups.values()]
        .map((g) => ({ ...g, members: g.members.sort(byName) }))
        .sort(byGroup),
    };
  },
});
