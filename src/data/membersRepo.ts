// Dépôt des membres (EX-03). Requêtes paramétrées seulement ; aucune donnée dans un journal (ABS-04).
import type { Db } from '@/data/db';
import { current, expectEnrollable } from '@/data/enrollmentsRepo';
import { expectChanged, expectFound } from '@/data/errors';
import { foldText } from '@/domain/formats';
import { type MemberInput, validateDate, validateMember } from '@/domain/validation';

export type Member = {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  archivedAt: string | null;
};

/** Ligne de la liste : groupes en cours de la saison active (non archivés). */
export type MemberListItem = Omit<Member, 'birthDate'> & { groups: string[] };

export type MemberFilter = {
  /** Date du jour (CONV-11) : une inscription est en cours si sa fin est absente ou après. */
  today: string;
  archived?: boolean;
  groupId?: number | null;
  /** Nom ou prénom, sans tenir compte des accents ni de la casse. */
  query?: string;
};

/** ABS-05 : supprimer un membre efface ses contacts, ses présences et ses inscriptions. */
export type MemberDeletionImpact = { contacts: number; attendances: number; enrollments: number };

const collator = new Intl.Collator('fr', { sensitivity: 'base' });

type MemberRow = {
  id: number;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  archived_at: string | null;
};

const toMember = (row: MemberRow): Member => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  birthDate: row.birth_date,
  archivedAt: row.archived_at,
});

/** Recherche par nom ou prénom, sans tenir compte des accents ni de la casse. */
export const filterByQuery = <T extends { firstName: string; lastName: string }>(
  members: T[],
  query: string,
): T[] => {
  const wanted = foldText(query.trim());
  if (wanted === '') return members;
  return members.filter(
    (m) =>
      foldText(`${m.firstName} ${m.lastName}`).includes(wanted) ||
      foldText(`${m.lastName} ${m.firstName}`).includes(wanted),
  );
};

export const membersRepo = (db: Db) => ({
  /** Membres courants (ou archivés), triés par nom puis prénom à la française. */
  list: async ({ today, archived = false, groupId = null, query = '' }: MemberFilter) => {
    validateDate(today);
    const rows = await db.query<MemberRow>(
      `SELECT id, first_name, last_name, birth_date, archived_at FROM members
       WHERE (archived_at IS NOT NULL) = ?1
         AND (?2 IS NULL OR EXISTS (
           SELECT 1 FROM enrollments e WHERE e.member_id = members.id AND e.group_id = ?2
             AND ${current(3)}))
       ORDER BY id`,
      [archived ? 1 : 0, groupId, today],
    );
    const groupRows = await db.query<{ member_id: number; name: string }>(
      `SELECT e.member_id, g.name FROM enrollments e
       JOIN groups g ON g.id = e.group_id
       JOIN seasons s ON s.id = g.season_id
       WHERE s.is_active = 1 AND g.archived_at IS NULL AND ${current(1)}`,
      [today],
    );
    const groups = new Map<number, string[]>();
    for (const { member_id, name } of groupRows) {
      groups.set(member_id, [...(groups.get(member_id) ?? []), name]);
    }
    return filterByQuery(
      rows.map(
        (row): MemberListItem => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          archivedAt: row.archived_at,
          groups: (groups.get(row.id) ?? []).sort(collator.compare),
        }),
      ),
      query,
    ).sort(
      (a, b) =>
        collator.compare(a.lastName, b.lastName) || collator.compare(a.firstName, b.firstName),
    );
  },

  get: async (id: number): Promise<Member | null> => {
    const [row] = await db.query<MemberRow>(
      'SELECT id, first_name, last_name, birth_date, archived_at FROM members WHERE id = ?',
      [id],
    );
    return row ? toMember(row) : null;
  },

  /** EX-03 : crée le membre et, si un groupe est choisi, l'y inscrit à `startDate` (par défaut `today`), d'un bloc. */
  create: async (
    input: MemberInput,
    {
      groupId = null,
      today,
      startDate = today,
    }: { groupId?: number | null; today: string; startDate?: string },
  ): Promise<number> => {
    const m = validateMember(input, validateDate(today));
    validateDate(startDate);
    return db.transaction(async (tx) => {
      const { lastInsertRowId: id } = await tx.execute(
        'INSERT INTO members (first_name, last_name, birth_date) VALUES (?, ?, ?)',
        [m.firstName, m.lastName, m.birthDate],
      );
      if (groupId !== null) {
        await expectEnrollable(tx, groupId, null, startDate);
        await tx.execute(
          'INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)',
          [id, groupId, startDate],
        );
      }
      return id;
    });
  },

  update: async (id: number, input: MemberInput, today: string): Promise<void> => {
    const m = validateMember(input, validateDate(today));
    expectChanged(
      await db.execute(
        'UPDATE members SET first_name = ?, last_name = ?, birth_date = ? WHERE id = ?',
        [m.firstName, m.lastName, m.birthDate, id],
      ),
    );
  },

  /** Disparaît des listes et de l'appel ; inscriptions et présences restent. Archivé : date gardée. */
  archive: async (id: number, today: string): Promise<void> => {
    expectChanged(
      await db.execute('UPDATE members SET archived_at = COALESCE(archived_at, ?) WHERE id = ?', [
        validateDate(today),
        id,
      ]),
    );
  },

  unarchive: async (id: number): Promise<void> => {
    expectChanged(await db.execute('UPDATE members SET archived_at = NULL WHERE id = ?', [id]));
  },

  deletionImpact: async (id: number): Promise<MemberDeletionImpact> => {
    const [row] = await db.query<MemberDeletionImpact>(
      `SELECT
        (SELECT COUNT(*) FROM emergency_contacts WHERE member_id = ?1) AS contacts,
        (SELECT COUNT(*) FROM attendances WHERE member_id = ?1) AS attendances,
        (SELECT COUNT(*) FROM enrollments WHERE member_id = ?1) AS enrollments
      FROM members WHERE id = ?1`,
      [id],
    );
    return expectFound(row);
  },

  /** ABS-05 : suppression réelle ; contacts, présences, inscriptions, brouillon en cascade. */
  remove: async (id: number): Promise<void> => {
    expectChanged(await db.execute('DELETE FROM members WHERE id = ?', [id]));
  },
});
