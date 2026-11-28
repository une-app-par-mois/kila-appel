// Rapport PDF, grille séance par séance (ticket 039b ; EX-32, RM-03, NF-08) : séances enregistrées
// de chaque groupe et statut de chaque membre, en une seule requête paramétrée (SEC-05). Statut
// d'une case : uniquement `credits` de `statsSql.ts` (même attribution RM-03 que les statistiques
// et le rapport du 039). Ni date de naissance, ni contact, ni commentaire (ABS-03).
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { credits, RECORDED } from '@/data/statsSql';
import type { GridSession, GroupGrid, ReportGrid } from '@/domain/reportGrid';
import { customPeriod, type StatsPeriod } from '@/domain/statsPeriod';
import { type AttendanceStatus, isId } from '@/domain/validation';

/** Ligne de séance (memberId nul) ou ligne de statut compté (date nulle). */
type GridRow = {
  groupId: number;
  sessionId: number;
  date: string | null;
  startTime: string | null;
  memberId: number | null;
  status: AttendanceStatus | null;
};

// ?1 début, ?2 fin, ?3 saison (NULL : toutes), ?4 groupe du filtre (NULL : tous les groupes).
// Colonnes : séances enregistrées de chaque groupe (même compte que `per_group` du 039).
const GRID = `WITH ${RECORDED}, ${credits('(?4 IS NULL OR sg.group_id = ?4)')}
SELECT sg.group_id AS groupId, rs.id AS sessionId, rs.date AS date, rs.start_time AS startTime,
  NULL AS memberId, NULL AS status
FROM rs JOIN session_groups sg ON sg.session_id = rs.id
WHERE ?4 IS NULL OR sg.group_id = ?4
UNION ALL
SELECT group_id, session_id, NULL, NULL, member_id, status FROM credits
ORDER BY groupId, date, startTime, sessionId`;

export const reportGridRepo = (db: Db) => ({
  /**
   * EX-32 : grilles de la période, tous les groupes (`groupId` nul) ou un seul ; vide si le groupe
   * du filtre n'existe pas (ou plus) ou n'a aucune séance. Période revalidée (RM-04).
   */
  grid: async (period: StatsPeriod, groupId: number | null): Promise<ReportGrid> => {
    const { from, to } = customPeriod(period.from, period.to);
    const { seasonId } = period;
    if (seasonId !== null && !isId(seasonId)) throw new DataError('NOT_FOUND');
    if (groupId !== null && !isId(groupId)) return new Map();
    const rows = await db.query<GridRow>(GRID, [from, to, seasonId, groupId]);
    const sessions = new Map<number, GridSession[]>();
    const statuses = new Map<number, Map<number, Map<number, AttendanceStatus>>>();
    for (const r of rows) {
      if (r.memberId === null) {
        const list = sessions.get(r.groupId) ?? [];
        list.push({ sessionId: r.sessionId, date: r.date ?? '', startTime: r.startTime ?? '' });
        sessions.set(r.groupId, list);
      } else if (r.status !== null) {
        const group = statuses.get(r.groupId) ?? new Map<number, Map<number, AttendanceStatus>>();
        const member = group.get(r.memberId) ?? new Map<number, AttendanceStatus>();
        member.set(r.sessionId, r.status);
        group.set(r.memberId, member);
        statuses.set(r.groupId, group);
      }
    }
    const grids = new Map<number, GroupGrid>();
    for (const [id, list] of sessions)
      grids.set(id, { sessions: list, statuses: statuses.get(id) ?? new Map() });
    return grids;
  },
});
