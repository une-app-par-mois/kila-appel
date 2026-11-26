// Dépôt des groupes d'une saison (EX-02). Requêtes paramétrées seulement.
import type { Db } from '@/data/db';
import { expectChanged } from '@/data/seasonsRepo';
import { validateDate, validateName } from '@/domain/validation';

export type Group = { id: number; seasonId: number; name: string; archivedAt: string | null };

/** EX-02 : supprimer un groupe efface ses inscriptions et ses liens ; séances et présences restent. */
export type GroupDeletionImpact = { enrollments: number; slots: number; sessions: number };

type GroupRow = { id: number; season_id: number; name: string; archived_at: string | null };

const toGroup = (row: GroupRow): Group => ({
  id: row.id,
  seasonId: row.season_id,
  name: row.name,
  archivedAt: row.archived_at,
});

export const groupsRepo = (db: Db) => ({
  /** Groupes courants, ou archivés ; triés par nom sans tenir compte de la casse. */
  listBySeason: async (seasonId: number, { archived = false } = {}): Promise<Group[]> =>
    (
      await db.query<GroupRow>(
        `SELECT id, season_id, name, archived_at FROM groups
         WHERE season_id = ? AND (archived_at IS NOT NULL) = ?
         ORDER BY name COLLATE NOCASE, id`,
        [seasonId, archived ? 1 : 0],
      )
    ).map(toGroup),

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
    const [row] = await db.query<GroupDeletionImpact>(
      `SELECT
        (SELECT COUNT(*) FROM enrollments WHERE group_id = ?1) AS enrollments,
        (SELECT COUNT(*) FROM slot_groups WHERE group_id = ?1) AS slots,
        (SELECT COUNT(*) FROM session_groups WHERE group_id = ?1) AS sessions`,
      [id],
    );
    return row ?? { enrollments: 0, slots: 0, sessions: 0 };
  },

  /** ABS-05 : suppression réelle (inscriptions et liens en cascade). */
  remove: async (id: number): Promise<void> => {
    expectChanged(await db.execute('DELETE FROM groups WHERE id = ?', [id]));
  },
});
