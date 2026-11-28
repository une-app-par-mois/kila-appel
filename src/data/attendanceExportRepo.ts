// Lignes de l'export CSV des présences (F-08, EX-31). Zone sensible : données de mineurs qui
// sortent de l'appareil. Une requête par lecture (NF-08), paramétrée (SEC-05) : ?1 début, ?2 fin
// (comprises), ?3 saison (`NULL` : toutes), ?4 groupe (`NULL` : tous les groupes).
// Attribution d'une présence à un groupe : RM-03, même règle que les statistiques (`credits`).
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { statsRepo } from '@/data/statsRepo';
import { byName, credits, RECORDED } from '@/data/statsSql';
import type { ExportRow } from '@/domain/attendanceCsv';
import { customPeriod, type StatsPeriod } from '@/domain/statsPeriod';
import { type AttendanceStatus, isId } from '@/domain/validation';

/** Groupe proposé dans le choix de l'export. */
export type ExportGroup = { groupId: number; name: string; archived: boolean };

type Flag = number | boolean;
/** Une ligne par présence et par groupe pour lequel elle compte (`groupName` nul : aucun). */
type SqlRow = {
  sessionId: number;
  memberId: number;
  date: string;
  startTime: string;
  hasSlot: Flag;
  slotName: string | null;
  lastName: string;
  firstName: string;
  status: AttendanceStatus;
  groupName: string | null;
};

const ROW_GROUP_FILTER = '(?4 IS NULL OR sg.group_id = ?4)';

// Séances enregistrées de la période seulement ; membres archivés compris. Export filtré : la
// présence doit compter pour ce groupe ; « Tous les groupes » : aussi les présences sans groupe.
const ROWS = `WITH ${RECORDED}, ${credits(ROW_GROUP_FILTER)}
SELECT rs.id AS sessionId, m.id AS memberId, rs.date, rs.start_time AS startTime,
  s.slot_id IS NOT NULL AS hasSlot, sl.name AS slotName,
  m.last_name AS lastName, m.first_name AS firstName, a.status, g.name AS groupName
FROM rs JOIN sessions s ON s.id = rs.id
JOIN attendances a ON a.session_id = rs.id
JOIN members m ON m.id = a.member_id
LEFT JOIN slots sl ON sl.id = s.slot_id
LEFT JOIN credits cr ON cr.session_id = rs.id AND cr.member_id = a.member_id
LEFT JOIN groups g ON g.id = cr.group_id
WHERE ?4 IS NULL OR cr.group_id IS NOT NULL
ORDER BY rs.date, rs.start_time, rs.id, m.id`;

// Même compte que ROWS : une présence par ligne, groupes joints.
const COUNT = `WITH ${RECORDED}, ${credits('sg.group_id = ?4')}
SELECT CASE WHEN ?4 IS NULL
  THEN (SELECT COUNT(*) FROM rs JOIN attendances a ON a.session_id = rs.id)
  ELSE (SELECT COUNT(*) FROM credits) END AS n`;

const collator = new Intl.Collator('fr', { sensitivity: 'base' });

/** Période et groupe revalidés avant toute requête (RM-04 ; entrée venue d'un écran). */
const params = (period: StatsPeriod, groupId: number | null) => {
  const { from, to } = customPeriod(period.from, period.to);
  const { seasonId } = period;
  if (seasonId !== null && !isId(seasonId)) throw new DataError('NOT_FOUND');
  if (groupId !== null && !isId(groupId)) throw new DataError('NOT_FOUND');
  return [from, to, seasonId, groupId];
};

/** Regroupe les lignes d'une même présence (groupes triés), puis trie chaque séance par nom. */
const toExportRows = (sqlRows: SqlRow[]): ExportRow[] => {
  const sessions: ExportRow[][] = [];
  let lastSession: number | null = null;
  let lastKey = '';
  for (const r of sqlRows) {
    if (r.sessionId !== lastSession) {
      sessions.push([]);
      lastSession = r.sessionId;
    }
    const current = sessions[sessions.length - 1] ?? [];
    const key = `${r.sessionId}|${r.memberId}`;
    const groups = r.groupName === null ? [] : [r.groupName];
    const previous = current[current.length - 1];
    if (key === lastKey && previous) {
      previous.groups = [...previous.groups, ...groups].sort(collator.compare);
      continue;
    }
    lastKey = key;
    current.push({
      date: r.date,
      startTime: r.startTime,
      hasSlot: Boolean(r.hasSlot),
      slotName: r.slotName,
      groups,
      lastName: r.lastName,
      firstName: r.firstName,
      status: r.status,
    });
  }
  // Tri stable : à nom égal, l'ordre des identifiants (SQL) est gardé.
  return sessions.flatMap((rows) => rows.sort(byName));
};

export const attendanceExportRepo = (db: Db) => ({
  /** EX-31 : une ligne par présence, par date, heure et séance, puis par nom (Collator français). */
  rows: async (period: StatsPeriod, groupId: number | null): Promise<ExportRow[]> =>
    toExportRows(await db.query<SqlRow>(ROWS, params(period, groupId))),

  /** EX-31 : nombre de lignes de l'export (bouton « Exporter (N lignes) »). */
  count: async (period: StatsPeriod, groupId: number | null): Promise<number> => {
    const [row] = await db.query<{ n: number }>(COUNT, params(period, groupId));
    return Number(row?.n ?? 0);
  },

  /** EX-31 : groupes proposés, ceux des statistiques de la période (même liste, même ordre). */
  groups: async (period: StatsPeriod): Promise<ExportGroup[]> =>
    (await statsRepo(db).overview(period)).groups.map(({ groupId, name, archived }) => ({
      groupId,
      name,
      archived,
    })),
});
