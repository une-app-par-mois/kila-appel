// Dépôt des inscriptions (EX-04). Inscrit du début (inclus) à la fin (exclue) : la date de fin est
// le premier jour sans le membre (décision du porteur du 2026-11-26). Requêtes paramétrées.
import type { Db } from '@/data/db';
import { DataError, expectChanged } from '@/data/errors';
import { InputError, validateDate } from '@/domain/validation';

/** `endDate` : premier jour sans le membre, ou `null` (aucun retrait prévu). */
export type GroupEnrollment = {
  enrollmentId: number;
  memberId: number;
  firstName: string;
  lastName: string;
  startDate: string;
  endDate: string | null;
};

export type MemberEnrollment = {
  enrollmentId: number;
  groupId: number;
  groupName: string;
  startDate: string;
  endDate: string | null;
};

type GroupEnrollmentRow = {
  enrollment_id: number;
  member_id: number;
  first_name: string;
  last_name: string;
  start_date: string;
  end_date: string | null;
};

const toGroupEnrollment = (r: GroupEnrollmentRow): GroupEnrollment => ({
  enrollmentId: r.enrollment_id,
  memberId: r.member_id,
  firstName: r.first_name,
  lastName: r.last_name,
  startDate: r.start_date,
  endDate: r.end_date,
});

const GROUP_ENROLLMENT_COLUMNS =
  'e.id AS enrollment_id, m.id AS member_id, m.first_name, m.last_name, e.start_date, e.end_date';

export type Candidate = { id: number; firstName: string; lastName: string };

const collator = new Intl.Collator('fr', { sensitivity: 'base' });
const byName = (a: Candidate | GroupEnrollment, b: Candidate | GroupEnrollment) =>
  collator.compare(a.lastName, b.lastName) || collator.compare(a.firstName, b.firstName);

/** Inscription en cours à la date du paramètre `?n` : commencée, et fin absente ou après (RM-03). */
export const current = (n: number) =>
  `(e.start_date <= ?${n} AND (e.end_date IS NULL OR e.end_date > ?${n}))`;

/** Période non vide : une fin le jour même du début (retrait le premier jour) ne compte nulle part. */
const NOT_EMPTY = '(e.end_date IS NULL OR e.end_date > e.start_date)';

/** Inscription qui n'est pas finie à la date `?n` (en cours ou à venir). */
export const notEnded = (n: number) =>
  `((e.end_date IS NULL OR e.end_date > ?${n}) AND ${NOT_EMPTY})`;

/**
 * Groupe où l'on peut inscrire (non archivé, saison active) et membre courant ; sinon NOT_FOUND.
 * Appelé dans la transaction de l'écriture.
 */
export const expectEnrollable = async (
  tx: Db,
  groupId: number,
  memberId: number | null,
  startDate: string,
) => {
  const [group] = await tx.query<{ start_date: string; end_date: string }>(
    `SELECT s.start_date, s.end_date FROM groups g JOIN seasons s ON s.id = g.season_id
     WHERE g.id = ? AND g.archived_at IS NULL AND s.is_active = 1`,
    [groupId],
  );
  if (!group) throw new DataError('NOT_FOUND');
  // EX-04 (ticket 007e) : début dans les dates de la saison, dernier jour compris.
  if (startDate < group.start_date || startDate > group.end_date)
    throw new InputError('DATE_OUTSIDE_SEASON');
  if (memberId === null) return;
  const [member] = await tx.query<{ id: number }>(
    'SELECT id FROM members WHERE id = ? AND archived_at IS NULL',
    [memberId],
  );
  if (!member) throw new DataError('NOT_FOUND');
};

export const enrollmentsRepo = (db: Db) => ({
  /** Membres courants inscrits au groupe à `today`, triés par nom. */
  listByGroup: async (groupId: number, today: string): Promise<GroupEnrollment[]> =>
    (
      await db.query<GroupEnrollmentRow>(
        `SELECT ${GROUP_ENROLLMENT_COLUMNS}
         FROM enrollments e JOIN members m ON m.id = e.member_id
         WHERE e.group_id = ?1 AND m.archived_at IS NULL AND ${current(2)}
         ORDER BY e.id`,
        [groupId, validateDate(today)],
      )
    )
      .map(toGroupEnrollment)
      .sort(byName),

  /** Inscriptions qui commencent après `today` (section « À venir », décision du 2026-11-26). */
  listUpcomingByGroup: async (groupId: number, today: string): Promise<GroupEnrollment[]> =>
    (
      await db.query<GroupEnrollmentRow>(
        `SELECT ${GROUP_ENROLLMENT_COLUMNS}
         FROM enrollments e JOIN members m ON m.id = e.member_id
         WHERE e.group_id = ?1 AND m.archived_at IS NULL AND e.start_date > ?2 AND ${NOT_EMPTY}
         ORDER BY e.start_date, e.id`,
        [groupId, validateDate(today)],
      )
    ).map(toGroupEnrollment),

  /** Groupes du membre en cours ou à venir, saison active, non archivés ; triés par nom. */
  listByMember: async (memberId: number, today: string): Promise<MemberEnrollment[]> =>
    (
      await db.query<{
        enrollment_id: number;
        group_id: number;
        name: string;
        start_date: string;
        end_date: string | null;
      }>(
        `SELECT e.id AS enrollment_id, g.id AS group_id, g.name, e.start_date, e.end_date
         FROM enrollments e
         JOIN groups g ON g.id = e.group_id
         JOIN seasons s ON s.id = g.season_id
         WHERE e.member_id = ?1 AND s.is_active = 1 AND g.archived_at IS NULL AND ${notEnded(2)}
         ORDER BY e.id`,
        [memberId, validateDate(today)],
      )
    )
      .map((r) => ({
        enrollmentId: r.enrollment_id,
        groupId: r.group_id,
        groupName: r.name,
        startDate: r.start_date,
        endDate: r.end_date,
      }))
      .sort((a, b) => collator.compare(a.groupName, b.groupName)),

  /** Membres courants sans inscription au groupe en cours ou à venir à `today`. */
  candidates: async (groupId: number, today: string): Promise<Candidate[]> =>
    (
      await db.query<{ id: number; first_name: string; last_name: string }>(
        `SELECT id, first_name, last_name FROM members m
         WHERE m.archived_at IS NULL AND NOT EXISTS (
           SELECT 1 FROM enrollments e WHERE e.member_id = m.id AND e.group_id = ?1 AND ${notEnded(2)})
         ORDER BY id`,
        [groupId, validateDate(today)],
      )
    )
      .map((r) => ({ id: r.id, firstName: r.first_name, lastName: r.last_name }))
      .sort(byName),

  /**
   * EX-04 : inscrit tous les membres à `startDate`, ou aucun. Refus si une inscription du membre au
   * groupe n'est pas finie à cette date : les périodes d'un membre dans un groupe ne se chevauchent pas.
   */
  enroll: async (groupId: number, memberIds: number[], startDate: string): Promise<void> => {
    validateDate(startDate);
    await db.transaction(async (tx) => {
      for (const memberId of memberIds) {
        await expectEnrollable(tx, groupId, memberId, startDate);
        const [taken] = await tx.query<{ id: number }>(
          `SELECT id FROM enrollments e WHERE e.member_id = ?1 AND e.group_id = ?2 AND ${notEnded(3)}`,
          [memberId, groupId, startDate],
        );
        if (taken) throw new DataError('ALREADY_ENROLLED');
        await tx.execute(
          'INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)',
          [memberId, groupId, startDate],
        );
      }
    });
  },

  /** EX-04 : pose la date de fin (premier jour sans le membre) ; présences conservées. */
  withdraw: async (enrollmentId: number, endDate: string): Promise<void> => {
    validateDate(endDate);
    await db.transaction(async (tx) => {
      const [row] = await tx.query<{ start_date: string }>(
        'SELECT start_date FROM enrollments WHERE id = ? AND end_date IS NULL',
        [enrollmentId],
      );
      if (!row) throw new DataError('NOT_FOUND');
      if (endDate < row.start_date) throw new InputError('END_BEFORE_START');
      await tx.execute('UPDATE enrollments SET end_date = ? WHERE id = ?', [endDate, enrollmentId]);
    });
  },

  /**
   * Annule une inscription qui n'a pas commencé (après `today`) : elle est effacée, il n'a jamais
   * été dans le groupe (décision du porteur du 2026-11-26). Commencée ou introuvable : NOT_FOUND.
   */
  cancel: async (enrollmentId: number, today: string): Promise<void> => {
    expectChanged(
      await db.execute('DELETE FROM enrollments WHERE id = ? AND start_date > ?', [
        enrollmentId,
        validateDate(today),
      ]),
    );
  },
});
