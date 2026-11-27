// Dépôt des séances enregistrées (EX-15, ADR-004 : une ligne n'existe qu'une fois l'appel fait).
// Requêtes paramétrées seulement. Le brouillon (ticket 011) n'est jamais lu ici : seulement
// effacé quand son appel est enregistré.
import type { Db } from '@/data/db';
import { current } from '@/data/enrollmentsRepo';
import { DataError, expectChanged } from '@/data/errors';
import { isIsoDate } from '@/domain/formats';
import { slotDates, type WeeklySlot } from '@/domain/occurrences';
import type { ReminderSession } from '@/domain/reminders';
import {
  type AttendanceStatus,
  InputError,
  isId,
  type MemberStatus,
  type RollCallInput,
  validateComment,
  validateDate,
  validateRollCall,
  validateStatuses,
} from '@/domain/validation';

export type RollCall = RollCallInput;

/** EX-16 : filtres ; `null` = sans filtre (toutes les saisons, tous les groupes, toute date). */
export type HistoryFilter = {
  seasonId: number | null;
  groupId: number | null;
  from: string | null;
};

/** EX-16 : ligne de l'historique ; groupe `null` s'il a été supprimé depuis (EX-02). */
export type HistorySession = {
  id: number;
  date: string;
  startTime: string;
  groupId: number | null;
  groupName: string | null;
  /** RM-01 : Présent + Retard. */
  present: number;
  /** Toutes les présences, Excusé compris (décision du 2026-11-27). */
  total: number;
};

export type SessionAttendance = {
  memberId: number;
  firstName: string;
  lastName: string;
  status: AttendanceStatus;
};

/** EX-18 : séance enregistrée et ses présences, membres archivés compris. */
export type SessionDetail = {
  id: number;
  seasonId: number;
  slotId: number | null;
  date: string;
  startTime: string;
  groupName: string | null;
  comment: string | null;
  attendances: SessionAttendance[];
};

/** EX-18 : statuts corrigés (membres de la séance seulement) et commentaire. */
export type Correction = { statuses: MemberStatus[]; comment: string | null };

// Lot 1 : un groupe par séance ; plusieurs (F-11) : le plus ancien donne le nom.
const GROUP_OF_SESSION =
  'LEFT JOIN groups g ON g.id = (SELECT MIN(sg.group_id) FROM session_groups sg WHERE sg.session_id = s.id)';
const collator = new Intl.Collator('fr', { sensitivity: 'base' });
const checkId = (id: number | null) => {
  if (id !== null && !isId(id)) throw new DataError('NOT_FOUND');
};

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
      // EX-39 : un appel sans créneau n'est jamais futur non plus (décision du 2026-11-27).
      if (call.slotId === null && call.date > today) throw new InputError('DATE_IN_FUTURE');
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
      // EX-14 : le brouillon de cet appel disparaît dans la même écriture (jamais un autre).
      await tx.execute(
        `DELETE FROM roll_call_drafts WHERE id = 1 AND slot_id IS ? AND date = ?
           AND EXISTS (SELECT 1 FROM roll_call_draft_groups WHERE draft_id = 1 AND group_id = ?)`,
        [call.slotId, call.date, call.groupId],
      );
      return id;
    });
  },

  /** EX-39 : un appel du groupe est déjà enregistré ce jour-là, avec ou sans créneau. */
  isGroupRecorded: async (groupId: number, date: string): Promise<boolean> =>
    (
      await db.query<{ id: number }>(
        `SELECT s.id FROM sessions s JOIN session_groups sg ON sg.session_id = s.id
         WHERE sg.group_id = ? AND s.date = ? AND s.state = 'recorded'`,
        [groupId, date],
      )
    ).length > 0,

  /** RM-05 : une séance existe déjà pour ce créneau à cette date (l'écran le dit avant l'appel). */
  isRecorded: async (slotId: number, date: string): Promise<boolean> =>
    (
      await db.query<{ id: number }>('SELECT id FROM sessions WHERE slot_id = ? AND date = ?', [
        slotId,
        date,
      ])
    ).length > 0,

  /** EX-17 : séances des créneaux de la saison (créneau, date) ; une seule par créneau et date (RM-05). */
  slotSessions: async (seasonId: number): Promise<{ slotId: number; date: string }[]> =>
    db.query<{ slotId: number; date: string }>(
      'SELECT slot_id AS slotId, date FROM sessions WHERE season_id = ? AND slot_id IS NOT NULL ORDER BY date',
      [seasonId],
    ),

  /**
   * EX-28, EX-36, EX-38 : séances des créneaux de la saison avec leur état, futures comprises ;
   * `plannedReminders` en déduit les relances dues. Sans les appels sans créneau (EX-39).
   */
  reminderSessions: async (seasonId: number): Promise<ReminderSession[]> =>
    db.query<ReminderSession>(
      `SELECT slot_id AS slotId, date, state FROM sessions
       WHERE season_id = ? AND slot_id IS NOT NULL ORDER BY date`,
      [seasonId],
    ),

  /** EX-16 : séances enregistrées (seulement), la plus récente en haut (date puis heure). */
  history: async ({ seasonId, groupId, from }: HistoryFilter): Promise<HistorySession[]> => {
    checkId(seasonId);
    checkId(groupId);
    if (from !== null) validateDate(from);
    return db.query<HistorySession>(
      `SELECT s.id, s.date, s.start_time AS startTime, g.id AS groupId, g.name AS groupName,
         (SELECT COUNT(*) FROM attendances a
          WHERE a.session_id = s.id AND a.status IN ('present', 'late')) AS present,
         (SELECT COUNT(*) FROM attendances a WHERE a.session_id = s.id) AS total
       FROM sessions s ${GROUP_OF_SESSION}
       WHERE s.state = 'recorded' AND (?1 IS NULL OR s.season_id = ?1)
         AND (?3 IS NULL OR s.date >= ?3)
         AND (?2 IS NULL OR EXISTS (SELECT 1 FROM session_groups sg
                                    WHERE sg.session_id = s.id AND sg.group_id = ?2))
       ORDER BY s.date DESC, s.start_time DESC, s.id DESC`,
      [seasonId, groupId, from],
    );
  },

  /** État vide de l'Historique (P1) : aucun appel enregistré, toutes saisons confondues. */
  hasRecorded: async (): Promise<boolean> =>
    (await db.query<{ id: number }>("SELECT id FROM sessions WHERE state = 'recorded' LIMIT 1"))
      .length > 0,

  /** EX-21 : plus ancienne séance enregistrée (bandeau sans sauvegarde) ; null si aucune ou illisible. */
  firstRecordedDate: async (): Promise<string | null> => {
    const [row] = await db.query<{ date: string | null }>(
      "SELECT MIN(date) AS date FROM sessions WHERE state = 'recorded'",
    );
    return row?.date != null && isIsoDate(row.date) ? row.date : null;
  },

  /** EX-18 : détail d'une séance enregistrée ; `null` si elle n'existe pas (ou plus). */
  get: async (id: number): Promise<SessionDetail | null> => {
    // Identifiant venu de l'adresse (`/seances/[id]`) : validé avant la requête.
    if (!isId(id)) return null;
    const [row] = await db.query<Omit<SessionDetail, 'attendances'>>(
      `SELECT s.id, s.season_id AS seasonId, s.slot_id AS slotId, s.date,
         s.start_time AS startTime, g.name AS groupName, s.comment
       FROM sessions s ${GROUP_OF_SESSION}
       WHERE s.id = ? AND s.state = 'recorded'`,
      [id],
    );
    if (!row) return null;
    const attendances = await db.query<SessionAttendance>(
      `SELECT a.member_id AS memberId, m.first_name AS firstName, m.last_name AS lastName,
         a.status
       FROM attendances a JOIN members m ON m.id = a.member_id
       WHERE a.session_id = ? ORDER BY a.member_id`,
      [id],
    );
    attendances.sort(
      (a, b) =>
        collator.compare(a.lastName, b.lastName) || collator.compare(a.firstName, b.firstName),
    );
    return { ...row, attendances };
  },

  /**
   * EX-18 : corrige statuts et commentaire, d'un bloc. Seuls les membres de la séance (sans ajout) ;
   * permis même saison inactive ou groupe archivé (décision du 2026-11-27).
   */
  correct: async (id: number, input: Correction): Promise<void> => {
    const statuses = validateStatuses(input.statuses);
    const comment = validateComment(input.comment);
    await db.transaction(async (tx) => {
      expectChanged(
        await tx.execute("UPDATE sessions SET comment = ? WHERE id = ? AND state = 'recorded'", [
          comment,
          id,
        ]),
      );
      for (const { memberId, status } of statuses) {
        expectChanged(
          await tx.execute(
            'UPDATE attendances SET status = ? WHERE session_id = ? AND member_id = ?',
            [status, id, memberId],
          ),
        );
      }
    });
  },

  /** EX-18, ABS-05, SEC-11 : suppression réelle ; groupe figé et présences partent en cascade. */
  remove: async (id: number): Promise<void> => {
    expectChanged(
      await db.execute("DELETE FROM sessions WHERE id = ? AND state = 'recorded'", [id]),
    );
  },
});
