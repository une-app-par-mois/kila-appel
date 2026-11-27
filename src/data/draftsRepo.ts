// Brouillon d'appel (EX-14, ADR-006, zone sensible) : un seul à la fois (id = 1), né au premier
// changement, écrit à chaque appui, effacé à l'enregistrement (sessionsRepo) ou à l'abandon.
// Seul ce dépôt le lit (contrôle de staticChecks) : jamais les statistiques ni l'historique.
// Requêtes paramétrées seulement ; aucun nom dans les erreurs (ABS-04).
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import {
  type AttendanceStatus,
  InputError,
  isAttendanceStatus,
  isId,
  isTime,
  validateComment,
  validateDate,
} from '@/domain/validation';

/** L'appel auquel appartient le brouillon ; `startedAt` : ouverture de l'appel (HH:MM). */
export type DraftTarget = {
  slotId: number | null;
  groupId: number;
  date: string;
  startedAt: string;
};

/**
 * `groupId` nul : groupe supprimé depuis (le brouillon reste, pour pouvoir l'abandonner).
 * `resumable` faux : groupe supprimé ou archivé, retiré du créneau, ou saison plus active ; le
 * brouillon ne peut plus qu'être abandonné (revues du ticket 011).
 */
export type RollCallDraft = {
  slotId: number | null;
  groupId: number | null;
  groupName: string | null;
  date: string;
  startedAt: string;
  comment: string | null;
  statuses: Record<number, AttendanceStatus>;
  resumable: boolean;
};

type DraftRow = {
  slot_id: number | null;
  date: string;
  started_at: string;
  comment: string | null;
  group_id: number | null;
  group_name: string | null;
  resumable: number;
};

/** Même appel : même créneau (ou aucun), même date, même groupe. */
export const sameCall = (
  draft: { slotId: number | null; groupId: number | null; date: string },
  target: { slotId: number | null; groupId: number; date: string },
) =>
  draft.slotId === target.slotId && draft.date === target.date && draft.groupId === target.groupId;

export const draftsRepo = (db: Db) => {
  const read = async (tx: Db): Promise<RollCallDraft | null> => {
    const [row] = await tx.query<DraftRow>(
      `SELECT d.slot_id, d.date, d.started_at, d.comment, g.id AS group_id, g.name AS group_name,
         (g.id IS NOT NULL AND g.archived_at IS NULL
          AND EXISTS (SELECT 1 FROM seasons se WHERE se.id = d.season_id AND se.is_active = 1)
          AND (d.slot_id IS NULL OR EXISTS (
            SELECT 1 FROM slot_groups sg WHERE sg.slot_id = d.slot_id AND sg.group_id = g.id
          ))) AS resumable
       FROM roll_call_drafts d
       LEFT JOIN roll_call_draft_groups dg ON dg.draft_id = d.id
       LEFT JOIN groups g ON g.id = dg.group_id
       WHERE d.id = 1 ORDER BY g.id LIMIT 1`,
    );
    if (!row) return null;
    const statuses: Record<number, AttendanceStatus> = {};
    for (const { member_id, status } of await tx.query<{ member_id: number; status: string }>(
      'SELECT member_id, status FROM roll_call_draft_statuses WHERE draft_id = 1',
    )) {
      if (isAttendanceStatus(status)) statuses[member_id] = status;
    }
    return {
      slotId: row.slot_id,
      groupId: row.group_id,
      groupName: row.group_name,
      date: row.date,
      startedAt: row.started_at,
      comment: row.comment,
      statuses,
      resumable: row.resumable === 1,
    };
  };

  /** Le brouillon de cet appel, créé s'il n'existe pas ; celui d'un autre appel est refusé. */
  const ensure = async (tx: Db, target: DraftTarget, now: string) => {
    validateDate(target.date);
    if (!isTime(target.startedAt)) throw new InputError('TIME_INVALID');
    if (!isId(target.groupId) || (target.slotId !== null && !isId(target.slotId)))
      throw new DataError('NOT_FOUND');
    const existing = await read(tx);
    if (existing) {
      if (!sameCall(existing, target)) throw new DataError('DRAFT_IN_PROGRESS');
      await tx.execute('UPDATE roll_call_drafts SET updated_at = ? WHERE id = 1', [now]);
      return;
    }
    const [group] = await tx.query<{ season_id: number }>(
      'SELECT season_id FROM groups WHERE id = ?',
      [target.groupId],
    );
    if (!group) throw new DataError('NOT_FOUND');
    await tx.execute(
      `INSERT INTO roll_call_drafts (id, season_id, slot_id, date, started_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?)`,
      [group.season_id, target.slotId, target.date, target.startedAt, now],
    );
    await tx.execute('INSERT INTO roll_call_draft_groups (draft_id, group_id) VALUES (1, ?)', [
      target.groupId,
    ]);
  };

  return {
    get: (): Promise<RollCallDraft | null> => read(db),

    /** EX-14 : statut d'un membre, écrit aussitôt (le brouillon naît au premier changement). */
    setStatus: async (
      target: DraftTarget,
      memberId: number,
      status: AttendanceStatus,
      now: string,
    ): Promise<void> => {
      if (!isId(memberId) || !isAttendanceStatus(status)) throw new InputError('STATUS_INVALID');
      await db.transaction(async (tx) => {
        await ensure(tx, target, now);
        await tx.execute(
          `INSERT INTO roll_call_draft_statuses (draft_id, member_id, status) VALUES (1, ?, ?)
           ON CONFLICT (draft_id, member_id) DO UPDATE SET status = excluded.status`,
          [memberId, status],
        );
      });
    },

    /** EX-13 EX-14 : commentaire de la séance, écrit aussitôt (nettoyé, 500 caractères au plus). */
    setComment: async (target: DraftTarget, text: string, now: string): Promise<void> => {
      const comment = validateComment(text);
      await db.transaction(async (tx) => {
        // Un commentaire vide ne fait pas naître de brouillon (revue du ticket 011).
        if (comment === null && !(await read(tx))) return;
        await ensure(tx, target, now);
        await tx.execute('UPDATE roll_call_drafts SET comment = ? WHERE id = 1', [comment]);
      });
    },

    /** EX-14 : abandon confirmé ; groupes et statuts partent avec lui (ABS-05). */
    discard: async (): Promise<void> => {
      await db.execute('DELETE FROM roll_call_drafts WHERE id = 1');
    },
  };
};
