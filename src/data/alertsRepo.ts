// Dépôt des alertes d'assiduité (F-04, EX-25, EX-26). Zone sensible : calcul affiché.
// La base fournit les statuts dans l'ordre ; la série (RM-02) et le masquage se calculent dans le
// domaine pur (absenceStreak). Requêtes paramétrées (SEC-05) ; aucun journal ici (ABS-04).
// Jamais d'INSERT OR REPLACE (ARCHITECTURE §4.2) : un retraitement met la date à jour sur place.

import type { Db } from '@/data/db';
import { current } from '@/data/enrollmentsRepo';
import { expectFound } from '@/data/errors';
import { type AlertAck, currentStreak, isAlertShown } from '@/domain/absenceStreak';
import { type AttendanceStatus, validateDate } from '@/domain/validation';

/** Alerte d'assiduité : membre, groupe affiché, longueur et dates de la série en cours. */
export type AttendanceAlert = {
  memberId: number;
  firstName: string;
  lastName: string;
  groupName: string;
  streak: number;
  /** Date de la première absence de la série. */
  start: string;
  /** Date de la dernière absence de la série. */
  end: string;
};

/** Séance enregistrée d'un membre, pour l'écran de l'alerte. */
export type RecentStatus = {
  sessionId: number;
  date: string;
  startTime: string;
  status: AttendanceStatus;
};

const RECENT_COUNT = 6;

// Périmètre de la série (RM-02) : séances enregistrées de la saison active, groupes archivés ou
// supprimés et appels sans créneau compris. Ordre : date, heure, puis identifiant.
const PERIMETER = `JOIN sessions s ON s.id = a.session_id
  JOIN seasons se ON se.id = s.season_id
  WHERE se.is_active = 1 AND s.state = 'recorded'`;

// Plan point 2 : membre non archivé, inscrit aujourd'hui (?1) à un groupe non archivé de la saison
// active. ?2 : un seul membre, ou NULL pour tous.
const ELIGIBLE = `m.archived_at IS NULL AND (?2 IS NULL OR m.id = ?2) AND EXISTS (
  SELECT 1 FROM enrollments e JOIN groups g ON g.id = e.group_id
  JOIN seasons ge ON ge.id = g.season_id
  WHERE e.member_id = m.id AND ge.is_active = 1 AND g.archived_at IS NULL AND ${current(1)})`;

// Groupe affiché, calculé sur la séance la plus récente seulement (rn = 1) : groupe de la séance où
// le membre était inscrit ce jour-là (début inclus, fin exclue) ; sinon l'unique groupe de la
// séance ; sinon son inscription courante.
const GROUP_NAME = `COALESCE(
  (SELECT g.name FROM session_groups sg JOIN groups g ON g.id = sg.group_id
     JOIN enrollments e ON e.group_id = sg.group_id AND e.member_id = r.member_id
     WHERE sg.session_id = r.session_id AND e.start_date <= r.date
       AND (e.end_date IS NULL OR e.end_date > r.date)
     ORDER BY g.id LIMIT 1),
  (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(g.name) END FROM session_groups sg
     JOIN groups g ON g.id = sg.group_id WHERE sg.session_id = r.session_id),
  (SELECT g.name FROM enrollments e JOIN groups g ON g.id = e.group_id
     JOIN seasons ge ON ge.id = g.season_id
     WHERE e.member_id = r.member_id AND ge.is_active = 1 AND g.archived_at IS NULL AND ${current(1)}
     ORDER BY e.id LIMIT 1))`;

// NF-08 : une seule requête pour tous les membres ; groupe et traitements sur la ligne rn = 1.
const STATUSES = `WITH r AS (
  SELECT a.member_id, s.id AS session_id, s.date, s.start_time, a.status,
    m.last_name, m.first_name,
    ROW_NUMBER() OVER (
      PARTITION BY a.member_id ORDER BY s.date DESC, s.start_time DESC, s.id DESC) AS rn
  FROM attendances a JOIN members m ON m.id = a.member_id ${PERIMETER} AND ${ELIGIBLE}
)
SELECT r.member_id, r.date, r.status, r.last_name, r.first_name,
  CASE WHEN r.rn = 1 THEN ${GROUP_NAME} END AS group_name,
  CASE WHEN r.rn = 1 THEN (SELECT group_concat(k.streak_length || ':' || k.acked_at)
    FROM alert_acks k WHERE k.member_id = r.member_id) END AS acks
FROM r ORDER BY r.member_id, r.date, r.start_time, r.session_id`;

type StatusRow = {
  member_id: number;
  date: string;
  status: AttendanceStatus;
  last_name: string;
  first_name: string;
  group_name: string | null;
  acks: string | null;
};

/** `alert_acks` agrégés « longueur:date,… » (valeurs garanties par les contraintes du schéma). */
const parseAcks = (acks: string | null): AlertAck[] =>
  (acks ?? '')
    .split(',')
    .filter((item) => item !== '')
    .map((item) => {
      const [length, date] = item.split(':');
      return { streakLength: Number(length), ackedAt: date ?? '' };
    });

const collator = new Intl.Collator('fr', { sensitivity: 'base' });
const byStreakThenName = (a: AttendanceAlert, b: AttendanceAlert) =>
  b.streak - a.streak ||
  collator.compare(a.lastName, b.lastName) ||
  collator.compare(a.firstName, b.firstName) ||
  a.memberId - b.memberId;

/** Regroupe les lignes par membre (déjà triées) et garde les alertes montrées. */
const toAlerts = (rows: StatusRow[], threshold: number): AttendanceAlert[] => {
  const byMember = new Map<number, StatusRow[]>();
  for (const row of rows) {
    const list = byMember.get(row.member_id);
    if (list) list.push(row);
    else byMember.set(row.member_id, [row]);
  }
  const alerts: AttendanceAlert[] = [];
  for (const [memberId, list] of byMember) {
    const streak = currentStreak(list);
    const latest = list[list.length - 1] as StatusRow;
    if (!isAlertShown({ streak, threshold, acks: parseAcks(latest.acks) })) continue;
    alerts.push({
      memberId,
      firstName: latest.first_name,
      lastName: latest.last_name,
      groupName: latest.group_name ?? '',
      streak: streak.length,
      start: streak.start ?? '',
      end: streak.end ?? '',
    });
  }
  return alerts.sort(byStreakThenName);
};

const memberStatuses = (db: Db, memberId: number, order: 'ASC' | 'DESC', limit: number) =>
  db.query<{ session_id: number; date: string; start_time: string; status: AttendanceStatus }>(
    `SELECT s.id AS session_id, s.date, s.start_time, a.status FROM attendances a ${PERIMETER}
     AND a.member_id = ?
     ORDER BY s.date ${order}, s.start_time ${order}, s.id ${order} LIMIT ?`,
    [memberId, limit],
  );

export const alertsRepo = (db: Db) => {
  const read = async (today: string, memberId: number | null, threshold: number) =>
    toAlerts(await db.query<StatusRow>(STATUSES, [validateDate(today), memberId]), threshold);

  return {
    /** EX-25 : alertes du jour, série la plus longue d'abord, puis nom et prénom. */
    list: (today: string, threshold: number): Promise<AttendanceAlert[]> =>
      read(today, null, threshold),

    /** Alerte d'un membre, ou null s'il n'en a pas (écran de l'alerte, ticket 022). */
    get: async (memberId: number, today: string, threshold: number) =>
      (await read(today, memberId, threshold))[0] ?? null,

    /** Dernières séances du membre (même périmètre que la série), la plus récente d'abord. */
    recentStatuses: async (memberId: number): Promise<RecentStatus[]> =>
      (await memberStatuses(db, memberId, 'DESC', RECENT_COUNT)).map((r) => ({
        sessionId: r.session_id,
        date: r.date,
        startTime: r.start_time,
        status: r.status,
      })),

    /**
     * EX-26 : traite la série de cette longueur. Date : la plus tardive entre aujourd'hui et la
     * dernière absence de la série (une séance datée après aujourd'hui reste couverte).
     */
    acknowledge: async (memberId: number, streakLength: number, today: string): Promise<void> => {
      if (!Number.isInteger(streakLength) || streakLength < 1)
        throw new RangeError('Longueur de série invalide');
      const date = validateDate(today);
      await db.transaction(async (tx) => {
        expectFound((await tx.query('SELECT id FROM members WHERE id = ?', [memberId]))[0]);
        const end = currentStreak(await memberStatuses(tx, memberId, 'ASC', -1)).end;
        await tx.execute(
          `INSERT INTO alert_acks (member_id, streak_length, acked_at) VALUES (?, ?, ?)
           ON CONFLICT (member_id, streak_length) DO UPDATE SET acked_at = MAX(acked_at, excluded.acked_at)`,
          [memberId, streakLength, end !== null && end > date ? end : date],
        );
      });
    },
  };
};
