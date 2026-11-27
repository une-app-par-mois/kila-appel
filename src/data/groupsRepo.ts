// Dépôt des groupes d'une saison (EX-02). Requêtes paramétrées seulement.
import type { Db } from '@/data/db';
import { expectChanged, expectFound } from '@/data/errors';
import { validateDate, validateName } from '@/domain/validation';

export type Group = { id: number; seasonId: number; name: string; archivedAt: string | null };

/** EX-02 : supprimer un groupe efface ses inscriptions et ses liens ; séances et présences restent. */
/** `rollCallDraft` : l'appel en cours (brouillon) concerne ce groupe et sera effacé (ticket 011b). */
export type GroupDeletionImpact = {
  enrollments: number;
  slots: number;
  sessions: number;
  rollCallDraft: boolean;
};

const byName = new Intl.Collator('fr', { sensitivity: 'base' });

type GroupRow = { id: number; season_id: number; name: string; archived_at: string | null };

const toGroup = (row: GroupRow): Group => ({
  id: row.id,
  seasonId: row.season_id,
  name: row.name,
  archivedAt: row.archived_at,
});

export const groupsRepo = (db: Db) => ({
  /** Groupes courants, ou archivés ; triés à la française, sans tenir compte des accents ni de la casse. */
  listBySeason: async (seasonId: number, { archived = false } = {}): Promise<Group[]> =>
    (
      await db.query<GroupRow>(
        `SELECT id, season_id, name, archived_at FROM groups
         WHERE season_id = ? AND (archived_at IS NOT NULL) = ?
         ORDER BY id`,
        [seasonId, archived ? 1 : 0],
      )
    )
      .map(toGroup)
      .sort((a, b) => byName.compare(a.name, b.name)),

  /** Ses inscrits, à la date du jour : `enrollmentsRepo.listByGroup` (ticket 007c). */
  get: async (id: number): Promise<Group | null> => {
    const [row] = await db.query<GroupRow>(
      'SELECT id, season_id, name, archived_at FROM groups WHERE id = ?',
      [id],
    );
    return row ? toGroup(row) : null;
  },

  create: async (seasonId: number, name: string): Promise<number> =>
    (
      await db.execute('INSERT INTO groups (season_id, name) VALUES (?, ?)', [
        seasonId,
        validateName(name),
      ])
    ).lastInsertRowId,

  rename: async (id: number, name: string): Promise<void> => {
    expectChanged(
      await db.execute('UPDATE groups SET name = ? WHERE id = ?', [validateName(name), id]),
    );
  },

  /** EX-02 : disparaît des écrans courants ; la date est passée par l'appelant (CONV-11). */
  archive: async (id: number, today: string): Promise<void> => {
    expectChanged(
      await db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', [validateDate(today), id]),
    );
  },

  unarchive: async (id: number): Promise<void> => {
    expectChanged(await db.execute('UPDATE groups SET archived_at = NULL WHERE id = ?', [id]));
  },

  deletionImpact: async (id: number): Promise<GroupDeletionImpact> => {
    const [row] = await db.query<Omit<GroupDeletionImpact, 'rollCallDraft'> & { drafts: number }>(
      `SELECT
        (SELECT COUNT(*) FROM enrollments WHERE group_id = ?1) AS enrollments,
        (SELECT COUNT(*) FROM slot_groups WHERE group_id = ?1) AS slots,
        (SELECT COUNT(*) FROM session_groups WHERE group_id = ?1) AS sessions,
        (SELECT COUNT(*) FROM roll_call_draft_groups WHERE group_id = ?1) AS drafts
      FROM groups WHERE id = ?1`,
      [id],
    );
    const { drafts, ...counts } = expectFound(row);
    return { ...counts, rollCallDraft: drafts > 0 };
  },

  /**
   * ABS-05 : suppression réelle (inscriptions et liens en cascade). L'appel en cours de ce groupe
   * part avec lui : il ne pourrait plus qu'être abandonné (décision du porteur du 2026-11-27).
   */
  remove: async (id: number): Promise<void> =>
    db.transaction(async (tx) => {
      await tx.execute(
        'DELETE FROM roll_call_drafts WHERE id IN (SELECT draft_id FROM roll_call_draft_groups WHERE group_id = ?)',
        [id],
      );
      expectChanged(await tx.execute('DELETE FROM groups WHERE id = ?', [id]));
    }),
});
