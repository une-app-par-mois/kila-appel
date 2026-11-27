// Dépôt des séances enregistrées (EX-15, ADR-004 : une ligne n'existe qu'une fois l'appel fait).
// Requêtes paramétrées seulement. Le brouillon (ticket 011) n'est jamais lu ici.
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { InputError, type RollCallInput, validateRollCall } from '@/domain/validation';

export type RollCall = RollCallInput;

/** RM-03 : inscription en cours à la date (début compris, fin exclue), comme `current()`. */
const ENROLLED_ON = `EXISTS (SELECT 1 FROM enrollments e JOIN members m ON m.id = e.member_id
  WHERE e.member_id = ?1 AND e.group_id = ?2 AND m.archived_at IS NULL
    AND e.start_date <= ?3 AND (e.end_date IS NULL OR e.end_date > ?3))`;

export const sessionsRepo = (db: Db) => ({
  /**
   * EX-15 : enregistre la séance, son groupe figé et une présence par membre, d'un bloc ; rend son
   * identifiant. Groupe de la saison active, date dans la saison, créneau lié au groupe, une
   * séance par créneau et par date (RM-05), membres inscrits au groupe à la date (RM-03).
   */
  record: async (input: RollCall): Promise<number> => {
    const call = validateRollCall(input);
    return db.transaction(async (tx) => {
      const [group] = await tx.query<{ season_id: number; start_date: string; end_date: string }>(
        `SELECT g.season_id, s.start_date, s.end_date FROM groups g
         JOIN seasons s ON s.id = g.season_id
         WHERE g.id = ? AND g.archived_at IS NULL AND s.is_active = 1`,
        [call.groupId],
      );
      if (!group) throw new DataError('NOT_FOUND');
      if (call.date < group.start_date || call.date > group.end_date)
        throw new InputError('DATE_OUTSIDE_SEASON');
      if (call.slotId !== null) {
        const [slot] = await tx.query<{ id: number }>(
          `SELECT s.id FROM slots s JOIN slot_groups sg ON sg.slot_id = s.id
           WHERE s.id = ? AND s.season_id = ? AND sg.group_id = ?`,
          [call.slotId, group.season_id, call.groupId],
        );
        if (!slot) throw new DataError('NOT_FOUND');
        const [taken] = await tx.query<{ id: number }>(
          'SELECT id FROM sessions WHERE slot_id = ? AND date = ?',
          [call.slotId, call.date],
        );
        if (taken) throw new DataError('ALREADY_RECORDED');
      }
      for (const { memberId } of call.statuses) {
        const [row] = await tx.query<{ ok: number }>(`SELECT ${ENROLLED_ON} AS ok`, [
          memberId,
          call.groupId,
          call.date,
        ]);
        if (!row?.ok) throw new DataError('NOT_ENROLLED');
      }
      const { lastInsertRowId: id } = await tx.execute(
        `INSERT INTO sessions (season_id, slot_id, date, start_time, state, comment)
         VALUES (?, ?, ?, ?, 'recorded', ?)`,
        [group.season_id, call.slotId, call.date, call.startTime, call.comment],
      );
      await tx.execute('INSERT INTO session_groups (session_id, group_id) VALUES (?, ?)', [
        id,
        call.groupId,
      ]);
      for (const { memberId, status } of call.statuses) {
        await tx.execute(
          'INSERT INTO attendances (session_id, member_id, status) VALUES (?, ?, ?)',
          [id, memberId, status],
        );
      }
      return id;
    });
  },

  /** RM-05 : une séance existe déjà pour ce créneau à cette date (l'écran le dit avant l'appel). */
  isRecorded: async (slotId: number, date: string): Promise<boolean> =>
    (
      await db.query<{ id: number }>('SELECT id FROM sessions WHERE slot_id = ? AND date = ?', [
        slotId,
        date,
      ])
    ).length > 0,
});
