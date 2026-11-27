// Dépôt des créneaux hebdomadaires d'une saison (EX-07). Requêtes paramétrées seulement ; jamais
// de REPLACE INTO (il recréerait la ligne et viderait le créneau des séances, ARCHITECTURE §4.2).
// Modifier ou supprimer un créneau ne touche à aucune séance : elles gardent leur date, leur heure
// et leurs groupes ; supprimer vide leur créneau (ON DELETE SET NULL). Hors périmètre : ponctuels.
import type { Db } from '@/data/db';
import { DataError, expectChanged } from '@/data/errors';
import { type SlotInput, validateDate, validateSlot } from '@/domain/validation';

export type Slot = {
  id: number;
  seasonId: number;
  weekday: number;
  startTime: string;
  durationMin: number;
  place: string | null;
  name: string | null;
  /** Date d'effet de l'horaire (EX-07, EX-08). */
  scheduleFrom: string;
  groups: { id: number; name: string }[];
};

type SlotRow = {
  id: number;
  season_id: number;
  weekday: number;
  start_time: string;
  duration_min: number;
  place: string | null;
  name: string | null;
  schedule_from: string;
};

const SELECT = `SELECT id, season_id, weekday, start_time, duration_min, place, name, schedule_from
  FROM slots`;

/** Groupes des créneaux lus, triés par nom. */
const withGroups = async (db: Db, rows: SlotRow[]): Promise<Slot[]> => {
  if (rows.length === 0) return [];
  const links = await db.query<{ slot_id: number; id: number; name: string }>(
    `SELECT sg.slot_id, g.id, g.name FROM slot_groups sg JOIN groups g ON g.id = sg.group_id
     WHERE sg.slot_id IN (${rows.map(() => '?').join(', ')}) ORDER BY g.name, g.id`,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({
    id: r.id,
    seasonId: r.season_id,
    weekday: r.weekday,
    startTime: r.start_time,
    durationMin: r.duration_min,
    place: r.place,
    name: r.name,
    scheduleFrom: r.schedule_from,
    groups: links.filter((l) => l.slot_id === r.id).map(({ id, name }) => ({ id, name })),
  }));
};

/** Le groupe est de la saison ; non archivé, sauf s'il reste celui du créneau. */
const expectGroup = async (tx: Db, seasonId: number, groupId: number, keptGroup?: number) => {
  const [group] = await tx.query<{ archived_at: string | null }>(
    'SELECT archived_at FROM groups WHERE id = ? AND season_id = ?',
    [groupId, seasonId],
  );
  if (!group || (group.archived_at !== null && groupId !== keptGroup))
    throw new DataError('NOT_FOUND');
};

export const slotsRepo = (db: Db) => ({
  /** EX-07 : créneaux hebdomadaires de la saison, par jour puis par heure. */
  listBySeason: async (seasonId: number): Promise<Slot[]> =>
    withGroups(
      db,
      await db.query<SlotRow>(
        `${SELECT} WHERE season_id = ? AND weekday IS NOT NULL ORDER BY weekday, start_time, id`,
        [seasonId],
      ),
    ),

  get: async (id: number): Promise<Slot | null> => {
    const rows = await db.query<SlotRow>(`${SELECT} WHERE id = ? AND weekday IS NOT NULL`, [id]);
    return (await withGroups(db, rows))[0] ?? null;
  },

  /** EX-07 : l'horaire prend effet le jour de la création (`today`, CONV-11). */
  create: async (seasonId: number, input: SlotInput, today: string): Promise<number> => {
    const s = validateSlot(input);
    validateDate(today);
    return db.transaction(async (tx) => {
      await expectGroup(tx, seasonId, s.groupId);
      const { lastInsertRowId: id } = await tx.execute(
        `INSERT INTO slots (season_id, weekday, start_time, duration_min, place, name, schedule_from)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [seasonId, s.weekday, s.startTime, s.durationMin, s.place, s.name, today],
      );
      await tx.execute('INSERT INTO slot_groups (slot_id, group_id) VALUES (?, ?)', [
        id,
        s.groupId,
      ]);
      return id;
    });
  },

  /**
   * EX-07 : un nouveau jour ou une nouvelle heure prennent effet `today` (date d'effet avancée,
   * jamais reculée : le passé n'est pas recalculé avec le nouvel horaire, ticket 005).
   */
  update: async (id: number, input: SlotInput, today: string): Promise<void> => {
    const s = validateSlot(input);
    validateDate(today);
    await db.transaction(async (tx) => {
      const [current] = await tx.query<SlotRow & { group_id: number | null }>(
        `SELECT s.season_id, s.weekday, s.start_time, s.schedule_from,
           (SELECT group_id FROM slot_groups WHERE slot_id = s.id LIMIT 1) AS group_id
         FROM slots s WHERE s.id = ? AND s.weekday IS NOT NULL`,
        [id],
      );
      if (!current) throw new DataError('NOT_FOUND');
      await expectGroup(tx, current.season_id, s.groupId, current.group_id ?? undefined);
      const moved = s.weekday !== current.weekday || s.startTime !== current.start_time;
      const scheduleFrom = moved && today > current.schedule_from ? today : current.schedule_from;
      expectChanged(
        await tx.execute(
          `UPDATE slots SET weekday = ?, start_time = ?, duration_min = ?, place = ?, name = ?,
             schedule_from = ? WHERE id = ?`,
          [s.weekday, s.startTime, s.durationMin, s.place, s.name, scheduleFrom, id],
        ),
      );
      if (s.groupId !== current.group_id) {
        await tx.execute('DELETE FROM slot_groups WHERE slot_id = ?', [id]);
        await tx.execute('INSERT INTO slot_groups (slot_id, group_id) VALUES (?, ?)', [
          id,
          s.groupId,
        ]);
      }
    });
  },

  /** EX-07 : les séances restent, sans créneau ; un appel interrompu sur ce créneau est effacé. */
  remove: async (id: number): Promise<void> => {
    expectChanged(await db.execute('DELETE FROM slots WHERE id = ?', [id]));
  },
});
