// Dépôt des inscriptions (EX-04). Inscrit du début (inclus) à la fin (exclue) : la date de fin est
// le premier jour sans le membre (décision du porteur du 2026-11-26). Requêtes paramétrées.
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { InputError, validateDate } from '@/domain/validation';

export type GroupEnrollment = {
  enrollmentId: number;
  memberId: number;
  firstName: string;
  lastName: string;
  startDate: string;
};

export type MemberEnrollment = {
  enrollmentId: number;
  groupId: number;
  groupName: string;
  startDate: string;
};

export type Candidate = { id: number; firstName: string; lastName: string };

const collator = new Intl.Collator('fr', { sensitivity: 'base' });
const byName = (a: Candidate | GroupEnrollment, b: Candidate | GroupEnrollment) =>
  collator.compare(a.lastName, b.lastName) || collator.compare(a.firstName, b.firstName);

/** Inscription en cours à la date `?` : fin absente, ou fin après cette date. */
const CURRENT = '(e.end_date IS NULL OR e.end_date > ?)';

export const enrollmentsRepo = (db: Db) => ({
  /** Membres courants inscrits au groupe à `today`, triés par nom. */
  listByGroup: async (groupId: number, today: string): Promise<GroupEnrollment[]> =>
    (
      await db.query<{
        enrollment_id: number;
        member_id: number;
        first_name: string;
        last_name: string;
        start_date: string;
      }>(
        `SELECT e.id AS enrollment_id, m.id AS member_id, m.first_name, m.last_name, e.start_date
         FROM enrollments e JOIN members m ON m.id = e.member_id
         WHERE e.group_id = ? AND m.archived_at IS NULL AND ${CURRENT}
         ORDER BY e.id`,
        [groupId, validateDate(today)],
      )
    )
      .map((r) => ({
        enrollmentId: r.enrollment_id,
        memberId: r.member_id,
        firstName: r.first_name,
        lastName: r.last_name,
        startDate: r.start_date,
      }))
      .sort(byName),

  /** Groupes en cours du membre dans la saison active (non archivés), triés par nom. */
  listByMember: async (memberId: number, today: string): Promise<MemberEnrollment[]> =>
    (
      await db.query<{ enrollment_id: number; group_id: number; name: string; start_date: string }>(
        `SELECT e.id AS enrollment_id, g.id AS group_id, g.name, e.start_date
         FROM enrollments e
         JOIN groups g ON g.id = e.group_id
         JOIN seasons s ON s.id = g.season_id
         WHERE e.member_id = ? AND s.is_active = 1 AND g.archived_at IS NULL AND ${CURRENT}
         ORDER BY e.id`,
        [memberId, validateDate(today)],
      )
    )
      .map((r) => ({
        enrollmentId: r.enrollment_id,
        groupId: r.group_id,
        groupName: r.name,
        startDate: r.start_date,
      }))
      .sort((a, b) => collator.compare(a.groupName, b.groupName)),

  /** Membres courants qui ne sont pas inscrits au groupe à `today`. */
  candidates: async (groupId: number, today: string): Promise<Candidate[]> =>
    (
      await db.query<{ id: number; first_name: string; last_name: string }>(
        `SELECT id, first_name, last_name FROM members m
         WHERE m.archived_at IS NULL AND NOT EXISTS (
           SELECT 1 FROM enrollments e WHERE e.member_id = m.id AND e.group_id = ? AND ${CURRENT})
         ORDER BY id`,
        [groupId, validateDate(today)],
      )
    )
      .map((r) => ({ id: r.id, firstName: r.first_name, lastName: r.last_name }))
      .sort(byName),

  /** EX-04 : inscrit tous les membres à `startDate`, ou aucun si l'un est déjà inscrit à cette date. */
  enroll: async (groupId: number, memberIds: number[], startDate: string): Promise<void> => {
    validateDate(startDate);
    await db.transaction(async (tx) => {
      for (const memberId of memberIds) {
        const [taken] = await tx.query<{ id: number }>(
          `SELECT id FROM enrollments e WHERE e.member_id = ? AND e.group_id = ? AND ${CURRENT}`,
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
});
