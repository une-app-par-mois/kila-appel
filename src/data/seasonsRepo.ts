// Dépôt des saisons (EX-01). Requêtes paramétrées seulement ; la base est passée en paramètre.
import type { Db } from '@/data/db';
import { DataError, expectChanged, expectFound } from '@/data/errors';
import { type SeasonInput, validateSeason } from '@/domain/validation';

export type Season = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

/** EX-01 : tout ce que la cascade effacera, pour la confirmation. */
export type SeasonDeletionImpact = {
  groups: number;
  enrollments: number;
  slots: number;
  sessions: number;
  attendances: number;
  rollCallDraft: boolean;
};

type SeasonRow = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: number;
};

const toSeason = (row: SeasonRow): Season => ({
  id: row.id,
  name: row.name,
  startDate: row.start_date,
  endDate: row.end_date,
  isActive: row.is_active === 1,
});

const SELECT = 'SELECT id, name, start_date, end_date, is_active FROM seasons';

export const seasonsRepo = (db: Db) => ({
  /** De la plus récente à la plus ancienne. */
  list: async (): Promise<Season[]> =>
    (await db.query<SeasonRow>(`${SELECT} ORDER BY start_date DESC, id DESC`)).map(toSeason),

  getActive: async (): Promise<Season | null> => {
    const [row] = await db.query<SeasonRow>(`${SELECT} WHERE is_active = 1`);
    return row ? toSeason(row) : null;
  },

  /** Crée une saison inactive ; l'activer est une action à part. */
  create: async (input: SeasonInput): Promise<number> => {
    const s = validateSeason(input);
    const result = await db.execute(
      'INSERT INTO seasons (name, start_date, end_date) VALUES (?, ?, ?)',
      [s.name, s.startDate, s.endDate],
    );
    return result.lastInsertRowId;
  },

  /** EX-01 : refusé si des séances tomberaient hors des nouvelles dates (décision du porteur du 2026-11-26). */
  update: (id: number, input: SeasonInput): Promise<void> => {
    const s = validateSeason(input);
    return db.transaction(async (tx) => {
      const [outside] = await tx.query<{ n: number }>(
        'SELECT COUNT(*) AS n FROM sessions WHERE season_id = ? AND (date < ? OR date > ?)',
        [id, s.startDate, s.endDate],
      );
      if ((outside?.n ?? 0) > 0) throw new DataError('SESSIONS_OUTSIDE_SEASON');
      expectChanged(
        await tx.execute('UPDATE seasons SET name = ?, start_date = ?, end_date = ? WHERE id = ?', [
          s.name,
          s.startDate,
          s.endDate,
          id,
        ]),
      );
    });
  },

  /** EX-01 : une seule saison active ; tout ou rien. */
  activate: (id: number): Promise<void> =>
    db.transaction(async (tx) => {
      await tx.execute('UPDATE seasons SET is_active = 0 WHERE is_active = 1');
      expectChanged(await tx.execute('UPDATE seasons SET is_active = 1 WHERE id = ?', [id]));
    }),

  /** EX-01 : ce que la suppression effacera, pour la confirmation. */
  deletionImpact: async (id: number): Promise<SeasonDeletionImpact> => {
    const [row] = await db.query<Omit<SeasonDeletionImpact, 'rollCallDraft'> & { drafts: number }>(
      `SELECT
        (SELECT COUNT(*) FROM groups WHERE season_id = ?1) AS groups,
        (SELECT COUNT(*) FROM enrollments e JOIN groups g ON g.id = e.group_id
          WHERE g.season_id = ?1) AS enrollments,
        (SELECT COUNT(*) FROM slots WHERE season_id = ?1) AS slots,
        (SELECT COUNT(*) FROM sessions WHERE season_id = ?1) AS sessions,
        (SELECT COUNT(*) FROM attendances a JOIN sessions s ON s.id = a.session_id
          WHERE s.season_id = ?1) AS attendances,
        (SELECT COUNT(*) FROM roll_call_drafts WHERE season_id = ?1) AS drafts
      FROM seasons WHERE id = ?1`,
      [id],
    );
    const { drafts, ...counts } = expectFound(row);
    return { ...counts, rollCallDraft: drafts > 0 };
  },

  /** EX-01, ABS-05 : efface la saison et, en cascade, groupes, créneaux, séances, présences. */
  remove: async (id: number): Promise<void> => {
    expectChanged(await db.execute('DELETE FROM seasons WHERE id = ?', [id]));
  },
});
