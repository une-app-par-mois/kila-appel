// Dépôt des séances enregistrées (EX-15, ADR-004 : une ligne n'existe qu'une fois l'appel fait).
// Requêtes paramétrées seulement. Le brouillon (ticket 011) n'est jamais lu ici.
import type { Db } from '@/data/db';
import { current } from '@/data/enrollmentsRepo';
import { DataError } from '@/data/errors';
import { slotDates, type WeeklySlot } from '@/domain/occurrences';
import {
  InputError,
  type RollCallInput,
  validateDate,
  validateRollCall,
} from '@/domain/validation';

export type RollCall = RollCallInput;

/** `today` : jour de l'appareil ; une séance de créneau n'est jamais future (décision du 2026-11-27). */
export const sessionsRepo = (db: Db, today: string) => ({
  /**
   * EX-15 : enregistre la séance, son groupe figé et une présence par membre, d'un bloc ; rend son
   * identifiant. Groupe de la saison active, date dans la saison, créneau lié au groupe, une
   * séance par créneau et par date (RM-05), membres inscrits au groupe à la date (RM-03). Une
   * séance de créneau en est une vraie : bon jour, bonne heure, pas future (EX-17, ticket 005).
   */
  record: async (input: RollCall): Promise<number> => {
    const call = validateRollCall(input);
    validateDate(today);
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
        const [slot] = await tx.query<{
          weekday: WeeklySlot['weekday'];
          start_time: string;
          schedule_from: string;
        }>(
          `SELECT s.weekday, s.start_time, s.schedule_from FROM slots s
           JOIN slot_groups sg ON sg.slot_id = s.id
           WHERE s.id = ? AND s.season_id = ? AND sg.group_id = ? AND s.weekday IS NOT NULL`,
          [call.slotId, group.season_id, call.groupId],
        );
        if (!slot) throw new DataError('NOT_FOUND');
        const weekly: WeeklySlot = {
          id: call.slotId,
          weekday: slot.weekday,
          startTime: slot.start_time,
          durationMin: 1,
          scheduleFrom: slot.schedule_from,
        };
        const season = { startDate: group.start_date, endDate: group.end_date };
        const last = today < call.date ? today : call.date;
        if (
          call.startTime !== slot.start_time ||
          slotDates(weekly, season, call.date, last)[0] !== call.date
        )
          throw new DataError('NOT_A_SLOT_SESSION');
        const [taken] = await tx.query<{ id: number }>(
          'SELECT id FROM sessions WHERE slot_id = ? AND date = ?',
          [call.slotId, call.date],
        );
        if (taken) throw new DataError('ALREADY_RECORDED');
      }
      // RM-03 : tous les membres de la liste inscrits au groupe à la date, en une requête.
      const ids = call.statuses.map((x) => x.memberId);
      if (ids.length > 0) {
        const [row] = await tx.query<{ n: number }>(
          `SELECT COUNT(DISTINCT e.member_id) AS n FROM enrollments e
           JOIN members m ON m.id = e.member_id
           WHERE e.group_id = ?1 AND m.archived_at IS NULL AND ${current(2)}
             AND e.member_id IN (${ids.map((_, i) => `?${i + 3}`).join(', ')})`,
          [call.groupId, call.date, ...ids],
        );
        if (row?.n !== ids.length) throw new DataError('NOT_ENROLLED');
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
