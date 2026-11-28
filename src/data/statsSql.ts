// Morceaux SQL des statistiques (ticket 023), partagés par les trois requêtes de `statsRepo.ts`.
// Paramètres positionnels communs (SEC-05) : ?1 = début, ?2 = fin de la période (comprises),
// ?3 = saison des séances (`NULL` : toutes les saisons).
import type { StatusCounts } from '@/domain/attendanceRate';

/**
 * Séances enregistrées de la période : seules elles comptent (glossaire, plan point 1) ; avec
 * « Saison », celles de la saison active seulement (décision du porteur du 2026-11-27).
 */
export const RECORDED = `rs AS (
  SELECT id, date, start_time, group_count FROM sessions
  WHERE state = 'recorded' AND date BETWEEN ?1 AND ?2 AND (?3 IS NULL OR season_id = ?3))`;

/**
 * EX-27 (plan point 5) : membre `m` non archivé, inscrit au groupe à un moment de la période
 * (inscription non vide qui la recoupe).
 */
export const enrolledInPeriod = (m: string, group: string) =>
  `(${m}.archived_at IS NULL AND EXISTS (SELECT 1 FROM enrollments e
    WHERE e.member_id = ${m}.id AND e.group_id = ${group} AND e.start_date <= ?2
      AND (e.end_date IS NULL OR (e.end_date > ?1 AND e.end_date > e.start_date))))`;

/**
 * RM-03 : le membre est inscrit au groupe à la date (début compris, fin exclue). `+e.group_id`
 * écarte l'index du groupe : SQLite passe par `enrollments_member` (quelques lignes par membre au
 * lieu de tout le groupe ; NF-08 : synthèse 5 fois plus rapide sur le jeu de volume).
 */
export const enrolledAt = (member: string, group: string, date: string) =>
  `EXISTS (SELECT 1 FROM enrollments e
    WHERE e.member_id = ${member} AND +e.group_id = ${group}
      AND e.start_date <= ${date} AND (e.end_date IS NULL OR e.end_date > ${date}))`;

/**
 * RM-03 (ticket 043b) : nombre de groupes de la séance `rs` (ligne de RECORDED), figé à son
 * enregistrement (`group_count`, ticket 043) : un groupe supprimé ensuite y compte encore.
 * Limite provisoire jusqu'au 043c : `group_count` NULL (séance d'avant le 043), compte actuel.
 */
const groupCount = (rs: string) =>
  `COALESCE(${rs}.group_count,
    (SELECT COUNT(*) FROM session_groups x WHERE x.session_id = ${rs}.id))`;

/**
 * RM-03 (plan validé le 2026-11-27, point 2), seule règle d'attribution : la présence du membre à
 * la séance `rs` compte pour le groupe s'il y était inscrit à sa date, ou si la séance n'a jamais
 * eu qu'un groupe (cas de secours ; « ou séance d'un seul groupe » revient au même).
 */
export const countsFor = (member: string, group: string, rs: string) =>
  `(${groupCount(rs)} = 1 OR ${enrolledAt(member, group, `${rs}.date`)})`;

/**
 * RM-03 : une ligne par présence et par groupe de la séance pour lequel elle compte (`countsFor`).
 * `groupFilter` : condition SQL facultative sur `sg.group_id`.
 */
export const credits = (groupFilter = '1') => `credits AS (
  SELECT a.session_id, a.member_id, a.status, sg.group_id
  FROM rs JOIN attendances a ON a.session_id = rs.id
  JOIN session_groups sg ON sg.session_id = rs.id
  WHERE ${groupFilter} AND ${countsFor('a.member_id', 'sg.group_id', 'rs')})`;

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
