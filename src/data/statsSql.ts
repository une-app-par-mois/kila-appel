// Morceaux SQL des statistiques (ticket 023), partagés par les trois requêtes de `statsRepo.ts`.
// Paramètres positionnels communs : ?1 = début, ?2 = fin de la période (comprises, SEC-05).
import type { StatusCounts } from '@/domain/attendanceRate';

/** Séances enregistrées de la période : seules elles comptent (glossaire, plan point 1). */
export const RECORDED = `rs AS (
  SELECT id, date, start_time FROM sessions
  WHERE state = 'recorded' AND date BETWEEN ?1 AND ?2)`;

/** RM-03 : le membre est inscrit au groupe à la date (début compris, fin exclue). */
export const enrolledAt = (member: string, group: string, date: string) =>
  `EXISTS (SELECT 1 FROM enrollments e
    WHERE e.member_id = ${member} AND e.group_id = ${group}
      AND e.start_date <= ${date} AND (e.end_date IS NULL OR e.end_date > ${date}))`;

/** Nombre de groupes figés d'une séance. */
export const groupCount = (session: string) =>
  `(SELECT COUNT(*) FROM session_groups x WHERE x.session_id = ${session})`;

/**
 * RM-03 (plan validé le 2026-11-27, point 2) : une présence compte pour chaque groupe de la séance
 * où le membre était inscrit à sa date ; si aucun ne correspond et que la séance n'a qu'un groupe,
 * pour ce groupe (« ou séance d'un seul groupe » revient au même). `groupFilter` : condition SQL
 * facultative sur `sg.group_id`.
 */
export const credits = (groupFilter = '1') => `credits AS (
  SELECT a.session_id, a.member_id, a.status, sg.group_id
  FROM rs JOIN attendances a ON a.session_id = rs.id
  JOIN session_groups sg ON sg.session_id = rs.id
  WHERE ${groupFilter}
    AND (${groupCount('rs.id')} = 1 OR ${enrolledAt('a.member_id', 'sg.group_id', 'rs.date')}))`;

/** Comptes par statut d'un ensemble de présences `alias.status` (agrégat). */
export const COUNT_COLUMNS = (alias: string) =>
  ['present', 'late', 'excused', 'absent']
    .map((s) => `COALESCE(SUM(${alias}.status = '${s}'), 0) AS ${s}`)
    .join(', ');

/** Groupe archivé ou hors de la saison active (décision du porteur du 2026-11-27). */
export const GROUP_ARCHIVED = '(g.archived_at IS NOT NULL OR se.is_active = 0)';

export type CountRow = StatusCounts;

export const toCounts = (row: CountRow): StatusCounts => ({
  present: Number(row.present),
  late: Number(row.late),
  excused: Number(row.excused),
  absent: Number(row.absent),
});

const collator = new Intl.Collator('fr', { sensitivity: 'base' });

/** Tri par nom, puis prénom (maquette « Statistiques d'un groupe » : « Triés par nom »). */
export const byName = (
  a: { lastName: string; firstName: string },
  b: { lastName: string; firstName: string },
) => collator.compare(a.lastName, b.lastName) || collator.compare(a.firstName, b.firstName);

/** Tri des groupes : actifs d'abord, puis archivés, chacun par nom. */
export const byGroup = (a: { archived: boolean; name: string }, b: typeof a) =>
  Number(a.archived) - Number(b.archived) || collator.compare(a.name, b.name);
