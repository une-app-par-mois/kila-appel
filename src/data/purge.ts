// Purge des anciennes saisons (EX-24, SEC-11, ABS-05). La durée de conservation (lue dans les
// réglages par l'écran, ticket 015b) et le jour (AAAA-MM-JJ) sont reçus en paramètre.
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { log } from '@/data/log';
import { type Season, type SeasonDeletionImpact, seasonsRepo } from '@/data/seasonsRepo';
import { validateDate } from '@/domain/validation';

/** EX-24 : ce que la purge effacera, pour la confirmation. */
export type PurgeImpact = SeasonDeletionImpact & { seasons: number; members: number };

/**
 * EX-24 : on garde de 1 à 3 saisons (décision du porteur du 2026-11-27). La valeur vient d'un choix
 * fermé (ticket 015b), pas d'une saisie : une autre valeur est une erreur de données.
 */
const validateRetention = (retention: number): number => {
  if (!Number.isInteger(retention) || retention < 1 || retention > 3) {
    throw new DataError('RETENTION_INVALID');
  }
  return retention;
};

/** Identifiants entiers positifs, sans doublon ; passés en JSON à `json_each` (une seule valeur). */
const toIdList = (ids: readonly number[]): number[] => {
  if (!ids.every((id) => Number.isInteger(id) && id > 0)) throw new DataError('NOT_FOUND');
  return [...new Set(ids)];
};

const PURGED = '(SELECT value FROM json_each(?1))';

/**
 * Membres effacés avec les saisons (décision du porteur du 2026-11-27) : une inscription ou une
 * présence dans une saison purgée, aucune dans une saison gardée ; archivés compris. Un membre
 * jamais inscrit n'est pas visé.
 */
const MEMBERS_TO_ERASE = `SELECT m.id FROM members m
  WHERE (EXISTS (SELECT 1 FROM enrollments e JOIN groups g ON g.id = e.group_id
                 WHERE e.member_id = m.id AND g.season_id IN ${PURGED})
      OR EXISTS (SELECT 1 FROM attendances a JOIN sessions s ON s.id = a.session_id
                 WHERE a.member_id = m.id AND s.season_id IN ${PURGED}))
    AND NOT EXISTS (SELECT 1 FROM enrollments e JOIN groups g ON g.id = e.group_id
                    WHERE e.member_id = m.id AND g.season_id NOT IN ${PURGED})
    AND NOT EXISTS (SELECT 1 FROM attendances a JOIN sessions s ON s.id = a.session_id
                    WHERE a.member_id = m.id AND s.season_id NOT IN ${PURGED})`;

const membersToErase = async (db: Db, seasonIds: number[]): Promise<number[]> =>
  (await db.query<{ id: number }>(MEMBERS_TO_ERASE, [JSON.stringify(seasonIds)])).map((m) => m.id);

/**
 * EX-24 : parmi les saisons commencées (début au plus tard `today`, dates ISO comparées comme
 * chaînes), rangées par date de début décroissante comme la liste des saisons, celles au-delà des
 * `retention` plus récentes. Une saison à venir ne compte pas parmi les gardées et n'est jamais
 * proposée ; une saison qui commence aujourd'hui compte (décision du porteur du 2026-11-27). La
 * saison active n'est jamais proposée.
 */
export const purgeCandidates = async (
  db: Db,
  retention: number,
  today: string,
): Promise<Season[]> => {
  const kept = validateRetention(retention);
  const day = validateDate(today);
  return (await seasonsRepo(db).list())
    .filter((season) => season.startDate <= day)
    .slice(kept)
    .filter((season) => !season.isActive);
};

/**
 * EX-24 : somme des cascades de chaque saison (EX-01), plus les membres effacés. Tout est lu dans
 * une seule transaction : les comptes décrivent le même état de la base.
 */
export const purgeImpact = async (db: Db, ids: readonly number[]): Promise<PurgeImpact> => {
  const seasonIds = toIdList(ids);
  return db.transaction(async (tx) => {
    const impact: PurgeImpact = {
      seasons: seasonIds.length,
      groups: 0,
      enrollments: 0,
      slots: 0,
      sessions: 0,
      attendances: 0,
      rollCallDraft: false,
      members: (await membersToErase(tx, seasonIds)).length,
    };
    for (const id of seasonIds) {
      const one = await seasonsRepo(tx).deletionImpact(id);
      impact.groups += one.groups;
      impact.enrollments += one.enrollments;
      impact.slots += one.slots;
      impact.sessions += one.sessions;
      impact.attendances += one.attendances;
      impact.rollCallDraft ||= one.rollCallDraft;
    }
    return impact;
  });
};

/**
 * EX-24, ABS-05 : efface les saisons (cascades de EX-01) et leurs seuls membres, en une
 * transaction. Dedans, la règle est revérifiée au jour `today` : la saison active est refusée
 * (`ACTIVE_SEASON`) ; si les saisons visées ne sont plus exactement les candidates (base modifiée,
 * jour changé depuis la confirmation), `NOT_PURGEABLE`. Dans les deux cas, rien n'est effacé.
 */
export const purge = async (
  db: Db,
  ids: readonly number[],
  retention: number,
  today: string,
): Promise<void> => {
  const seasonIds = toIdList(ids);
  validateRetention(retention);
  validateDate(today);
  const memberCount = await db.transaction(async (tx) => {
    const [active] = await tx.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM seasons WHERE is_active = 1 AND id IN ${PURGED}`,
      [JSON.stringify(seasonIds)],
    );
    if ((active?.n ?? 0) > 0) throw new DataError('ACTIVE_SEASON');
    const candidates = new Set(
      (await purgeCandidates(tx, retention, today)).map((season) => season.id),
    );
    const same =
      candidates.size === seasonIds.length && seasonIds.every((id) => candidates.has(id));
    if (!same) throw new DataError('NOT_PURGEABLE');
    // Lus avant : les inscriptions et présences disparaissent avec les saisons.
    const memberIds = await membersToErase(tx, seasonIds);
    for (const id of seasonIds) await seasonsRepo(tx).remove(id);
    await tx.execute('DELETE FROM members WHERE id IN (SELECT value FROM json_each(?))', [
      JSON.stringify(memberIds),
    ]);
    return memberIds.length;
  });
  log('PURGE_DONE', { seasonCount: seasonIds.length, memberCount });
};
