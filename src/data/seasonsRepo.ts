// Dépôt des saisons (EX-01). Requêtes paramétrées seulement ; la base est passée en paramètre.
import type { Db } from '@/data/db';
import { notEnded } from '@/data/enrollmentsRepo';
import { DataError, expectChanged, expectFound } from '@/data/errors';
import { type SeasonInput, validateDate, validateSeason } from '@/domain/validation';

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

/** Séances et débuts d'inscription de la saison dans les nouvelles dates (EX-01, EX-04). */
const expectDatesFit = async (tx: Db, id: number, startDate: string, endDate: string) => {
  const [outside] = await tx.query<{ n: number }>(
    'SELECT COUNT(*) AS n FROM sessions WHERE season_id = ? AND (date < ? OR date > ?)',
    [id, startDate, endDate],
  );
  if ((outside?.n ?? 0) > 0) throw new DataError('SESSIONS_OUTSIDE_SEASON');
  const [enrolled] = await tx.query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM enrollments e JOIN groups g ON g.id = e.group_id
     WHERE g.season_id = ? AND (e.start_date < ? OR e.start_date > ?)
       AND (e.end_date IS NULL OR e.end_date > e.start_date)`,
    [id, startDate, endDate],
  );
  if ((enrolled?.n ?? 0) > 0) throw new DataError('ENROLLMENTS_OUTSIDE_SEASON');
};

/** P1 : où en est la mise en route (écran Bienvenue, ticket 012b). */
export type SetupProgress = {
  season: { id: number; name: string } | null;
  /** Premier groupe courant de la saison active : « Ajouter des membres » y inscrit. */
  firstGroupId: number | null;
  groups: number;
  /** Membres courants inscrits (inscription en cours ou à venir) à un groupe courant. */
  members: number;
  slots: number;
};

export const seasonsRepo = (db: Db) => ({
  /** De la plus récente à la plus ancienne. */
  list: async (): Promise<Season[]> =>
    (await db.query<SeasonRow>(`${SELECT} ORDER BY start_date DESC, id DESC`)).map(toSeason),

  /**
   * P1 : crée la première saison, active, seulement s'il n'en existe aucune ; une seule
   * instruction, donc pas de doublon si deux ouvertures se suivent. Vrai si elle a été créée.
   */
  createFirst: async (input: SeasonInput): Promise<boolean> => {
    const s = validateSeason(input);
    const result = await db.execute(
      `INSERT INTO seasons (name, start_date, end_date, is_active)
       SELECT ?, ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM seasons)`,
      [s.name, s.startDate, s.endDate],
    );
    return result.changes > 0;
  },

  /** P1 : avancement de la mise en route dans la saison active (`today` : inscriptions finies). */
  setupProgress: async (today: string): Promise<SetupProgress> => {
    const [season] = await db.query<{ id: number; name: string }>(
      'SELECT id, name FROM seasons WHERE is_active = 1',
    );
    if (!season) return { season: null, firstGroupId: null, groups: 0, members: 0, slots: 0 };
    const [row] = await db.query<Omit<SetupProgress, 'season'>>(
      `SELECT
        (SELECT MIN(id) FROM groups WHERE season_id = ?1 AND archived_at IS NULL) AS firstGroupId,
        (SELECT COUNT(*) FROM groups WHERE season_id = ?1 AND archived_at IS NULL) AS groups,
        (SELECT COUNT(DISTINCT e.member_id) FROM enrollments e
           JOIN groups g ON g.id = e.group_id
           JOIN members m ON m.id = e.member_id
         WHERE g.season_id = ?1 AND g.archived_at IS NULL AND m.archived_at IS NULL
           AND ${notEnded(2)}) AS members,
        (SELECT COUNT(*) FROM slots WHERE season_id = ?1 AND weekday IS NOT NULL) AS slots`,
      [season.id, validateDate(today)],
    );
    return { season, ...(row as Omit<SetupProgress, 'season'>) };
  },

  getActive: async (): Promise<Season | null> => {
    const [row] = await db.query<SeasonRow>(`${SELECT} WHERE is_active = 1`);
    return row ? toSeason(row) : null;
  },

  /**
   * Crée une saison, active seulement si aucune ne l'est (décision du porteur du 2026-11-26) ;
   * une seule instruction, donc sans course entre la lecture et l'écriture.
   */
  create: async (input: SeasonInput): Promise<number> => {
    const s = validateSeason(input);
    const result = await db.execute(
      `INSERT INTO seasons (name, start_date, end_date, is_active)
       VALUES (?, ?, ?, NOT EXISTS (SELECT 1 FROM seasons WHERE is_active = 1))`,
      [s.name, s.startDate, s.endDate],
    );
    return result.lastInsertRowId;
  },

  /**
   * EX-01 : refusé si des séances tomberaient hors des nouvelles dates, ou si une inscription à l'un
   * de ses groupes y commencerait (EX-04, ticket 006f) ; membres et groupes archivés compris, période
   * vide exclue (décisions du porteur du 2026-11-26).
   */
  update: (id: number, input: SeasonInput): Promise<void> => {
    const s = validateSeason(input);
    return db.transaction(async (tx) => {
      const [current] = await tx.query<{ start_date: string; end_date: string }>(
        'SELECT start_date, end_date FROM seasons WHERE id = ?',
        [id],
      );
      // Dates inchangées (renommage) : rien à contrôler.
      if (current?.start_date !== s.startDate || current?.end_date !== s.endDate)
        await expectDatesFit(tx, id, s.startDate, s.endDate);
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
