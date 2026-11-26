// Dépôt des saisons (EX-01). Requêtes paramétrées seulement ; la base est passée en paramètre.
import type { Db } from '@/data/db';
import { type SeasonInput, validateSeason } from '@/domain/validation';

export const NOT_FOUND = 'Élément introuvable';

export type Season = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type SeasonDeletionImpact = {
  groups: number;
  slots: number;
  sessions: number;
  attendances: number;
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

/** Une modification qui ne touche aucune ligne vise un élément introuvable. */
export const expectChanged = ({ changes }: { changes: number }): void => {
  if (changes === 0) throw new Error(NOT_FOUND);
};

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

  update: async (id: number, input: SeasonInput): Promise<void> => {
    const s = validateSeason(input);
    expectChanged(
      await db.execute('UPDATE seasons SET name = ?, start_date = ?, end_date = ? WHERE id = ?', [
        s.name,
        s.startDate,
        s.endDate,
        id,
      ]),
    );
  },

  /** EX-01 : une seule saison active ; tout ou rien. */
  activate: (id: number): Promise<void> =>
    db.transaction(async (tx) => {
      await tx.execute('UPDATE seasons SET is_active = 0 WHERE is_active = 1');
      expectChanged(await tx.execute('UPDATE seasons SET is_active = 1 WHERE id = ?', [id]));
    }),

  /** EX-01 : ce que la suppression effacera, pour la confirmation. */
  deletionImpact: async (id: number): Promise<SeasonDeletionImpact> => {
    const [row] = await db.query<SeasonDeletionImpact>(
      `SELECT
        (SELECT COUNT(*) FROM groups WHERE season_id = ?1) AS groups,
        (SELECT COUNT(*) FROM slots WHERE season_id = ?1) AS slots,
        (SELECT COUNT(*) FROM sessions WHERE season_id = ?1) AS sessions,
        (SELECT COUNT(*) FROM attendances a JOIN sessions s ON s.id = a.session_id
          WHERE s.season_id = ?1) AS attendances`,
      [id],
    );
    return row ?? { groups: 0, slots: 0, sessions: 0, attendances: 0 };
  },

  /** EX-01, ABS-05 : efface la saison et, en cascade, groupes, créneaux, séances, présences. */
  remove: async (id: number): Promise<void> => {
    expectChanged(await db.execute('DELETE FROM seasons WHERE id = ?', [id]));
  },
});
