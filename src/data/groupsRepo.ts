// Dépôt des groupes d'une saison (EX-02). Requêtes paramétrées seulement.
import type { Db } from '@/data/db';
import { expectChanged, expectFound } from '@/data/errors';
import { validateDate, validateGroupName } from '@/domain/validation';

export type Group = { id: number; seasonId: number; name: string; archivedAt: string | null };

/** EX-02 : supprimer un groupe efface ses inscriptions et ses liens ; séances et présences restent. */
/** `rollCallDraft` : l'appel en cours (brouillon) concerne ce groupe et sera effacé (ticket 011b). */
export type GroupDeletionImpact = {
  enrollments: number;
  slots: number;
  sessions: number;
  rollCallDraft: boolean;
};

/** EX-16 : groupe proposé au filtre de l'Historique, avec sa saison. */
export type HistoryGroup = { id: number; name: string; seasonName: string; activeSeason: boolean };

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

  /**
   * EX-16 : groupes du filtre de l'Historique, archivés compris (ils ont des séances) : ceux d'une
   * saison, ou de toutes (`seasonId` nul), la saison active d'abord, puis les plus récentes. Avec
   * `from` (« 30 derniers jours ») : ceux qui ont une séance enregistrée depuis, plus `include`
   * (groupes des appels manquants).
   */
  listForHistory: async ({
    seasonId,
    from,
    include = [],
  }: {
    seasonId: number | null;
    from: string | null;
    include?: number[];
  }): Promise<HistoryGroup[]> => {
    if (from !== null) validateDate(from);
    const ids = include.filter((id) => Number.isInteger(id));
    const listed = ids.map((_, i) => `?${i + 3}`).join(', ');
    const rows = await db.query<GroupRow & { season_name: string; active: number; rank: number }>(
      `SELECT g.id, g.name, s.name AS season_name, s.is_active AS active,
         DENSE_RANK() OVER (ORDER BY s.is_active DESC, s.start_date DESC, s.id DESC) AS rank
       FROM groups g JOIN seasons s ON s.id = g.season_id
       WHERE (?1 IS NULL OR g.season_id = ?1)
         AND (?2 IS NULL ${ids.length > 0 ? `OR g.id IN (${listed})` : ''}
              OR EXISTS (SELECT 1 FROM session_groups sg JOIN sessions x ON x.id = sg.session_id
                         WHERE sg.group_id = g.id AND x.state = 'recorded' AND x.date >= ?2))`,
      [seasonId, from, ...ids],
    );
    return rows
      .sort((a, b) => a.rank - b.rank || byName.compare(a.name, b.name))
      .map((r) => ({
        id: r.id,
        name: r.name,
        seasonName: r.season_name,
        activeSeason: r.active === 1,
      }));
  },

  /** Ses inscrits, à la date du jour : `enrollmentsRepo.listByGroup` (ticket 007c). */
  get: async (id: number): Promise<Group | null> => {
    const [row] = await db.query<GroupRow>(
      'SELECT id, season_id, name, archived_at FROM groups WHERE id = ?',
      [id],
    );
    return row ? toGroup(row) : null;
  },

  /** SEC-06 : nom refusé s'il est vide ou contient un caractère invisible (ticket 044). */
  create: async (seasonId: number, name: string): Promise<number> =>
    (
      await db.execute('INSERT INTO groups (season_id, name) VALUES (?, ?)', [
        seasonId,
        validateGroupName(name),
      ])
    ).lastInsertRowId,

  rename: async (id: number, name: string): Promise<void> => {
    expectChanged(
      await db.execute('UPDATE groups SET name = ? WHERE id = ?', [validateGroupName(name), id]),
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
