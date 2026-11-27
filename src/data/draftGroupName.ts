// Appel en cours vu par la restauration (ticket 014e, EX-14, ADR-006 ; décision du porteur du
// 2026-11-27) : son existence et le nom de son groupe, rien d'autre (ni statuts, ni commentaire).
// Seul autre fichier que les dépôts à nommer les tables du brouillon (contrôle de staticChecks).
import type { Db } from '@/data/db';

/** Appel en cours : `groupName` nul si son groupe a été supprimé depuis. */
export type DraftGroup = { groupName: string | null };

/** Le groupe affiché est le premier, comme sur l'écran d'appel ; null : aucun appel. */
export const draftGroupName = async (db: Db): Promise<DraftGroup | null> => {
  const [row] = await db.query<{ group_name: string | null }>(
    `SELECT g.name AS group_name
     FROM roll_call_drafts d
     LEFT JOIN roll_call_draft_groups dg ON dg.draft_id = d.id
     LEFT JOIN groups g ON g.id = dg.group_id
     WHERE d.id = 1 ORDER BY g.id LIMIT 1`,
  );
  return row ? { groupName: row.group_name } : null;
};
